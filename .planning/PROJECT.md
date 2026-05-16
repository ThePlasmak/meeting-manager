# Meeting Manager — Agenda Presenter

## What This Is

A single-file local HTML tool that turns a Markdown meeting agenda into a Marp-style slide deck with per-slide timers and a clickable agenda sidebar. Sarah double-clicks `meeting-manager.html`, pastes (or drops in) her agenda markdown, and screenshares the result into Discord to run timed meetings. No build step, no server, works offline.

## Core Value

**Paste markdown → run a timed meeting on screenshare without fiddling.** If the parser, the timer, and the sidebar all work for the agenda format below, everything else is polish.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

- [ ] Parse the exact Markdown agenda format (Meeting Admins block + numbered Agenda block with title, attribution, duration, deadline)
- [ ] Tolerate em-dash `—`, en-dash `–`, or `--` between title and duration
- [ ] Handle "max per person" duration semantics — split an item into per-person sub-states each with their own timer (one slide, advances Sarah → Teck Lee → Solomon)
- [ ] Render slide 1 as a title slide with Meeting Master and Notetaker info
- [ ] Render each agenda item as a clean Marp-style slide (large title, attribution subtitle, deadline badge)
- [ ] Provide a left sidebar (~25%) with numbered agenda + expandable sub-items for "max per person" entries (1a, 1b, 1c); clicking jumps to that slide/sub-state AND resets its timer
- [ ] Bottom fixed timer bar showing `MM:SS remaining / MM:SS allocated`
- [ ] Timer counts down, turns amber at 25% remaining, red at 0, keeps counting into negatives
- [ ] Overrun visual = whole slide tints red with Overwatch-style "OVERTIME" banner
- [ ] Pause/play, ±1 min, click-to-edit time, reset, advance — all via toolbar and keyboard
- [ ] Per-slide timer state — navigating away and back returns to that slide's running/paused state
- [ ] Keyboard shortcuts: Space (pause), → (next person, then next item), Shift+→ (skip remaining people, jump to next item), ← (prev), 1–9 (jump), R (reset), +/− (±1 min)
- [ ] Light mode default, dark mode toggle (button visible in UI), preference persisted in localStorage
- [ ] Auto-save full state to localStorage — agenda + current slide + per-slide timer states — reload restores exactly where you were
- [ ] Drag-and-drop a `.md` file as an alternative to pasting into the textarea
- [ ] Lightweight, lean code — vanilla HTML/CSS/JS preferred; Reveal.js only if vanilla gets unwieldy

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Multi-user / collaboration features — solo presenter on Discord screenshare is the only use case
- Audience-side view or remote control — only Sarah drives; everyone else just watches the screenshare
- Auto-advance when timer hits zero — overrun is meant to be visible, not hidden
- Auth / cloud sync — local-first, single-machine; localStorage is enough
- Build step or package manager — must open by double-clicking the .html file
- Mobile/touch UI — desktop-only; designed for screensharing from a laptop
- Editing the agenda inside the tool — markdown is the source of truth; edit the .md, reload
- Speaker notes, exports (PDF/PPT), animations — out of scope for v1; Marp aesthetic means clean and static
- Calendar integration / meeting auto-import — paste-driven only

## Context

- **Source format is fixed.** Sarah already writes agendas in the exact shape shown in README.md. The parser must match that shape, not a generalized Markdown spec.
- **Use case is real and recurring.** Sarah runs meetings on Discord screenshare. The pain is timekeeping while presenting — current tools either show slides (no timer) or show a timer (no slides/markdown).
- **Prior research summary** (from README.md): no existing tool combines markdown-agenda → slides + per-item timer + clickable sidebar. FMJansen/agenda is slides-only, meetingtimer.eu is timer-only, stagetimer.io is paid and no-markdown. Custom build is the path.
- **Aesthetic reference**: Marp slides (lots of whitespace, one accent color, sans-serif Inter/system stack) for the slide body; Overwatch's "OVERTIME" banner for overrun.

## Constraints

- **Tech stack**: Vanilla HTML/CSS/JS in a single file. No build step. No package manager. Reveal.js allowed as a CDN script *only* if vanilla becomes unwieldy.
- **Distribution**: Must open by double-clicking the `.html` file from disk. Works offline once loaded.
- **Deliverable**: One file — `meeting-manager.html`. Self-contained. No external CDN unless it saves significant code.
- **Persistence**: Browser localStorage only. No server, no cloud, no auth.
- **Target environment**: Modern Chromium-based desktop browser (Chrome/Edge), screenshared into Discord. No need to support old browsers, no need to support mobile.

## Key Decisions

| Decision                                                                                                      | Rationale                                                                                             | Outcome   |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------- |
| Single-file vanilla HTML over framework                                                                       | "Lightweight and simple" — must double-click open, no build                                           | — Pending |
| "Max per person" splits into per-person sub-states on one slide (not separate slides, not one combined slide) | Sarah's mental model: each person speaks in turn under one agenda item, but each gets their own timer | — Pending |
| Meeting Admins shown as slide 1 (not header strip, not hidden)                                                | User explicitly chose: "make it slide 1"                                                              | — Pending |
| Light mode default + dark toggle in UI                                                                        | User wants flexibility but defaults to Marp's clean light aesthetic                                   | — Pending |
| Auto-save everything (agenda + slide + timer state)                                                           | Browser crash mid-meeting is a real risk on screenshare; full restore beats partial                   | — Pending |
| Right-arrow advances person-by-person; Shift+→ skips to next agenda item                                      | Power-user-friendly default, escape hatch when a person is absent                                     | — Pending |
| Overrun = full-slide red tint + Overwatch "OVERTIME" banner                                                   | User wants the aggressive Overwatch styling, full visibility                                          | — Pending |
| Don't auto-advance on timer zero                                                                              | Overrun should be visible, not hidden — meeting discipline is the user's job, not the tool's          | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):

1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):

1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-16 after initialization*
