---
status: complete
completed: 2026-05-16
implementation_commit: b8ea193
---

# Quick Task Summary: Read Time Left Button

## Result

Added a `Read time` button to the timer controls in `meeting-manager.html`.

- Speaks the current timer remaining through browser-native `speechSynthesis`.
- Formats positive time as natural language, e.g. `7 minutes 14 seconds left`.
- Formats overrun time as natural language, e.g. `5 seconds overtime`.
- Cancels any in-progress speech before reading the latest time.
- Fails safely with an inline error if speech synthesis is unavailable.

## Verification

- Playwright smoke stubbed `speechSynthesis.speak` and confirmed `7 minutes 14 seconds left`.
- Playwright smoke confirmed overrun phrase `5 seconds overtime`.
- Parser fixtures still returned `failed: 0`.
- Static checks passed; no `fetch(` was introduced.
