# Walking Skeleton - Meeting Manager

**Phase:** 1
**Generated:** 2026-05-16

## Capability Proven End-to-End

Sarah can open `meeting-manager.html` from disk, paste agenda Markdown, render title and agenda slides, click the sidebar, and run a truthful countdown timer with overrun state.

## Architectural Decisions

| Decision        | Choice                                              | Rationale                                                                       |
| --------------- | --------------------------------------------------- | ------------------------------------------------------------------------------- |
| Runtime         | One classic HTML file with inline CSS and JS        | Required by the double-click/offline distribution model                         |
| Framework       | Vanilla DOM, store, reducer, and renderer           | The app is small enough that framework/build overhead would violate constraints |
| Markdown parser | Inlined `marked` UMD, lexer API                     | Handles Markdown tokenization without requiring a package manager at runtime    |
| State           | Single mutable store with dispatch/subscribe        | Keeps parser, renderer, sidebar, and timer consistent                           |
| Timer           | Single rAF loop with `performance.now()` derivation | Prevents drift and background-tab lies                                          |
| Persistence     | Not in Phase 1                                      | Phase 2 owns localStorage after state shape is stable                           |
| Deployment      | Local file open only                                | The product is distributed as `meeting-manager.html`                            |

## Stack Touched in Phase 1

- [x] Local project scaffold: `meeting-manager.html`
- [x] Parser: Markdown agenda text to agenda IR
- [x] UI: paste/load surface, sidebar, stage, timer bar
- [x] Interaction: sidebar click, timer controls
- [x] Verification: inline parser fixtures and manual browser smoke tests
- [ ] Persistence: deferred to Phase 2

## Out of Scope

- Drag/drop file loading and localStorage restore
- Full navigation keyboard truth table
- Theme toggle, wake lock, chime, parser error polish
- Discord compression audit beyond Phase 1 baseline readability

## Subsequent Slice Plan

- Phase 2: persistence, drag/drop, keyboard navigation, and reload guards
- Phase 3: empty state, parser error UI, theme, click-to-edit, wake lock, chime
- Phase 4: Discord-readiness visual audit
