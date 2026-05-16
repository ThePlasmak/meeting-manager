# STATE — Meeting Manager

**Last updated:** 2026-05-16 (v1 complete)
**Mode:** MVP
**Granularity:** coarse (4 phases)

---

## Project Reference

**What this is:** Single-file local HTML tool — `meeting-manager.html` — that turns a Markdown meeting agenda into a Marp-style slide deck with per-slide timers and a clickable agenda sidebar. Sarah double-clicks the file, pastes or drops her agenda markdown, and screenshares the result into Discord to run timed meetings.

**Core value:** Paste markdown → run a timed meeting on screenshare without fiddling.

**Current focus:** v1 complete. All roadmap phases are implemented in `meeting-manager.html`; remaining work is optional manual Discord screenshare validation.

---

## Current Position

**Phase:** Complete
**Plan:** All v1 phase plans executed
**Status:** v1 complete; milestone audit passed
**Progress:** ██████████ 4/4 phases complete (100%)

```
Phase 1 ██████████  complete
Phase 2 ██████████  complete
Phase 3 ██████████  complete
Phase 4 ██████████  complete
```

---

## Phase Summary

| #   | Phase                                                                      | Status   | Requirements | Plans |
| --- | -------------------------------------------------------------------------- | -------- | ------------ | ----- |
| 1   | MVP Vertical Slice — Paste, Render, Tick, Click                            | Complete | 41           | 4/4   |
| 2   | Persistence + Drag-Drop + Keyboard + Nav Truth Table                       | Complete | 17           | 1/1   |
| 3   | Polish Layer — Empty State, Errors, Theme, Click-to-Edit, Wake Lock, Chime | Complete | 15           | 1/1   |
| 4   | Discord-Readiness Visual Audit                                             | Complete | 5            | 1/1   |

**Total v1 requirements:** 78 (100% mapped)

---

## Performance Metrics

(Filled in as phases complete.)

| Phase | Plans | Plans Repaired | Verifier Issues | Code Review Issues | Notes                                                           |
| ----- | ----- | -------------- | --------------- | ------------------ | --------------------------------------------------------------- |
| 1     | 4     | 0              | 0 open          | Not run            | Commit `eef3112`; Playwright + static distribution smoke passed |
| 2     | 1     | 0              | 0 open          | Inline review      | Commit `5801cb9`; Playwright smoke passed                       |
| 3     | 1     | 0              | 0 open          | Inline review      | Commit `5801cb9`; Playwright smoke passed                       |
| 4     | 1     | 0              | 0 open          | Inline review      | Commit `5801cb9`; layout/static audit passed                    |

---

## Accumulated Context

### Locked Decisions (do not re-litigate)

From `.planning/research/SUMMARY.md`:

- **Tech stack:** Vanilla HTML5 + ES2024 in one file. No build, no framework, no package manager.
- **Markdown library:** `marked` v18.0.3 UMD inlined (~36 KB), use `lexer()` token-stream API.
- **Persistence:** `localStorage` with versioned key `meeting-manager.v1.state`, debounce 500ms, force-flush on `pagehide` / `visibilitychange:hidden` / `beforeunload`, try/catch every call.
- **Fonts:** OS system stack; no Google Fonts CDN.
- **Architecture:** Single mutable store + reducer + subscribe; one rAF loop for the whole app; `performance.now()`-derived timer (never decrement a counter); region-scoped renderer (Sidebar / Stage / TimerBar); composite timer key `"3"` / `"3.0"`.
- **Build order (within Phase 1):** Parser → AgendaModel → Store → Renderer → TimerEngine. (Then Phase 2: Persistence + Input + Keyboard. Phase 3: Theme + Click-to-edit + Wake + Sound + Errors. Phase 4: Visual audit.)
- **Persist `accumulatedMs` (duration), NOT `startedAt` (timestamp)** — `performance.now()` is per-document; cross-reload comparison is nonsense.
- **Restore always in paused state** — never auto-resume a running timer on reload.
- **Agenda-text hash gates timer restoration** — same hash → restore timers; different hash → reset cursor + timers, preserve theme + raw text.
- **Overwatch banner = CSS-only recreation** — different typeface, shifted colors, called "overrun banner" in user-facing strings.

### Critical Pitfalls (per phase)

From `.planning/research/PITFALLS.md`:

**Phase 1:**
- Pitfall #1: Timer drift from counter-decrement → rAF + `performance.now()` derivation, day one.
- Pitfall #4: Parser breaks on real-world Markdown → fixture file with all 10+ variants, parse on every save.
- Pitfall #18: Smart quotes / unicode → NFC-normalize on intake; render via `textContent`, never `innerHTML` for user content.
- Pitfall #19: Title slide breaks numbering → keep `slide[]` vs `agendaItem[]` separate.

**Phase 2:**
- Pitfall #2: `file://` localStorage / Firefox `SecurityError` → try/catch every call, in-memory fallback with banner.
- Pitfall #3: Duplicate-tab corruption → v1 ships with documented limitation; heartbeat is v1.1.
- Pitfall #5: Keyboard fires in textarea → `isEditingTarget(e)` guard, five lines, at top of every keydown handler.
- Pitfall #7: Reload restore wrong elapsed → always restore paused; persist `accumulatedMs`; hash agenda; bounds-check indices.
- Pitfall #10: Sub-state navigation truth table → write the 8 boundary cases as code comments before implementing NAV.
- Pitfall #12: Drag-drop browser hijack → `e.preventDefault()` on `dragenter`/`dragover`.
- Pitfall #14: `performance.now()` per-document → don't persist timestamps; persist durations.
- Pitfall #16: Async autosave on close → force-flush on `pagehide`.

**Phase 3:**
- Pitfall #6: Rapid clicks / overrun semantics → write the explicit table; pause-while-overrun freezes negative; reset-while-overrun restores paused.
- Pitfall #11: Dark mode flash → inline `<script>` in `<head>` reads theme before paint.
- Pitfall #17: Sidebar scroll resets → incremental sidebar updates (toggle `.active`), don't blast `innerHTML`.
- Pitfall #20: Reset ambiguity → R resets current sub-state only; document.

**Phase 4:**
- Pitfall #8: Discord compression → font weight ≥ 500, size ≥ 24px, AAA contrast, OVERTIME banner has stroke.
- Pitfall #9: Overwatch IP → CSS-only, different typeface, shifted hues; "overrun banner" in copy.
- Pitfall #13: Browser zoom → `clamp()` + CSS grid `minmax()`; test 100/125/150%.
- Pitfall #15: Timer digit wiggle → `font-variant-numeric: tabular-nums`.

### Open Questions Requiring User Sign-Off (Phase 3 prerequisite)

From `.planning/research/SUMMARY.md` Phase 3 section:

1. Drag-drop semantics: **replace** with confirm (if loaded), or **merge/append**? (research recommends: replace + confirm; LOAD-04/05 covers both modes via modal.)
2. Single-hyphen separator support with `(?=\d+\s*(?:min|m|minutes))` lookahead? (research recommends: yes.) PARSE-07 already locks this in.
3. Click-to-edit scope: allocated, remaining, or both? (research recommends: edit *remaining*; coupled-adjust *allocated* by same delta.) TIMER-07 locks this in.
4. Sidebar expand default: current item expanded, others collapsed? (research recommends: yes.) SIDE-03 locks this in.
5. End-of-agenda `→` from last sub-state of last item: no-op, wrap, or "Meeting complete" slide? (research recommends: no-op + hint.) NAV-05 chose: "Meeting complete" slide.
6. R-resets-what for sub-states: current sub-state only, or whole item? (research recommends: current.) TIMER-08 locks this in: current sub-state only.
7. Duplicate-tab handling: heartbeat + warning, or documented limitation? (research recommends: documented v1, heartbeat v1.1.) Deferred to v2.

### Todos / Reminders

- [x] Write the parser fixture file (`test-agendas.md` or inline test strings) with all 10+ variants BEFORE writing the parser (Phase 1).
- [x] Pin the sub-state navigation truth table (Pitfall #10) into code comments BEFORE writing NAV (Phase 2).
- [x] Pin the overrun semantics table (Pitfall #6) into code comments BEFORE writing click-to-edit or reset-during-overrun (Phase 3).
- [ ] After Phase 4, run the real-Discord-screenshare validation session (screenshot to a second account/device).

### Blockers

None.

### Quick Tasks Completed

| #          | Description                                                        | Date       | Commit  | Directory                                                               |
| ---------- | ------------------------------------------------------------------ | ---------- | ------- | ----------------------------------------------------------------------- |
| 260516-001 | Sync AGENTS.md and CLAUDE.md via hardlink and concise shared guide | 2026-05-16 | 8949fb0 | [260516-001-agents-claude-sync](./quick/260516-001-agents-claude-sync/) |
| 260516-002 | Add spoken time-left button to timer controls                      | 2026-05-16 | b8ea193 | [260516-read-time-left-button](./quick/260516-read-time-left-button/)   |

---

## Session Continuity

**Last session:** 2026-05-16 — Completed v1 phases 2-4 into `meeting-manager.html`, verified the full local browser workflow, and wrote milestone audit.

**Resume hint:** v1 is complete. Optional next step is a real Discord screenshare compression check.

**v1 completion:** Parser with inline fixtures, Store + reducer skeleton, Renderer (region-scoped: Sidebar / Stage / TimerBar), TimerEngine (single rAF + `performance.now()` derivation), persistence, drag/drop, keyboard navigation, theme, error UI, click-to-edit, wake lock, sound toggle, and Discord-readiness CSS audit, all in `meeting-manager.html` opened by double-click.

---

*Last updated: 2026-05-16 (v1 complete)*
