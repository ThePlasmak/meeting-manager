# Design reference

Frozen copies of Claude Design handoff bundles. The HTML/JSX inside each version is the **prototype** — not what we ship. `meeting-manager.html` at the repo root is the production port.

## Versions

- `v1/` — initial port baseline (imported 2026-05-17).
- `v2/` — imported 2026-05-18. Delta vs v1: smoothing of discrete timer jumps (bump / set-time / reset) moved from React state + `setTimeout` to imperative Web Animations API in `useLayoutEffect`, applied to both `TimerRing` (animates `strokeDasharray`) and `FlatTimer` (animates bar `width`). Reason: driving smoothing through `useEffect` lands AFTER the new value is committed, so the CSS transition has nothing to interpolate while running. What's currently reflected in `meeting-manager.html`.

## Sync workflow

When a new bundle arrives:

1. Drop it in `design-reference/vN/` (next integer).
2. `diff -r design-reference/vN-1 design-reference/vN` to see what actually changed.
3. Port only the deltas into `meeting-manager.html`. Don't redo the whole thing.

This is why the bundles stay in git rather than in `.tmp-import/`.
