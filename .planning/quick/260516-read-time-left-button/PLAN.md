---
status: in_progress
created: 2026-05-16
---

# Quick Task: Read Time Left Button

## Goal

Add a timer control button that speaks the current agenda timer remaining in natural language, for example: "7 minutes 14 seconds left."

## Plan

1. Add a small formatter for spoken remaining/overtime duration.
2. Add a browser-native speech helper using `speechSynthesis`, with a safe non-throwing fallback.
3. Add a `Read time` button to the timer controls.
4. Verify through Playwright by stubbing `speechSynthesis.speak` and checking the spoken phrase.

## Files

- `meeting-manager.html`
- `.planning/STATE.md`
- `.planning/quick/260516-read-time-left-button/SUMMARY.md`
