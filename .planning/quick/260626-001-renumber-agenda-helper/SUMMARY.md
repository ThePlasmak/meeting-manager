---
status: complete
completed: 2026-06-26
implementation_commit: 970e403
---

# Quick Task Summary: Renumber Agenda Helper

## Result

Changed `meeting-manager.html` so the agenda fix button now:

- Adds missing computed clock times as before.
- Renumbers ordered agenda lines by their actual position in the Agenda section.
- Still preserves bullet agenda lines without converting them to numbers.
- Reports fix counts for deadlines and renumbering separately while keeping the existing total `count` API for the UI.

## Verification

- Node smoke test executed the parser/helper script and confirmed `1. 2. 3. 1.` becomes `1. 2. 3. 4.` while adding computed times.
- Node smoke test confirmed a renumber-only agenda with existing `by` times is fixed and does not rewrite the times.
- `git diff --check -- meeting-manager.html` reported only the repo's line-ending normalization warning for `meeting-manager.html`.
