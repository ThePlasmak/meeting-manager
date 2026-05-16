# Phase 4: Discord-Readiness Visual Audit - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning
**Mode:** Autonomous

## Phase Boundary

Perform the final CSS/readability audit against the completed app. The goal is Discord screenshare survivability, not adding new product workflows.

## Implementation Decisions

- Centralize minimum stage font sizes and weights as CSS custom properties.
- Keep stage text at 24px or larger, title at 72px or larger on the target desktop viewport, timer numerals at 96px or larger on the target viewport.
- Avoid `font-weight: 300` entirely.
- Ensure light and dark theme stage text contrast is high.
- Give amber state a textual/status cue in addition to color.
- Keep OVERTIME banner static, high-weight, thick outlined, and visually distinct from any source game UI.
- Verify layout at simulated 100%, 125%, and 150% browser zoom viewports.

## Code Context

All visual work lands in `meeting-manager.html`.
