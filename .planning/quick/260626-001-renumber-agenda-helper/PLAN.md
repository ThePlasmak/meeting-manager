---
status: complete
created: 2026-06-26
---

# Quick Task: Renumber Agenda Helper

## Goal

Make the agenda fix button also correct ordered agenda numbering, so repeated numbers like `1. 2. 3. 1.` become `1. 2. 3. 4.`.

## Plan

1. Find the existing time-fill helper in `meeting-manager.html`.
2. Extend the same Agenda-section pass to normalize ordered list numbers.
3. Keep deadline filling behavior unchanged.
4. Smoke test both combined renumber/deadline filling and renumber-only existing-time cases.

## Files

- `meeting-manager.html`
- `.planning/STATE.md`
- `.planning/quick/260626-001-renumber-agenda-helper/SUMMARY.md`
