# Prompt for Codex / Claude Code: redesign Meeting Manager

Copy everything below the `---` and paste into Codex/Claude Code at the repo root.
The current `meeting-manager.html` is the single source of truth for behavior; replace
its visual treatment with the spec below.

---

Refactor `meeting-manager.html` so it looks calm, modern, and intentional instead of
generic Bootstrap-blue. Keep every existing behavior — markdown parsing, agenda data
model, timer keys, localStorage persistence, sample fixture, keyboard nav, theme
toggle, file-drop, error reporting. Do not change parser output or storage keys.

The file should remain a single self-contained HTML, no build step. React + Babel
in-browser is fine, but the existing vanilla implementation is also fine — just
restyle and re-lay-out it.

## Design system

Light theme (default):
```
--paper:        #F7F8FB
--paper-2:      #EEF1F6
--ink:          #0E1626
--ink-2:        #1E2940
--muted:        #5D6779
--faint:        #9AA3B6
--line:         #DDE2EC
--line-strong:  #C4CCDB
--accent:       #2257D6
--accent-soft:  #D9E3F7
--good:         #1F7A4D
--warn:         #A16B00
--bad:          #B03A2E
```

Dark theme — keep the existing dark variables but rebalance to match:
```
--paper:#0C1220  --paper-2:#131A2B  --ink:#E8ECF5  --ink-2:#C8CEE0
--muted:#8F97AB --faint:#5E667C --line:#22293B --line-strong:#303A52
--accent:#6C9CFF --accent-soft:#1C2C54
--good:#5FBE8E --warn:#D4A046 --bad:#E07A6F
```

Fonts (Google Fonts):
- UI sans + **numerals/timer** (with `font-variant-numeric: tabular-nums`): **Inter Tight** 400/500/600/700
- The markdown textarea uses Inter Tight too (13.5px, weight 500, line-height 1.5). Avoid mono fonts here — they read worse than sans at this size.
- Title face is configurable (see Tweaks). Default: Inter Tight 700.

Treat all body copy as Inter Tight 500. Tabular numerals on every numeric column.

## Layout

Two-pane: 320px sidebar (`--paper-2` bg) + main stage (`--paper` bg).

**Sidebar, top to bottom:**
1. Header: just the wordmark "Meeting Manager" at 14px / weight 600 (no logo). 20px padding.
2. Collapsible "Agenda Source" section — caret + uppercase label, contains the
   monospace textarea, "Load agenda" (primary) and "Sample" (ghost) buttons, and
   parse errors stacked below in a `--bad`-tinted box.
3. Collapsible "Agenda" section — uppercase label on left, total duration ("11.5 min")
   right-aligned in `--faint`. Body is a list of agenda rows:
   - Each row is a button: `[number/letter, mono, --faint when inactive / --accent when active]
     [title + meta two-line stack, flex 1]  [duration right-aligned, fixed 56px width]`
   - Active row: `--accent-soft` background, 10px radius, no transition (avoid flicker).
   - Sub-items indent paddingLeft 44 and use letters a/b/c instead of numbers.
   - Bookend rows: "— Title" at the top, "✓ Complete" at the bottom.

**Main stage, top to bottom:**
1. **Top strip** (header, padding 20px 36px, border-bottom):
   - Left: sidebar toggle icon button, then an uppercase eyebrow showing
     "Pre-meeting" / "Wrap" / `Slide N of M`.
   - Right: prev/next arrow icon buttons, a vertical hairline, live wall clock
     in mono `h:mm:ss AM`, theme toggle.
2. **Stage** (flex 1, min-height 0, vertical-center, padding `clamp(28px,4vh,64px) clamp(40px,6vw,120px)`):
   - Eyebrow in `--accent`, uppercase, 12px, letter-spacing 0.14em.
   - **h1** in the chosen title font:
     - Title slide: meeting title, `clamp(48px, 10vh, 112px)`.
     - Agenda slide: item or sub-item name, `clamp(44px, 9.5vh, 108px)`. `text-wrap: balance`.
     - Complete slide: "Meeting complete.", same as title.
   - Below the h1 on agenda slides, present attribution names in `--muted`,
     `clamp(18px,2.6vh,26px)`, joined with " · ".
   - Below that, badges row:
     - Duration pill in `--accent-soft` bg + `--accent` text + leading dot.
     - "by H:MM PM" pill with a small clock icon.
     - "max per person" pill in `--muted` when the item is a per-person item.
   - On title slide, show admins as a horizontal list of role/value pairs
     (role 12px uppercase muted; value 22px medium ink), then `4 items` and
     `11.5 min total` outlined pills.
3. **Timer footer** (border-top, 16px 28px 18px, flex row):
   - Circular ring: 156px, stroke 5, light grey track, colored arc growing clockwise
     from 12. Color = `--good` (>20%), `--warn` (≤20%), `--bad` (over time).
   - Inside the ring: mono remaining time at 36px, then "/ 02:00" in `--faint` at 10px.
   - Right side: state pill ("Running" + pulsing dot / "Almost up" / "Over time" / "Paused"),
     followed by control buttons: Start/Pause (primary, black), `−1 min`, `+1 min`,
     **`Speak time`** (uses `window.speechSynthesis` to read the remaining time aloud;
     do NOT change the timer value), `Reset`. All buttons `white-space: nowrap`.
4. On title and complete slides there is no timer — replace the footer with a single
   primary CTA ("Start meeting →" / "Start over") on the right and a muted helper line
   on the left.

## Tweaks (in-page panel)

A floating "Tweaks" panel in the bottom-right (toggleable). Controls:
- **Accent** — swatch picker. Values: `#2257D6`, `#0B6EAB`, `#3D52B5`, `#0E1626`, `#11833F`.
  Sets `--accent` and recomputes `--accent-soft` if you want it harmonized.
- **Title font** — select with values:
  - `inter-tight` → Inter Tight 700, tracking -0.025em (default)
  - `instrument-serif` → Instrument Serif 400, -0.02em
  - `dm-serif` → DM Serif Display 400, -0.015em
  - `newsreader` → Newsreader 500, -0.02em
  - `fraunces` → Fraunces 500, -0.025em
- **Dark mode** — toggle. Sets `document.documentElement.dataset.theme`.
- **Show wall clock** — toggle.
- **Ring timer** — toggle. When off, render the timer as a horizontal progress
  bar above a 72px mono "remaining / duration" row in the footer.

## Behavior, unchanged

- Parse markdown per the existing grammar. Title from `# Heading`. Admins from
  `**Meeting Admins**` block (`- **Role:** Value`). Agenda items from `**Agenda**`
  ordered list: `<title> (<names>) - <N> min [max per person] [by H:MM AM/PM]`.
  Sub-items either come from `max per person` (one per name, equal duration) or
  from an inline sublist where each `- Name - N min` line specifies a sub-duration.
- **Auto-fill missing deadlines.** Walk items in order:
  • If an item has an explicit `by H:MM PM`, sync the running clock to it.
  • If not, advance the running clock by the item's duration and synthesize a deadline.
  • If NO items have explicit deadlines, start the running clock at "now"
    rounded up to the next 5 minutes.
  • For items with sub-items, derive per-sub end times: parent_start =
    parent_end - parent_duration, then add each sub's duration cumulatively.
  Render computed deadlines identically to explicit ones (no visual marker).
- Slide order: Title → each agenda item (with its sub-items expanded as their
  own slides after the parent overview) → Complete.
- Timer keys are stable per slide and per sub-item; per-key remaining time
  survives reload via localStorage.
- Keyboard: ← / → / ↑ / ↓ or j/k for slides, Space toggles run/pause, R resets the current
  timer, `[` toggles the sidebar. Disable shortcuts while focus is in a text input.
- Pause the timer whenever the slide changes.
- "Speak time" speaks `"<mins> minute(s) and <secs> second(s) remaining"`,
  or `"... over time"` when negative.

## Don't do

- No emoji except `✓` in the Complete sidebar row.
- No drop shadows on cards. Only the very subtle one on the Tweaks panel.
- No transitions on the active-row background — they flicker on rapid slide changes.
- No icons for every metadata pill; one clock icon on the deadline pill is the limit.
- No gradient backgrounds. No rounded-corner-with-left-border cards.
- No "AI generated" tropes.

## File structure (suggested)

Keep a single HTML file, but inline JSX broken into three Babel scripts in this
order: parse → components → app. Each script wraps its top-level identifiers in
an IIFE so React hook destructures don't collide.

Verify visually:
1. Title slide renders without overlap at viewport heights down to 540px.
2. Sidebar duration column right-aligns across all rows including sub-items.
3. Active sidebar row matches the visible stage slide at all times.
4. Tweaks panel persists choices to the EDITMODE block via the host protocol.
