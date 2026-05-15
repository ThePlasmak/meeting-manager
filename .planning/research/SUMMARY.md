# Project Research Summary

**Project:** Meeting Manager — Agenda Presenter
**Domain:** Single-file local HTML tool — Markdown agenda → Marp-style slide deck + per-slide timer + clickable sidebar, screenshared into Discord
**Researched:** 2026-05-16
**Confidence:** HIGH

## Executive Summary

Solo-presenter meeting-running tool: paste Markdown → render a Marp-style slide deck with a per-slide countdown timer and a clickable agenda sidebar, screenshare into Discord. Market gap is unambiguous — slide tools (Marp, Reveal.js, FMJansen/agenda) don't time; timer tools (meetingtimer.eu, stagetimer.io) don't render slides from Markdown; stagetimer is paid + cloud (violates offline-first). All four research tracks agree: build it custom, in vanilla HTML/CSS/JS, in one file, with one library inlined (`marked` v18 UMD, ~36 KB), targeting modern Chromium because the deliverable runs from `file://` on Sarah's laptop.

Architecture: tiny one-file app: a pure Markdown→IR parser, a single mutable store with reducer + subscribe, **one `requestAnimationFrame` loop** driving a **`performance.now()`-derived** timer (no counter decrement, no per-slide intervals), and a region-scoped renderer that is the only DOM writer. `rawMarkdown` is persisted alongside the parsed IR so re-parsing on schema change is free; an agenda-text hash gates whether per-slide timer state is restored across reloads. Discord compression, `file://` storage quirks, and Chrome background-tab timer throttling all fall out of this architecture rather than needing special-case handling.

**Dominant risk:** timer correctness on a live screenshare. A counter-style timer drifts seconds per minute under load and minutes when the tab is backgrounded; the only acceptable pattern is wall-clock-derived (`performance.now()` deltas + `accumulatedMs`, never decrement). **Secondary risks:** silent parser failures on real-world Markdown variants (em/en-dash, smart quotes, BOM, decimals like `7.5 min`), `file://` localStorage edge cases (per-path origin isolation, Firefox `SecurityError`, duplicate tabs racing), Discord H.264 making thin fonts and red-on-red banners illegible. All have known mitigations already documented; the roadmap just has to enforce them.

## Key Findings

### Recommended Stack

Vanilla HTML5 + ES2024 in **one file**, no build step, no framework. Reactive surface (~12 DOM regions, one timer loop) is well under the threshold where Alpine.js / Petite-vue / Mithril would pay for themselves. Inline `marked` v18.0.3 via its `lexer()` API — semantics (title / duration / deadline / `max N min per person`) are extracted by walking the token stream. Fonts: OS system stack (not Google Fonts — breaks offline). Persistence: `localStorage` with try/catch + schema-version wrapper.

**Core technologies:**
- **Vanilla HTML/CSS/JS (ES2024)** — zero build, double-click open; CSS `:has()`, `light-dark()`, nesting Baseline-stable
- **`marked` v18.0.3 UMD inlined** — ~36 KB, zero deps; use `marked.lexer()` for a token stream
- **`localStorage` with versioned wrapper** — key `meeting-manager.v1.state`, debounce 500ms, force-flush on `pagehide`, try/catch every call
- **System font stack** — zero bytes, always offline; opt-in Inter Variable WOFF2 base64 only if visual demo fails the Marp test

**Locked decisions (do not re-litigate):**
- Vanilla + `marked` v18 UMD + system fonts
- Single mutable store + render-on-change (no framework, no immutability ceremony)
- One loop for the whole app — never per-slide intervals
- rAF-driven timer using `performance.now()` deltas — never decrement a counter
- `rawMarkdown` stored alongside parsed IR for trivial migration

**Explicitly rejected:** Reveal.js, Marp Core (Node-first), Google Fonts CDN, `<script type="module">` (fails on `file://`), `fetch('agenda.md')` (CORS-blocked on `file://`), TypeScript, React/Vue/Svelte, `markdown-it`.

### Expected Features

PROJECT.md's Active list is already well-scoped. Research surfaced **five P1 gaps** implied but not explicit.

**Must have (in Active list):** tolerant parser, Marp slides, per-slide countdown with green/amber/red, overrun with OVERTIME banner, pause/±1/reset/advance/prev/Shift+→/1-9, click-to-edit, sidebar with sub-item expand and click-jump-reset, per-slide state preservation, auto-save, drag-drop `.md`, light/dark toggle, title slide for Meeting Admins.

**Must have (P1 gaps not yet in PROJECT.md):**
1. **Empty-state UI** — clear "paste markdown here or drop a .md file" prompt
2. **Inline parser error with line number** — silent blank screen is the worst failure mode
3. **`beforeunload` confirmation while a timer is running** — mid-tick reload on screenshare is jarring
4. **Per-person attribution visible on each sub-state slide** — "Teck Lee — 5 min", not just "5 min"
5. **Click-to-edit clarification** — disambiguate allocated vs remaining

**Should have (P2, defer to v1.x):** Screen Wake Lock during timer, optional chime (off default), quick-help on `?`, total-meeting elapsed clock, sidebar elapsed-vs-allocated, compact HUD (`H`).

**Defer (v2+ / needs user sign-off):** post-meeting summary markdown to clipboard (overlaps "no exports" Out-of-Scope), animated OVERTIME banner, per-item notes.

**Anti-features (do not build):** auto-advance on zero, in-tool agenda editing, multi-user/cloud, mobile/touch, speaker notes, PDF/PPTX export, transitions, calendar integration, webcam overlay, per-action sound, auto-pause on blur, themes beyond light/dark.

### Architecture Approach

One file, seven modules talking through a single mutable store. **One-way data flow:** UI dispatches → reducer mutates → store notifies → renderer paints. Renderer is the only DOM writer. Store is the only state mutator. TimerEngine owns the only loop.

**Major components:**
1. **Parser (pure)** — `parseAgenda(md) → IR`; `marked.lexer()` + regex extraction; no side effects
2. **AgendaModel (pure)** — selectors: `getSlide(i)`, `currentTimerKey(state)`
3. **Store** — `state = { agenda, cursor, timers, theme, ui }` + `dispatch` + `subscribe`; ~40 lines, mutate-in-place
4. **TimerEngine** — single rAF loop; derives `remainingMs` from `performance.now() - startedAt + accumulatedMs`; never decrements
5. **Router / SlideController** — pure functions translating NEXT/PREV/JUMP/SHIFT_NEXT into reducer mutations; owns sub-state truth table
6. **Renderer** — region-scoped (`renderSidebar`, `renderStage`, `renderTimerBar`); diffs by region to preserve sidebar state and avoid flicker
7. **PersistenceLayer** — debounced 500ms; try/catch wrapped; force-flush on `pagehide`; stores rawMarkdown + IR + agenda-hash
8. **KeyboardController / InputController / ThemeController** — thin dispatch wrappers; keyboard early-returns on editing targets

**Composite timer key:** plain items get `"3"`; per-person sub-states get `"3.0"`, `"3.1"`, `"3.2"`. `state.timers` is a flat dict; sub-state never leaks into Store/TimerEngine/Persistence.

**Architecture-proposed build order:** Parser → AgendaModel → Store → Renderer → TimerEngine → Router → Persistence → Keyboard → Input → Theme → Overtime polish. Store before TimerEngine (else write it twice); Renderer before TimerEngine (visual verification); Persistence after state shape settles (avoid schema churn).

### Critical Pitfalls

Non-negotiable five for a screenshared meeting tool:

1. **Timer drift from `setInterval(remaining--)`** — drifts seconds/minute under load, minutes when backgrounded. **Prevention:** store `allocatedMs`, `startedAt`, `accumulatedMs`, `paused`; derive `remainingMs` from `performance.now()` deltas every rAF; never decrement. Test: 5-min alt-tab must snap to truth. **Phase 1.**
2. **Parser breaks on real-world Markdown** — `--` vs `—` vs `–`, decimal `7.5 min`, smart quotes from Notion, BOM, names with apostrophes. **Prevention:** explicit normalization on intake, fixture file with all 10+ variants, inline error UI for whatever survives. **Phase 1.**
3. **`file://` localStorage edge cases** — per-path origin isolation, Firefox `SecurityError`, Incognito. **Prevention:** try/catch from first `setItem`; degrade to in-memory with warning; namespace key; persist `accumulatedMs` (duration) not `startedAt` (per-document, resets on reload). **Phase 2.**
4. **Reload restores wrong elapsed time** — `performance.now()` is per-document; restoring `startedAt` is meaningless. **Prevention:** auto-pause on restore; persist `accumulatedMs` not `startedAt`; hash the agenda text — same hash = restore timers, different hash = reset slide index and timers but keep theme + agenda text; bounds-check restored indices. **Phase 2.**
5. **Keyboard shortcuts fire in textarea** — typing `1` jumps to slide 1; `r` resets. **Prevention:** five-line guard early-returning if `event.target.tagName in {INPUT, TEXTAREA}` or `isContentEditable`. Use real `<input>` for click-to-edit, not contenteditable. **Phase 3.**

Other critical-grade items: duplicate-tab corruption (heartbeat or documented limitation), rapid-keystroke / overrun-semantics table (write before coding), sub-state navigation truth table (8 boundary cases), Discord compression (font weight ≥500, size ≥24px, AAA contrast, white/black stroke on OVERTIME banner, `tabular-nums`), Overwatch IP (CSS-only, shifted colours, different typeface; call it "overrun banner" in user-facing strings).

## Implications for Roadmap

PROJECT.md's `granularity: coarse` setting means **4 phases, not 11**. Architecture's 11-step module order, Pitfalls' phase-mapping, and Features' grouping all reconcile cleanly. **Dependency-critical rule: Parser, Store, Renderer, and TimerEngine all land in Phase 1.**

### Phase 1: Core Engine — Parser, Slides, Sidebar, Timer

**Rationale:** Parser anchors every later feature; Timer is the heart of the product; both researches say "get these right first or everything later is a workaround." Static rendering included so timer correctness is visually verifiable.

**Delivers:** Loadable agenda. Paste markdown → see slides + sidebar + working countdown with wrap-up colours and overrun. No persistence/keyboard yet.

**Addresses (features):** Tolerant Markdown parser, Marp-style slides, sidebar with expandable sub-items, per-slide countdown with green/amber/red, overrun + OVERTIME banner, per-person attribution on sub-state slides (P1 gap), empty-state UI (P1 gap), inline parser error (P1 gap).

**Implements (architecture):** Parser, AgendaModel selectors, Store + reducer skeleton, Renderer (region-scoped), TimerEngine (rAF + `performance.now()`).

**Avoids (pitfalls):** #1 timer drift (rAF + wall-clock derivation day one), #4 parser edge cases (fixture file with 10+ variants), #18 smart quotes, #19 title-slide-vs-agenda-item numbering.

### Phase 2: Persistence + Input — Drop, Auto-Save, Restore

**Rationale:** State shape must be frozen before persistence is wired. With Phase 1's store stable, persistence = debounced subscriber + boot-time loader. Drag-drop slots in naturally (dispatches `LOAD_AGENDA`). Auto-pause-on-restore + agenda-hash make crash-recovery honest.

**Delivers:** State survives crashes and reloads. Drop `.md` to load. `beforeunload` warns mid-timer.

**Uses (stack):** `localStorage` with schema-version wrapper, `FileReader.readAsText()` (NOT `fetch()`).

**Implements (architecture):** PersistenceLayer (debounced 500ms, force-flush on `pagehide`/`visibilitychange`/`beforeunload`), InputController, agenda-text hash for stale-state detection.

**Avoids (pitfalls):** #2 `file://` localStorage / Firefox, #3 duplicate-tab corruption, #7 reload-restore wrong elapsed, #12 drag-drop browser hijack, #16 async autosave on close.

**Addresses (features):** Auto-save, drag-and-drop `.md`, `beforeunload` confirmation (P1 gap).

### Phase 3: Interactions — Keyboard, Navigation, Click-to-Edit, Theme

**Rationale:** Keyboard and Router come late — thin dispatch wrappers, correct only once action set is final and state shape stable. Sub-state navigation truth table and overrun semantics table are design artifacts to write *before* coding. Theme rides along.

**Delivers:** Fully driveable tool. Space, ←/→, Shift+→, 1-9, R, +/− all work. Sidebar click jumps-and-resets. Click time to edit. Light/dark toggle.

**Implements (architecture):** Router (NEXT/PREV/JUMP/SHIFT_NEXT with sub-state semantics), KeyboardController with `isEditingTarget` guard, click-to-edit `<input>`, ThemeController.

**Avoids (pitfalls):** #5 keyboard fires in textarea, #6 rapid-clicks / overrun semantics, #10 sub-state navigation truth table, #11 dark-mode flash (read theme in inline `<script>` in `<head>`), #17 sidebar scroll resets, #20 reset-ambiguity.

**Addresses (features):** All keyboard shortcuts, click-to-edit with allocated-vs-remaining clarification (P1 gap), light/dark toggle, sidebar expand/collapse defaults.

**Open user decisions required before this phase:**
- Drag-drop semantics: **replace** with confirm (if loaded), or **merge/append**? (recommend replace + confirm)
- Single-hyphen separator `- ` between title and duration: support with `(?=\d+\s*(?:min|m|minutes))` lookahead? (recommend yes)
- Click-to-edit scope: allocated, remaining, or both? (recommend both, visually distinct)
- Sidebar expand default: current item expanded, others collapsed? (recommend yes)
- End-of-agenda `→` from last sub-state of last item: no-op, wrap, or "complete" slide? (recommend no-op + subtle hint)
- R-resets-what for sub-states: current sub-state only, or whole item? (recommend current; Shift+R or omit for whole item)
- Duplicate-tab handling: heartbeat + warning, or documented limitation? (recommend documented v1, heartbeat v1.1)

### Phase 4: Visual Polish — Overtime, Discord-Readiness, Aesthetic

**Rationale:** Polish last because every other phase has to work first. OVERTIME depends on overrun signal; Discord-readiness floors depend on real content. Polish = audit pass: font weights, sizes, contrast, `tabular-nums`, zoom tolerance, theme correctness — set as CSS custom properties for one-place auditing.

**Delivers:** Screenshare-ready. Slides survive Discord H.264. OVERTIME banner legible at 720p low bitrate. No flash of wrong theme. Numerals don't wiggle. Layout intact at 100%/125%/150% zoom.

**Implements (architecture):** Overtime visuals (CSS `:has()`, static not animated), final CSS token audit.

**Avoids (pitfalls):** #8 Discord screenshare quality, #9 Overwatch IP, #13 browser zoom, #15 timer digit wiggle.

### Phase Ordering Rationale

- **Parser+Timer first** — both researches agree
- **Persistence before Keyboard** — auto-save subscriber needs stable state shape
- **Keyboard+Navigation grouped** — share action set, sub-state truth table, `isEditingTarget` guard
- **Polish last** — OVERTIME needs timer; Discord audit needs real content
- **Coarse granularity (4 phases)** — PROJECT.md setting + clean four-way split

### Research Flags

Phases likely needing `/gsd-research-phase` during planning:
- **Phase 1:** Likely yes — rAF + `performance.now()` derivation has subtle edges; Parser quirk table deserves fixture-driven design pass
- **Phase 2:** Likely yes — duplicate-tab heartbeat decision needs user input; agenda-hash strategy and "different hash = reset" UX flow needs design
- **Phase 3:** Almost certainly yes — 7+ open user decisions need sign-off before coding
- **Phase 4:** Maybe — patterns are well-documented; real Discord-screenshare validation session needed

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | `marked` versions/sizes verified GitHub Releases + jsDelivr; `file://` gotchas cross-checked MDN + Chromium bug tracker; Can I Use confirms baseline features |
| Features | HIGH | Table stakes / anti-features anchored in PROJECT.md + stagetimer.io + Marp/Reveal conventions; MEDIUM only on niche differentiators (Wake Lock, chime, summary export) |
| Architecture | HIGH | Standard store/reducer/renderer pattern; rAF + `performance.now()` well-trodden; composite key for sub-state timers a clean fit |
| Pitfalls | HIGH | Timer / `file://` / Discord findings cross-verified against MDN, Chrome dev blog, Discord support, Mozilla bugzilla |

**Overall confidence:** HIGH

### Gaps to Address

- **User decisions on Phase 3 semantics** (drag-drop merge vs replace, single-hyphen parser, click-to-edit scope, sidebar expand default, end-of-agenda `→`, R-reset for sub-states, duplicate-tab) — walk truth tables with Sarah before Phase 3 starts
- **Post-meeting summary clipboard export** — overlaps "no exports" Out-of-Scope; needs explicit user sign-off
- **`setInterval(250ms)` vs `requestAnimationFrame` for dispatch cadence** — both work; decide in Phase 1 planning
- **Per-person attribution shape in IR** — PROJECT.md implicit; one design pass in Phase 1 planning
- **Real Discord screenshare validation** — floors are research-backed but should be validated against a real Sarah-led Discord meeting before declaring Phase 4 done

## Sources

### Primary (HIGH confidence)
- MDN — `Window.localStorage`, `setInterval` throttling, Page Visibility API, Web Storage quotas, CSS custom properties
- Chrome for Developers — "Heavy throttling of chained JS timers beginning in Chrome 88", "View Transitions in 2025"
- GitHub Releases — `marked` v18.0.3 release notes (UMD build)
- jsDelivr — `marked` UMD bundle location and size
- Can I Use — `:has()` Baseline 2023, View Transitions Chrome 111+, `light-dark()` Chrome 123+
- Blizzard Logo and Trademark Guidelines — Overwatch banner IP framing
- Discord Voice/Video/Streaming Guide + support community — H.264 compression
- whatwg/html#3099 — `file://` document origin officially unspecified
- Mozilla bugzilla #507361 — Firefox `localStorage` on `file://` throws
- stagetimer.io features + docs — wrap-up colour/chime conventions
- Reveal.js keyboard shortcuts + Marpit Markdown spec
- PROJECT.md and README.md (this repo) — agenda format, "max per person" semantics

### Secondary (MEDIUM confidence)
- PkgPulse — markdown-it vs marked 2026
- Alpine.js installation docs — microlib trade-off
- Chromium issue 514076 — `file://` localStorage
- DEV.to "Autosave works. Until it doesn't"
- Slido "four methods to prevent overruns"
- Read the Tea Leaves — "Why do browsers throttle JavaScript timers?" (Mozilla engineer)
- CKEditor — "ContentEditable: The Good, the Bad and the Ugly"

---
*Research completed: 2026-05-16*
*Ready for roadmap: yes*
