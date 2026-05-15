# Feature Research

**Domain:** Solo-presenter meeting-running tool (Markdown agenda → timed slide deck on Discord screenshare)
**Researched:** 2026-05-16
**Confidence:** HIGH for table-stakes / anti-features (anchored in PROJECT.md + stagetimer.io conventions); MEDIUM for the niche / differentiator features (cross-referenced with comparable tools but not yet user-validated).

## Feature Landscape

### Table Stakes (Users Expect These)

Without these, the tool feels broken for the stated use case. Every one is either already in PROJECT.md's Active list or directly implied by it.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Markdown agenda parser tolerant of the exact format Sarah writes | Core value prop — "paste markdown → run a meeting". If paste fails, nothing else matters. | MEDIUM | Already in Active. Must tolerate `—` / `–` / `--` (PROJECT.md). See "parser quirk inventory" below — there are more variants worth handling than the three listed. |
| Marp-style slide rendering (one item per slide, large title, attribution subtitle, deadline badge) | Marp is the explicit aesthetic anchor; users expect "slides" not "a list with bigger text". | LOW | Already in Active. Inter / system sans, lots of whitespace, single accent color. |
| Per-slide countdown timer (`MM:SS remaining / MM:SS allocated`) | The literal reason this tool exists — the gap stagetimer/Marp don't fill together. | LOW | Already in Active. |
| Wrap-up colour cues: green → amber at 25% → red at 0 | This is the universal convention in stagetimer.io and every conference timer. Without it the timer feels amateurish. | LOW | Already in Active. 25% threshold matches stagetimer's "yellow stage" default behaviour. |
| Overrun = keep counting into negatives, never auto-stop | Best practice: presenter must *see* how far over they are. PROJECT.md explicitly chose this over auto-advance. | LOW | Already in Active. |
| Pause / play (Space) | Phone rings, someone interrupts, a tangent worth following — pausing is non-optional. | LOW | Already in Active. |
| ±1 min adjustment | Real meetings need bumpers. Every conference timer has it. | LOW | Already in Active. PROJECT.md uses `+` / `−`. |
| Click-to-edit current time | Sometimes the agenda lies — "actually this is a 10-min item, not 5". Inline edit is faster than re-pasting markdown. | LOW | Already in Active. Should also allow editing the *allocated* duration, not just remaining — see "flag" section. |
| Reset (R) | If you fumble the start, you need a zero-state. Universally expected. | LOW | Already in Active. |
| Advance to next slide (→) and previous (←) | PowerPoint/Reveal/Keynote all use arrow keys. Muscle memory. | LOW | Already in Active. |
| Number-key jump (1–9) | Reveal.js convention. Useful when an agenda item is skipped or re-ordered live. | LOW | Already in Active. |
| Clickable agenda sidebar with current-item highlight | Visual orientation for the presenter — "where am I?". | LOW | Already in Active. ~25% width. |
| Expandable sub-items for "max per person" (1a / 1b / 1c) | Direct from PROJECT.md's mental model — each person gets their own timer under one item. | MEDIUM | Already in Active. The expand/collapse interaction needs a default state choice — recommend: expanded by default for the current item, collapsed for the rest. |
| Click sidebar item → jump *and* reset that item's timer | PROJECT.md explicitly chose reset-on-click. Without it, navigation is destructive in a confusing way. | LOW | Already in Active. |
| Per-slide timer state preservation (navigate away & back → state restored) | If navigating wiped timer state, sidebar clicking and arrow-key navigation would be unusable mid-meeting. | MEDIUM | Already in Active. Each slide owns: `remainingMs`, `runState (running/paused/notStarted)`, `lastTickAt`. |
| Auto-save full state to localStorage | Browser crash mid-meeting is real. Stagetimer, Google Docs, Notion all do this — users now assume it. | MEDIUM | Already in Active. Save on every state change (debounced ~500ms is enough). |
| Drag-and-drop a `.md` file | Faster than paste for repeat use; standard pattern. | LOW | Already in Active. |
| Light mode default + dark mode toggle, persisted | Marp aesthetic = light. Some users prefer dark. Preference must survive reload. | LOW | Already in Active. |
| Title slide (slide 1) showing Meeting Admins block | PROJECT.md key decision: "make it slide 1". | LOW | Already in Active. |
| Visible empty-state when no agenda is loaded | A blank screen with no instructions is a broken experience. Need a "paste markdown here or drop a .md file" prompt. | LOW | **Implied but not explicit in PROJECT.md** — flagging. The textarea / drop zone IS this empty state. |
| Graceful handling of an empty / malformed paste | If the parser silently shows zero slides, the user thinks the tool is broken, not their markdown. | MEDIUM | **Not explicit in PROJECT.md** — flagging. See "Differentiators" for the richer version (inline error pointing to line number). |

### Differentiators (Competitive Advantage)

Where this tool can beat stagetimer / Marp / agenda by being more thoughtful than they are. None are strictly required for v1 but several are cheap and high-leverage.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Inline parser error with line number | When markdown is malformed, show "line 14: couldn't read duration — expected `— 5 min` after the title". Comparable tools either parse silently-broken or refuse to load. | MEDIUM | High value, low risk. Even a single error message like "no agenda items found, did you forget the numbered list?" is a step up from "blank screen". |
| Screen Wake Lock API while a timer is running | Discord screenshare does *not* reliably keep the screen awake (community-confirmed). Calling `navigator.wakeLock.request('screen')` while any timer is running prevents the screen blanking mid-meeting. | LOW | ~10 lines of code. Genuinely niche-but-high-value — none of the comparable tools do this. Release the lock when all timers are paused or the tab is hidden. |
| Optional chime at wrap-up (25%) and at zero | Stagetimer's "wrap-up colors and chimes" pattern. A short tone (Web Audio API, no asset file) when crossing thresholds. Off by default — Sarah is on screenshare and her audio may be live. | LOW | Toggle in the toolbar. Generate the tone in code (no MP3 needed → keeps single-file constraint clean). |
| "Overwatch" OVERTIME banner already in PROJECT.md — but make it animated (subtle scan-line / pulse) | PROJECT.md asks for the Overwatch styling; the static version works, the pulsing version is unmistakable on a low-bitrate Discord screenshare. | LOW | CSS animation, no JS. Important: keep it 1–2Hz max — fast flashing risks accessibility / streaming compression artifacts. |
| "Total meeting" running clock in the timer bar | Most agendas drift. A second readout showing `elapsed / total-allocated` for the *whole meeting* lets the presenter know they're 4 min over at item 3 of 9, before they reach the end. | LOW | Sum of all per-item elapsed times vs sum of allocated. One extra line in the timer bar. |
| Smart paste: handle the agenda being pasted with leading/trailing whitespace, smart-quotes, BOM, CRLF | Real Markdown comes from Notion / Apple Notes / Google Docs / VS Code — each does subtly different things. | LOW | Normalize in the parser: trim, replace smart quotes if needed, strip BOM, collapse `\r\n`. |
| Sidebar shows actual elapsed time vs allocated for completed items (green if on time, red if overran) | Lightweight retrospective — at item 7 you can see at a glance "we overran items 2 and 5". | MEDIUM | Requires tracking per-item elapsed, not just remaining. Easy if state model includes both `elapsedMs` and `allocatedMs`. |
| Compact "presenter HUD" mode (hide sidebar with a key, e.g. `H`) | If the sidebar gets in the way during a particularly slide-heavy item, toggle it off. Reveal.js convention is `B`/`,` for blank. | LOW | Toggle CSS class on root. Persist in localStorage. |
| Confirm-on-reload-only-when-running | If the user accidentally hits Ctrl+R or closes the tab mid-timer, the `beforeunload` handler prompts. If no timer is running, no prompt (don't be annoying). | LOW | Standard pattern. |
| "Skip" sub-state without losing time (Shift+→ already covers this for "person absent" case) | PROJECT.md already has Shift+→. The differentiator is making it obvious in the UI — e.g. a tiny "skip" button on each sub-item in the sidebar. | LOW | Already half-built; adding the visible affordance is the differentiator. |
| Export current state to clipboard as "post-meeting summary" markdown | After the meeting: copy a markdown block showing actual vs allocated for each item, who overran, total time. Sarah can paste that into the meeting notes. | MEDIUM | Doesn't break the "no exports" out-of-scope rule the same way as PDF/PPTX — it's just markdown-out, and matches the markdown-in philosophy. **Flag for user — this might overlap with their Out-of-Scope "exports" rule, worth confirming.** |
| Quick-help overlay on `?` | Standard convention (Reveal.js, GitHub, Gmail). Lists all keyboard shortcuts. Removes the need for a manual. | LOW | Static modal triggered on `?` or `Shift+/`. |
| Per-person attribution rendered visibly on each "max per person" sub-state | When slide 1b is showing, the slide says "Teck Lee — 5 min" not just "5 min". So the presenter and viewers know whose turn it is. | LOW | **Implied by PROJECT.md's mental model but worth making explicit.** |

### Anti-Features (Commonly Requested, Often Problematic)

Features that look reasonable but would break the tool's identity or violate constraints. Most are already in PROJECT.md's Out of Scope — listing here makes the *why* explicit for future scope-creep resistance.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Auto-advance when timer hits zero | "It would save me from having to press →" | Hides overrun. Meetings overrun for *reasons* — the presenter must see and decide. Already an explicit PROJECT.md decision. | Visible OVERTIME banner; presenter advances when ready. |
| In-tool agenda editing (rich-text or even textarea-edit) | "I noticed a typo, fix it inline" | Two sources of truth (the .md file and the in-tool state). Diverges fast. Already in PROJECT.md Out of Scope. | Edit the `.md`, drop it back in. The auto-save on the *tool* state remains, but the agenda content is one-way: markdown → tool. |
| Multi-user / shared timer / "audience view" | "Stagetimer does this" | Requires a server. Violates the local-file constraint hard. Already Out of Scope. | Screenshare is the shared view. |
| Auth, accounts, cloud sync | "I want my agendas on multiple machines" | Requires a backend. Tool stops being a double-clickable HTML. | The .md file IS the sync mechanism — store it in Dropbox/iCloud/Drive. |
| Mobile/touch UI | "What if I want to run a meeting from my phone" | Discord screenshare from a phone is not the use case. Optimising for it compromises the desktop layout. Already Out of Scope. | Desktop-only. |
| Speaker notes panel | "PowerPoint has them" | Sarah is *alone* on screenshare — there's no second monitor for a private speaker-notes view. The notes would either be visible to the audience (defeats purpose) or require popping a window (complexity). Already Out of Scope. | The markdown itself can carry context; if needed, use a second tab/window with the source `.md` open. |
| PDF / PPTX export | "I want to share the slides afterwards" | The agenda *is* markdown. Re-sharing the .md or a screenshot is enough. PDF export pulls in a renderer and breaks single-file constraint. Already Out of Scope. | Share the .md. (See differentiator: post-meeting summary markdown is a lighter alternative if requested.) |
| Animations / transitions between slides | "Marp can do reveals" | This is a *meeting tool*, not a deck for an external audience. Animations slow the presenter and waste screenshare bandwidth. Already Out of Scope. | Hard cuts. |
| Calendar integration / auto-import meeting invites | "Pull the agenda from my calendar" | Requires APIs, auth, OAuth. Violates local-only constraint. Already Out of Scope. | Paste / drag .md. |
| Live audience interaction (polls, Q&A submission) | "Mentimeter has it" | Wrong product. Mentimeter exists for that. This tool is for *running* the meeting, not for engaging the audience. | Out of category. |
| Webcam / mic overlay | "PowerPoint Presenter Coach has this" | Discord already shows the user's camera in its own panel. Doubling it in the tool is redundant. | Use Discord's overlay; keep the tool focused on agenda + timer. |
| Adjustable timer "skin" or themes beyond light/dark | "Power users want customisation" | Decision fatigue, code bloat, more state to persist. PROJECT.md picked Marp + Overwatch on purpose. | Light + dark. That's it. If the user really wants different colours, they can edit the CSS — the single-file constraint makes that trivial. |
| Sound effects for every action (slide change, click, etc.) | "Stagetimer plays a tick" | Audio routing on Discord screenshare is a mess — system sounds may or may not pass through depending on how the user has Discord configured. Risk of broadcasting unwanted sound to the meeting. | Only the optional wrap-up chime, off by default. |
| Auto-pause on tab blur / window unfocus | "The meeting should pause if I tab away" | The presenter often switches tabs (to share a doc, to check Slack) — they want the timer to *keep running* because the meeting is still happening. | Don't auto-pause. Wake Lock + manual pause is enough. |

## Feature Dependencies

```
Markdown parser (tolerant, with line-numbered errors)
    └──requires──> Agenda data model (items, sub-items, durations)
                       └──requires──> Slide renderer (1 item per slide, sub-states per person)
                                          └──requires──> Sidebar (numbered list reflects parsed structure)
                                          └──requires──> Per-slide timer state map
                                                             └──requires──> localStorage auto-save
                                                                                └──requires──> State schema versioning (so old saves don't crash new builds)

Timer engine (tick, pause, ±1 min, reset)
    └──requires──> Wrap-up colour cues (consumes timer's % remaining)
    └──requires──> OVERTIME overrun visual (consumes timer's sign)
    └──enhances──> Optional chime (consumes wrap-up + zero thresholds)
    └──enhances──> Screen Wake Lock (active while any timer running)

Keyboard handlers (Space, ←, →, Shift+→, 1–9, R, +, −)
    └──requires──> Focus management (don't trigger shortcuts while typing in the paste textarea or click-to-edit field)

Click-to-edit time
    └──conflicts──> Keyboard handler for digits (1–9 jump) — need a "is the user editing?" guard

Dark mode toggle
    └──conflicts──> OVERTIME red overlay must remain readable in both modes — test both
```

### Dependency Notes

- **Parser → everything.** Get this right first or every downstream feature is mis-anchored. The parser's *tolerance* (em-dash / en-dash / `--`, smart quotes, BOM, CRLF, blank-line variants) is the single biggest determinant of "does this feel polished?".
- **localStorage requires schema versioning.** Even though it's v1, write the saved state as `{ version: 1, ... }`. When you change the schema, you can detect old data and discard it cleanly rather than crashing on a stale load.
- **Keyboard handlers must respect focus.** If the user is typing into the paste textarea or click-to-edit field, digits, Space, and arrows must NOT trigger shortcuts. Standard pattern: ignore keydown if `event.target` is `<input>` / `<textarea>` / `contenteditable`.
- **Click-to-edit ↔ digit-jump conflict.** While editing time, "1" should type "1", not jump to slide 1. The focus guard above handles this.
- **Wake Lock requires user gesture on first acquire** in some Chromium versions. Acquire on first timer start (a user click), not on page load.
- **OVERTIME visual + dark mode.** The full-screen red tint at low opacity over a dark slide can look brown. Use a different overlay (red border + banner) in dark mode if pure tint reads badly.

## MVP Definition

### Launch With (v1) — matches PROJECT.md Active list, with two additions

Everything in PROJECT.md's Active list is genuinely table-stakes; the list is already well-scoped. The MVP additions below are the ones a real user will trip on within the first 10 minutes of use.

- [ ] All items currently in PROJECT.md's Active list (parser, slides, sidebar, timer, persistence, drag-and-drop, light/dark, keyboard shortcuts)
- [ ] **Empty-state UI** with clear instructions when no agenda is loaded — essential or first-run feels broken
- [ ] **Inline parser error** with at least a one-line "couldn't parse — check line X" message — essential or malformed-markdown failures are silent and frustrating
- [ ] **`beforeunload` confirmation while a timer is running** — essential or Ctrl+R during a meeting silently wipes state (even with auto-save, mid-tick reload is jarring)
- [ ] **Per-person attribution visible on each sub-state slide** (e.g. "Teck Lee — 5 min" not just "5 min") — essential or the audience can't tell whose turn it is

### Add After Validation (v1.x)

Cheap, high-leverage features to add once core is proven. Each one is small and additive — none require architectural changes.

- [ ] **Screen Wake Lock** while a timer is running — trigger: any time Sarah's screen blanks mid-meeting (a real Discord pain point)
- [ ] **Optional chime** at 25% and 0 (off by default) — trigger: user requests audible cue, or asks for an option to disable system-sound risk
- [ ] **Quick-help overlay on `?`** — trigger: anyone other than Sarah uses the tool
- [ ] **Total-meeting elapsed/allocated clock** in the timer bar — trigger: first time Sarah wants to know "how far over am I overall?"
- [ ] **Sidebar shows elapsed-vs-allocated per completed item** — trigger: same as above; if she wants per-item retrospective during the meeting
- [ ] **Compact HUD mode (hide sidebar with `H`)** — trigger: first time the sidebar gets in the way

### Future Consideration (v2+)

Defer until product-market fit. These either widen scope or introduce features that should be validated cautiously.

- [ ] **Post-meeting summary export to clipboard (markdown)** — defer because it overlaps with the explicit "no exports" Out-of-Scope rule; needs user sign-off before implementing
- [ ] **Animated OVERTIME banner (pulse / scanline)** — defer because static red + banner may already be enough; animate only if real screenshare tests show it's missed
- [ ] **Per-item notes** (markdown-rendered description below the title) — defer until Sarah asks; risks bloating slides

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Markdown parser (tolerant, with the documented variants) | HIGH | MEDIUM | P1 |
| Slide renderer (Marp aesthetic) | HIGH | LOW | P1 |
| Per-slide timer with wrap-up colours and overrun | HIGH | LOW | P1 |
| Sidebar with click-to-jump, current-item highlight, sub-item expand | HIGH | MEDIUM | P1 |
| Per-slide timer state preservation | HIGH | MEDIUM | P1 |
| localStorage auto-save (with schema version) | HIGH | LOW | P1 |
| Keyboard shortcuts (Space, ←, →, Shift+→, 1–9, R, +, −) | HIGH | LOW | P1 |
| Drag-and-drop `.md` import | MEDIUM | LOW | P1 |
| Light/dark mode toggle + persist | MEDIUM | LOW | P1 |
| Empty-state UI | HIGH | LOW | P1 |
| Inline parser error message | HIGH | LOW | P1 |
| `beforeunload` confirm while timer running | MEDIUM | LOW | P1 |
| Per-person attribution shown on sub-state slide | HIGH | LOW | P1 |
| Quick-help overlay on `?` | MEDIUM | LOW | P2 |
| Screen Wake Lock during timer | HIGH | LOW | P2 |
| Optional chime (off by default) | MEDIUM | LOW | P2 |
| Total-meeting elapsed clock | MEDIUM | LOW | P2 |
| Sidebar elapsed-vs-allocated indicator per item | MEDIUM | MEDIUM | P2 |
| Compact HUD mode (hide sidebar) | LOW | LOW | P2 |
| Post-meeting summary clipboard export | MEDIUM | MEDIUM | P3 |
| Animated OVERTIME banner | LOW | LOW | P3 |
| Per-item notes / description rendering | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch (table stakes + critical UX guards)
- P2: Should have soon after launch (cheap differentiators)
- P3: Nice to have, validate first

## Parser Quirk Inventory (Specific to This Domain)

Real-world Markdown for this format will arrive with these variations. The parser should tolerate all of them silently — error reporting only fires when nothing in this list can rescue the line.

| Quirk | Example | Where it comes from | Handling |
|---|---|---|---|
| Em-dash separator | `Item title — 5 min` | macOS auto-correct, manual typing on Mac | Already in PROJECT.md |
| En-dash separator | `Item title – 5 min` | Pasted from Apple Notes, Word | Already in PROJECT.md |
| Double-hyphen separator | `Item title -- 5 min` | Plain-text editors that don't auto-correct | Already in PROJECT.md |
| Single-hyphen separator | `Item title - 5 min` | Common, especially on Windows | **Flag — not in PROJECT.md, recommend supporting** (with a higher false-positive risk because `- ` is also a list bullet — only match when followed by `\d+\s*(min|m|minutes)`) |
| Smart quotes around names | `"Sarah"`, `"Teck Lee"` | Notion, Apple Notes, Google Docs | Normalize `"`, `"`, `'`, `'` → straight quotes before parsing |
| BOM at start of file | U+FEFF (zero-width no-break space) at byte 0 | Windows Notepad UTF-8 saves | Strip on input |
| CRLF line endings | `\r\n` | Any Windows-edited file | Normalize to `\n` |
| Trailing whitespace on lines | `5 min   ` | Pasted from rich editors | Trim each line before matching |
| Mixed list markers | `1.`, `1)`, `* ` | Different markdown flavours | Match any common ordered/unordered marker |
| Bullet sub-items vs numbered sub-items for "max per person" | `- Sarah: 5 min` vs `1.1 Sarah — 5 min` | User preference | Pick one and document; tolerate the most likely alternative |
| "5 minutes" / "5min" / "5 m" / "5" | Real human variation | Manual typing | Accept any of these for duration; reject only if no number at all |
| Deadline phrase variation | `due: Friday`, `by Friday`, `deadline: Fri` | Manual typing | If `deadline` parsing is keyword-based, accept multiple keywords; if it's positional, document the rule |
| Blank lines between items | 0, 1, or 2 blank lines | User preference | Tolerate any |
| Trailing punctuation on title | `Item title. — 5 min` | Manual typing | Strip during display, or just render as-is |

## Competitor Feature Analysis

| Feature | FMJansen/agenda (slides) | meetingtimer.eu (timer) | stagetimer.io (timer, paid) | Marp (slides) | Our Approach |
|---------|---|---|---|---|---|
| Markdown agenda input | yes | no | no | yes (markdown-it) | yes — tolerant parser of Sarah's specific format |
| Per-item countdown timer | no | yes (single) | yes (multi-room) | no | yes — per slide, state persisted |
| Clickable sidebar | minimal | no | partial (controller view only) | none | yes — full agenda, click-to-jump-and-reset |
| Wrap-up colour cues | n/a | yes | yes (green/yellow/red) | n/a | yes — amber at 25%, red at 0 |
| Overrun behaviour | n/a | counts up | counts up + chime | n/a | counts up + OVERTIME banner + full-tint |
| Audible chime | n/a | optional | optional | n/a | optional, off by default (screenshare audio risk) |
| Local-only / offline | yes | no (web) | no (web, paid) | yes (CLI/VS Code) | yes — single double-clickable HTML |
| Discord-friendly | indirectly | indirectly | indirectly | indirectly | direct — designed for it (Wake Lock, large fonts, high contrast) |
| Cost | free | free | paid | free | free, local |
| Multi-presenter / cloud sync | no | no | yes | no | **deliberately no** (anti-feature) |

## Flags for PROJECT.md

These are features the user should confirm or revise in their Active list:

- **Single-hyphen separator (`- `) between title and duration** — not in PROJECT.md, but realistically present in user-written markdown. Recommend adding (with the `\d+\s*(min|m|minutes)` lookahead to avoid colliding with list bullets). LOW risk.
- **Inline parser error with line number** — not in Active list. Without it, malformed paste = silent blank screen. Recommend P1.
- **Empty-state UI** — implied (the paste textarea is the empty state) but worth making explicit so it gets designed rather than defaulting to an unstyled `<textarea>`.
- **`beforeunload` confirmation while a timer is running** — auto-save covers data loss, but mid-tick reload still disrupts the meeting visibly on screenshare. Recommend P1.
- **Per-person attribution rendered on each sub-state slide** — implied by the "max per person" mental model but not explicit; without it the audience can't tell whose turn it is. Recommend P1.
- **Editing *allocated* duration** (not just remaining) via click-to-edit — PROJECT.md says "click-to-edit time" but doesn't disambiguate. Recommend allowing both, with a clear visual distinction.
- **Screen Wake Lock** — niche but high-value; comparable tools don't do this, and Discord screenshare confirmed to not reliably keep the screen awake. Recommend P2 (cheap to add post-launch).
- **Post-meeting summary clipboard export** — overlaps with the explicit "no exports" Out-of-Scope rule. Listed as a future P3 but the user should confirm whether "no exports" was meant to include this lightweight markdown-out variant.

## Sources

- [Stagetimer features overview](https://stagetimer.io/features/) — wrap-up colours, chimes, flash cues (conference-timer convention)
- [Stagetimer: Free Online Timer with Wrap-up Colors and Chimes](https://stagetimer.io/blog/free-online-timer-with-wrap-up-colors-and-chimes/) — the green/yellow/red + optional chime pattern is the industry default
- [Stagetimer docs: Using Timers](https://stagetimer.io/docs/using-timers/) — wrap-up actions (sound + flash) at threshold timestamps
- [Slido: four methods to prevent overruns](https://medium.com/@Slidoapp/did-your-presenters-speak-too-long-here-are-four-methods-to-prevent-overruns-bcbd772ed600) — show "Time Up" and keep counting; escalating beeps as an option
- [Reveal.js keyboard shortcuts](https://defkey.com/reveal-js-shortcuts) — arrow-key navigation, `S` speaker view, `B` blank, `?` help convention
- [Reveal.js Keyboard config](https://revealjs.com/keyboard/) — Space default binding behaviour
- [Marpit Markdown spec](https://marpit.marp.app/markdown) — CommonMark base, `---` ambiguity with em-dashes
- [Beautiful.ai: Best font size for presentations](https://www.beautiful.ai/blog/what-font-size-is-best-for-presentations) — 36–60pt titles, 18–24pt body for screenshare-readability targets
- [Autoppt: Minimum font size best practices](https://autoppt.com/blog/powerpoint-minimum-font-size-best-practices/) — confirms body min 18–24pt, titles 36–44pt
- [Discord support: Screenshare overriding monitor sleep](https://support.discord.com/hc/en-us/community/posts/360050245111-Screenshare-in-Discord-should-override-monitor-sleep-settings-in-Fullscreen-mode) — community-confirmed: Discord screenshare does NOT reliably keep the screen awake; Wake Lock from the tool side is genuinely useful
- [javascript.info: localStorage](https://javascript.info/localstorage) — persistence semantics; cross-tab considerations
- [DEV: Autosave works. Until it doesn't.](https://dev.to/plc-creates/autosave-works-until-it-doesnt-2l3i) — recommends versioned schema and debounced writes
- [MDXEditor error handling](https://mdxeditor.dev/editor/docs/error-handling) — pattern for surfacing parser errors with the offending source
- PROJECT.md (this repo) — anchoring document for Active / Out-of-Scope / Key Decisions

---
*Feature research for: Solo-presenter Markdown-agenda → timed slide deck tool, screenshare-on-Discord use case*
*Researched: 2026-05-16*
