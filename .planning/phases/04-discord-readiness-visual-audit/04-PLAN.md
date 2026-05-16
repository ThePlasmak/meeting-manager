---
phase: 4
plan: 01
name: Discord-readiness visual audit
type: implementation
wave: 1
files_modified:
  - agenda-presenter.html
autonomous: true
requirements_addressed:
  - BRAND-01
  - BRAND-02
  - BRAND-03
  - BRAND-04
  - BRAND-05
---

# Plan 04: Discord-Readiness Visual Audit

## Tasks

1. Add CSS tokens for body/stage/title/timer/banner font floors and apply them consistently.
2. Ensure no stylesheet `font-weight: 300` exists and stage text uses 500+ weights.
3. Strengthen light/dark contrast and add non-color timer state labels.
4. Reinforce the OVERTIME banner outline/stroke for low-bitrate readability.
5. Run browser smoke at simulated 100%, 125%, and 150% zoom viewports and fix overlap/horizontal scroll.

## Verification

- Static scan for font floors and forbidden patterns.
- Browser smoke confirms layout at all target zoom simulations.
- Overrun screenshot state has readable banner and timer.
