# Phase 3: Polish Layer - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning
**Mode:** Autonomous

## Phase Boundary

Build visible polish on top of Phase 2: first-run empty state, better parser/drop errors, no-flash theme, click-to-edit timer, wake lock, and optional chime. Preserve the single-file/offline constraint.

## Implementation Decisions

- Theme defaults to light unless saved state or `prefers-color-scheme` says dark. A small head script sets `data-theme` before body paint.
- Theme toggle sits in the app chrome. Theme is saved through the Phase 2 storage wrapper.
- Empty state remains the app's initial stage when no agenda is loaded and references paste/drop/file picker.
- Parser errors appear in a persistent inline error panel with line numbers; partial parses still render.
- Drop rejects non `.md`, `.markdown`, `.txt` files with a friendly error.
- Timer click-to-edit uses a real `<input>`. Editing pauses current timer, commits on Enter/blur, reverts on Escape, and changes allocated by the same delta as remaining.
- Wake lock uses `navigator.wakeLock.request("screen")` only when supported; failures are ignored.
- Chime uses WebAudio, off by default, with a persisted toggle. Chime fires once per timer key when crossing from positive to zero/negative.

## Code Context

Phase 2 will introduce storage, lifecycle, and navigation helpers in `meeting-manager.html`. Phase 3 should reuse those rather than creating a second persistence path.

## Deferred

Full visual compression/readability audit is Phase 4.
