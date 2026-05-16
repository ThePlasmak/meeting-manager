---
phase: 3
plan: 01
name: Polish theme errors edit wake sound
type: implementation
wave: 1
files_modified:
  - meeting-manager.html
autonomous: true
requirements_addressed:
  - LOAD-01
  - TIMER-07
  - THEME-01
  - THEME-02
  - THEME-03
  - THEME-04
  - WAKE-01
  - WAKE-02
  - WAKE-03
  - SOUND-01
  - SOUND-02
  - SOUND-03
  - ERR-01
  - ERR-02
  - ERR-03
---

# Plan 03: Polish Theme Errors Edit Wake Sound

## Tasks

1. Add no-flash theme boot script, theme CSS tokens, and a UI toggle persisted through storage.
2. Replace the basic empty state with a first-run state that points to paste, drop, and file loading.
3. Add structured error panel for parser and file type errors; keep partial parse visible.
4. Add timer click-to-edit input with Enter/blur commit and Escape revert.
5. Add wake lock acquisition/release around running timers and visible-tab re-acquire.
6. Add optional WebAudio chime toggle, off by default, with one-shot zero crossing behavior.

## Verification

- Browser smoke confirms no-flash theme attribute and theme persistence.
- Broken agenda shows error panel and still renders parsed items.
- `.png` drop shows friendly unsupported-file error.
- Timer edit commits `5:00` and adjusts allocated by the same delta; Space in input does not toggle timer.
- Wake lock unsupported path does not throw.
- Chime toggle persists and zero crossing does not spam repeated sounds.
