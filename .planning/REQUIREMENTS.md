# Requirements — Meeting Manager v1

**Project:** Single-file local HTML tool that turns a Markdown meeting agenda into a Marp-style slide deck with per-slide timers and a clickable sidebar, screenshared into Discord.

**Source of truth:** `.planning/PROJECT.md` (context) + `.planning/research/SUMMARY.md` (locked stack/architecture decisions).

---

## v1 Requirements

### Parsing — `PARSE`

- [x] **PARSE-01**: Parse the `**Meeting Admins**` block — collect bulleted roles (Meeting Master, Notetaker, anything else listed)
- [x] **PARSE-02**: Parse the `**Agenda**` block — each numbered item becomes one slide with title, attribution(s), duration, and deadline
- [x] **PARSE-03**: Parse attribution(s) inside `(...)` — comma-separated names; tolerate 0, 1, or many
- [x] **PARSE-04**: Parse duration — number + unit (`min`, `mins`, `minutes`, `m`); tolerate decimals (`7.5 min`)
- [x] **PARSE-05**: Parse "max per person" semantics — split that item into per-person sub-states (`item.subStates = [{name, durationMs}]`), each with its own timer
- [x] **PARSE-06**: Parse `by H:MM AM/PM` deadline into a Date for display
- [x] **PARSE-07**: Tolerate em-dash `—`, en-dash `–`, double-dash `--`, AND single-hyphen `-` (with lookahead so it doesn't match list bullets) between title and duration; single `-` is the canonical/default rendering inside the tool
- [x] **PARSE-08**: Normalize input on intake — strip BOM, normalize smart quotes to straight, NFC-normalize whitespace
- [x] **PARSE-09**: Use the `marked` v18 UMD `lexer()` API on a token stream — not regex-on-raw-string (per research)
- [x] **PARSE-10**: Build a fixture file in Phase 1 with all 10+ Markdown variants and parse on every save (smoke-test gate)

### Loading & Input — `LOAD`

- [x] **LOAD-01**: Empty-state UI when no agenda is loaded — clear "Paste agenda markdown below, or drop a .md file" prompt
- [x] **LOAD-02**: A single unified "Load .md" affordance that accepts both modes — clicking opens the OS file picker; dragging a `.md` file onto it (or anywhere on the page) loads it via `FileReader.readAsText()`
- [x] **LOAD-03**: Textarea paste — paste markdown directly; "Load" button parses and renders
- [x] **LOAD-04**: When dropping/loading a new `.md` while an agenda is already loaded, show a modal with two options: "Replace agenda" or "Add items to current agenda"
- [x] **LOAD-05**: The "Add items" flow lets the user append more items either by pasting more agenda markdown or via a simple form (item title + attribution(s) + duration + deadline); appended items use the same parser path

### Slide Rendering — `SLIDE`

- [x] **SLIDE-01**: Slide 1 is the title slide — large meeting title, Meeting Master and Notetaker rendered prominently; no timer on slide 1
- [x] **SLIDE-02**: Every subsequent slide renders one agenda item — large title, attribution(s) as subtitle, deadline as a small badge
- [x] **SLIDE-03**: For "max per person" items, each sub-state slide shows the *current person's name + their duration* as the title (e.g., "Teck Lee — 7 min"); the parent agenda item title appears as a smaller eyebrow above
- [x] **SLIDE-04**: Marp-style aesthetic — lots of whitespace, sans-serif system font stack, one accent color, no shadows/borders by default
- [x] **SLIDE-05**: Slide area takes the main ~75% of the viewport (right side of the sidebar)

### Sidebar — `SIDE`

- [x] **SIDE-01**: Fixed left sidebar (~25% width) with the numbered agenda visible at all times
- [x] **SIDE-02**: "Max per person" items render as expandable parents with sub-items (1a Sarah, 1b Teck Lee, 1c Solomon)
- [x] **SIDE-03**: Default expand state — current item's sub-states expanded; other items collapsed
- [x] **SIDE-04**: Clicking a sidebar item (or sub-item) jumps to that slide/sub-state AND resets that timer to its allocated duration
- [x] **SIDE-05**: Current item/sub-item is visually highlighted; completed items are dimmed/checked
- [x] **SIDE-06**: Sidebar updates without scroll-position reset when state changes (renderer must diff, not blast innerHTML)

### Timer Engine — `TIMER`

- [x] **TIMER-01**: Per-slide countdown timer showing `MM:SS remaining / MM:SS allocated`
- [x] **TIMER-02**: Each slide (and each per-person sub-state) has its own independent running/paused timer state; navigating away and back preserves it
- [x] **TIMER-03**: Timer counts down via a **single `requestAnimationFrame` loop** for the whole app, deriving `remainingMs` from `performance.now() - startedAt + accumulatedMs` (per research — never decrement a counter)
- [x] **TIMER-04**: Visual cues — green ≥25% remaining, amber <25% remaining, red at 0; counts into negatives with `−` prefix
- [x] **TIMER-05**: Pause/play (also Space key) — pause is a `paused: true` flag in state, not interval lifecycle
- [x] **TIMER-06**: ±1 minute buttons (also `+`/`−` keys)
- [x] **TIMER-07**: Click time to edit — adding/subtracting from the *remaining* time also adjusts *allocated* by the same delta (coupled edit, single input)
- [x] **TIMER-08**: Reset (`R` key) — resets the current slide's or sub-state's timer to its allocated duration; resets only the *current* sub-state, not sibling people in the same item
- [x] **TIMER-09**: Do not auto-advance when the timer hits zero — overrun must be visible (anti-feature)
- [x] **TIMER-10**: Timer digits use `font-variant-numeric: tabular-nums` so digits don't wiggle

### Navigation — `NAV`

- [x] **NAV-01**: `→` (right arrow) — within a "max per person" item, advance to next person; after last person, advance to next agenda item
- [x] **NAV-02**: `Shift+→` — skip remaining people in current item, jump straight to next agenda item
- [x] **NAV-03**: `←` (left arrow) — go to previous sub-state or previous item; symmetric with `→`
- [x] **NAV-04**: `1`–`9` — jump to slide N (counts agenda items, not sub-states; jumping to an item lands on its first sub-state if it has any)
- [x] **NAV-05**: Pressing `→` on the *last sub-state of the last agenda item* navigates to a dedicated "Meeting complete" slide (no further nav forward)
- [x] **NAV-06**: All keyboard shortcuts early-return if `event.target` is `<input>`, `<textarea>`, or `isContentEditable` — keystrokes never escape edit-in-place inputs

### Overtime Visual — `OVER`

- [x] **OVER-01**: When the current slide's timer goes ≤0, tint the whole slide red
- [x] **OVER-02**: Show an "OVERTIME" banner styled in the spirit of Overwatch — bold sans, white core with thick black stroke, slight skew — but CSS-only with shifted colors and a non-Overwatch typeface (per IP research)
- [x] **OVER-03**: Banner stays visible until the user advances or resets; overrun also visible in the timer bar
- [x] **OVER-04**: Static (no animation) for v1 — keeps it Discord-compression-survivable

### Theme — `THEME`

- [x] **THEME-01**: Light mode (default) and dark mode
- [x] **THEME-02**: Toggle button visible in the UI (top-right of viewport)
- [x] **THEME-03**: Theme preference persisted in localStorage
- [x] **THEME-04**: No flash of wrong theme on reload — read theme from localStorage in an inline `<script>` in `<head>` before paint

### Persistence — `PERSIST`

- [x] **PERSIST-01**: Auto-save full state to localStorage (key `meeting-manager.v1.state`) — `rawMarkdown`, parsed IR, current slide/sub-state index, per-slide timer states (`accumulatedMs`, `paused`, edited allocation), theme
- [x] **PERSIST-02**: Debounce writes to ~500ms; force-flush on `pagehide` / `visibilitychange: hidden` / `beforeunload`
- [x] **PERSIST-03**: On boot, restore state from localStorage if present; **always restore in paused state** (never resume running) per research finding on `performance.now()` cross-reload semantics
- [x] **PERSIST-04**: Hash the agenda text on save — if a saved agenda has a different hash from the current one (or no saved agenda), reset slide index and timers but preserve theme + agenda text
- [x] **PERSIST-05**: Wrap every localStorage call in try/catch; degrade to in-memory with a small banner if storage is unavailable (Firefox `file://`, Incognito, quota exceeded)
- [x] **PERSIST-06**: Bounds-check restored slide/sub-state indices against the current agenda — clamp to valid range

### Lifecycle Guards — `GUARD`

- [x] **GUARD-01**: `beforeunload` confirmation while any timer is running — browser-native "Leave site?" prompt
- [x] **GUARD-02**: Disable the confirmation when all timers are paused (no false alarms on normal close)

### Wake Lock — `WAKE`

- [x] **WAKE-01**: Call `navigator.wakeLock.request('screen')` when any timer transitions to running; release when all timers are paused or meeting ends
- [x] **WAKE-02**: Handle re-acquisition on `visibilitychange: visible` if the lock was dropped (per MDN guidance)
- [x] **WAKE-03**: Fail silently if the API is unsupported (older browser) — degrade is acceptable

### Sound — `SOUND`

- [x] **SOUND-01**: Optional chime when a timer reaches 0 — a single short WebAudio beep
- [x] **SOUND-02**: Sound off by default; toggleable via a button in the UI; preference persisted in localStorage
- [x] **SOUND-03**: No sound for amber transitions, sub-state changes, or reset — only the zero-crossing chime

### Error Surfacing — `ERR`

- [x] **ERR-01**: Inline parser error with line number when the markdown can't be parsed (e.g., "Line 4: missing duration after attribution")
- [x] **ERR-02**: Inline parser error survives a partial parse — show successfully parsed items + an error banner about the bad lines (don't blank the screen)
- [x] **ERR-03**: Friendly error if a dropped file isn't `.md` / `.markdown` / `.txt`

### Discord-Readiness Polish — `BRAND`

- [x] **BRAND-01**: Minimum body font-weight 500; titles 700+ (Discord H.264 destroys thin fonts)
- [x] **BRAND-02**: Minimum displayed font-size 24px on stage content
- [x] **BRAND-03**: AAA contrast ratio on stage text (both light and dark themes)
- [x] **BRAND-04**: OVERTIME banner has a thick stroke/outline so it survives 720p low-bitrate compression
- [x] **BRAND-05**: Layout intact at 100%, 125%, and 150% browser zoom

### Single-File Deliverable — `DIST`

- [x] **DIST-01**: One file — `meeting-manager.html`, opens by double-clicking
- [x] **DIST-02**: Inline all CSS and JS; no external CDN at runtime
- [x] **DIST-03**: Inline `marked` v18 UMD as the only library
- [x] **DIST-04**: System font stack — no Google Fonts CDN; works fully offline
- [x] **DIST-05**: No `<script type="module">` (fails on `file://`); classic scripts only
- [x] **DIST-06**: No `fetch()` for local files (CORS-blocked on `file://`); use `FileReader` exclusively for `.md` imports

---

## v2 / Deferred Requirements

These were considered and explicitly deferred — not built for v1.

- **Quick-help overlay** — `?` shows a keyboard-shortcut cheatsheet
- **Total-meeting elapsed clock** — running clock across the whole meeting
- **Sidebar elapsed-vs-allocated indicators** — small bar/chip showing how each completed item ran
- **Compact HUD mode** (`H` key) — hide sidebar, just slide + timer for smaller screens
- **Duplicate-tab heartbeat + warning** — detect and warn if the same file is open in another tab (v1 ships with documented limitation)
- **Animated OVERTIME banner** — Overwatch's sliding chevron motion; v1 is static
- **Per-item notes** — additional notes on each slide
- **Schema-version migration** — v1 stores `rawMarkdown` so re-parse-on-bump is the migration; true migration logic is v2 concern

---

## Out of Scope

These will not be built for this product, with reasoning.

- **Multi-user / collaboration** — solo presenter screenshare is the only use case
- **Audience-side view or remote control** — only the presenter drives; viewers just watch the screenshare
- **Auto-advance on timer zero** — overrun must be visible, not hidden; meeting discipline is the user's job
- **Auth / cloud sync** — local-first, single-machine; localStorage is enough
- **Build step or package manager** — must open by double-clicking the `.html` file
- **Mobile / touch UI** — desktop-only, designed for screensharing from a laptop
- **In-tool editing of existing agenda items** — markdown is the source of truth; *adding* items in-tool is allowed (LOAD-05), but editing existing items requires editing the source `.md` and reloading
- **Speaker notes, transitions, animations** — Marp aesthetic means clean and static
- **Exports** (PDF, PPTX, post-meeting summary) — markdown in, screenshare out; no derived artifacts
- **Calendar integration / meeting auto-import** — paste-driven only
- **Custom themes beyond light/dark** — two themes is enough for one tool
- **Webcam overlay / picture-in-picture** — out of scope; Discord handles that
- **Per-action sounds** — only zero-crossing chime; no key-click / nav / reset sounds
- **Auto-pause on tab blur** — timer must keep ticking during screenshare even if focus shifts

---

## Traceability

Every v1 requirement is mapped to exactly one phase. Coverage: 78 / 78 (100%).

| Requirement | Phase   | Status   |
| ----------- | ------- | -------- |
| PARSE-01    | Phase 1 | Complete |
| PARSE-02    | Phase 1 | Complete |
| PARSE-03    | Phase 1 | Complete |
| PARSE-04    | Phase 1 | Complete |
| PARSE-05    | Phase 1 | Complete |
| PARSE-06    | Phase 1 | Complete |
| PARSE-07    | Phase 1 | Complete |
| PARSE-08    | Phase 1 | Complete |
| PARSE-09    | Phase 1 | Complete |
| PARSE-10    | Phase 1 | Complete |
| LOAD-01     | Phase 3 | Complete |
| LOAD-02     | Phase 2 | Complete |
| LOAD-03     | Phase 1 | Complete |
| LOAD-04     | Phase 2 | Complete |
| LOAD-05     | Phase 2 | Complete |
| SLIDE-01    | Phase 1 | Complete |
| SLIDE-02    | Phase 1 | Complete |
| SLIDE-03    | Phase 1 | Complete |
| SLIDE-04    | Phase 1 | Complete |
| SLIDE-05    | Phase 1 | Complete |
| SIDE-01     | Phase 1 | Complete |
| SIDE-02     | Phase 1 | Complete |
| SIDE-03     | Phase 1 | Complete |
| SIDE-04     | Phase 1 | Complete |
| SIDE-05     | Phase 1 | Complete |
| SIDE-06     | Phase 1 | Complete |
| TIMER-01    | Phase 1 | Complete |
| TIMER-02    | Phase 1 | Complete |
| TIMER-03    | Phase 1 | Complete |
| TIMER-04    | Phase 1 | Complete |
| TIMER-05    | Phase 1 | Complete |
| TIMER-06    | Phase 1 | Complete |
| TIMER-07    | Phase 3 | Complete |
| TIMER-08    | Phase 1 | Complete |
| TIMER-09    | Phase 1 | Complete |
| TIMER-10    | Phase 1 | Complete |
| NAV-01      | Phase 2 | Complete |
| NAV-02      | Phase 2 | Complete |
| NAV-03      | Phase 2 | Complete |
| NAV-04      | Phase 2 | Complete |
| NAV-05      | Phase 2 | Complete |
| NAV-06      | Phase 2 | Complete |
| OVER-01     | Phase 1 | Complete |
| OVER-02     | Phase 1 | Complete |
| OVER-03     | Phase 1 | Complete |
| OVER-04     | Phase 1 | Complete |
| THEME-01    | Phase 3 | Complete |
| THEME-02    | Phase 3 | Complete |
| THEME-03    | Phase 3 | Complete |
| THEME-04    | Phase 3 | Complete |
| PERSIST-01  | Phase 2 | Complete |
| PERSIST-02  | Phase 2 | Complete |
| PERSIST-03  | Phase 2 | Complete |
| PERSIST-04  | Phase 2 | Complete |
| PERSIST-05  | Phase 2 | Complete |
| PERSIST-06  | Phase 2 | Complete |
| GUARD-01    | Phase 2 | Complete |
| GUARD-02    | Phase 2 | Complete |
| WAKE-01     | Phase 3 | Complete |
| WAKE-02     | Phase 3 | Complete |
| WAKE-03     | Phase 3 | Complete |
| SOUND-01    | Phase 3 | Complete |
| SOUND-02    | Phase 3 | Complete |
| SOUND-03    | Phase 3 | Complete |
| ERR-01      | Phase 3 | Complete |
| ERR-02      | Phase 3 | Complete |
| ERR-03      | Phase 3 | Complete |
| BRAND-01    | Phase 4 | Complete |
| BRAND-02    | Phase 4 | Complete |
| BRAND-03    | Phase 4 | Complete |
| BRAND-04    | Phase 4 | Complete |
| BRAND-05    | Phase 4 | Complete |
| DIST-01     | Phase 1 | Complete |
| DIST-02     | Phase 1 | Complete |
| DIST-03     | Phase 1 | Complete |
| DIST-04     | Phase 1 | Complete |
| DIST-05     | Phase 1 | Complete |
| DIST-06     | Phase 1 | Complete |

### Phase-by-Phase Summary

| Phase                                                 | Requirements                                                                                           | Count  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------ |
| **Phase 1: MVP Vertical Slice**                       | PARSE-01..10, LOAD-03, SLIDE-01..05, SIDE-01..06, TIMER-01..06, TIMER-08..10, OVER-01..04, DIST-01..06 | 41     |
| **Phase 2: Persistence + Drag-Drop + Keyboard + Nav** | LOAD-02, LOAD-04, LOAD-05, NAV-01..06, PERSIST-01..06, GUARD-01..02                                    | 17     |
| **Phase 3: Polish Layer**                             | LOAD-01, TIMER-07, THEME-01..04, WAKE-01..03, SOUND-01..03, ERR-01..03                                 | 15     |
| **Phase 4: Discord-Readiness Visual Audit**           | BRAND-01..05                                                                                           | 5      |
| **TOTAL**                                             |                                                                                                        | **78** |

---

*Last updated: 2026-05-16 after v1 completion*
