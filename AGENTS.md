<!--
  This file is the Codex project guide. Its twin CLAUDE.md is the Claude Code
  equivalent and is kept in lockstep with this file.

  To regenerate after editing .planning/PROJECT.md or research:
    gsd-sdk query generate-claude-md --output CLAUDE.md
    gsd-sdk query generate-claude-md --output AGENTS.md

  Do not edit only one of the two — they must stay in sync.
-->

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Meeting Manager — Agenda Presenter**

A single-file local HTML tool that turns a Markdown meeting agenda into a Marp-style slide deck with per-slide timers and a clickable agenda sidebar. Sarah double-clicks `agenda-presenter.html`, pastes (or drops in) her agenda markdown, and screenshares the result into Discord to run timed meetings. No build step, no server, works offline.

**Core Value:** **Paste markdown → run a timed meeting on screenshare without fiddling.** If the parser, the timer, and the sidebar all work for the agenda format below, everything else is polish.

### Constraints

- **Tech stack**: Vanilla HTML/CSS/JS in a single file. No build step. No package manager. Reveal.js allowed as a CDN script *only* if vanilla becomes unwieldy.
- **Distribution**: Must open by double-clicking the `.html` file from disk. Works offline once loaded.
- **Deliverable**: One file — `agenda-presenter.html`. Self-contained. No external CDN unless it saves significant code.
- **Persistence**: Browser localStorage only. No server, no cloud, no auth.
- **Target environment**: Modern Chromium-based desktop browser (Chrome/Edge), screenshared into Discord. No need to support old browsers, no need to support mobile.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## TL;DR — The Prescriptive Answer
## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Vanilla HTML5 + ES2024 JS** | n/a | App shell, state, DOM, event handling | Zero build step, double-click open works, no framework lock-in. The app's complexity (one page, one user, ~6 keyboard shortcuts, one timer loop) is well under the threshold where a framework starts paying for itself. ES2024 features (private fields `#x`, top-level await, `structuredClone`, `Object.groupBy`) are baseline in modern Chromium. |
| **CSS3 with modern features** | n/a | Layout, theming, slide transitions | CSS Grid + Flexbox for the sidebar+slide+timer layout. CSS custom properties (`--accent`) for light/dark theming. `:has()` for parent-state styling (e.g., `.slide:has(.overrun)` for the OVERTIME tint). All Baseline-stable in 2025. |
| **`marked` (Markdown parser)** | **v18.0.3** | Parse the agenda Markdown into HTML tokens | The de-facto Markdown library: 34M weekly downloads, single UMD file (~36 KB min), zero dependencies, fast. Inlining its UMD build into the HTML keeps the "one file, double-click open" constraint. v18 (April 2026) dropped CommonJS build but UMD is still shipped. |
| **`localStorage`** | Web Storage API | Persist agenda, slide index, per-slide timer state, theme | Synchronous, ~5–10 MiB quota, dead simple. Caveat: behavior on `file://` is technically undefined per spec, but in practice all current Chromium versions give each `.html` file its own isolated storage area. See "Browser Gotchas" below. |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **`marked`** | v18.0.3 | Markdown → HTML tokens | Always — embed the UMD build inline as `<script>...</script>` or use the lexer API (`marked.lexer()`) to get a token stream you can walk to extract the structured agenda fields (title / `—` / duration / deadline / "max X min per person"). |
### Development Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| **A text editor** | Edit `agenda-presenter.html` | That's it. VS Code with `live-server` extension is nice for iteration, but not required — saving + Ctrl-R in Chrome works fine. |
| **Chrome/Edge DevTools** | Debugging | F12 + Application tab → Local Storage to inspect persisted state. Console for the timer loop. Sources panel for breakpoints. |
| **Prettier (optional)** | Format HTML/CSS/JS in one file | If you want consistent formatting across embedded blocks. Not strictly required. |
## Installation
## Question-by-Question Answers
### 1. Vanilla vs. microlib (Alpine.js, Petite-vue, Mithril)?
### 2. Markdown parsing: marked / markdown-it / hand-rolled regex?
| Option | Verdict |
|--------|---------|
| **`marked` (lexer)** | Winner. `marked.lexer(md)` returns a flat array of tokens (`{type: 'heading', depth, text}`, `{type: 'list', items: [...]}`, etc.). Walk it once to build your agenda model. 36 KB minified, single file, zero deps. |
| **`markdown-it`** | Larger (~60 KB+ gzipped with default plugins), slightly slower for simple cases, has a more complex token model (nested inline tokens) that you don't need. Justified only if you wanted to extend Markdown syntax with custom inline tokens — you don't. |
| **Hand-rolled regex parser** | Tempting because the format is so constrained, and a ~150-LOC regex parser is technically sufficient. But the moment Sarah uses a `—`, `–`, or `--`, or wraps a duration title across two lines, or pastes from Notion (smart quotes, NBSPs), the brittle regex starts to bite. `marked` handles tokenization, you handle semantics. Hybrid wins. |
| **`micromark`** | Newer, spec-compliant, but bigger as a browser bundle and the API is designed for streaming/AST transforms — wrong shape for this. |
### 3. Slide rendering: Reveal.js / Marp Core / CSS Grid + visibility?
| Option | Verdict |
|--------|---------|
| **Vanilla CSS Grid + `.slide.is-active`** | Winner. Your slides are static, single-page, no transitions, no fragments, no nested decks. Render the current slide into `<main class="slide-stage">` from the agenda model. Done in 30 LOC. |
| **Reveal.js v6.0.1** | Wrong fit. Reveal is a *framework* that owns `<div class="reveal"><div class="slides">` and assumes you want its keyboard handler, its print stylesheet, its overview mode, its fragments, its themes. You'd be fighting it to add a custom sidebar + timer bar + per-person sub-states. Reveal's bundle is ~250+ KB. The Markdown plugin assumes one-slide-per-section semantics that don't match the "one item with per-person sub-states" model. Verdict: **do not use**. |
| **Marp Core (`@marp-team/marp-core`)** | Wrong fit *and* not browser-first. Marp Core is designed to be run on Node (or in Marp CLI) to convert Markdown → HTML/CSS bundles. The community explicitly notes "Marp official tools do not provide a way to bundle assets into a single HTML file" and recommends external tools like `monolith`. Using it browser-side would mean shipping its full Marpit theme engine (~hundreds of KB) for the visual style only. Just copy the Marp visual style — generous whitespace, big sans-serif title, accent color — into your own CSS. |
### 4. Fonts: Google Fonts CDN / bundled @font-face / system stack?
| Option | Verdict |
|--------|---------|
| **Google Fonts CDN (`<link href="fonts.googleapis.com/...">`)** | **Breaks the offline requirement.** When opened from `file://` with no internet, the page falls back to a serif fallback and looks wrong on the very screenshare it's designed for. Hard no. |
| **System font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ...`)** | Default recommendation. On Sarah's Windows machine this resolves to Segoe UI Variable — a clean, modern sans that's perfectly fine for a Marp-style slide. Zero bytes, zero dependencies, always works. |
| **Inter as `@font-face` with WOFF2 file beside HTML** | Works, but means the deliverable is no longer one file — it's `agenda-presenter.html` + `inter.woff2`. Breaks the constraint. |
| **Inter as `@font-face` with `src: url(data:font/woff2;base64,...)`** | Works and stays single-file. Inter Variable WOFF2 (Latin subset) is ~70 KB → ~95 KB base64-encoded. Doubles your file size but stays self-contained. Use only if you decide "looks like Marp" requires Inter specifically. |
### 5. localStorage patterns: raw JSON or wrapper?
### 6. Other 2025-current things that materially change the calculus?
| Feature | Use it? | Why |
|---------|---------|-----|
| **CSS `:has()`** | **Yes.** | Style the slide based on overrun child: `.slide:has(.overtime-banner) { background: var(--overrun-tint); }`. Baseline 2023, ~93% global support, 100% in target Chromium. |
| **CSS Container Queries** | Optional. | Only useful if you make the slide stage resizable. Sidebar is fixed 25% width — container queries don't add anything here. Baseline Widely available 2025. |
| **CSS `@scope`** | Skip. | Useful for component scoping in component libs; here, your selectors are already specific by class. Not worth the cognitive cost. |
| **View Transitions API (same-document)** | **Skip explicitly.** Stable since Chrome 111. | The user's spec says no animations — clean, static Marp aesthetic. Adding View Transitions would conflict with the design intent. Save for later as a polish-phase enhancement if Sarah asks. |
| **Web Components / Custom Elements** | Skip. | Adds a layer (Shadow DOM, slot composition) that costs more than it saves in a non-reusable single-file app. |
| **Popover API (`popover` attribute)** | Maybe. | Useful if you add a help/keyboard-shortcuts overlay. Baseline Chrome 114+. Mention as polish, not core. |
| **`structuredClone()`** | **Yes.** | Cleaner than `JSON.parse(JSON.stringify(...))` for deep-cloning state. Baseline 2022. |
| **CSS Nesting** | **Yes.** | Native nesting (`.slide { & .title { ... } }`) shipped in all browsers 2023-2024. Reduces CSS verbosity in a single-file app where you can't split styles. |
| **CSS `light-dark()` function** | **Yes, but check fallback.** | `color: light-dark(black, white)` simplifies theme code dramatically. Chrome 123+ (Feb 2024) — solid in target environment. Pair with `color-scheme: light dark` on `:root`. |
| **`prefers-color-scheme` + manual override** | **Yes.** | Standard pattern: data-theme attribute on `<html>` overrides the media query. |
## Browser Gotchas — Critical for `file://` Distribution
| Gotcha | Impact | Mitigation |
|--------|--------|------------|
| **`localStorage` behavior is *officially* undefined for `file://`** ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)) | In *theory* Chrome could one day disable it. In *practice*, every current Chromium version (incl. Edge) gives each `.html` file its own isolated storage keyed by full file path. | **Always wrap localStorage in try/catch.** Treat the absence of persisted state as a clean start. Document for Sarah: if she renames the `.html` file, her saved state moves with the *old* name. |
| **`localStorage` is keyed by full file path** | If Sarah moves `agenda-presenter.html` from Desktop to Documents, her saved state stays at the old path and the new location starts empty. | Acceptable for v1. Document the behavior in a "first run" message. |
| **`fetch()` of sibling files fails on `file://` in Chrome** | Chrome blocks XHR/fetch of local files from `file://` origin (CORS). Drag-drop of `.md` via `FileReader` does work — that's the API to use. | Use **drag-and-drop + `FileReader.readAsText()`** for `.md` file ingestion (already in spec). Do **not** try to `fetch('agenda.md')` — it will fail silently. |
| **ES modules (`<script type="module">`) fail on `file://`** | Chrome blocks module imports from `file://`. | Don't use `type="module"`. Use classic `<script>` only. Use IIFE or just top-level code. This rules out npm packages that ship only as ESM. |
| **Service Workers fail on `file://`** | They require HTTPS/`http://localhost`. | Not relevant for this app — no offline-via-SW needed because `file://` *is* offline. |
| **`crypto.subtle` requires secure context** | Not available on `file://`. | Not relevant — no crypto needed for this app. |
| **`navigator.clipboard.writeText()` may fail on `file://`** | Some Chrome versions restrict clipboard API to secure contexts. | Not in v1 scope, but flag if "copy markdown back out" is ever added. |
| **External CDN scripts fail offline** | If you load `marked` from `cdn.jsdelivr.net`, the app breaks on a plane / poor WiFi. | **Inline all scripts.** No CDN dependencies in the shipped file. |
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Vanilla JS | Alpine.js 3.x via CDN | If you find yourself writing more than ~5 `setState/render` calls and the reactivity bookkeeping starts to bite. Migration is straightforward — Alpine sits on top of existing HTML. Threshold not expected to be hit in v1. |
| Vanilla JS | Petite-vue | Only if you specifically want Vue's reactivity model and template syntax. Not recommended due to its quasi-abandoned status. |
| Vanilla JS | Lit (Web Components) | If this app ever becomes a multi-page suite where slide rendering, sidebar, and timer need to be reusable units. Not v1. |
| `marked` v18 lexer | `markdown-it` v14 | If you later want plugin extensibility (custom containers, footnotes, definition lists). Overkill for the fixed agenda DSL. |
| `marked` lexer | Hand-rolled regex parser | If you commit to ultra-minimal (sub-300 LOC total) and accept the brittleness. Defensible for a true minimalist; not recommended given the format edge cases (dashes, smart quotes, paste-from-Notion artifacts). |
| Hand-rolled slides | Reveal.js v6 | If feature creep adds: speaker notes view, fragments/animations, multi-slide-per-item transitions, PDF export, overview mode. None are in scope per PROJECT.md — and most are out-of-scope by explicit decision. |
| Hand-rolled slides | Marp Core | Only if you'll run a build step to use Marp's full theme engine. Conflicts with the no-build constraint. |
| System fonts | Inter Variable WOFF2 base64 | If the visual demo doesn't read as "Marp" with system Segoe UI / SF Pro. Adds ~95 KB to the HTML file but stays single-file. |
| `localStorage` | IndexedDB | If state grows past ~5 MB (it won't — your state is <50 KB) or you need async transactional writes (you don't). |
| `localStorage` | File System Access API | If Sarah wants persistent `.md` file binding ("remember this file, reload it next time"). Requires user permission gesture, doesn't work on `file://`. Skip for v1. |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Reveal.js** | Framework wants to own the page; you need a custom sidebar+timer+per-person layout. ~250 KB of features you won't use. Fighting it costs more than rolling your own slides. | Vanilla CSS Grid with `.slide.is-active` visibility toggle. ~30 LOC. |
| **Marp Core in browser** | Designed for Node-based conversion to HTML/CSS. Not packaged for direct browser script-tag use. | Copy the Marp visual *style* into your CSS — generous whitespace, large title, accent color. |
| **Google Fonts CDN `<link>`** | Breaks the offline requirement. Page falls back to serif when no internet. | System font stack or inlined WOFF2 base64. |
| **React / Vue / Svelte / SolidJS** | All require a build step (JSX/SFC transform). Violates the no-build constraint. | Vanilla DOM. |
| **TypeScript** | Requires a compile step. | JSDoc type annotations if you want IDE intellisense without the build step (Chrome ignores them, VS Code reads them). |
| **`<script type="module">`** | Fails to load from `file://` origin in Chrome. | Classic `<script>` with no `type` attribute. |
| **`fetch('agenda.md')`** | Blocked by Chrome's `file://` CORS policy. | `FileReader` API via drag-and-drop or `<input type="file">`. |
| **`markdown-it`** | Larger and overpowered for this fixed DSL. Nested inline token model adds complexity you don't need. | `marked.lexer()` — simpler token stream. |
| **CommonJS-only npm packages** | Won't run in browser without a bundler. | UMD or IIFE builds. (Most major libs ship UMD on jsDelivr/unpkg.) |
| **`navigator.locks`, `BroadcastChannel`** | Not needed — single-tab, single-user app. Adds complexity for zero benefit. | Just `localStorage`. |
| **Service Workers** | Don't work on `file://`. | Not needed — `file://` *is* offline. |
| **Date library (date-fns, dayjs, luxon)** | You're formatting `MM:SS` deltas. That's `String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0')`. | Hand-roll the 1-line formatter. |
| **Icon library (lucide, heroicons)** | Each icon set is ~50–200 KB of SVG you'd inline. | Use 5–8 hand-picked inline SVGs for play/pause/reset/±1m. ~2 KB total. |
## Stack Patterns by Variant
- `marked` v18 inlined as UMD
- ~12 module-level functions: `parseAgenda`, `render`, `setState`, `loadState`, `saveState`, `startTimer`, `stopTimer`, `tick`, `jumpTo`, `advance`, `applyTheme`, `bindKeyboard`
- ~1500–2500 total LOC across HTML + CSS + JS
- One file. No build. No package.json.
- Add Alpine.js v3 from CDN OR inlined (~17 KB gzip)
- Refactor the imperative `render()` into Alpine directives
- Threshold to trigger: more than 3 places in the code where you forget to call `render()` after `setState()`, or the keyboard handler grows past ~80 LOC of conditional dispatch
- Reconsider Reveal.js v6 + custom plugin
- This represents a v2 rewrite, not an v1 evolution
## Version Compatibility
| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| `marked` | 18.0.3 | Modern browsers (ES2020+) | v16+ removed CommonJS build. UMD build still ships. Use `lib/marked.umd.min.js`. v17+ dropped Node 18 support (irrelevant for browser use). |
| Browser features | Chrome/Edge 120+ | `:has()`, `light-dark()`, CSS nesting, container queries, View Transitions | All Baseline-stable. Target is "modern Chromium for Discord screenshare" — no issue. |
## Sources
- [marked GitHub Releases](https://github.com/markedjs/marked/releases) — v18.0.3 latest (May 1, 2026)
- [marked CDN via jsDelivr](https://www.jsdelivr.com/package/npm/marked) — UMD build location confirmed
- [marked docs — Using Advanced](https://marked.js.org/using_advanced) — lexer API documented
- [MDN — Window.localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) — **file:// behavior is "undefined", browsers may change it; current behavior gives each file:// URL its own storage**
- [reveal.js npm](https://www.npmjs.com/package/reveal.js) — v6.0.1 latest, switched to Vite for build
- [Marp Core unpkg](https://unpkg.com/@marp-team/marp-core@4.0.0) — confirms Node-first design, not browser-script-friendly
- [@marp-team/marp-core npm](https://www.npmjs.com/package/@marp-team/marp-core) — confirmed not packaged for single-HTML browser use
- [Can I Use — :has()](https://caniuse.com/css-has) — ~93% global support, Baseline 2023
- [Can I Use — View Transitions](https://caniuse.com/view-transitions) — Chrome 111+
- [Chrome for Developers — View Transitions in 2025](https://developer.chrome.com/blog/view-transitions-in-2025) — Baseline Newly available Oct 2025
- [web.dev — Web platform updates 2025](https://web.dev/blog/web-platform-10-2025) — container queries Baseline Widely Available
- [PkgPulse — markdown-it vs marked 2026](https://www.pkgpulse.com/guides/marked-vs-remark-vs-markdown-it-parsers-2026) — bundle sizes and weekly download counts (marked 34.4M/wk, markdown-it 21M/wk)
- [Alpine.js installation docs](https://alpinejs.dev/essentials/installation) — CDN single-script usage pattern verified
- [Medium — Alpine.js vs Petite-Vue, Dec 2025](https://medium.com/@bilalahmada774/alpine-js-vs-petite-vue-which-lightweight-javascript-framework-should-you-choose-d0f3dd76cb4e) — current state of both microlibs
- [Chromium issue 514076 — localStorage of file:// can be read](https://bugs.chromium.org/p/chromium/issues/detail?id=514076) — confirms file:// localStorage is implemented but informally
- [WesleyTheGeolien/revealjs_single_file](https://github.com/WesleyTheGeolien/revealjs_single_file) — confirms reveal.js can run from single HTML via CDN (but not why you'd want it for this app)
- [dasroot.net — Markdown presentation tools 2026](https://dasroot.net/posts/2026/04/markdown-presentation-tools-marp-presentation-tools-marp-slidev-reveal-js/) — ecosystem overview
- [Tony Cabaye — Choosing a slide library](https://tonai.github.io/blog/posts/slide-libraries/) — comparison reading
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
