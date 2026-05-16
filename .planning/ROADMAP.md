# Roadmap — Meeting Manager v1

**Project:** Single-file local HTML tool that turns a Markdown meeting agenda into a Marp-style slide deck with per-slide timers and a clickable sidebar, screenshared into Discord.

**Mode:** MVP (every phase delivers an end-to-end usable slice).
**Granularity:** coarse (4 phases).
**Source of truth:** `.planning/PROJECT.md` + `.planning/REQUIREMENTS.md` + `.planning/research/SUMMARY.md`.

**Coverage:** 78 / 78 v1 requirements mapped (validated below).

---

## Phases

- [x] **Phase 1: MVP Vertical Slice — Paste, Render, Tick, Click** — Smallest usable product: paste markdown, see a Marp-style slide deck with working sidebar + countdown timer (rAF + `performance.now()` from day one), click sidebar to navigate, overrun shows OVERTIME banner.
- [ ] **Phase 2: Persistence + Drag-Drop + Keyboard + Nav Truth Table** — Turns the prototype into something you can actually run a meeting with: auto-save survives crashes, drop a `.md` file to load, full keyboard control (Space, ←/→, Shift+→, 1–9, R, +/−) with editing-target guard, `beforeunload` warns mid-timer.
- [ ] **Phase 3: Polish Layer — Empty State, Errors, Theme, Click-to-Edit, Wake Lock, Chime** — Quality-of-life: empty-state UI guides first-time use, parser errors show inline with line numbers, dark/light toggle with no flash, click time to edit, screen stays awake while timer runs, optional zero-crossing chime.
- [ ] **Phase 4: Discord-Readiness Visual Audit** — Final pass for screenshare: font weights ≥500, sizes ≥24px, AAA contrast, OVERTIME banner has thick stroke that survives 720p compression, layout intact at 100/125/150% zoom.

---

## Phase Details

### Phase 1: MVP Vertical Slice — Paste, Render, Tick, Click

**Goal:** Sarah can paste an agenda markdown into a textarea, click Load, and see a working Marp-style slide deck with a clickable sidebar and a per-slide countdown timer. Clicking a sidebar item jumps to that slide and resets its timer. Timer counts down green → amber → red → negative-overtime with the OVERTIME banner.
**Mode:** mvp
**Depends on:** Nothing (foundation phase).
**Requirements:**
- PARSE-01, PARSE-02, PARSE-03, PARSE-04, PARSE-05, PARSE-06, PARSE-07, PARSE-08, PARSE-09, PARSE-10
- LOAD-03
- SLIDE-01, SLIDE-02, SLIDE-03, SLIDE-04, SLIDE-05
- SIDE-01, SIDE-02, SIDE-03, SIDE-04, SIDE-05, SIDE-06
- TIMER-01, TIMER-02, TIMER-03, TIMER-04, TIMER-05, TIMER-06, TIMER-08, TIMER-09, TIMER-10
- OVER-01, OVER-02, OVER-03, OVER-04
- DIST-01, DIST-02, DIST-03, DIST-04, DIST-05, DIST-06

**Why these requirements ship together** (architecture lock): Parser, Store, Renderer, and TimerEngine are dependency-coupled — splitting them across phases would force rewrites (per research/ARCHITECTURE.md build-order analysis). Per-slide rendering and sidebar are how we verify the timer is correct (visual feedback). Overrun visual lands here because the timer is incomplete without it (red-on-red is the timer's terminal state). DIST requirements (single file, no build, inline `marked`, no `fetch`/`module`) constrain the whole architecture — they must be enforced from the first line of code.

**Critical constraints (do not violate):**
- TimerEngine MUST use the single-rAF + `performance.now()`-derivation pattern (TIMER-03 / Pitfall #1). Never decrement a counter. Verified by the 5-minute alt-tab test.
- Parser uses `marked` v18 UMD `lexer()` on the token stream (PARSE-09). Build the 10+-variant fixture file on day one (PARSE-10).
- Title slide vs agenda item numbering: keep two index spaces — `slide[]` (includes title) vs `agendaItem[]` (1..N, excludes title). Sidebar numbers agenda items. (Pitfall #19.)
- Composite timer key `"3"` for plain items, `"3.0"/"3.1"/"3.2"` for sub-states. Flat `state.timers` dict.
- No persistence yet. No full navigation keyboard yet (only minimal timer keys needed for TIMER-05/06/08). No drag-drop yet. No theme toggle yet. No click-to-edit yet.

**Success Criteria** (what must be TRUE when this phase is done — Sarah can verify by opening the file):
  1. Pasting the example agenda from README.md and clicking Load renders 1 title slide (Meeting Master + Notetaker) + N agenda slides with correct titles, attribution subtitles, and deadline badges; sidebar shows the numbered agenda with "max per person" items expandable to 1a/1b/1c sub-items.
  2. Clicking any sidebar item (or sub-item) jumps the stage to that slide/sub-state AND resets that timer to its allocated value; other slides' timer states are preserved.
  3. The timer ticks down smoothly with tabular numerals, displays `MM:SS remaining / MM:SS allocated`, turns amber at <25%, red at 0, and keeps counting into negatives with a `−` prefix.
  4. When the timer goes negative, the whole slide tints red and a static "OVERTIME" banner appears (CSS-only, non-Overwatch typeface, recognizable-but-distinct styling).
  5. Backgrounding the tab for 5 minutes and returning shows the timer snapped to the truth (drift ≤50ms over 10 minutes) — proves rAF + `performance.now()` derivation, not counter decrement.
  6. The file opens by double-clicking `agenda-presenter.html` from disk; no build step, no external CDN at runtime, no `fetch()`, no `<script type="module">`.

**Plans:**
- [x] 01-01: Agenda parser fixture and IR
- [x] 01-02: Static presenter shell and sidebar rendering
- [x] 01-03: Timer engine, controls, and overrun visual
- [x] 01-04: File distribution and Phase 1 smoke verification
**UI hint**: yes

---

### Phase 2: Persistence + Drag-Drop + Keyboard + Nav Truth Table

**Goal:** Sarah can run a real meeting end-to-end without the textarea. She drops a `.md` file (or adds items to an already-loaded agenda), drives the meeting entirely from the keyboard (Space to pause, →/Shift+→/← to navigate, 1–9 to jump, R to reset, +/− for ±1 min), and her state survives a browser crash or accidental reload. A `beforeunload` prompt prevents mid-timer reloads from being silent.
**Mode:** mvp
**Depends on:** Phase 1 (Phase 1's state shape must be frozen before persistence wires in — schema-churn protection per research; keyboard maps to actions defined in Phase 1).
**Requirements:**
- LOAD-02, LOAD-04, LOAD-05
- NAV-01, NAV-02, NAV-03, NAV-04, NAV-05, NAV-06
- PERSIST-01, PERSIST-02, PERSIST-03, PERSIST-04, PERSIST-05, PERSIST-06
- GUARD-01, GUARD-02

**Why these requirements ship together:** Persistence cannot ship before the state shape is stable (Phase 1 freezes it). Drag-drop is a new InputController that dispatches the same `LOAD_AGENDA` action Phase 1 already supports — it slots in naturally. Keyboard is a thin dispatch wrapper that only becomes correct once the action set is final; it shares the `isEditingTarget` guard with future click-to-edit inputs. Sub-state navigation truth table (Pitfall #10) must be written BEFORE coding NAV — pin it into code comments.

**Critical constraints (do not violate):**
- Keyboard handler MUST early-return on `isEditingTarget(e)` (NAV-06 / Pitfall #5) — five-line guard at the top, before any dispatch. Test: type `r` in the textarea, no reset; type `1` in the textarea, no jump.
- Persistence: every `localStorage` call wrapped in try/catch (PERSIST-05 / Pitfall #2 — Firefox `file://`, Incognito, quota). Debounce 500ms, force-flush on `pagehide` / `visibilitychange:hidden` / `beforeunload` (PERSIST-02 / Pitfall #16).
- On reload, ALWAYS restore in paused state (PERSIST-03 / Pitfall #7). `performance.now()` resets per-document — persist `accumulatedMs` (duration), never `startedAt` (timestamp).
- Agenda-text hash gates timer restoration (PERSIST-04). Same hash → restore timers. Different hash → reset slide index + timers, preserve theme + raw text.
- Bounds-check restored cursor indices (PERSIST-06) — clamp to valid range, fall back to 0.
- Drop handler: `e.preventDefault()` on `dragenter`/`dragover` to prevent browser file-open (Pitfall #12). Use `FileReader.readAsText()`, NOT `fetch()` (DIST-06).
- `beforeunload` confirmation only while a timer is *running* (GUARD-02) — no false alarms on paused close.
- Write the sub-state navigation truth table (Pitfall #10's 8 boundary cases) in code comments before implementing NAV-01..05.
- Pressing `→` on the last sub-state of the last agenda item (NAV-05) advances to a dedicated "Meeting complete" slide (no further forward nav).

**Success Criteria** (what must be TRUE):
  1. Sarah can drag a `.md` file from her file system onto the page (or click the unified "Load .md" affordance to open the OS file picker) and it loads via `FileReader` — no browser file-open hijack, no `fetch()`; dropping while an agenda is already loaded shows a "Replace / Add items" modal.
  2. Every keyboard shortcut works: Space pauses/resumes, → advances per-person then per-item, Shift+→ skips remaining people, ← goes back symmetrically, 1–9 jumps to that agenda item (landing on first sub-state if any), R resets the current sub-state's timer, +/− adjust by ±1 min.
  3. Typing in the paste textarea (or any input) NEVER triggers a shortcut — `r`, `1`, Space, ←/→ all behave as normal text input when an editing target is focused.
  4. Killing the browser tab mid-timer and reopening the file restores the agenda, current slide/sub-state, per-slide timer values, and theme — and the restored timer is paused (banner: "Restored from last session — timer paused, press Space to resume"); reload while a timer is running prompts the browser's `beforeunload` confirmation.
  5. Loading a different agenda (different hash) resets cursor + timers but preserves theme; restored cursor/sub-state indices are clamped to the new agenda's range.
  6. Opening the file in Firefox does NOT white-screen — it falls back to in-memory state with a small "Auto-save unavailable" banner (try/catch around every `localStorage` call).

**Plans:** TBD
**UI hint**: yes

---

### Phase 3: Polish Layer — Empty State, Errors, Theme, Click-to-Edit, Wake Lock, Chime

**Goal:** The tool feels finished and forgiving. First-time users see a clear empty-state prompt explaining both load modes. Parser errors surface inline with line numbers instead of blanking the screen. Dark mode toggles cleanly with no flash. Sarah can click the time display to edit it. The screen doesn't sleep mid-timer. An optional chime fires at zero-crossing.
**Mode:** mvp
**Depends on:** Phase 2 (theme persistence needs Phase 2's localStorage wrapper; click-to-edit needs Phase 2's `isEditingTarget` guard to coexist with keyboard shortcuts; empty-state UI references both paste and drop modes which Phase 2 unlocks).
**Requirements:**
- LOAD-01
- TIMER-07
- THEME-01, THEME-02, THEME-03, THEME-04
- WAKE-01, WAKE-02, WAKE-03
- SOUND-01, SOUND-02, SOUND-03
- ERR-01, ERR-02, ERR-03

**Why these requirements ship together:** All polish/quality-of-life additions that depend on Phase 1+2 foundations. Empty-state UI (LOAD-01) belongs with the polish layer because it references both load modes (Phase 2 shipped drag-drop). Click-to-edit (TIMER-07) uses a real `<input>` element to inherit the `isEditingTarget` guard from Phase 2 (Pitfall #5). Theme has its own no-flash subtlety (inline `<script>` in `<head>` reading `localStorage` before paint — Pitfall #11). Wake Lock + chime are independent micro-features that round out the screenshare experience. Error UI (ERR-01..03) is grouped with empty-state as the "what does the user see when something goes wrong" layer.

**Critical constraints (do not violate):**
- Theme no-flash (THEME-04 / Pitfall #11): read theme from localStorage in an INLINE `<script>` in `<head>` before paint; set `document.documentElement.dataset.theme` before `<body>` renders. NOT after DOMContentLoaded.
- Click-to-edit (TIMER-07): use a real `<input type="text">`, NOT contenteditable (Pitfall #5 — the `isEditingTarget` guard relies on tagName `INPUT/TEXTAREA`). Pause the timer during edit; commit on Enter/blur, revert on Escape, revert silently on invalid input. Edits to *remaining* time adjust *allocated* by the same delta.
- Wake Lock (WAKE-01..03): acquire on first running-transition, release when all paused or meeting ends; re-acquire on `visibilitychange:visible` if lock was dropped (WAKE-02). Fail silently if API unsupported (WAKE-03) — never block the meeting on this.
- Chime (SOUND-01..03): WebAudio (no external file), single short beep, off by default, only at zero-crossing (not amber, not sub-state changes, not reset). Persisted via localStorage.
- Parser errors (ERR-01..02): inline error banner with line numbers; partial parse must survive — show successfully parsed items + error banner, never blank the screen. Reject non-`.md/.markdown/.txt` drops gracefully (ERR-03).
- Empty-state UI (LOAD-01): clear "Paste agenda markdown below, or drop a .md file" prompt with example snippet; only visible when no agenda is loaded.

**Success Criteria** (what must be TRUE):
  1. Opening the file for the first time (or after clearing localStorage) shows a clean empty-state with a "Paste agenda markdown below, or drop a `.md` file" prompt and an example snippet; loading any way clears the empty-state.
  2. Pasting a deliberately broken agenda (e.g., a line with no duration) renders the slides that DID parse, plus an inline error banner saying "Line 4: missing duration after attribution"; dropping a `.png` shows a friendly "Only `.md`, `.markdown`, or `.txt` files supported."
  3. Clicking the dark/light toggle (top-right) swaps the theme; reloading the page reads the saved theme from localStorage in `<head>` and paints the correct theme on first frame — no flash of the wrong theme.
  4. Clicking the timer display turns it into an editable `<input>`; typing `5:00` and pressing Enter sets remaining to 5:00 AND adjusts allocated by the same delta; Escape reverts; the timer is paused during edit; pressing Space while in the input adds a space (does NOT pause).
  5. Starting a timer requests the Screen Wake Lock; the screen does not dim/sleep while a timer runs; pausing all timers releases the lock; switching tabs and back re-acquires the lock; if `navigator.wakeLock` is unsupported, nothing breaks.
  6. Enabling the sound toggle and letting the active timer cross zero fires a single short chime; no chime fires for amber transitions, sub-state changes, or reset.

**Plans:** TBD
**UI hint**: yes

---

### Phase 4: Discord-Readiness Visual Audit

**Goal:** The tool survives Discord's H.264 720p compression. Stage text remains legible after compression; the OVERTIME banner is unmistakable at low bitrate; the layout stays intact when Sarah zooms in for an in-person variant. This is a CSS-token audit pass — set floors as CSS custom properties for one-place verification.
**Mode:** mvp
**Depends on:** Phase 3 (every prior phase must work first — polish needs real content, real timer states, real overrun visuals to audit against; CSS tokens established in Phase 1 are tightened here).
**Requirements:**
- BRAND-01, BRAND-02, BRAND-03, BRAND-04, BRAND-05

**Why these requirements ship together:** All BRAND requirements are about one thing — Discord screenshare survivability (Pitfall #8). They are best audited as a single pass against real content with the timer running and the OVERTIME banner visible. Splitting them risks regressing one floor while fixing another. CSS custom properties (`--stage-min-font-size`, `--body-font-weight`, `--title-font-weight`, etc.) make the audit reviewable in one place.

**Critical constraints (do not violate):**
- Font weight floor (BRAND-01): body ≥ 500, titles ≥ 700 — Discord H.264 destroys thin fonts. No `font-weight: 300` anywhere on stage content.
- Font size floor (BRAND-02): smallest stage text ≥ 24px at 1080p design viewport; slide title ≥ 72px; timer numerals ≥ 96px.
- AAA contrast (BRAND-03): 7:1 where possible, never <4.5:1 — Discord crushes ~1 stop of dynamic range. Verify in both light AND dark themes.
- OVERTIME banner stroke (BRAND-04): thick white/black stroke or outline so the banner survives 720p low-bitrate H.264 chroma subsampling. Pair with the static (no-animation) constraint already in OVER-04.
- Zoom tolerance (BRAND-05): layout intact at 100%, 125%, 150% browser zoom — use `clamp()` and CSS grid `minmax()` for the sidebar/stage split (Pitfall #13).
- Overwatch IP framing (Pitfall #9): banner is recognizable-style, NOT pixel-identical — different typeface, shifted hue/saturation. Called "overrun banner" in any user-facing strings.

**Success Criteria** (what must be TRUE):
  1. Every stage text element (slide title, attribution, deadline badge, timer numerals, OVERTIME banner) has `font-weight: 500` or greater and `font-size: 24px` or greater at default zoom; no `font-weight: 300` exists in the stylesheet.
  2. Both light and dark themes pass AAA contrast (7:1) on stage text; the amber timer state is distinguishable not just by hue but also by an icon or weight cue (Discord may crush color).
  3. Triggering overrun on a real Discord screenshare (or a 720p-compressed JPEG screenshot) leaves the OVERTIME banner readable — thick stroke survives compression, not a smeared red blob.
  4. Browser zoom at 100%, 125%, and 150% all render correctly — sidebar doesn't overlap stage, timer bar stays at the bottom, no horizontal scroll appears.
  5. Side-by-side with an actual Overwatch screenshot, the banner is clearly inspired-by, not copy-of: different typeface, shifted colors, but the aggressive impact intent is preserved.

**Plans:** TBD
**UI hint**: yes

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. MVP Vertical Slice — Paste, Render, Tick, Click | 4/4 | Complete | 2026-05-16 |
| 2. Persistence + Drag-Drop + Keyboard + Nav Truth Table | 0/? | Not started | — |
| 3. Polish Layer — Empty State, Errors, Theme, Click-to-Edit, Wake Lock, Chime | 0/? | Not started | — |
| 4. Discord-Readiness Visual Audit | 0/? | Not started | — |

---

## Coverage Validation

**Total v1 requirements:** 78
**Mapped:** 78 (100%) ✓
**Orphans:** 0 ✓
**Duplicates:** 0 ✓

| Category | Total | P1 | P2 | P3 | P4 |
|----------|-------|----|----|----|----|
| PARSE | 10 | 10 | — | — | — |
| LOAD | 5 | 1 (LOAD-03) | 3 (LOAD-02,04,05) | 1 (LOAD-01) | — |
| SLIDE | 5 | 5 | — | — | — |
| SIDE | 6 | 6 | — | — | — |
| TIMER | 10 | 9 | — | 1 (TIMER-07) | — |
| NAV | 6 | — | 6 | — | — |
| OVER | 4 | 4 | — | — | — |
| THEME | 4 | — | — | 4 | — |
| PERSIST | 6 | — | 6 | — | — |
| GUARD | 2 | — | 2 | — | — |
| WAKE | 3 | — | — | 3 | — |
| SOUND | 3 | — | — | 3 | — |
| ERR | 3 | — | — | 3 | — |
| BRAND | 5 | — | — | — | 5 |
| DIST | 6 | 6 | — | — | — |
| **Totals** | **78** | **41** | **17** | **15** | **5** |

---

## Phase Ordering Rationale

- **Phase 1 first** — Architecture lock: Parser + Store + Renderer + TimerEngine are dependency-coupled. Splitting them creates rework. The rAF + `performance.now()` timer pattern must be there from line one (Pitfall #1 is the dominant risk for the whole product).
- **Phase 2 second** — Persistence cannot ship before state shape is stable. Keyboard is a thin dispatch wrapper that only becomes correct once the action set is final. Drag-drop is a new InputController that reuses Phase 1's `LOAD_AGENDA` action. The `isEditingTarget` guard (Pitfall #5) is the keyboard layer's foundation.
- **Phase 3 third** — Polish layer that depends on Phase 1+2 foundations. Click-to-edit needs the `isEditingTarget` guard. Theme no-flash needs localStorage. Empty-state UI references both load modes (Phase 2 unlocked drag-drop). Error UI needs the parser (Phase 1) and the drop handler (Phase 2).
- **Phase 4 last** — Visual polish needs real content (Phase 1), real timer states (Phase 1), real overrun visuals (Phase 1), and the full feature surface (Phase 3 themes) to audit against. CSS-token audit pass with one-place verification.

---

*Last updated: 2026-05-16 (Phase 1 complete)*
