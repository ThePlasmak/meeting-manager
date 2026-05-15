# Architecture Research

**Domain:** Single-file local HTML tool — Markdown-agenda → slide-deck + per-slide timer
**Researched:** 2026-05-16
**Confidence:** HIGH (foundational vanilla JS patterns; no exotic deps)

## Standard Architecture

### System Overview

The whole app is one file. Internally it is split into seven cooperating modules glued together by a single mutable store and a render-on-change loop. Modules talk to the store, not to each other.

```
┌──────────────────────────────────────────────────────────────────────┐
│                            agenda-presenter.html                     │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                       UI Layer (DOM)                           │  │
│  │  ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────────┐   │  │
│  │  │ Sidebar  │ │ Slide Stage  │ │ Timer Bar│ │ Paste/Drop UI│   │  │
│  │  └────┬─────┘ └──────┬───────┘ └────┬─────┘ └──────┬───────┘   │  │
│  └───────┼──────────────┼──────────────┼──────────────┼───────────┘  │
│          │              │              │              │              │
│          │   dispatch(action)          │              │              │
│          ▼              ▼              ▼              ▼              │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                     Controllers / Engines                      │  │
│  │  ┌──────────┐ ┌────────────────┐ ┌──────────────┐ ┌─────────┐  │  │
│  │  │ Router/  │ │ TimerEngine    │ │ Keyboard     │ │ Theme   │  │  │
│  │  │ SlideCtl │ │ (single tick)  │ │ Controller   │ │ Ctrl    │  │  │
│  │  └─────┬────┘ └──────┬─────────┘ └──────┬───────┘ └────┬────┘  │  │
│  └────────┼─────────────┼──────────────────┼──────────────┼───────┘  │
│           │             │                  │              │          │
│           ▼             ▼                  ▼              ▼          │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                          Store (single source of truth)        │  │
│  │  state = { agenda, cursor, timers, theme, ui }                 │  │
│  │  dispatch(action) → reducer → state' → notify(subscribers)     │  │
│  └───────┬────────────────────────────────────────────────────────┘  │
│          │ subscribe                                                 │
│          ▼                                                           │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                          Renderer                              │  │
│  │  renderSidebar(state)  renderStage(state)  renderTimerBar(state)│  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─────────────────┐   ┌──────────────────┐   ┌──────────────────┐   │
│  │ Parser (pure)   │   │ AgendaModel      │   │ PersistenceLayer │   │
│  │ md → agenda IR  │   │ derived helpers  │   │ debounced save   │   │
│  └─────────────────┘   └──────────────────┘   └──────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

**One-way data flow:** UI dispatches actions → reducer mutates store → store notifies → renderer paints DOM. Modules never call the renderer or DOM directly outside their owned region.

### Component Responsibilities

| Component | Owns | Implementation |
|-----------|------|----------------|
| **Parser** | Markdown → typed `Agenda` IR (intermediate representation). Pure, no side effects. | One function `parseAgenda(md)` plus small helpers (regex for `— / – / --`, "max N per person" detector, deadline-badge extractor). |
| **AgendaModel** | Selectors over the parsed IR (`getSlide(i)`, `getSubItem(i, j)`, `totalSlides()`, `flatTimerKeys()`). Pure. | Plain functions on the IR shape. No state of its own. |
| **Store** | Single mutable `state` object + `dispatch` + `subscribe`. Reducer turns actions into new state. | ~40 lines of vanilla JS. No library. |
| **TimerEngine** | The ONE `setInterval` for the whole app. On every tick (250ms) it reads `state.cursor` + `state.timers[activeKey]`, recalculates remaining, dispatches `TICK`. Owns nothing of its own — all timer state lives in the store. | Single `setInterval` started at boot, never cleared (cheap; pauses are state, not interval lifecycle). |
| **Router / SlideController** | Translates navigation intents (`NEXT`, `PREV`, `JUMP`, `SHIFT_NEXT`) into store actions. Knows the agenda structure well enough to compute "next person → next item" semantics. | Pure functions returning actions; the reducer applies them. |
| **Renderer** | Reads `state`, paints the three DOM regions (sidebar, stage, timer bar). Idempotent: same state → same DOM. | Hand-written `innerHTML` templates or `textContent` updates. Diffing by region, not virtual DOM. |
| **PersistenceLayer** | Reads/writes `state` ↔ localStorage. Debounces writes. Owns schema version and migrations. | `loadState()` at boot, `subscribe(() => debouncedSave())`. |
| **ThemeController** | Toggles `data-theme="dark"` on `<html>`, persists choice. | Tiny — sets attribute, dispatches `SET_THEME`. |
| **KeyboardController** | Maps key events to actions. Single `keydown` listener on `window`. | Switch statement → `dispatch(action)`. |
| **InputController** | Handles paste/drop of markdown; calls Parser; dispatches `LOAD_AGENDA`. | Two event listeners (paste, drop). |

**Single-responsibility check:** No module both *owns DOM* and *owns state*. The Renderer is the only DOM writer. The Store is the only state mutator. The TimerEngine is the only owner of `setInterval`.

## Recommended Project Structure

There is one file. Inside it, sections appear in this order, each fenced with a comment banner so you can navigate by Ctrl+F.

```
agenda-presenter.html
├── <head>
│   ├── <style>                                # Section: STYLES
│   │   ├── :root tokens (light)
│   │   ├── [data-theme="dark"] tokens
│   │   ├── layout grid (sidebar | stage | timer bar)
│   │   ├── slide typography (Inter/system, Marp-ish)
│   │   ├── overtime overlay (Overwatch banner)
│   │   └── sidebar tree (numbered + expanded sub-items)
│   └── <title>
├── <body>
│   ├── <div id="app">                         # Three regions, always present
│   │   ├── <aside id="sidebar">
│   │   ├── <main id="stage">
│   │   └── <footer id="timerbar">
│   ├── <div id="paste-modal">                 # Shown when no agenda loaded
│   └── <script>                               # Section: APP
│       ├── // ===== CONSTANTS =====
│       ├── // ===== PARSER =====
│       ├── // ===== AGENDA MODEL (selectors) =====
│       ├── // ===== STORE (state + reducer) =====
│       ├── // ===== PERSISTENCE =====
│       ├── // ===== TIMER ENGINE =====
│       ├── // ===== ROUTER / SLIDE CONTROLLER =====
│       ├── // ===== RENDERER =====
│       ├── // ===== KEYBOARD =====
│       ├── // ===== INPUT (paste/drop) =====
│       ├── // ===== THEME =====
│       └── // ===== BOOT =====
└── </body>
```

### Structure Rationale

- **Pure first, side-effecting last.** Parser and selectors are pure; Store is the only mutator; Renderer is the only DOM writer; TimerEngine is the only `setInterval`. This makes the file mentally reviewable top-to-bottom.
- **One file, banner comments instead of folders.** Folders would imply a build step. Banner comments (`// ===== PARSER =====`) make Ctrl+F navigation effectively as fast as a file tree.
- **CSS uses custom properties for theming, not class swaps.** Setting `<html data-theme="dark">` flips the whole palette via `:root` variable overrides. Zero JS work beyond one attribute write.
- **Three persistent DOM regions.** Sidebar, stage, timer bar are always in the DOM; renderer mutates their contents rather than recreating containers. Prevents layout thrash during slide changes.

## Architectural Patterns

### Pattern 1: Single Mutable Store + Render-on-Change

**What:** One global `state` object. All UI reads from it. All mutations go through `dispatch(action)`. After every dispatch the store calls subscribers; the renderer is the main subscriber and repaints.

**When to use:** Always, here. The state graph (agenda + cursor + per-slide timers + theme) is small (< 2KB), entirely in-memory, and shared by every UI region. Redux/Zustand/Pinia are overkill — this is ~40 lines.

**Trade-offs:**
- Pro: One mental model. Anyone reading the file knows where state lives.
- Pro: Persistence is trivial (`JSON.stringify(state)`).
- Pro: Time-travel debugging by hand: `state = JSON.parse(prompt())` works.
- Con: Whole-state re-render unless renderer is region-scoped (it is — see Renderer section).

**Example:**

```javascript
// ===== STORE =====
const state = {
  schemaVersion: 1,
  agenda: null,            // parsed IR, or null before paste
  cursor: { slideIdx: 0, subIdx: 0 },
  timers: {},              // keyed by "slideIdx[.subIdx]" — see schema
  theme: 'light',
  ui: { paused: true, lastTickAt: null }
};

const subscribers = new Set();
function subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); }

function dispatch(action) {
  reduce(state, action);             // mutate in place (we do not need immutability here)
  subscribers.forEach(fn => fn(state, action));
}

function reduce(s, a) {
  switch (a.type) {
    case 'LOAD_AGENDA':   s.agenda = a.agenda; s.cursor = {slideIdx:0,subIdx:0}; s.timers = freshTimers(a.agenda); break;
    case 'JUMP':          s.cursor = {slideIdx:a.slideIdx, subIdx:a.subIdx ?? 0}; resetTimer(s, s.cursor); break;
    case 'NEXT':          advanceCursor(s); break;
    case 'SHIFT_NEXT':    advanceToNextItem(s); break;
    case 'TOGGLE_PAUSE':  togglePause(s); break;
    case 'TICK':          tick(s, a.now); break;
    case 'ADJUST':        adjust(s, a.deltaSec); break;
    case 'RESET':         resetTimer(s, s.cursor); break;
    case 'EDIT_TIME':     editTime(s, a.newAllocSec); break;
    case 'SET_THEME':     s.theme = a.theme; break;
  }
}
```

Mutation-in-place is deliberate. There is no React reconciler that depends on referential equality, so immutability would buy nothing and cost code.

### Pattern 2: One Interval, State-Driven Timer

**What:** A single `setInterval` runs the entire app's clock. It does not start/stop on pause; it only checks state. State decides whether to decrement.

**When to use:** Whenever the app has one "active" timer at a time (true here — only the current slide's timer ticks).

**Trade-offs:**
- Pro: No interval-lifecycle bugs (forgotten `clearInterval`, double-starts on remount).
- Pro: Pause is a boolean flip, not a control-flow change.
- Pro: Drift-resistant — uses `Date.now()` deltas, not assumed tick spacing.
- Con: Costs ~4 wakeups/sec even when paused. Negligible (a fraction of a millisecond of CPU).

**Example:**

```javascript
// ===== TIMER ENGINE =====
const TICK_MS = 250;
let lastWall = null;

function timerTick() {
  const now = Date.now();
  if (lastWall === null) { lastWall = now; return; }
  const deltaMs = now - lastWall;
  lastWall = now;
  if (!state.agenda) return;
  if (state.ui.paused) return;
  dispatch({ type: 'TICK', deltaMs });
}

function tick(s, deltaMs) {
  const key = currentTimerKey(s);             // e.g. "2.0" for slide 2 person a
  const t = s.timers[key];
  t.remainingSec -= deltaMs / 1000;           // can go negative — overrun is allowed
  // No state-machine transitions on zero; overrun is a render concern.
}

setInterval(timerTick, TICK_MS);
```

The TimerEngine *only* dispatches `TICK`. It does not branch on slide type, sub-state, or theme. All meaning lives in the reducer.

### Pattern 3: Composite Key Per Timer ("Flat Map, Hierarchical Key")

**What:** Every timer the agenda will ever need has a stable key. Plain items: `"3"`. Per-person sub-states: `"3.0"`, `"3.1"`, `"3.2"`. `state.timers` is a flat object keyed by that string. The cursor knows which key is active.

**When to use:** When a tree of state would otherwise leak into many modules. Flatten the leaf state, keep the tree only in the parsed agenda IR.

**Trade-offs:**
- Pro: PersistenceLayer serializes timers as a flat dictionary. Trivial.
- Pro: Sidebar rendering and timer reads use the same key — no two code paths to keep in sync.
- Pro: Renderer doesn't care whether the current slide is a sub-state or not; it just reads `timers[currentTimerKey(state)]`.
- Con: One small helper (`currentTimerKey`) that the cursor and the reducer both rely on. Centralize it.

**Example:**

```javascript
// IR for an agenda item that uses "max N per person"
{
  index: 3,
  title: "Status round",
  attribution: "Team",
  deadline: "2026-05-30",
  durationSec: 360,                  // total (12 min × 3 people if applicable)
  perPerson: {
    perPersonSec: 120,               // 2 min each
    people: ["Sarah", "Teck Lee", "Solomon"]
  }
}

// timers initialized at LOAD_AGENDA:
state.timers = {
  "1":   { remainingSec: 60,  allocatedSec: 60 },
  "2":   { remainingSec: 300, allocatedSec: 300 },
  "3.0": { remainingSec: 120, allocatedSec: 120 },   // Sarah
  "3.1": { remainingSec: 120, allocatedSec: 120 },   // Teck Lee
  "3.2": { remainingSec: 120, allocatedSec: 120 },   // Solomon
  "4":   { remainingSec: 180, allocatedSec: 180 },
};

function currentTimerKey(s) {
  const slide = s.agenda.items[s.cursor.slideIdx];
  return slide.perPerson ? `${s.cursor.slideIdx}.${s.cursor.subIdx}` : `${s.cursor.slideIdx}`;
}
```

**Why this nests cleanly without leaking:** Only the Parser produces the `perPerson` shape, only the Router knows to bump `subIdx` instead of `slideIdx` on `NEXT`, and only the Renderer reads `perPerson.people` to show the active speaker. The Store, TimerEngine, and PersistenceLayer never need to know whether a slide has sub-states — they treat keys uniformly.

### Pattern 4: Region-Scoped Re-render

**What:** The Renderer subscribes once but exposes three sub-renderers. After each dispatch, it decides per region whether anything changed and only repaints what did.

**When to use:** Whole-state re-renders are fine until they cause flicker (sidebar collapse animations, focus loss in inputs) or cost. With a small DOM (sidebar ~30 nodes, stage ~6 nodes, timer bar ~5 nodes) you could blast-rerender all three on every tick — but you shouldn't, because the TICK action fires 4x/sec.

**Trade-offs:**
- Pro: Smooth timer-bar updates without touching sidebar/stage.
- Pro: Sidebar's expanded/collapsed state is preserved because we don't blow it away.
- Con: Slight bookkeeping — a small "dirty" check per region.

**Example:**

```javascript
// ===== RENDERER =====
let prev = { cursor: null, theme: null, agendaId: null };

subscribe((s, action) => {
  if (action.type === 'TICK')         { renderTimerBar(s); maybeRenderOvertime(s); return; }
  if (action.type === 'SET_THEME')    { /* CSS handles it via attr */ return; }
  // Anything else may have shifted slide or agenda
  renderTimerBar(s);
  if (s.cursor !== prev.cursor)       renderSidebarActive(s);
  if (slideOrSubChanged(s, prev))     renderStage(s);
  if (agendaChanged(s, prev))         renderSidebar(s);                 // full sidebar rebuild
  prev = snapshot(s);
});
```

### Pattern 5: Debounced Whole-State Persistence

**What:** On every dispatch, schedule a `localStorage.setItem('agenda-presenter:v1', JSON.stringify(state))` 500ms later, coalescing rapid bursts (timer ticks).

**When to use:** Always here. Loss tolerance is ~half a second.

**Trade-offs:**
- Pro: One line of persistence code; no per-action save logic.
- Pro: Survives browser crash mid-meeting (the user's stated risk).
- Con: Saves the whole blob each time. State is tiny (< 4 KB even with a long agenda). Fine.

**Example:**

```javascript
// ===== PERSISTENCE =====
const KEY = 'agenda-presenter:v1';
let saveHandle = null;

function scheduleSave() {
  if (saveHandle) clearTimeout(saveHandle);
  saveHandle = setTimeout(() => {
    localStorage.setItem(KEY, JSON.stringify(state));
    saveHandle = null;
  }, 500);
}

subscribe(scheduleSave);

function loadState() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return migrate(parsed);
  } catch { return null; }
}
```

## Data Flow

### State Management

```
[User]
  │ click sidebar "2b" / press "→" / paste markdown
  ▼
[UI region]            (sidebar / keyboard / paste handler)
  │ dispatch({type: 'JUMP', slideIdx: 1, subIdx: 1})
  ▼
[Store.dispatch]
  │ reduce(state, action)        — mutates state in place
  │ resetTimer(state, cursor)    — for JUMP, fresh timer
  ▼
[subscribers fire]
  ├─► Renderer        — repaints affected regions
  └─► PersistenceLayer — schedules debounced save
```

There is no callback chain between modules. Everything flows through `dispatch → reduce → subscribers`.

### Worked Example: User Clicks Sidebar Item "2b"

1. **Event capture.** Sidebar's delegated click listener reads `data-slide="1"` `data-sub="1"` from the clicked `<li>`.
2. **Dispatch.** It calls `dispatch({ type: 'JUMP', slideIdx: 1, subIdx: 1 })`.
3. **Reduce.** The reducer sets `state.cursor = { slideIdx: 1, subIdx: 1 }` and calls `resetTimer(state, state.cursor)`, which finds key `"1.1"` and sets `state.timers["1.1"] = { remainingSec: allocated, allocatedSec: allocated }`. Per the requirements, JUMP resets the destination's timer. (Other slides' timers are untouched — that's the whole point of per-slide state.)
4. **Subscribers fire** (in registration order):
   - Renderer compares `prev.cursor` to `state.cursor` → mismatch → calls `renderStage(state)` (re-renders the slide body with the new active person highlighted) and `renderSidebarActive(state)` (updates `.is-active` class on the new `<li>`, leaves the rest alone) and `renderTimerBar(state)` (shows the new `MM:SS / MM:SS`).
   - PersistenceLayer schedules a save 500ms later.
5. **Next TimerEngine tick** (within 250ms) sees `state.ui.paused` is still whatever it was, reads the new cursor's timer key, and decrements that one.

No module called another module. No DOM was touched outside the renderer. No `setInterval` was reset. The user observed an instant slide change, an instant sidebar highlight change, an instant timer reset, and a saved state half a second later.

### Worked Example: User Presses Space (Pause Toggle)

1. KeyboardController sees `keydown` `Space` → `dispatch({type: 'TOGGLE_PAUSE'})`.
2. Reducer flips `state.ui.paused`.
3. Renderer paints the toolbar's pause/play icon. Timer bar text unchanged.
4. TimerEngine on its next 250ms wakeup checks `state.ui.paused === true` → does not dispatch TICK. The timer freezes without any interval manipulation.

### Worked Example: User Presses → (Advance Person)

1. `dispatch({type: 'NEXT'})`.
2. Reducer asks the Router helper: `advanceCursor(state)`. The helper:
   - Looks at the current slide. If it has `perPerson` and `subIdx + 1 < people.length`, increment `subIdx`.
   - Otherwise increment `slideIdx`, set `subIdx = 0`.
   - On any advance, do NOT auto-reset timers — per the spec, only sidebar clicks and explicit reset clear them. (This preserves the "navigate away and back returns to that slide's running/paused state" requirement.)
3. Subscribers fire as usual.

### Worked Example: User Presses Shift+→ (Skip Remaining People)

1. `dispatch({type: 'SHIFT_NEXT'})`.
2. Reducer: increment `slideIdx`, set `subIdx = 0`, regardless of whether sub-states remain.
3. Subscribers fire as usual.

### Worked Example: User Drops a `.md` File

1. InputController's `drop` handler reads `e.dataTransfer.files[0]` as text.
2. Calls `parseAgenda(text)` → IR.
3. `dispatch({type: 'LOAD_AGENDA', agenda: ir})`.
4. Reducer rebuilds `state.timers` from IR (`freshTimers(ir)`), resets cursor to `{0, 0}`, hides the paste modal flag.
5. Renderer paints sidebar (full rebuild), stage (slide 1: title), timer bar.
6. PersistenceLayer schedules save.

## Persistence Schema (localStorage)

**Key:** `agenda-presenter:v1` (versioned in the key itself — see Migrations).

**Shape:**

```json
{
  "schemaVersion": 1,
  "savedAt": "2026-05-16T14:32:11.823Z",
  "agenda": {
    "rawMarkdown": "# Meeting Admins\n...",
    "admins": {
      "meetingMaster": "Sarah",
      "notetaker": "Teck Lee"
    },
    "items": [
      {
        "index": 1,
        "title": "Kickoff",
        "attribution": "Sarah",
        "deadline": null,
        "durationSec": 60,
        "perPerson": null
      },
      {
        "index": 2,
        "title": "Status round",
        "attribution": "Team",
        "deadline": "2026-05-30",
        "durationSec": 360,
        "perPerson": {
          "perPersonSec": 120,
          "people": ["Sarah", "Teck Lee", "Solomon"]
        }
      }
    ]
  },
  "cursor": { "slideIdx": 1, "subIdx": 0 },
  "timers": {
    "0":   { "remainingSec": 0,   "allocatedSec": 0 },
    "1":   { "remainingSec": 24,  "allocatedSec": 60 },
    "2.0": { "remainingSec": 120, "allocatedSec": 120 },
    "2.1": { "remainingSec": 120, "allocatedSec": 120 },
    "2.2": { "remainingSec": 120, "allocatedSec": 120 }
  },
  "theme": "light",
  "ui": { "paused": true }
}
```

**Notes:**

- **Slide 0 is the title slide** (Meeting Admins). It has a timer entry with `0/0` so the schema is uniform; the renderer simply hides the timer bar (or shows it dimmed) on slide 0.
- **`rawMarkdown` is stored.** On reload, if the parser ever changes, we can re-parse fresh from `rawMarkdown` rather than trusting an older IR shape. This is the cheapest possible migration safety net.
- **No `agendaId` / no `meetingId`.** One agenda at a time. Loading a new one fully replaces.
- **`savedAt` is informational.** Lets a future "stale state" warning be added without a schema bump.
- **`ui` is minimal on purpose.** Sidebar expand/collapse state could go here later if it matters (it probably doesn't — default to "current item expanded").

### Migration Strategy

```javascript
function migrate(saved) {
  if (!saved || typeof saved !== 'object') return null;
  if (saved.schemaVersion === 1) return saved;
  // Future:
  // if (saved.schemaVersion === 1 && CURRENT === 2) return v1tov2(saved);
  // Unknown version: try to recover what we can from rawMarkdown.
  if (saved.agenda && saved.agenda.rawMarkdown) {
    return {
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
      agenda: parseAgenda(saved.agenda.rawMarkdown),
      cursor: { slideIdx: 0, subIdx: 0 },
      timers: null,                       // freshTimers will rebuild
      theme: saved.theme || 'light',
      ui: { paused: true }
    };
  }
  return null;                            // give up, show paste UI
}
```

**Rule:** Bump `schemaVersion` (and the storage key suffix `:v2`) whenever a shape change is non-additive. Additive changes (new optional fields) do not need a bump.

## Build Order

The user's proposed order — parser → timer state machine → layout — is **mostly right**, but timer state machine before any state/store wiring will cause rework. Here is the refined dependency-driven order:

```
1.  Parser (pure)                ← no dependencies; testable in isolation by pasting strings into the console
2.  AgendaModel selectors        ← depends on Parser output shape
3.  Store + reducer skeleton     ← depends on the IR; needs LOAD_AGENDA, JUMP, NEXT first
4.  Renderer (static layout)     ← depends on store; render the IR as slides + sidebar without timers
5.  TimerEngine                  ← depends on store + cursor; add TICK + currentTimerKey
6.  Router/SlideController       ← depends on store; adds NEXT / SHIFT_NEXT / advanceCursor logic
7.  PersistenceLayer             ← depends on stable store shape; add last so schema doesn't churn
8.  KeyboardController           ← depends on action set being final
9.  InputController (paste/drop) ← depends on parser + LOAD_AGENDA
10. ThemeController               ← independent; can slot in anytime after CSS tokens exist
11. Overtime visuals + polish     ← last
```

### Why this order

- **Parser first** so you can hand-write fixtures and validate the IR shape in the DevTools console with no UI at all.
- **Store before TimerEngine.** The TimerEngine is trivial (one interval, one dispatch) *if* the store exists. Building a timer first means writing it twice.
- **Renderer before TimerEngine.** Seeing slides on screen makes timer development obviously correct or obviously wrong. Without the renderer you're debugging blind.
- **Persistence after the state shape settles.** If you wire persistence at step 3, every store change forces a schema migration. Wait until the shape is real.
- **Keyboard and Input late.** They are thin wrappers around dispatch — they only become correct once the action set is final.

### Dependency table

| Module | Depends on | Blocks |
|--------|------------|--------|
| Parser | nothing | AgendaModel, Renderer, InputController |
| AgendaModel | Parser IR | Store reducer, Renderer |
| Store | AgendaModel, action set | Everything below |
| Renderer | Store, CSS tokens | Visual feedback for all later work |
| TimerEngine | Store, cursor helper | Timer visuals, overtime |
| Router | Store | Keyboard `→` / Shift+`→`, sidebar `JUMP` |
| Persistence | Store schema (frozen) | nothing (additive) |
| Keyboard | Action set frozen | nothing |
| Input | Parser, Store | nothing |
| Theme | CSS tokens | nothing |

## Scaling Considerations

This is a single-user, single-machine, screen-shared tool. "Scale" here means *how long an agenda can be* and *how many ticks before things drift*.

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1–20 agenda items, single meeting | No changes. This is the design target. |
| 50+ agenda items | Sidebar may need a small virtual scroll, but at 50 `<li>` elements native scroll is fine. No change. |
| Multi-hour meetings (timer accuracy) | Already drift-resistant: TimerEngine uses `Date.now()` deltas, not assumed tick spacing. A 3-hour meeting drifts by single-digit seconds at worst, and an out-of-focus tab will throttle but resume correctly on focus. |
| Many saved agendas | Out of scope (one agenda at a time). If ever wanted, key per `agenda.id` and add a picker. Not now. |

### What breaks first

1. **Tab throttling when not in focus.** Chrome/Edge throttle `setInterval` to ~1Hz on backgrounded tabs. Because the engine uses wall-clock deltas, the math stays correct, but visual updates are slow until focus returns. Acceptable for screenshare (the tab is always foreground).
2. **localStorage 5MB quota.** Not a real risk — state is < 10 KB. Ignore.
3. **Long sidebar with many sub-items.** At ~100 items the sidebar starts feeling sluggish on full rebuild. Switch full sidebar rebuild to keyed-diff if it ever happens. Not now.

## Anti-Patterns

### Anti-Pattern 1: One `setInterval` per timer

**What people do:** Spawn a `setInterval` when entering a slide, `clearInterval` when leaving. Restart when navigating back.

**Why it's wrong:**
- Forgotten clears leak timers.
- Pause becomes "clear interval then remember to restart" — branching state, easy to desync.
- "Navigate away and back returns to that slide's running/paused state" requires per-slide *state*, not per-slide *intervals*.

**Do this instead:** One interval, state-driven (Pattern 2). Per-slide `running` / `remainingSec` lives in the store, not in interval identity.

### Anti-Pattern 2: Sub-states as separate slides

**What people do:** Flatten "max per person" into N independent slides for Sarah, Teck Lee, Solomon.

**Why it's wrong:**
- Violates the user's mental model (one agenda item, multiple speakers).
- Breaks numbering: agenda item 3 with 3 sub-states becomes slides 3, 4, 5 and item 4 becomes slide 6 — confusing in the sidebar.
- Breaks "click sidebar item 3 jumps to the current speaker, not always Sarah."

**Do this instead:** Keep the slide singular. Sub-state lives in `cursor.subIdx` and `timers["3.x"]` (Pattern 3). Renderer draws one slide that visually highlights the active speaker.

### Anti-Pattern 3: Each module touches the DOM

**What people do:** TimerEngine writes the timer bar directly. KeyboardController toggles the pause icon. Sidebar handler updates its own `.is-active` class.

**Why it's wrong:**
- Three places update the timer bar — drift inevitable.
- Persistence sees state changes but the DOM does not, or vice versa.
- Theme switches require chasing down every direct DOM writer.

**Do this instead:** Renderer is the only DOM writer. Every other module dispatches actions; the renderer reacts.

### Anti-Pattern 4: `setTimeout` chains for "advance person → advance item"

**What people do:** `setTimeout(advancePerson, 100); setTimeout(maybeAdvanceItem, 200)`.

**Why it's wrong:**
- Race-prone, untestable, hard to reason about during fast keypresses.

**Do this instead:** Make `advanceCursor(state)` a pure synchronous function on state. The reducer calls it. No timeouts.

### Anti-Pattern 5: Storing rendered DOM in state

**What people do:** Stash sidebar `<li>` elements or HTML strings in `state.ui` for "performance."

**Why it's wrong:**
- DOM in state breaks JSON serialization → persistence dies.
- The renderer becomes responsible for two sources of truth.

**Do this instead:** State is JSON-shaped, always. DOM is a derivative, always.

### Anti-Pattern 6: Persisting on every TICK without debouncing

**What people do:** `subscribe(() => localStorage.setItem(...))` without debounce.

**Why it's wrong:**
- 4 writes/sec × multi-minute meeting = wasted main-thread work and SSD wear; can stutter the timer bar.

**Do this instead:** Debounce 500ms (Pattern 5). Loss window is half a second — acceptable.

## Integration Points

### External Services

None. The app is offline. Even fonts are system stack (Inter optional via `@font-face` only if a `.woff2` is base64-embedded; otherwise `font-family: Inter, system-ui, sans-serif` falls through gracefully).

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Parser ↔ Store | Function return value (`parseAgenda(md) → IR`); Store ingests via `LOAD_AGENDA` action | Parser must never touch the store directly |
| Store ↔ Renderer | `subscribe(fn)` callback; renderer reads `state` | Renderer never mutates state |
| Store ↔ TimerEngine | TimerEngine reads `state` to decide whether to dispatch `TICK`; dispatches `TICK` only | Single interval; no per-slide intervals |
| Store ↔ PersistenceLayer | Subscribe → debounced `JSON.stringify(state)`; boot-time `loadState()` dispatches `LOAD_AGENDA` if found | Schema version lives in state, not just the key |
| Store ↔ KeyboardController | One `window.keydown` listener → switch → `dispatch` | Don't bind per-element shortcuts |
| Store ↔ InputController | Paste/drop handlers → Parser → `dispatch('LOAD_AGENDA')` | Confirm overwrite if `state.agenda` already populated |
| Renderer ↔ DOM | Region-scoped writes (`sidebar.innerHTML = ...` etc.) | Only place that touches DOM, period |
| ThemeController ↔ DOM | Sets `<html data-theme>` attribute | CSS does the rest |

## Sources

- [MDN — Event-driven programming and the observer pattern](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events) — HIGH confidence, foundational
- [MDN — `setInterval` throttling and timer precision](https://developer.mozilla.org/en-US/docs/Web/API/setInterval) — HIGH confidence
- [MDN — Web Storage API (localStorage)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API) — HIGH confidence; quota ~5–10 MB per origin
- [MDN — CSS custom properties for theming](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties) — HIGH confidence
- Redux design notes (single store, pure reducer, subscribers) — pattern is mature and well-documented; we apply it without the library because the state graph is tiny.
- The PROJECT.md constraints in this repo (single file, no build, localStorage only, modern Chromium target).

---
*Architecture research for: single-file local HTML meeting-agenda presenter*
*Researched: 2026-05-16*
