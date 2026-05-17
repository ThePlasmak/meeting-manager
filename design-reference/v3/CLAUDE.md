# Meeting Manager — Claude Code entry point

> Read this file first. Everything you need is in this folder.

## What this is

A working **HTML prototype** of a meeting-cockpit app: paste a markdown agenda,
get a slide per item with a per-item countdown ring, live wall clock, computed
deadlines, keyboard nav, dark mode, and a Tweaks panel. **Hi-fi** — colors,
typography, spacing, timer math, and parser grammar are final.

**Your job:** recreate this design in the target codebase using its existing
component library and conventions. Do not ship the in-browser-Babel HTML as-is.

## Read order (fastest path to context)

1. **`CLAUDE.md`** ← you are here
2. **`SPEC.md`** — design tokens, layout, behavior, tweaks. Authoritative.
3. **`meeting-manager.html`** — entry; CSS variables for both themes, font loads, tweak defaults.
4. **`parse.jsx`** — markdown → agenda model. The grammar.
5. **`components.jsx`** — every UI component, in render order top-to-bottom.
6. **`app.jsx`** — state, persistence, rAF timer tick, keyboard, TTS, sounds.
7. **`tweaks-panel.jsx`** — in-page settings panel + `useTweaks` hook.

`README.md` is the long-form version of `SPEC.md` — skim only if `SPEC.md` left a question.

## Stack the prototype uses (you do NOT need to replicate this)

React 18 + Babel-in-browser, no build step, no bundler, no npm. All source is
plain `.jsx` loaded via `<script type="text/babel">` and components are exported
to `window` to share scope across script files. **Port the components into
whatever stack the target codebase uses** (Next.js, Vite + React, Vue, SwiftUI,
native, etc.) — the prototype's structure is not prescriptive.

## Quickstart for the port

1. Copy CSS variables from `:root` and `html[data-theme="dark"]` in `meeting-manager.html` into your design-token system.
2. Wire up Google Fonts (Inter + the title-font options) or substitute house fonts.
3. Port `parseAgenda` from `parse.jsx` as-is — it has no React deps.
4. Recreate components from `components.jsx` using your component library's primitives. Names mirror what's there: `Sidebar`, `AgendaList`, `Stage`, `TimerRing`, `FlatTimer`, `EditableTime`, `LiveClock`, `Badge`, `IconButton`, `GhostButton`, `PrimaryAction`.
5. Reimplement the rAF timer in `app.jsx`. **Read the Timer notes in `SPEC.md` first** — there's a subtle `dt` seeding bug to avoid.
6. Re-do persistence using your app's settings/storage layer (the prototype writes `localStorage["meeting-manager.v2.state"]`).
7. The Tweaks panel is a prototype-only host feature — for production, replace it with normal app settings.

## Hard rules

- No emoji except `✓` on the Complete sidebar row.
- No drop shadows on cards (only on the Tweaks panel itself).
- No background-transition on the active sidebar row — it flickers on rapid slide nav.
- No gradients. No left-border accent cards. No icons on every metadata pill.
- Tabular numerals on every numeric column (sidebar durations, timer, wall clock, deadlines).
