# Pitfalls Research

**Domain:** Single-file local HTML meeting-timer / agenda-presenter (Chromium-based, `file://` origin, Discord screenshare)
**Researched:** 2026-05-16
**Confidence:** HIGH (timer / `file://` / Discord findings cross-verified against MDN, Chrome dev blog, Discord support); MEDIUM on Overwatch banner copyright; HIGH on parser edge cases (derived from the exact agenda fixtures in PROJECT.md).

This document lists pitfalls that are specific to *this* tool — a meeting-presenter that lives in one .html file, runs from disk, drives a live screenshare, and must not lie about elapsed time. Generic web-dev advice has been omitted.

---

## Critical Pitfalls

### Pitfall 1: Timer drift from `setInterval(tick, 1000)` (the "vibes-coded countdown")

**What goes wrong:**
A naive `setInterval(() => remaining--, 1000)` will drift several seconds per minute under load, and far worse when the tab is backgrounded. Sarah looks down at the timer mid-meeting and it says 4:32 remaining when the wall clock says she's been on this item for 6 minutes. The amber/red transitions fire late. The "OVERTIME" banner is no longer truthful.

**Why it happens:**
- `setInterval` provides a *minimum* delay, not an accurate one — main-thread work, GC pauses, layout, and rendering all push subsequent ticks late and the error accumulates.
- Chrome throttles same-tab timers to **~1 tick/second** when the tab is hidden, and to **~1 tick/minute** after the page has been hidden ≥5 minutes with no audio/WebRTC ("intensive throttling," Chrome 88+). A presenter who alt-tabs to check Slack for 6 minutes returns to a timer that is *minutes* behind reality.
- Decrementing a counter (`remaining--`) loses information: the only "truth" the timer has is its own bad bookkeeping.

**How to avoid — concrete pattern (this is the recommended one for v1):**

Store the *intent* (when this segment was started, how long it should run, paused-accumulated-ms), and *derive* `remaining` on every render from `performance.now()`. Never decrement a counter.

```js
// State per slide/sub-state:
//   allocatedMs: number              // from markdown
//   startedAt: number | null         // performance.now() when last unpaused
//   accumulatedMs: number            // total run time before the current run
//   paused: boolean

function elapsedMs(s) {
  if (s.paused || s.startedAt == null) return s.accumulatedMs;
  return s.accumulatedMs + (performance.now() - s.startedAt);
}
function remainingMs(s) { return s.allocatedMs - elapsedMs(s); }  // can go negative for overrun
```

Drive the *display* with `requestAnimationFrame`, not `setInterval`. The display only needs to update once per second visually, but the data underneath is always live:

```js
function loop() {
  render(remainingMs(current));   // derives from performance.now() every frame
  requestAnimationFrame(loop);
}
```

This pattern is **immune to drift** (state is wall-clock-derived) and **immune to throttling** (when the tab returns to foreground, the next rAF reads `performance.now()` and the display jumps to the truth). It also makes pause/resume/±60s/edit trivial: just mutate `accumulatedMs` or `startedAt`.

**Do not** use a Web Worker for v1. The README mandates a single .html file; a worker requires a separate file or a `Blob`/`data:` URL hack and adds complexity for zero benefit — the rAF + `performance.now()` derivation is already drift-proof. Reserve workers as a v2 fallback only if a real bug shows up.

**Warning signs:**
- Test: start a 60-second timer, alt-tab for 2 minutes, come back. Display should snap to ~−60s remaining (i.e. 1 minute into overrun), not 0 or a stale value.
- Open DevTools Performance tab during a 3-minute timer; the displayed time at minute 3 should be within ~50ms of `Date.now()` delta from start.
- If timer "speeds up" when you click around or "lags" when you scroll the sidebar, the implementation is counter-based, not wall-clock-derived.

**Phase to address:** Phase 1 (Core timer engine). Get this right *first* — it is the heart of the product. Every other timer feature (pause, ±1min, edit-in-place, per-slide state, restore) becomes trivial on top of a clean derivation model and a nightmare on top of a counter.

---

### Pitfall 2: `file://` localStorage works in Chrome but silently isolates per-file path

**What goes wrong:**
Sarah saves a meeting agenda. She renames `agenda-presenter.html` to `agenda-presenter-v2.html` or moves it to a different folder. The new file loads with empty state — agenda is gone, theme preference is gone, current-slide is gone. She thinks her data was lost.

Worse: she opens the file in Chrome on one day from `C:\Users\sarah\Downloads\agenda-presenter.html`, then a week later from `C:\Users\sarah\Documents\GitHub\meeting-manager\agenda-presenter.html`. These are two completely separate localStorage buckets in Chromium — moving the file silently abandons her state.

**Why it happens:**
- Chromium (Chrome/Edge) **does** allow localStorage on `file://` (unlike Firefox, which throws `SecurityError`). This makes "double-click to open" viable on the target browser.
- However, Chromium treats *each `file://` URL as its own origin* for storage isolation. Move/rename the file → new origin → empty localStorage. This behavior is officially undefined and could change.
- The HTML spec leaves `file://` origin behavior unspecified (`whatwg/html#3099`), so this is browser-implementation-defined.

**How to avoid:**
1. **Wrap every storage call in try/catch.** Even on Chromium, Incognito mode and some enterprise policy configurations can throw `SecurityError` or `QuotaExceededError` on `file://`. A throw on first `localStorage.setItem` must not blank the screen — fall back to in-memory state and surface a non-blocking warning ("Auto-save unavailable in this browser mode").
2. **Detect Firefox/Safari and degrade gracefully.** A user who opens the .html in Firefox by accident gets `SecurityError: The operation is insecure`. Catch this on startup, set `STORAGE_AVAILABLE = false`, and run from memory only with a one-time banner: "Your browser blocked auto-save for local files. Try Chrome or Edge for full persistence."
3. **Provide a manual export/import fallback.** A "Copy state to clipboard" / "Paste state to restore" pair (one button, JSON blob) lets the user recover from a file rename or browser switch. Cheap to build, high insurance value.
4. **Use a namespaced storage key** like `meeting-manager.v1.state` so any future schema migration is unambiguous and so other `file://` files on the same machine don't collide (Chromium *does* share localStorage across all `file://` origins by some bug reports — namespacing protects either way).

**Warning signs:**
- Refresh test: load file → paste agenda → refresh → state restores. Pass.
- Rename test: load file, save state, close, rename file, reopen. State will be lost — verify the UI handles "empty state" gracefully (not an error, just the paste-textarea view).
- Firefox test: open the .html in Firefox. The app must still render, not white-screen.

**Phase to address:** Phase 2 (Persistence / auto-save). Bake the try/catch wrapper and the memory-fallback path in *from the very first `setItem` call*, not as a polish item.

---

### Pitfall 3: `file://` opens in two tabs → state corruption via storage event echo

**What goes wrong:**
Sarah double-clicks `agenda-presenter.html` from the desktop, then accidentally double-clicks it again. Now two tabs are running. Both write to the same localStorage key. Sarah edits the timer in tab A; tab B doesn't see it. Sarah uses tab B for the meeting; on next reload, whichever tab was *last* to autosave wins and the other's edits are silently lost.

**Why it happens:**
- localStorage's `storage` event fires in *other* same-origin tabs but **not** in the originating tab. Two tabs writing to the same key produce a last-writer-wins race.
- On `file://`, all tabs of the same file path share storage (per the path-as-origin behavior above), so this isn't theoretical — it's the default on double-click.
- A debounced autosave (typical pattern) makes this *worse*: tab A writes at t=1s, tab B writes its older state at t=1.2s, tab A's edit is gone.

**How to avoid:**
1. **Detect duplicate tabs on startup** with a heartbeat key:
   ```js
   const TAB_ID = crypto.randomUUID();
   localStorage.setItem('meeting-manager.tab.heartbeat', JSON.stringify({id: TAB_ID, t: Date.now()}));
   // On 'storage' event for that key with a different id and recent t: show a warning banner
   ```
   When a second tab opens, both tabs see each other and the second tab shows a non-dismissable banner: "Another tab of Meeting Manager is open — close one before running a meeting."
2. **Don't fight the race, surface it.** Disable autosave in any tab that sees a competing heartbeat, and read-only the agenda there.
3. **For v1, accept this as a known limitation** if heartbeat is too much for the first cut — but document it loudly in the empty-state hint: "Only run one tab at a time."

**Warning signs:**
- Open the file in two tabs. Edit timer in tab A. Check tab B. Reload tab B. Check whose state survived.
- If reload of tab B *silently overwrites tab A's edits with stale data*, you're vulnerable.

**Phase to address:** Phase 2 (Persistence). The heartbeat solution is ~15 lines of code and lives next to the storage layer.

---

### Pitfall 4: Markdown parser breaks on real-world agenda variations

**What goes wrong:**
Sarah pastes an agenda where one line has `--` (two hyphens because she typed it on her phone) instead of `—`. Another item is `7.5 min` instead of `7 min`. One person's name has an apostrophe (`O'Brien`). The parser fails silently — that slide is missing, or shows `NaN:NaN` in the timer, or attributions render as `[object Object]`.

**Why it happens:**
- The README spec shows `—` (em-dash) in examples but PROJECT.md explicitly requires tolerating `—`, `–`, and `--`. A naive `split('—')` only handles one.
- "max per person" semantics are under-specified at the edges: what if there's only 1 person? What if 0? What if attribution is `(Sarah, Teck Lee — max 5 min per person)` vs `(— max 5 min per person)` (no names)?
- Decimal durations like `7.5 min` need explicit handling (`7.5 * 60_000 = 450_000ms`, not parsing as integer `7` and dropping `.5`).
- "Out of order" numbering (`1.`, `3.`, `2.`) — should the parser preserve markdown order or sort? Reordering on the fly will confuse the user.
- Multi-line item titles, unicode in names (`Solomon's`, `Teck-Lee`), missing deadlines, and double-blank-lines all need explicit handling.

**How to avoid — explicit rules table:**

| Input variation | Rule |
|---|---|
| ` — `, ` – `, ` -- ` between title and duration | Normalize all three to one separator at parse time: `s.replace(/\s+(?:—|–|--)\s+/g, ' — ')` then split on ` — ` |
| `7.5 min`, `5min`, `5 minutes`, `5m` | Single regex `/(\d+(?:\.\d+)?)\s*(?:min|minutes?|m)\b/i`; round to nearest second on display |
| `max N min per person` with 1 person | Render as single sub-state (1a only), same UX as a normal item with custom duration |
| `max N min per person` with 0 people / no names | Parse error → surface inline, don't crash; show that item with a "no attribution" badge and a single sub-state |
| Missing duration | Default to a configurable fallback (e.g. 5 min) and **flag the slide visually** ("duration not specified — defaulted to 5:00") |
| Missing deadline | Just hide the badge, don't show "undefined" |
| Out-of-order numbering (`1.`, `3.`, `2.`) | Preserve markdown order, ignore the user's numbers; use parser-assigned sequence for the sidebar (1, 2, 3 by appearance) |
| Names with apostrophes / hyphens / unicode | Treat attribution as opaque strings; never use names as object keys or regex inputs |
| Decimal durations (`7.5 min`) | `Math.round(parseFloat(m) * 60_000)` ms |
| Trailing whitespace, BOM, CRLF | Normalize on intake: `text.replace(/^﻿/, '').replace(/\r\n/g, '\n').trim()` |
| Empty agenda | Show the paste-textarea view, never a blank slide deck |

**Build a fixture file** (`test-agendas.md`) with every variant. Parse it on every save during development. Don't ship without this.

**Warning signs:**
- Any rendered slide containing `NaN`, `undefined`, `[object Object]`, or an empty title.
- Sidebar numbering that disagrees with markdown numbering with no visible explanation.
- Timer total time not matching the sum of durations in markdown.

**Phase to address:** Phase 1 (Parser). The parser is the second pillar of the product (after the timer engine). Build with the variant table above as a test fixture from day 1.

---

### Pitfall 5: Keyboard shortcuts fire while user is typing in the markdown textarea

**What goes wrong:**
Sarah is editing her agenda in the paste textarea. She types a `1` for "1. Approve minutes" — the app jumps to slide 1. She types `r` somewhere — the timer resets. She presses Space to add a space between words — the page scrolls (or worse, pauses a timer that wasn't even visible). She presses → in the textarea to move her cursor — the app advances to the next slide.

**Why it happens:**
- Global keydown listeners (`document.addEventListener('keydown', ...)`) fire for events that originated inside `<input>`, `<textarea>`, and `[contenteditable]` elements unless explicitly filtered.
- Space, arrow keys, and `/` have browser defaults (page scroll, quick-find in Firefox, etc.) that must be `preventDefault()`-ed *only when the app intends to handle them*, not when the user is typing.

**How to avoid:**
1. **Global early-return guard** at the top of every keydown handler:
   ```js
   function isEditingTarget(e) {
     const t = e.target;
     return t.tagName === 'INPUT'
         || t.tagName === 'TEXTAREA'
         || t.isContentEditable;
   }
   document.addEventListener('keydown', (e) => {
     if (isEditingTarget(e)) return;          // user is typing — hands off
     // ... shortcut routing
   });
   ```
2. **Scope `preventDefault()` narrowly.** Only call it on keys the app actually handles, and only after confirming `!isEditingTarget(e)`. Don't blanket-prevent all keys.
3. **Treat Space specially.** Space scrolls by default; if the app handles Space (pause/play), `preventDefault()` only when the timer is the active focus *or* the keyboard handler matches. Same for `/` (Firefox quick-find).
4. **For the "click time to edit" feature**, use a real `<input type="text">` (not contenteditable) so the global guard above does the right thing automatically.

**Warning signs:**
- Type `r` inside the paste textarea — does the app reset? If yes, guard is missing.
- Press Space in any input — does the page scroll? It shouldn't, but neither should the timer pause.
- Press Tab — does focus go somewhere visible and useful, or does it disappear?

**Phase to address:** Phase 3 (Keyboard / interaction layer). Ship the guard *before* binding any shortcuts; this single line of code prevents a class of bugs that's painful to debug later.

---

### Pitfall 6: Rapid clicks / fast keystrokes corrupt per-slide timer state

**What goes wrong:**
Sarah, mid-meeting, mashes → to skip three items quickly. The first slide's timer was running; the transition handler reads its `accumulatedMs`, the user advances before the write completes, and the next slide inherits the previous slide's `startedAt`. Now slide 2's timer thinks it started 3 minutes ago. Or: Sarah clicks the timer to edit it, types `5`, clicks elsewhere — was that "5 minutes total" or "5 minutes remaining"? Or: she clicks "reset" while the timer is in overrun — does it restart at full allocated, or stay at 0?

**Why it happens:**
- Each interaction is a small state mutation; concurrent or out-of-order mutations don't compose if they share mutable references.
- Async event handlers (especially with debounced autosave) can fire in an order that's different from user intent.
- Edge cases around "in overrun" multiply: pause-while-overrun, reset-while-overrun, navigate-away-while-overrun all need explicit decisions.

**How to avoid:**
1. **Make the timer state a pure data object per slide/sub-state.** Mutations are local to one object; advancing slide = save current object to map by id, load next from map. No shared mutable references.
2. **Define overrun semantics explicitly in one place** (table form):

   | Action | Behavior |
   |---|---|
   | Pause during overrun | Freeze at current negative value (e.g., −1:23). Resume continues counting more negative. |
   | Reset during overrun | Restore to full allocated time, paused (don't auto-start — let the presenter decide). |
   | ±1 min during overrun | Add/subtract from remaining, can cross back into positive territory. |
   | Navigate away during overrun | Persist the negative remaining + paused state. On return, show the negative + OVERTIME banner. |
   | Edit time during overrun | Treat input as "new remaining" (positive number); replaces accumulated such that `allocatedMs - accumulated = input`. |
   | Edit while running | Pause for the duration of the edit dialog/input focus; resume on commit. |
3. **Make `setSlide(id)` and `advanceToNext()` idempotent.** Two rapid → presses must produce the same state as one slow → press to the same target.
4. **Edit-in-place input rules** (be explicit):
   - Format: `MM:SS` or `M:SS` or just `M` (interpreted as minutes).
   - Enter → commit and blur.
   - Escape → revert and blur.
   - Click-outside → commit.
   - Invalid input → revert silently, no error dialog (preserves screenshare flow).
   - Pause the timer while editing (otherwise the displayed value changes under the user's fingers).

**Warning signs:**
- Hold down → for 2 seconds. Does the app land on a sensible slide with a sensible timer, or does it lock up / show NaN / inherit weird state?
- Click reset 5 times rapidly mid-overrun. Same end state every time?
- Edit timer, type garbage like `abc`, press Enter. Does it revert cleanly?

**Phase to address:** Phase 3 (Interactions). The overrun-semantics table above is a design artifact, not a code artifact — write it down *before* implementing, ideally pinned into the comments next to the state machine.

---

### Pitfall 7: Reload during a running meeting — restore is wrong

**What goes wrong:**
Sarah's browser crashes 12 minutes into a 30-minute meeting. She reopens the file. Option A: the app restores the agenda *and starts the timer running from where it was*, but it's been 90 seconds since the crash and the timer doesn't know. The timer is now 90 seconds optimistic. Option B: the app restores everything but the timer is *paused* — Sarah doesn't notice and runs the meeting with a frozen timer.

Even worse: Sarah pastes a *new* agenda on Monday for a meeting, then her browser restores the old state from Friday's meeting (current slide index = 4, but new agenda only has 3 items). She sees a blank/error slide.

**Why it happens:**
- Restoring `startedAt: performance.now() - somethingFromBeforeTheCrash` doesn't make sense — `performance.now()` is a time origin relative to the document, and it resets on reload.
- localStorage can hold stale state across totally different agendas if keys aren't versioned/scoped to the agenda content.
- Out-of-bounds slide indices after agenda change are a classic restore-after-edit bug.

**How to avoid:**
1. **On restore, always pause running timers.** Better to make Sarah press Space than to lie about elapsed time. Show a small banner: "Restored from last session — timer paused. Press Space to resume."
2. **Persist `accumulatedMs` (not `startedAt`).** On restore, restart pause-state with `paused: true, startedAt: null` and the saved `accumulatedMs`. No time math across reloads.
3. **Hash the agenda text** (simple SHA-1 of the trimmed input) and store it with the per-slide state. On reload:
   - Same hash → restore current slide + per-slide timer states.
   - Different hash → restore only the agenda text and dark-mode preference; reset slide index to 0 and clear all per-slide timer states.
4. **Bounds-check restored indices** every time: `Math.min(savedIndex, slides.length - 1)` and fall back to 0 if invalid.
5. **Save state on every meaningful change** (slide change, pause/resume, edit, ±1 min), not just on `beforeunload` — the crash case bypasses `beforeunload`.

**Warning signs:**
- DevTools → Application → Local Storage → manually corrupt the state JSON. App should fall back to fresh state, not white-screen.
- Paste agenda A, advance to slide 3, paste agenda B. Slide should reset to 1 (or whichever paste-flow is appropriate), not stay at 3.
- Kill the tab mid-timer. Reopen. Timer should be paused at the same value, not running and out-of-sync.

**Phase to address:** Phase 2 (Persistence). Pair these rules with the storage-wrapper from Pitfall 2.

---

### Pitfall 8: Discord screenshare compression makes the slides look bad

**What goes wrong:**
Sarah's slides look gorgeous in her browser. On Discord screenshare, viewers see blurry text, the OVERTIME banner is a smeared red blob, the timer numerals are illegible at 720p, and the timer's color-change to amber is hard to see. After the meeting someone asks "what did slide 3 say?"

**Why it happens:**
- Discord defaults to a low-bitrate H.264 encode for non-Nitro users; thin fonts, anti-aliased small text, and red-on-red contrast all get destroyed by compression.
- "Better Text Readability" is Discord's app-level setting that streams at exact resolution but lower FPS — many users (and Sarah) won't know it exists.
- Common font choices like ultralight Inter look great locally and disappear in compression.
- A typical presenter laptop runs the browser at fractional DPI scaling, which double-compresses on the way to Discord.

**How to avoid:**
1. **Font weight floor:** body text ≥ 500, slide title ≥ 700. No `font-weight: 300` anywhere on slide-visible content.
2. **Font size floor:** smallest readable element ≥ 24px at the design viewport (1080p). Slide title ≥ 72px. Timer numerals ≥ 96px.
3. **Contrast headroom:** assume Discord will crush ~1 stop of dynamic range. Use AAA contrast (7:1) where possible, never <4.5:1 (AA). The amber state should not be the only signal — pair color change with size/weight change or a subtle icon.
4. **Test the OVERTIME banner on a real screenshare.** Pure-red-on-red is exactly the worst case for H.264 chroma subsampling. Add a high-contrast outline (white or black stroke) on the banner text so it survives compression.
5. **Use system-stack sans-serif** (`-apple-system, "Segoe UI", system-ui, sans-serif`) over web fonts. System fonts are hinted for the user's actual display; web fonts often aren't.
6. **Document a "screenshare prep" hint** in the empty-state UI: "Tip: in Discord, set Stream Quality → Better Text Readability for sharp slides."
7. **Avoid animation on slide content during overrun.** A pulsing or animating element on a low-bitrate stream looks like artifacts. A *static* tinted background with the banner is fine; an animated tint is not.
8. **Test on a second monitor.** If Sarah's browser is on display 2 and Discord is sharing display 1, she'll screen-share the wrong thing — out of scope for the app, but the empty-state could say "share the window, not the screen" as a hint.

**Warning signs:**
- Self-screenshare into an empty Discord channel and view from a second account/device. Anything illegible there is illegible in the meeting.
- Take a screenshot of the slide, scale down to 720p, JPEG-compress at quality 50. If text fails the squint test, real Discord will be worse.

**Phase to address:** Phase 4 (Visual polish / Marp aesthetic). Set the font/size/weight floors as CSS custom-properties so they're easy to audit in one place.

---

### Pitfall 9: Overwatch "OVERTIME" banner — copyright considerations

**What goes wrong:**
Sarah ships the tool, screenshares it widely, and the visual is a pixel-perfect rip of Overwatch's banner — same wordmark, same red-and-yellow chevron, same custom typography. It's used as branding, not commentary. Blizzard's IP team is unlikely to care about a private tool, but if Sarah ever puts this on her portfolio, GitHub README, or shows it in a public stream, the banner is a trademark/copyright signal that's *not* hers.

**Why it happens:**
- "OVERTIME" the word isn't copyrightable, but the specific visual treatment (typography, colors, chevron, animation) is part of Overwatch's protected branding.
- Blizzard's fan-content policy allows non-commercial fan use *with attribution* and forbids derivative works that confuse the brand. A tool labeled "Overwatch-style" is fine; one that *looks like an actual Overwatch asset* is more fraught.
- Pulling Overwatch's actual font/PNG asset is clear copyright infringement. CSS-only recreation is mostly fine for personal use but still a brand-confusion concern.

**How to avoid:**
1. **CSS-only recreation** — no asset copying. Use a free, high-impact typeface (Bebek, Oswald Black, system bold-italic-condensed) sized large; layer with a tilted parallelogram background; stroke + drop-shadow for screenshare survival.
2. **Don't use the exact Overwatch colors verbatim.** Shift the hue/saturation slightly so it's *evocative*, not *replicating*. The README's intent is "aesthetic reference," not "exact clone."
3. **Don't ship the wordmark as the literal Overwatch wordmark** (the original has a stylized "OVER" with the iconic font). Use a different typeface. The vibe survives; the IP concern doesn't.
4. **For Sarah's personal use this is fine as-is.** If/when the tool goes public (portfolio, GitHub README screenshot, OSS), revisit. Sarah is the only audience for v1 per README, so this is a deferred concern.
5. **Don't credit it as "Overwatch OVERTIME banner"** in user-facing UI or repo README — just call it "overrun banner." Internal code comments referencing the inspiration are fine.

**Warning signs:**
- Side-by-side comparison with an actual Overwatch screenshot: if they look indistinguishable, it's too close.
- Using PNG/SVG assets from `overwatch.fandom.com` or Blizzard's site → don't.

**Phase to address:** Phase 4 (Visual polish). Treat as a 30-min design constraint, not a legal exercise; the README's "Overwatch-style" intent is correctly read as inspiration, not literal copy.

---

### Pitfall 10: "Max per person" UX — collapsing back to the parent slide

**What goes wrong:**
Sarah is on agenda item 1 ("Approve minutes — max 5 min per person") which has 3 sub-states (1a Sarah, 1b Teck Lee, 1c Solomon). She finishes 1b and presses →. Does she go to 1c, or to item 2? She presses Shift+→ — does she go to 1c or to 2? She clicks "1" in the sidebar — does she go to 1a or stay on 1b? She's on 1c, presses → — does she go to item 2, or get stuck because there's no 1d?

The PROJECT.md is explicit on the *keybinding* semantics (→ = next person then next item, Shift+→ = skip to next item) but the *visual* semantics are easy to get wrong: does the sidebar show 1a/1b/1c always expanded, or only when on item 1? Is the active sub-state highlighted differently from the active item?

**Why it happens:**
- Two-level navigation (item → sub-state) creates eight edge cases at the boundaries (first/last sub-state, first/last item, clicking item-level vs sub-level in sidebar, →/Shift+→/←/click).
- The default mental model — "each sub-state is just another slide" — fails because the *header* (item title, attribution) should stay constant across sub-states.

**How to avoid:**
1. **Write the navigation truth table** (write this down in the README or code comments):

   | Current location | Action | Result |
   |---|---|---|
   | 1a (first of 3) | → | 1b |
   | 1b (middle) | → | 1c |
   | 1c (last of 3) | → | 2 (next item) |
   | 1a | Shift+→ | 2 (skip remaining people) |
   | 1c | Shift+→ | 2 |
   | 1c | ← | 1b |
   | 1a | ← | previous item's *last* sub-state (or item itself if no sub-states) |
   | Click "1" in sidebar (while on 1b) | jump to 1a *and reset 1a's timer* |
   | Click "1a" in sidebar (while on 1b) | jump to 1a *and reset 1a's timer* |
   | Click "2" in sidebar (while on 1b) | jump to 2 (1's per-person states are preserved) |
   | Item 1 with only 1 person | renders as single sub-state, no expand-arrow in sidebar |
   | Item 1 with 0 people / no attribution | renders as normal item (no sub-states), Shift+→ behaves same as → |

2. **One slide layout, one timer bar — sub-state changes the timer and the attribution.** The item title and deadline don't reflow across sub-states; only the "Currently: Sarah" subtitle and the timer numerals change. This is what the PROJECT.md asks for ("one slide, advances Sarah → Teck Lee → Solomon").

3. **Sidebar expansion rule:** auto-expand the currently active item's sub-states; collapse others. User can override by clicking the chevron. Don't try to be clever — auto-expand-on-active is enough.

**Warning signs:**
- Press → from the last sub-state of the last item — does the app navigate off the end of the agenda? It shouldn't (no-op or wrap to start, document the choice).
- Press ← from 1a — does the app go to slide 0 (title slide), or to the previous item's last sub-state? Pick one and stick to it.

**Phase to address:** Phase 3 (Navigation). Build the truth table first, code from it second.

---

## Moderate Pitfalls

### Pitfall 11: Dark mode toggle flickers on load ("flash of wrong theme")
**Symptom:** App loads in light mode, then 200ms later snaps to dark.
**Cause:** Theme preference is read from localStorage after CSS has already applied a default.
**Fix:** Read `meeting-manager.v1.theme` in an *inline* `<script>` in `<head>` (before `<body>`) and set `document.documentElement.dataset.theme = "dark"` before render. CSS reads `[data-theme="dark"]` selectors.
**Phase:** Phase 4 (Visual polish).

### Pitfall 12: Drag-and-drop a .md file does nothing visible / triggers browser file-open
**Symptom:** User drops a markdown file on the page; the browser navigates away to display the raw file.
**Cause:** The default `dragover` and `drop` handlers on `document` allow browser to take over; must `e.preventDefault()` on both.
**Fix:** Listen on `document` for `dragenter`/`dragover` and always `preventDefault()`. Show a drop-zone overlay on `dragenter` so the user has visual confirmation. Read the file via `FileReader.readAsText(file)`.
**Warning signs:** Drop file → browser shows raw markdown in URL bar.
**Phase:** Phase 2 (Input methods).

### Pitfall 13: Browser zoom changes break the layout
**Symptom:** User zooms in (Ctrl+Plus) to make text more readable for an in-person meeting; sidebar overlaps slide content or timer bar disappears.
**Cause:** Fixed pixel widths instead of relative units; CSS that doesn't tolerate the 25% sidebar becoming `min(25%, 320px)` at zoom.
**Fix:** Use `clamp()` and CSS grid with `minmax()` for the sidebar/main split. Test at 100%, 125%, 150% zoom.
**Phase:** Phase 4.

### Pitfall 14: `performance.now()` is high-resolution but starts at 0 per document
**Symptom:** Comparing `performance.now()` values across reloads or between tabs is nonsense.
**Cause:** Each document has its own time origin.
**Fix:** Don't persist `performance.now()` values. Persist *durations* (already addressed in Pitfall 1, but worth restating).
**Phase:** Phase 2 (Persistence).

### Pitfall 15: Timer numerals "wiggle" because each digit has variable width
**Symptom:** As seconds tick down `49 → 48 → 47`, the digits shift left/right slightly. Distracting on screenshare.
**Cause:** Most fonts have proportional digits.
**Fix:** Apply `font-variant-numeric: tabular-nums;` to the timer element. One CSS property, big readability win.
**Phase:** Phase 4.

### Pitfall 16: `beforeunload` save fires but localStorage write was async
**Symptom:** Closing the tab during a fast meeting flow loses the last edit.
**Cause:** Misunderstanding — actually localStorage writes are synchronous. But debounced *autosave* may not have fired yet.
**Fix:** Force-flush autosave on `visibilitychange` (hidden) *and* `beforeunload` *and* `pagehide`. Use `pagehide` as the primary signal; `beforeunload` is unreliable on mobile (not relevant here but a habit).
**Phase:** Phase 2.

---

## Minor Pitfalls

### Pitfall 17: Sidebar scroll position resets when slide changes
**Symptom:** On a long agenda, clicking item 12 jumps to it but on next render the sidebar scrolls back to top.
**Cause:** Re-rendering the whole sidebar with `innerHTML = ...` loses scroll state.
**Fix:** Update sidebar items incrementally (toggle `.active` class), or save+restore `scrollTop`.
**Phase:** Phase 3.

### Pitfall 18: Copy-paste from Notion/Google Docs adds smart quotes that break parser
**Symptom:** Sarah copies an agenda from Notion. Em-dashes are correct but quotes are `"smart"`. Parser doesn't crash but title is rendered with mojibake on display.
**Cause:** Unicode normalization absent.
**Fix:** `text.normalize('NFC')` on intake; render through `textContent`, not `innerHTML`, so all unicode is safe.
**Phase:** Phase 1 (Parser).

### Pitfall 19: Title slide (slide 1, meeting admins) breaks the numbering
**Symptom:** Sidebar shows the first agenda item as "2" because the title slide is also indexed.
**Cause:** Indexing slides vs. agenda-items collision.
**Fix:** Keep two separate concepts: `slide[]` (includes title) and `agendaItem[]` (excludes title). Sidebar numbers agenda items 1..N; slide nav uses slide indices internally.
**Phase:** Phase 1 (Data model).

### Pitfall 20: Reset button resets the wrong thing
**Symptom:** R resets the current sub-state's timer, but user expected it to reset the whole item (1a + 1b + 1c).
**Cause:** Ambiguous semantics.
**Fix:** Pick one and document. Recommendation: R resets the *current sub-state's* timer only. Shift+R resets the entire item (all sub-states) — or omit Shift+R and document that clicking item-number in sidebar resets all sub-states.
**Phase:** Phase 3.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Use `setInterval(tick, 1000)` for the timer instead of rAF + `performance.now()` derivation | 5 lines of code instead of 20 | Drift; throttling; every restore/pause/edit feature becomes a workaround on top of broken state | Never (the timer *is* the product) |
| Skip the storage try/catch wrapper because "it works on my Chrome" | Saves 10 lines | App white-screens for any user on Firefox / Incognito / strict enterprise policy | Never |
| Skip parser fixtures, hand-test with one example agenda | Faster v1 | Every "weird" agenda Sarah writes is a silent failure | Only if a fixture file is added in Phase 2 before any real meeting use |
| Skip Pitfall 5 (typing-in-input guard) until a bug shows up | One less abstraction | Class-of-bugs that's confusing to repro; user loses trust | Never — it's 5 lines and prevents 10+ bugs |
| Combine slide state + sub-state in a flat array | Simple data model | Pitfall 10's truth table becomes ad-hoc and inconsistent | Never (use hierarchy: items[] → subStates[]) |
| Persist `startedAt: performance.now()` directly | Less math | Wrong on reload | Never |
| Use literal Overwatch font/PNG asset | Pixel-perfect look | Trademark exposure if tool ever shipped publicly | Only for private screenshots, never in committed code |
| Skip the duplicate-tab heartbeat | Less code | Silent state corruption when user double-double-clicks | Acceptable in v1 if the empty-state hint warns explicitly; revisit if Sarah hits it |

---

## "Looks Done But Isn't" Checklist

- [ ] **Timer:** Verify accuracy after 5-min alt-tab — does the display snap to the truth? (See Pitfall 1.)
- [ ] **Storage:** Verify the app loads cleanly in Firefox (no white screen, just a warning). (See Pitfall 2.)
- [ ] **Storage:** Verify rename/move handling — open from a different path, app doesn't error.
- [ ] **Parser:** Run the parser against a fixture file with all 10+ markdown variants. Every variant produces a sensible slide or an explicit error.
- [ ] **Parser:** Decimal durations (`7.5 min`) yield 7:30, not 7:00.
- [ ] **Keyboard:** Type "r" in the paste textarea — app does NOT reset.
- [ ] **Keyboard:** Press Space while focused on the time-edit input — app does NOT pause; input takes the space.
- [ ] **Overrun:** Pause, resume, ±60s, reset, navigate-away, navigate-back — all behave per the explicit table in Pitfall 6.
- [ ] **Restore:** Kill the tab mid-meeting, reopen — timer is paused at the right value, banner shown.
- [ ] **Sub-states:** Item with 1 person renders without an empty 1b/1c. Item with 0 attribution renders as a normal item.
- [ ] **Sub-states:** Press → from last sub-state of last item — no crash, deterministic landing.
- [ ] **Screenshare:** All text ≥ 24px, font-weight ≥ 500. OVERTIME banner has a contrast outline.
- [ ] **Drag-drop:** Drop a .md file — app reads it. Drop a .png — app rejects gracefully, no navigation.
- [ ] **Theme:** No flash of wrong theme on reload.
- [ ] **Timer display:** Digits use `tabular-nums` — numerals don't wiggle.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Timer drift discovered in production | MEDIUM | Rewrite to rAF + `performance.now()` (Pitfall 1); state shape change forces a one-time storage migration |
| Firefox user can't load the app | LOW | Add the try/catch wrapper + warning banner; ~30 min |
| Parser breaks on a new agenda variant | LOW | Add to fixture file, fix regex/rule; same-day turnaround |
| State corruption from duplicate tabs | MEDIUM | Add heartbeat detection; clear stale state on detected conflict |
| Restore-from-crash showed wrong elapsed time | LOW (if architecture is right) | Already mitigated by "always restore paused" rule (Pitfall 7); just ensure the rule is enforced |
| Discord viewers complain about blurry text | MEDIUM | Bump font weights/sizes via CSS variables; ~1 hour of style tuning + retest |
| Sub-state navigation got tangled | MEDIUM | Refactor to the navigation truth table (Pitfall 10) |
| Overwatch banner takedown / portfolio concern | LOW | Reskin the banner (different font, shifted hues); ~30 min |

---

## Pitfall-to-Phase Mapping

The roadmap should treat these as gates: a phase isn't done if its pitfalls aren't actively prevented.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Timer drift / throttling | Phase 1 (Timer engine) | 5-min alt-tab test passes; timer accuracy within 50ms over 10 minutes |
| 4. Parser edge cases | Phase 1 (Parser) | Fixture file with all 10+ variants parses without error or NaN |
| 18. Smart quotes / unicode | Phase 1 (Parser) | Notion-copied agenda renders correctly |
| 19. Title slide numbering | Phase 1 (Data model) | Sidebar item 1 = agenda item 1, not title slide |
| 2. `file://` storage / Firefox | Phase 2 (Persistence) | App loads in Firefox without white-screen |
| 3. Duplicate tab corruption | Phase 2 (Persistence) | Heartbeat detection or documented warning |
| 7. Reload restore | Phase 2 (Persistence) | Kill-tab-mid-meeting test produces paused-correct state |
| 12. Drag-drop default | Phase 2 (Input) | Drop .md works; drop .png is graceful |
| 16. Async autosave on close | Phase 2 (Persistence) | Force-flush on `pagehide` |
| 5. Typing-in-input guard | Phase 3 (Keyboard) | Type "r" in textarea — no reset |
| 6. Rapid clicks / overrun semantics | Phase 3 (Interactions) | Overrun semantics table behaviors all verified |
| 10. Sub-state navigation | Phase 3 (Navigation) | Navigation truth table behaviors all verified |
| 17. Sidebar scroll position | Phase 3 (Navigation) | Clicking item 20 keeps sidebar scroll context |
| 20. Reset ambiguity | Phase 3 (Interactions) | Reset behavior documented and consistent |
| 8. Discord screenshare quality | Phase 4 (Visual polish) | Real Discord screenshare test passes squint test |
| 9. Overwatch banner copyright | Phase 4 (Visual polish) | Banner is recognizable-style but not exact copy |
| 11. Dark mode flicker | Phase 4 (Visual polish) | Reload in dark mode — no flash |
| 13. Browser zoom | Phase 4 (Visual polish) | Layout intact at 100%, 125%, 150% zoom |
| 14. `performance.now()` cross-reload | Phase 2 (Persistence) | Already prevented by persisting durations not timestamps |
| 15. Timer digit wiggle | Phase 4 (Visual polish) | `tabular-nums` applied |

---

## Sources

**Timer accuracy and throttling**
- [Heavy throttling of chained JS timers beginning in Chrome 88 | Chrome for Developers](https://developer.chrome.com/blog/timer-throttling-in-chrome-88) — HIGH (official Chrome team)
- [Page Visibility API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) — HIGH
- [Why JavaScript timer is unreliable, and how can you fix it | Medium](https://abhi9bakshi.medium.com/why-javascript-timer-is-unreliable-and-how-can-you-fix-it-9ff5e6d34ee0) — MEDIUM
- [The Final Countdown — accurate countdown with JS | Medium](https://medium.com/@uriser/the-final-countdown-rendering-a-resilient-and-accurate-countdown-with-javascript-c3fff527f61) — MEDIUM
- [Why do browsers throttle JavaScript timers? | Read the Tea Leaves](https://nolanlawson.com/2025/08/31/why-do-browsers-throttle-javascript-timers/) — HIGH (Mozilla engineer)

**`file://` origin and localStorage**
- [Window: localStorage property - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) — HIGH
- [507361 - localStorage doesn't work in file:/// documents (Mozilla)](https://bugzilla.mozilla.org/show_bug.cgi?id=507361) — HIGH (Mozilla bug tracker)
- [Define behavior for file:// documents' origin (whatwg/html#3099)](https://github.com/whatwg/html/issues/3099) — HIGH (spec discussion)
- [Firefox localStorage: Why Local Files (file://) Fail](https://www.xjavascript.com/blog/does-localstorage-in-firefox-only-work-when-the-page-is-online/) — MEDIUM
- [SecurityError: localStorage is not available for opaque origins (jsdom#2308)](https://github.com/jsdom/jsdom/issues/2308) — MEDIUM
- [Storage quotas and eviction criteria - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) — HIGH

**Cross-tab localStorage**
- [Cross-Tab State Synchronization Using the storage Event | Medium](https://medium.com/@vinaykumarbr07/cross-tab-state-synchronization-in-react-using-the-browser-storage-event-14b6f1a97ea6) — MEDIUM
- [Document: visibilitychange event - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event) — HIGH

**Discord screenshare quality**
- [Discord Voice, Video, & Streaming Guide](https://support.discord.com/hc/en-us/articles/33030151293079-Discord-Voice-Video-Streaming-Guide) — HIGH (official Discord)
- [text on screenshare too blurry? Discord Facebook post on Better Text Readability](https://www.facebook.com/discord/posts/4165871226813909/) — HIGH (Discord official)
- [Discord Screen Share is Very Low Quality](https://support.discord.com/hc/en-us/community/posts/360055932211) — MEDIUM (Discord support community)
- [Discord Blurry Text and Video Quality | MiniTool](https://www.partitionwizard.com/partitionmagic/discord-blurry.html) — LOW
- [Adjust default screenshare settings (Vesktop#998)](https://github.com/Vencord/Vesktop/issues/998) — MEDIUM

**Overwatch trademark/copyright**
- [Blizzard Entertainment Logo and Trademark Guidelines](https://www.blizzard.com/legal/38fd0408-8431-469a-99bc-2cd9eb9462c8/blizzard-entertainment-logo-and-trademark-guidelines) — HIGH (official Blizzard legal)
- [Blizzard Copyright Notices](https://www.blizzard.com/en-us/legal/5515ca11-1c96-42a0-b853-e7876a0d19bf/copyright-notices) — HIGH

**Keyboard / contenteditable / input edge cases**
- [contenteditable attribute | HTML5 Doctor](http://html5doctor.com/the-contenteditable-attribute/) — MEDIUM
- [ContentEditable — The Good, the Bad and the Ugly | CKEditor](https://ckeditor.com/blog/ContentEditable-The-Good-the-Bad-and-the-Ugly/) — HIGH (CKEditor team)
- [How to disable arrow key in textarea | GeeksforGeeks](https://www.geeksforgeeks.org/how-to-disable-arrow-key-in-textarea-using-javascript/) — MEDIUM

**Domain experience**
- PROJECT.md and README.md for this project (agenda format, "max per person" semantics, screenshare context, single-file constraint).

---
*Pitfalls research for: single-file local HTML meeting-timer / agenda-presenter*
*Researched: 2026-05-16*
