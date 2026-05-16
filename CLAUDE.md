# CLAUDE.md / AGENTS.md

## Project

Meeting Manager - Agenda Presenter is a single-file local HTML tool.
Sarah double-clicks `agenda-presenter.html`, pastes or drops a Markdown meeting agenda, and screenshares a Marp-style timed slide deck into Discord.

Core value: paste markdown -> run a timed meeting on screenshare without fiddling.

## Hard Constraints

- One deliverable: `agenda-presenter.html`.
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
- Current GSD position: Phase 1 is ready to plan. Next phase command is `$gsd-plan-phase 1`; use `$gsd-discuss-phase 1` first if user-specific context is needed.

## Current Phase Notes

Phase 1 must deliver the first usable vertical slice: paste Markdown, render title + agenda slides, clickable sidebar, working countdown timer, and overrun visual.

Non-negotiables for Phase 1:

- Parser handles the README agenda shape plus dash variants and "max per person".
- Fixture coverage exists before parser implementation.
- Sidebar click jumps to the slide/sub-state and resets that timer.
- Timer turns amber at 25%, red at zero, then counts negative with an overrun banner.
- The file still opens directly from disk with no runtime network requirement.

## Note: Relationship Between MD Files

- `CLAUDE.md` and `AGENTS.md` are hardlinked - they are two names for the same file on disk, so editing one updates both files locally.
- `CLAUDE.md` is read by Claude Code; `AGENTS.md` is read by Codex and other tools that follow the AGENTS.md convention.
- Hardlinks are not preserved by git, so collaborators cloning this repo will get two normal files. If they drift, re-create the hardlink with `del AGENTS.md && mklink /H AGENTS.md CLAUDE.md` on Windows or `ln CLAUDE.md AGENTS.md` on macOS/Linux.
