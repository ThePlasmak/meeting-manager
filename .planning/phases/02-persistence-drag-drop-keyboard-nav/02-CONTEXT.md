# Phase 2: Persistence + Drag-Drop + Keyboard + Nav Truth Table - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning
**Mode:** Autonomous

## Phase Boundary

Build on Phase 1's single-file parser/store/renderer/timer foundation. Add persistence, file loading, add-items flow, full keyboard navigation, and lifecycle guards without changing the no-build/offline distribution model.

## Implementation Decisions

- Use `localStorage` key `meeting-manager.v1.state`; wrap every access in `try/catch`.
- Persist `rawMarkdown`, parsed agenda, cursor, timers, theme/sound placeholders, and a text hash.
- Restore timers paused, with `startedAt: null`; never persist `performance.now()` timestamps.
- Hash raw agenda text with a deterministic string hash. Same hash restores cursor/timers; different hash resets them.
- Drag/drop and file picker use `FileReader.readAsText()`. No `fetch()`.
- Existing loaded agenda + new load opens a modal with `Replace agenda` and `Add items`. Add-items appends parsed agenda items to the current raw markdown and reloads via the same parser path.
- Keyboard truth table:
  - `ArrowRight`: title -> item 1; sub-state -> next sub-state; last sub-state -> next item; last agenda item -> meeting complete slide.
  - `Shift+ArrowRight`: current item -> next agenda item, skipping sibling sub-states; last item -> meeting complete slide.
  - `ArrowLeft`: meeting complete -> last item/sub-state; item -> previous item last sub-state or title; sub-state -> previous sub-state.
  - `1`-`9`: jump to agenda item N, first sub-state when present.
  - `Space`, `R`, `+`, `-`: existing timer controls.
  - Editing targets always return before dispatch.
- `beforeunload` only warns while any timer is running.

## Code Context

Phase 1 code lives in `meeting-manager.html` and currently has:

- parser helpers and fixtures;
- flat `state`;
- `dispatch`/`reduce`/`subscribe`;
- region-scoped `renderSidebar`, `renderStage`, `renderTimerBar`;
- single rAF timer loop.

## Deferred

Dark/light theme UI, click-to-edit, wake lock, sound, and richer error UI are Phase 3.
