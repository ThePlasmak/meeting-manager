# Handoff: Meeting Manager

## Overview

Meeting Manager is a single-page app that turns a markdown agenda into a slide-by-slide
"meeting cockpit": one slide per agenda item, a per-item countdown ring/timer, live wall
clock, computed deadlines, keyboard nav, and a Tweaks panel for in-page customization
(accent color, title font, dark mode, ring vs. flat timer).

The full behavioral spec for the redesign already lives in **`PROMPT-FOR-CODEX.md`** —
read that first. This README provides the bundled-file inventory, fidelity context, and
implementation notes so a developer can pick up where the design left off.

## About the Design Files

The files in this bundle are **design references created in HTML** — a working prototype
showing intended look and behavior, not production code to ship as-is. The task is to
**recreate this design in the target codebase's existing environment** (React, Vue,
SwiftUI, native, etc.) using its established patterns, libraries, and conventions. If
no environment exists yet, choose the most appropriate framework for the project and
implement the design there.

The HTML/JSX in this bundle uses in-browser Babel + React 18 (no build step). That's
fine for a prototype, but you should not preserve the in-browser-Babel structure in
production — port the components into a real build pipeline.

## Fidelity

**High-fidelity.** Colors, typography, spacing, timer math, parser grammar, keyboard
shortcuts, and the Tweaks protocol are all final. Recreate the UI pixel-perfectly,
adapted to whatever component primitives and styling conventions the target codebase
already uses.

## Files in this bundle

| File                   | Role                                                                                                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `meeting-manager.html` | Entry point. Loads fonts, declares CSS variables (light + dark theme tokens), declares the `__TWEAK_DEFAULTS` JSON block, and mounts the React app.                         |
| `parse.jsx`            | Markdown → agenda model. Pulls title, admins block, agenda items, sub-items, durations, and explicit/computed deadlines. Exposes `window.parseAgenda`.                      |
| `components.jsx`       | UI components: `Badge`, `Sidebar`, `AgendaList`, `Stage`, `TimerRing`, `FlatTimer`, `EditableTime`, `FitText`, `LiveClock`, `PrimaryAction`, etc. Exports them to `window`. |
| `app.jsx`              | App shell: state, persistence, rAF timer tick, countdown sounds (Web Audio), TTS, keyboard handlers, slide nav, sidebar resize, drag-drop import. Mounts `<App />`.         |
| `tweaks-panel.jsx`     | The Tweaks panel + `useTweaks` hook used by the host.                                                                                                                       |
| `PROMPT-FOR-CODEX.md`  | The original design spec — colors, fonts, layout, behavior, Tweaks. Authoritative.                                                                                          |

## Design Tokens

Light theme (default) — declared in `meeting-manager.html` as CSS custom properties on `:root`:

```
--paper:        #F7F8FB    page bg
--paper-2:      #EEF1F6    sidebar bg, hovers
--ink:          #0E1626    primary text, primary button bg
--ink-2:        #1E2940    secondary text
--muted:        #5D6779    metadata
--faint:        #9AA3B6    inactive numerals, "/ 02:00" duration
--line:         #DDE2EC    hairlines
--line-strong:  #C4CCDB    button borders
--accent:       #2257D6    eyebrow, active-row, accent pill
--accent-soft:  #D9E3F7    accent pill bg, active-row bg
--good:         #1F7A4D    timer ring while >20% remaining
--warn:         #A16B00    timer ring while ≤20%
--bad:          #B03A2E    timer ring once over time
```

Dark theme — `html[data-theme="dark"]`:

```
--paper:#0C1220   --paper-2:#131A2B  --ink:#E8ECF5  --ink-2:#C8CEE0
--muted:#8F97AB  --faint:#5E667C    --line:#22293B --line-strong:#303A52
--accent:#6C9CFF --accent-soft:#1C2C54
--good:#5FBE8E   --warn:#D4A046     --bad:#E07A6F
```

The accent is also overridable at runtime via the Tweaks panel; valid values:
`#2257D6` (default), `#0B6EAB`, `#3D52B5`, `#0E1626`, `#11833F`.

**Shadow** (only used on the Tweaks panel itself — no cards have shadows):
`0 1px 0 rgba(14,22,38,.04), 0 12px 32px -16px rgba(14,22,38,.18)`

**Radii:** 10px on active sidebar rows and the primary action button. 999px on pills.
Hairlines are 1px solid `--line`.

## Typography

Loaded from Google Fonts in `<head>`:
- **Inter** 400/500/600/700/800 — UI sans + numerals (with `font-variant-numeric: tabular-nums` on every numeric column)
- **Instrument Serif**, **DM Serif Display**, **Newsreader**, **Fraunces** — selectable title fonts

CSS variables for the type stack:
```
--sans:  "Inter", system-ui, -apple-system, "Segoe UI", sans-serif
--serif: "Instrument Serif", "Times New Roman", serif
--mono:  "IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace
--num:   "Inter", system-ui, sans-serif
```

Body copy is Inter 500 with `font-feature-settings: "ss01", "cv11"` and tabular nums on
every numeric readout.

The PROMPT mentions Inter Tight; the current implementation uses Inter — either is fine,
keep whichever is consistent in your codebase.

## Screens / Views

### Two-pane layout

- **Sidebar:** default 320px wide, user-resizable via the divider on its right edge (double-click resets to 320). Background `--paper-2`. Toggle with `[` or the icon button in the top strip.
- **Main stage:** flex 1, background `--paper`.

### Sidebar contents (top → bottom)

1. **Header** — wordmark "Meeting Manager" at 14px / weight 600, 20px padding. No logo. A sidebar-collapse icon button sits at top-right of the sidebar.
2. **Agenda Source** (collapsible) — caret + uppercase label. Contains:
   - A textarea for markdown input. Inter 500, 13.5px, line-height 1.5. Avoid mono fonts at this size — they read worse than sans.
   - Two buttons: "Load agenda" (primary, ink-on-paper) and "Sample" (ghost).
   - Parse errors stacked below in a `--bad`-tinted box.
3. **Agenda** (collapsible) — uppercase label left, total duration ("11.5 min" / "28 min") right-aligned in `--faint`. Body is the agenda row list:
   - Row shape: `[number/letter mono · faint when inactive / accent when active][title + meta two-line stack, flex 1][duration right-aligned, 56px column]`.
   - Active row: `--accent-soft` background, 10px radius, **no transition** on the background change (it flickers on rapid slide nav).
   - Sub-items indent paddingLeft 44 and use letters `a/b/c` instead of numbers.
   - Bookends: "— Title" at top, "✓ Complete" at bottom.

### Main stage (top → bottom)

1. **Top strip** — `padding: 20px 36px`, border-bottom `--line`.
   - Left: sidebar-toggle icon button, uppercase eyebrow showing "Pre-meeting" / "Wrap" / `Slide N of M`.
   - Right: prev/next arrow icon buttons, vertical hairline, live wall clock (`h:mm:ss AM`, mono, tabular nums), theme toggle.
2. **Stage** — `flex: 1`, vertical-centered, `padding: clamp(28px,4vh,64px) clamp(40px,6vw,120px)`.
   - Eyebrow: `--accent`, uppercase, 12px, letter-spacing 0.14em (e.g. "3 OF 4").
   - **h1** in the chosen title font:
     - Title slide: meeting title, `clamp(48px, 10vh, 112px)`
     - Agenda slide: item / sub-item name, `clamp(44px, 9.5vh, 108px)`, `text-wrap: balance`
     - Complete slide: "Meeting complete!" same as title
   - Below h1 on agenda slides: present attribution names in `--muted`, `clamp(18px,2.6vh,26px)`, joined with " · ".
   - Badge row: duration pill (`--accent-soft` bg, `--accent` text, leading dot) · "by H:MM PM" pill with clock icon · "max per person" muted pill where applicable.
   - On title slide only: horizontal admin list (role 12px uppercase muted, value 22px medium ink), then "N items" and "11.5 min total" outline pills.
3. **Timer footer** — `padding: 16px 28px 18px`, border-top `--line`.
   - **Ring timer** (default): 156px circular ring, stroke 5, light grey track, colored arc growing **clockwise from 12 o'clock**. Color = `--good` (>20%), `--warn` (≤20%), `--bad` (over time). Inside: mono `EditableTime` at 36–44px + "/ 02:00" duration in `--faint` 10–11px.
   - Right side: state pill ("Running" + pulsing dot / "Almost up" / "Over time" / "Paused"), then control row: Start/Pause (primary, ink bg, 36×36, 10px radius), `−1 min`, `+1 min`, **Speak time** (icon button — uses `speechSynthesis` to read the remaining time; do NOT mutate the timer), **Reset**. All buttons `white-space: nowrap`.
4. **Title and Complete slides have no timer.** Replace the footer with a muted helper line on the left and a single primary CTA on the right ("Start meeting →" / "Start over").

### Tweaks panel (in-page)

A floating "Tweaks" panel in the bottom-right, draggable, with a close button. Toggled by the host's toolbar. Controls (current implementation uses the bundled `tweaks-panel.jsx` primitives):

- **Accent** — swatch picker (`#2257D6`, `#0B6EAB`, `#3D52B5`, `#0E1626`, `#11833F`). Sets `--accent`.
- **Title font** — select: `inter-tight` (default, weight 700, tracking -0.025em), `instrument-serif` (400, -0.02em), `dm-serif` (400, -0.015em), `newsreader` (500, -0.02em), `fraunces` (500, -0.025em).
- **Dark mode** — toggle, sets `document.documentElement.dataset.theme`.
- **Show wall clock** — toggle.
- **Ring timer** — toggle. When off, render the `FlatTimer`: a horizontal progress bar above a 72px mono "remaining / duration" row in the footer.
- **Countdown sounds** + volume slider — synthesized via Web Audio (`OscillatorNode`).
- **TTS voice** — picker for `speechSynthesis` voices.

## Behavior, in detail

(See `PROMPT-FOR-CODEX.md` for the original spec; the notes below add concrete
implementation details.)

### Markdown grammar

- **Title:** `# Heading`
- **Start time** (optional): `**Start Time:** 1 PM`
- **Admins:** a `**Meeting Admins**` block with `- **Role:** Value` rows
- **Agenda:** a `**Agenda**` ordered list. Each line:
  `<title> (<names>) - <N> min [max per person] [by H:MM AM/PM]`
- Sub-items come from either `max per person` (one per name, each gets the full N minutes) or an inline sublist where each `- Name - N min` line specifies a sub-duration.

### Auto-filled deadlines

Walk items in order:
- If an item has an explicit `by H:MM PM`, sync the running clock to it.
- Otherwise advance the running clock by the item's duration and synthesize a deadline.
- If NO items have explicit deadlines, start the running clock at "now" rounded up to the next 5 minutes.
- For items with sub-items: `parent_start = parent_end - parent_duration`, then add each sub's duration cumulatively.

Computed deadlines render identically to explicit ones (no visual marker).

### Slide order

Title → each agenda item (with its sub-items expanded as their own slides immediately after the parent overview) → Complete.

### Timer

- Each slide has a stable `timerInfo.key` (e.g. `1.total`, `2.0`, `2.1`); per-key remaining time is in a `remainingMap` persisted to `localStorage` under `meeting-manager.v2.state`.
- A `requestAnimationFrame` loop drives the tick while running.
- **Important:** seed `last` inside the rAF callback on the first frame (not from `performance.now()` at effect-mount time) and clamp `dt = Math.max(0, now - last)`. rAF's `now` is the *frame's start time* and can predate effect-mount when the click and commit land mid-frame — leaving the first `dt` negative and ticking the readout *up* one second for a single paint (e.g. 7:00 → 7:01 → 7:00 flicker on press-Start).
- `fmtTimer`: for positive ms, **ceil** seconds so each integer second holds for its full duration (a fresh 5:00 reads "5:00" for one whole second before rolling to "4:59"). For negative ms, **floor** so "0:00" holds for a second before "-0:01".
- Pause the timer automatically whenever the slide changes.

### Smoothing the ring on discrete jumps

The ring's stroke-dasharray transition is disabled while running (so per-frame rAF updates don't queue 360ms animations on every paint). When a bump / set-time / reset causes a remaining-ms jump > 200ms, briefly re-enable the transition for 400ms to animate the discrete jump. Implementation: `showTransition = !running || smoothing`.

### Editable time readout

`EditableTime` is the timer numeral. Click to pause + enter edit mode; Enter commits via `parseTimeInput`, Esc cancels. While editing, the field uses a `FitText` wrapper that shrinks the font if the draft would otherwise overflow the ring's interior.

### Countdown sounds

Last 10 seconds: a sine tick (660 Hz for 10–6s, 880 Hz emphasis for 5–1s). At 0:00, a triangle two-note chime (E6 → A6). All synthesized via `AudioContext`. Mirror the readout's rounding so each tick lands the instant the display rolls.

### Speak-time (TTS)

`speakSentence("<n> minute(s) and <n> second(s) remaining"` — or `"... over time"` when negative). Uses `window.speechSynthesis`. Voice is configurable via Tweaks. Does NOT change the timer value.

### Keyboard

- `←` / `→` / `↑` / `↓` / `j` / `k` / PageDown / PageUp — change slide
- `Space` — toggle run/pause
- `R` — reset current timer
- `[` — toggle sidebar
- Disable shortcuts while focus is in an `<input>` or `<textarea>`.

### Persistence

`localStorage` key `meeting-manager.v2.state` holds `{ rawMarkdown, currentSlide, remainingMap, sidebarWidth, theme }`. The Tweaks `__TWEAK_DEFAULTS` JSON block in the HTML is rewritten on disk via the host's `__edit_mode_set_keys` protocol (only relevant inside the design host — for production, replace with normal app settings).

## State Management

The app's React state lives in one component (`App` in `app.jsx`):

- `meeting` — the parsed agenda model from `parseAgenda(rawMarkdown)`
- `currentSlide` — slide index
- `remainingMap` — `{ [key]: ms }` per-slide timer state
- `running` — boolean
- `sidebarOpen`, `sidebarWidth` — sidebar UI state
- Tweaks state from `useTweaks(__TWEAK_DEFAULTS)`

`useMemo` derives the active `slide` and `timerInfo`. A `useEffect` watches `[remainingMap, ...]` and persists. Another `useEffect` runs the rAF tick when `running && timerInfo`.

For a real codebase, fold this state into whatever conventional store the app uses (Zustand, Redux, context, Vue refs, SwiftUI `@State`, etc.). The shape is small enough to fit anywhere.

## Don't do

- No emoji except `✓` in the Complete sidebar row.
- No drop shadows on cards — only the very subtle one on the Tweaks panel.
- No transitions on the active-row background — flickers on rapid slide changes.
- No icons for every metadata pill — one clock icon on the deadline pill is the limit.
- No gradient backgrounds.
- No rounded-corner-with-left-border accent cards.
- No "AI generated" tropes.

## Assets

No external image assets — all UI is HTML/CSS/SVG. Icons (sidebar toggle, arrows, clock, speaker, reset, theme, drag handle) are inline SVGs in `components.jsx`. Pull them out as your codebase's icon component when porting.

Fonts are loaded from Google Fonts; replace with your codebase's font-loading approach.

## Verification checklist

1. Title slide renders without overlap down to 540px viewport height.
2. Sidebar duration column right-aligns across all rows including sub-items.
3. Active sidebar row matches the visible stage slide at all times.
4. Tweaks panel choices persist across reload (in production, via your settings store).
5. Pressing Start on a fresh timer does **not** flash the readout up by one second (the rAF-`last` seed bug — see the Timer section).
6. Tabular numerals are on every numeric column (sidebar durations, timer readout, wall clock, deadlines).
