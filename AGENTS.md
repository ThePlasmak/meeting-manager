# CLAUDE.md / AGENTS.md

## Project

Meeting Manager - Agenda Presenter is a single-file local HTML tool.
Sarah double-clicks `meeting-manager.html`, pastes or drops a Markdown meeting agenda, and screenshares a Marp-style timed slide deck into Discord.

Core value: paste markdown -> run a timed meeting on screenshare without fiddling.

## Hard Constraints

- One deliverable: `meeting-manager.html`.
- Vanilla HTML/CSS/JS only. No build step, package manager, server, auth, or cloud.
- Must open from disk with `file://` and work offline after load.
- Target modern Chromium desktop browsers only.
- Use browser `localStorage` only, and wrap every storage access in `try/catch`.
- Inline runtime dependencies. If using `marked`, inline its UMD build and use the lexer API.
- Do not use `fetch()` for local files, `<script type="module">`, service workers, Google Fonts, React, Vue, Svelte, or TypeScript.

## Implementation Direction

- Source of truth for product scope lives in `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, and `.planning/STATE.md`.
- Phase 1 build order: parser -> agenda model -> store/reducer -> renderer -> timer engine.
- Timer engine must use one `requestAnimationFrame` loop plus `performance.now()` derivation. Never decrement a counter.
- Persist elapsed durations, not `startedAt` timestamps. Restored timers must always resume paused.
- Keep slide index separate from agenda item index. Title slide is a slide; sidebar agenda numbering starts at 1.
- "Max per person" agenda items split into sub-states on one slide, using composite timer keys like `"3.0"`, `"3.1"`, and `"3.2"`.
- Render user agenda content with `textContent`, not raw `innerHTML`.

## GSD Workflow

- Follow GSD for repo edits. Use `$gsd-quick` for small fixes/docs, `$gsd-plan-phase` for planning, and `$gsd-execute-phase` for planned implementation.
- Do not paste generated research dumps into this file. Keep this guide concise and point agents at `.planning/` for detail.
- Current GSD position: v1 complete (all 4 phases shipped). See `.planning/STATE.md` for milestone status before starting new work.

## Current Status

v1 ships in `meeting-manager.html`: parser, sidebar, ring + flat timer, persistence, keyboard nav, theme, click-to-edit, wake lock, sounds, drag-drop, Discord-readiness audit. Open todo: real Discord screenshare validation pass.

## Design Reference Sync

Claude Design handoff bundles land in `design-reference/vN/`. When a new bundle arrives, do not re-port from scratch — `diff -r design-reference/vN-1 design-reference/vN` and apply only the deltas to `meeting-manager.html`. The HTML at repo root is the production port; the bundled JSX is the prototype.

## Note: Relationship Between MD Files

- `CLAUDE.md` and `AGENTS.md` are hardlinked - they are two names for the same file on disk, so editing one updates both files locally.
- `CLAUDE.md` is read by Claude Code; `AGENTS.md` is read by Codex and other tools that follow the AGENTS.md convention.
- Hardlinks are not preserved by git, so collaborators cloning this repo will get two normal files. If they drift, re-create the hardlink with `del AGENTS.md && mklink /H AGENTS.md CLAUDE.md` on Windows or `ln CLAUDE.md AGENTS.md` on macOS/Linux.
