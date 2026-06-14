---
status: complete
created: 2026-06-14
---

# Quick Task: Auto-Start Timer On Slide Change

## Goal

When a timer is already running, moving to another timed slide should keep the run state active so the destination slide timer starts automatically.

## Plan

1. Find where navigation and timer run state interact in `meeting-manager.html`.
2. Remove the unconditional pause-on-slide-change behavior while preserving explicit pauses from reset and agenda reload flows.
3. Smoke test from `file://` that a running timer continues onto the next slide.
4. Publish the updated app with `publish.ps1`.

## Files

- `meeting-manager.html`
- `.planning/STATE.md`
- `.planning/quick/260614-001-auto-start-timer-on-slide-change/SUMMARY.md`
