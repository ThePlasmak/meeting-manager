---
phase: 2
plan: 01
name: Persistence drag-drop keyboard navigation
type: implementation
wave: 1
files_modified:
  - meeting-manager.html
autonomous: true
requirements_addressed:
  - LOAD-02
  - LOAD-04
  - LOAD-05
  - NAV-01
  - NAV-02
  - NAV-03
  - NAV-04
  - NAV-05
  - NAV-06
  - PERSIST-01
  - PERSIST-02
  - PERSIST-03
  - PERSIST-04
  - PERSIST-05
  - PERSIST-06
  - GUARD-01
  - GUARD-02
---

# Plan 02: Persistence Drag-Drop Keyboard Navigation

## Tasks

1. Add safe storage helpers, state serialization, agenda hash, debounced save, and forced save on lifecycle events.
2. Restore saved agenda/cursor/timers paused on boot, clamping cursor/sub-state indices.
3. Add `.md/.markdown/.txt` file picker and page-level drag/drop through `FileReader.readAsText()`.
4. Add replace/add-items modal when loading while an agenda exists; implement add-items by appending parsed agenda rows to current markdown and reloading.
5. Add full keyboard navigation truth table for arrows, Shift+ArrowRight, number jumps, and existing timer keys with editing-target guard.
6. Add meeting-complete slide and `beforeunload` warning only while a timer is running.

## Verification

- Browser smoke from `file://`.
- Parser fixtures still pass.
- File chooser button exists; drag/drop can load a DataTransfer file in Playwright.
- Keyboard navigation covers title, sub-states, item skip, meeting complete, back navigation, and number jumps.
- Textarea key presses do not dispatch navigation/timer changes.
- Saved state restores with paused timers and clamped cursor.
- Static scan: no `fetch(`, no module script, no runtime CDN, no `setInterval`.
