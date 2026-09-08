# Hashi Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a random, rules-complete Hashi game at `/hashi` with exact SVG interactions, local run persistence, a casual SQLite leaderboard, and an incremental build-notes post.

**Architecture:** Framework-independent TypeScript modules own Hashi geometry, rules, solving, and generation; a Vue composable owns mutable run state; focused Vue components render the board-first interface. FastAPI exposes two small leaderboard endpoints backed by SQLite, while the game remains fully client-playable if those endpoints fail.

**Tech Stack:** Vue 3.5, TypeScript 5.9, Vite 7, Nuxt UI 4, SVG, Web Workers, Vitest 4, FastAPI, Pydantic, SQLite, pytest.

## Global Constraints

- Route: `/hashi`; navigation group: Playground.
- Categories: Intro `15 × 15`, Daily `30 × 15`, Weekly `35 × 18`, Monthly `40 × 20`.
- Corridors cycle `0 → 1 → 2 → 0` on click, Enter, or Space.
- Bridges are orthogonal, connect nearest visible islands, stop at rounded-square borders, never cross islands or other bridges, and never exceed two per corridor.
- Completion requires exact clue counts and one connected island graph; a locally satisfied `1—1` component does not complete the puzzle.
- Satisfied islands and incident bridges recede with low-opacity muted green; overfilled islands use brick red plus text/legend support.
- Random generation must yield a solvable puzzle with exactly one solution; bounded failure falls back to a bundled valid puzzle.
- Store preferred category and the active run in versioned `localStorage`.
- Leaderboard is top five per category; ask for a nickname only after a qualifying solve.
- Use the existing warm neutral OKLCH tokens, Nuxt UI foundation, system sans stack, subtle motion, and responsive app shell.
- The leaderboard must never block puzzle generation, play, completion, reset, or starting another puzzle.

---

## File Map

Create these focused client files:

- `src/features/hashi/types.ts`: shared domain and API types.
- `src/features/hashi/geometry.ts`: neighbor discovery, crossing checks, and SVG endpoints.
- `src/features/hashi/rules.ts`: clue totals, island states, connectivity, and completion.
- `src/features/hashi/generator.ts`: seeded solution-first generator and fallback selection.
- `src/features/hashi/solver.ts`: bounded solution counter.
- `src/features/hashi/generator.worker.ts`: worker message protocol.
- `src/features/hashi/persistence.ts`: versioned local record parsing and serialization.
- `src/features/hashi/useHashiGame.ts`: active game, timer, history, and commands.
- `src/features/hashi/useHashiLeaderboard.ts`: API requests and qualification.
- `src/features/hashi/*.test.ts`: co-located domain tests.
- `src/components/hashi/HashiBoard.vue`: SVG board and corridor interaction.
- `src/components/hashi/HashiControls.vue`: category and history actions.
- `src/components/hashi/HashiLeaderboard.vue`: rankings and nickname dialog.
- `src/pages/HashiPage.vue`: route composition and completion orchestration.
- `src/content/blog/notes-from-building-hashi-one-rule-at-a-time.md`: build notes.

Modify these integration files:

- `src/router/index.ts`: lazy `/hashi` route.
- `src/App.vue`: navigation and search entries.
- `src/types/api-generated.ts`: leaderboard request/response contracts.
- `server/models.py`: Pydantic leaderboard models.
- `server/hashi_leaderboard.py`: SQLite repository and schema initialization.
- `server/main.py`: leaderboard dependency and routes.
- `server/tests/test_api.py`: API behavior.

---

### Task 1: Hashi Domain Model, Geometry, and Rules

**Files:**
- Create: `src/features/hashi/types.ts`
- Create: `src/features/hashi/geometry.ts`
- Create: `src/features/hashi/rules.ts`
- Test: `src/features/hashi/geometry.test.ts`
- Test: `src/features/hashi/rules.test.ts`

**Interfaces:**
- Produces: `HashiPuzzle`, `Island`, `Corridor`, `BridgeCounts`, `getVisibleCorridors`, `bridgeSegments`, `corridorsCross`, `getIslandState`, and `evaluatePuzzle`.
- Consumes: no feature-local interfaces.

- [ ] **Step 1: Write failing geometry and rules tests**

```ts
import { describe, expect, it } from 'vitest'
import { bridgeSegments, corridorsCross, getVisibleCorridors } from './geometry'
import { evaluatePuzzle, getIslandState } from './rules'
import type { HashiPuzzle } from './types'

const puzzle: HashiPuzzle = {
  id: 'test', category: 'intro', width: 7, height: 7,
  islands: [
    { id: 'a', x: 1, y: 1, clue: 1 }, { id: 'b', x: 5, y: 1, clue: 1 },
    { id: 'c', x: 3, y: 3, clue: 2 }, { id: 'd', x: 3, y: 5, clue: 2 },
  ],
}

it('finds nearest visible orthogonal islands only', () => {
  expect(getVisibleCorridors(puzzle.islands).map(({ a, b }) => [a, b])).toEqual([
    ['a', 'b'], ['c', 'd'],
  ])
})

it('stops visible lines at 19-unit rounded-square edges', () => {
  const [segment] = bridgeSegments({ id: 'a:b', a: 'a', b: 'b', axis: 'horizontal' }, puzzle, 40, 19, 1)
  expect(segment).toEqual({ x1: 59, y1: 40, x2: 181, y2: 40 })
})

it('offsets double bridges symmetrically', () => {
  const segments = bridgeSegments({ id: 'c:d', a: 'c', b: 'd', axis: 'vertical' }, puzzle, 40, 19, 2)
  expect(segments.map((line) => line.x1)).toEqual([117, 123])
})

it('detects only interior perpendicular crossings', () => {
  expect(corridorsCross({ a: { x: 0, y: 2 }, b: { x: 4, y: 2 } }, { a: { x: 2, y: 0 }, b: { x: 2, y: 4 } })).toBe(true)
})

it('distinguishes satisfied and overfilled islands', () => {
  expect(getIslandState('a', puzzle, { 'a:b': 1 })).toBe('satisfied')
  expect(getIslandState('a', puzzle, { 'a:b': 2 })).toBe('overfilled')
})

it('rejects locally satisfied but stranded groups', () => {
  const disconnected: HashiPuzzle = {
    id: 'stranded', category: 'intro', width: 7, height: 3,
    islands: [
      { id: 'a', x: 0, y: 0, clue: 1 }, { id: 'b', x: 2, y: 0, clue: 1 },
      { id: 'c', x: 4, y: 2, clue: 1 }, { id: 'd', x: 6, y: 2, clue: 1 },
    ],
  }
  expect(evaluatePuzzle(disconnected, { 'a:b': 1, 'c:d': 1 })).toMatchObject({
    allCountsMatch: true, connected: false, solved: false,
  })
})
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npm test -- src/features/hashi/geometry.test.ts src/features/hashi/rules.test.ts`

Expected: FAIL because the feature modules do not exist.

- [ ] **Step 3: Add the domain types**

```ts
export type HashiCategory = 'intro' | 'daily' | 'weekly' | 'monthly'
export type Axis = 'horizontal' | 'vertical'
export type BridgeCount = 0 | 1 | 2
export type BridgeCounts = Record<string, BridgeCount>

export interface Island { id: string; x: number; y: number; clue: number }
export interface Corridor { id: string; a: string; b: string; axis: Axis }
export interface HashiPuzzle {
  id: string
  category: HashiCategory
  width: number
  height: number
  islands: Island[]
}
export interface LineSegment { x1: number; y1: number; x2: number; y2: number }
export type IslandState = 'open' | 'satisfied' | 'overfilled'
export interface PuzzleEvaluation {
  allCountsMatch: boolean
  connected: boolean
  solved: boolean
  strandedIslandIds: string[]
}
```

- [ ] **Step 4: Implement nearest-neighbor geometry and bridge layout**

```ts
export function corridorId(a: string, b: string) {
  return [a, b].sort().join(':')
}

export function getVisibleCorridors(islands: Island[]): Corridor[] {
  const result = new Map<string, Corridor>()
  for (const island of islands) {
    const candidates = islands.filter((other) => other.id !== island.id && (other.x === island.x || other.y === island.y))
    for (const axis of ['horizontal', 'vertical'] as const) {
      const aligned = candidates.filter((other) => axis === 'horizontal' ? other.y === island.y : other.x === island.x)
      for (const direction of [-1, 1]) {
        const visible = aligned
          .filter((other) => direction * (axis === 'horizontal' ? other.x - island.x : other.y - island.y) > 0)
          .sort((left, right) => Math.abs((axis === 'horizontal' ? left.x : left.y) - (axis === 'horizontal' ? island.x : island.y)) - Math.abs((axis === 'horizontal' ? right.x : right.y) - (axis === 'horizontal' ? island.x : island.y)))[0]
        if (!visible) continue
        const id = corridorId(island.id, visible.id)
        const [a, b] = [island.id, visible.id].sort()
        result.set(id, { id, a, b, axis })
      }
    }
  }
  return [...result.values()].sort((left, right) => left.id.localeCompare(right.id))
}

export function bridgeSegments(corridor: Corridor, puzzle: HashiPuzzle, cell: number, halfIsland: number, count: BridgeCount): LineSegment[] {
  const a = puzzle.islands.find((island) => island.id === corridor.a)!
  const b = puzzle.islands.find((island) => island.id === corridor.b)!
  const start = { x: a.x * cell, y: a.y * cell }
  const end = { x: b.x * cell, y: b.y * cell }
  const direction = { x: Math.sign(end.x - start.x), y: Math.sign(end.y - start.y) }
  const offsets = count === 2 ? [-3, 3] : count === 1 ? [0] : []
  return offsets.map((offset) => ({
    x1: start.x + direction.x * halfIsland + (corridor.axis === 'vertical' ? offset : 0),
    y1: start.y + direction.y * halfIsland + (corridor.axis === 'horizontal' ? offset : 0),
    x2: end.x - direction.x * halfIsland + (corridor.axis === 'vertical' ? offset : 0),
    y2: end.y - direction.y * halfIsland + (corridor.axis === 'horizontal' ? offset : 0),
  }))
}
```

Implement `corridorsCross` using strict interior comparisons so shared island endpoints are never classified as crossings.

- [ ] **Step 5: Implement rule evaluation with graph traversal**

```ts
export function getIslandTotal(id: string, corridors: Corridor[], counts: BridgeCounts) {
  return corridors.reduce((sum, corridor) => corridor.a === id || corridor.b === id ? sum + (counts[corridor.id] ?? 0) : sum, 0)
}

export function getIslandState(id: string, puzzle: HashiPuzzle, counts: BridgeCounts): IslandState {
  const island = puzzle.islands.find((candidate) => candidate.id === id)!
  const total = getIslandTotal(id, getVisibleCorridors(puzzle.islands), counts)
  return total === island.clue ? 'satisfied' : total > island.clue ? 'overfilled' : 'open'
}

export function evaluatePuzzle(puzzle: HashiPuzzle, counts: BridgeCounts): PuzzleEvaluation {
  const corridors = getVisibleCorridors(puzzle.islands)
  const allCountsMatch = puzzle.islands.every((island) => getIslandTotal(island.id, corridors, counts) === island.clue)
  const visited = new Set<string>()
  const queue = puzzle.islands.length ? [puzzle.islands[0]!.id] : []
  while (queue.length) {
    const id = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    for (const corridor of corridors) {
      if (!(counts[corridor.id] > 0)) continue
      if (corridor.a === id) queue.push(corridor.b)
      if (corridor.b === id) queue.push(corridor.a)
    }
  }
  const strandedIslandIds = puzzle.islands.filter((island) => !visited.has(island.id)).map((island) => island.id)
  const connected = puzzle.islands.length > 0 && strandedIslandIds.length === 0
  return { allCountsMatch, connected, solved: allCountsMatch && connected, strandedIslandIds }
}
```

- [ ] **Step 6: Run tests and commit**

Run: `npm test -- src/features/hashi/geometry.test.ts src/features/hashi/rules.test.ts`

Expected: PASS.

```bash
git add src/features/hashi
git commit -m "feat: add hashi rules and geometry"
```

### Task 2: Unique Random Puzzle Generation

**Files:**
- Create: `src/features/hashi/solver.ts`
- Create: `src/features/hashi/generator.ts`
- Create: `src/features/hashi/generator.worker.ts`
- Create: `src/features/hashi/fallbacks.ts`
- Test: `src/features/hashi/generator.test.ts`
- Test: `src/features/hashi/solver.test.ts`

**Interfaces:**
- Consumes: `HashiPuzzle`, `Corridor`, `BridgeCounts`, `getVisibleCorridors`, `corridorsCross`, and `evaluatePuzzle` from Task 1.
- Produces: `countSolutions(puzzle, limit): number`, `generatePuzzle(category, seed): GeneratedPuzzle`, and worker messages `{ type: 'generate'; category; seed }` / `{ type: 'generated'; puzzle }`.

- [ ] **Step 1: Write generator and solver tests**

```ts
it('counts a forced puzzle as unique', () => {
  expect(countSolutions(forcedPuzzle, 2)).toBe(1)
})

it.each(['intro', 'daily', 'weekly', 'monthly'] as const)('generates a valid unique %s puzzle', (category) => {
  const generated = generatePuzzle(category, 123456)
  expect(evaluatePuzzle(generated.puzzle, generated.solution).solved).toBe(true)
  expect(countSolutions(generated.puzzle, 2)).toBe(1)
  expect(generated.puzzle.width).toBe(CATEGORY_CONFIG[category].width)
})

it('is deterministic for a supplied seed', () => {
  expect(generatePuzzle('intro', 42)).toEqual(generatePuzzle('intro', 42))
})
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- src/features/hashi/generator.test.ts src/features/hashi/solver.test.ts`

Expected: FAIL because generator and solver modules do not exist.

- [ ] **Step 3: Implement bounded solution counting**

Represent every visible corridor as a variable with domain `0 | 1 | 2`. Backtrack over the most constrained corridor, prune when an island's assigned sum exceeds its clue or its remaining maximum cannot reach its clue, reject partial crossings immediately, and call `evaluatePuzzle` only when all variables are assigned.

```ts
export function countSolutions(puzzle: HashiPuzzle, limit = 2): number {
  const corridors = getVisibleCorridors(puzzle.islands)
  const counts: BridgeCounts = {}
  let solutions = 0

  function search(index: number) {
    if (solutions >= limit) return
    if (index === corridors.length) {
      if (evaluatePuzzle(puzzle, counts).solved) solutions += 1
      return
    }
    const corridor = corridors[index]!
    for (const value of [0, 1, 2] as const) {
      counts[corridor.id] = value
      if (partialCountsCanStillMatch(puzzle, corridors, counts, index) && !hasActiveCrossing(corridors, counts)) search(index + 1)
    }
    delete counts[corridor.id]
  }

  search(0)
  return solutions
}
```

Order corridors by the minimum remaining capacity of their endpoints before search so the bounded uniqueness check remains practical.

- [ ] **Step 4: Implement the seeded solution-first generator**

```ts
export const CATEGORY_CONFIG = {
  intro: { width: 15, height: 15, targetIslands: 18, extraEdgeRate: 0.08, doubleRate: 0.12 },
  daily: { width: 30, height: 15, targetIslands: 42, extraEdgeRate: 0.18, doubleRate: 0.22 },
  weekly: { width: 35, height: 18, targetIslands: 58, extraEdgeRate: 0.24, doubleRate: 0.28 },
  monthly: { width: 40, height: 20, targetIslands: 76, extraEdgeRate: 0.3, doubleRate: 0.34 },
} as const

export function generatePuzzle(category: HashiCategory, seed: number): GeneratedPuzzle {
  const random = mulberry32(seed)
  const config = CATEGORY_CONFIG[category]
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const islands = placeSpacedIslands(config, random)
    const corridors = getVisibleCorridors(islands)
    const solution = buildConnectedPlanarSolution(islands, corridors, config, random)
    const puzzle = deriveClues({ category, width: config.width, height: config.height, islands }, corridors, solution)
    if (puzzle.islands.every(({ clue }) => clue >= 1 && clue <= 8) && countSolutions(puzzle, 2) === 1) {
      return { puzzle: { ...puzzle, id: fingerprintPuzzle(puzzle) }, solution }
    }
  }
  return cloneFallback(category)
}
```

`buildConnectedPlanarSolution` must start from one island, repeatedly attach an unvisited island through a non-crossing visible corridor, then add optional non-crossing corridors and doubles using the category rates. Reject an attempt if the spanning phase cannot reach every island.

- [ ] **Step 5: Add worker and bundled fallback protocol**

```ts
self.onmessage = (event: MessageEvent<{ type: 'generate'; category: HashiCategory; seed: number }>) => {
  if (event.data.type !== 'generate') return
  const generated = generatePuzzle(event.data.category, event.data.seed)
  self.postMessage({ type: 'generated', puzzle: generated.puzzle })
}
```

Use a prevalidated forced chain as the last-resort fallback for each category; generator tests must assert each fallback solves and is unique.

```ts
const FALLBACK_XS: Record<HashiCategory, number[]> = {
  intro: [1, 5, 9, 13], daily: [1, 8, 15, 22, 28],
  weekly: [1, 9, 17, 25, 33], monthly: [1, 10, 20, 30, 38],
}

export function cloneFallback(category: HashiCategory): GeneratedPuzzle {
  const config = CATEGORY_CONFIG[category]
  const xs = FALLBACK_XS[category]
  const y = Math.floor(config.height / 2)
  const islands = xs.map((x, index) => ({ id: `i${index}`, x, y, clue: index === 0 || index === xs.length - 1 ? 1 : 2 }))
  const puzzle: HashiPuzzle = { id: `fallback-${category}`, category, width: config.width, height: config.height, islands }
  const solution = Object.fromEntries(getVisibleCorridors(islands).map(({ id }) => [id, 1])) as BridgeCounts
  return { puzzle, solution }
}
```

- [ ] **Step 6: Run tests and commit**

Run: `npm test -- src/features/hashi/generator.test.ts src/features/hashi/solver.test.ts`

Expected: PASS for deterministic representative seeds and all fallbacks.

```bash
git add src/features/hashi
git commit -m "feat: generate unique hashi puzzles"
```

### Task 3: Persistent Game State and Timer

**Files:**
- Create: `src/features/hashi/persistence.ts`
- Create: `src/features/hashi/useHashiGame.ts`
- Test: `src/features/hashi/persistence.test.ts`
- Test: `src/features/hashi/useHashiGame.test.ts`

**Interfaces:**
- Consumes: puzzle types and `evaluatePuzzle` from Tasks 1–2.
- Produces: `loadHashiState`, `saveHashiState`, and `useHashiGame()` with `selectCategory`, `cycleCorridor`, `undo`, `reset`, and `newPuzzle`.

- [ ] **Step 1: Write failing persistence and transition tests**

```ts
it('cycles bridge counts and records undo history', () => {
  const game = createHashiGame(fixedPuzzle, () => 1000)
  game.cycleCorridor('a:b'); game.cycleCorridor('a:b'); game.cycleCorridor('a:b')
  expect(game.bridgeCounts['a:b']).toBe(0)
  game.undo()
  expect(game.bridgeCounts['a:b']).toBe(2)
})

it('refuses a bridge that crosses an active bridge', () => {
  const game = createHashiGame(crossingPuzzle, () => 1000)
  game.cycleCorridor('a:b')
  expect(game.cycleCorridor('c:d')).toEqual({ changed: false, reason: 'crossing' })
})

it('drops corrupt and obsolete local records', () => {
  expect(parsePersistedHashiState('{"version":99}')).toBeNull()
  expect(parsePersistedHashiState('bad json')).toBeNull()
})
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- src/features/hashi/persistence.test.ts src/features/hashi/useHashiGame.test.ts`

Expected: FAIL because state modules do not exist.

- [ ] **Step 3: Implement versioned persistence**

```ts
export const HASHI_STORAGE_KEY = 'adrianlatorre.hashi.v1'
export interface PersistedHashiState {
  version: 1
  preferredCategory: HashiCategory
  puzzle: HashiPuzzle
  bridgeCounts: BridgeCounts
  startedAt: number
  history: Array<{ corridorId: string; previous: BridgeCount }>
}

export function parsePersistedHashiState(raw: string | null): PersistedHashiState | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<PersistedHashiState>
    return value.version === 1 && isCategory(value.preferredCategory) && isPuzzle(value.puzzle) && typeof value.startedAt === 'number' ? value as PersistedHashiState : null
  } catch { return null }
}
```

- [ ] **Step 4: Implement game commands and wall-clock timer**

`cycleCorridor` calculates the next count, checks only newly active bridges for crossings, permits overfilled clues, pushes one undo entry, persists, and recomputes completion. `elapsedMs` is always `now() - startedAt` until the solved timestamp is captured.

```ts
function cycleCorridor(id: string): CycleResult {
  const previous = bridgeCounts.value[id] ?? 0
  const next = ((previous + 1) % 3) as BridgeCount
  if (next > 0 && wouldCross(id, next, bridgeCounts.value)) return { changed: false, reason: 'crossing' }
  history.value.push({ corridorId: id, previous })
  bridgeCounts.value = { ...bridgeCounts.value, [id]: next }
  evaluation.value = evaluatePuzzle(puzzle.value, bridgeCounts.value)
  if (evaluation.value.solved && solvedAt.value === null) solvedAt.value = now()
  persist()
  return { changed: true }
}
```

- [ ] **Step 5: Run tests and commit**

Run: `npm test -- src/features/hashi/persistence.test.ts src/features/hashi/useHashiGame.test.ts`

Expected: PASS.

```bash
git add src/features/hashi
git commit -m "feat: persist hashi game progress"
```

### Task 4: Accessible SVG Board and Controls

**Files:**
- Create: `src/components/hashi/HashiBoard.vue`
- Create: `src/components/hashi/HashiControls.vue`
- Test: `src/components/hashi/HashiBoard.test.ts`

**Interfaces:**
- Consumes: `HashiPuzzle`, `BridgeCounts`, geometry helpers, and island rule states.
- Produces: `cycle` event with a corridor ID and control events `select-category`, `undo`, `reset`, and `new-puzzle`.

- [ ] **Step 1: Write failing board interaction tests**

```ts
it('emits cycle from click, Enter, and Space', async () => {
  const wrapper = mount(HashiBoard, { props: { puzzle, bridgeCounts: {} } })
  const target = wrapper.get('[data-corridor="a:b"]')
  await target.trigger('click'); await target.trigger('keydown.enter'); await target.trigger('keydown.space')
  expect(wrapper.emitted('cycle')?.map(([id]) => id)).toEqual(['a:b', 'a:b', 'a:b'])
})

it('renders an expanded transparent corridor hit stroke', () => {
  const wrapper = mount(HashiBoard, { props: { puzzle, bridgeCounts: {} } })
  expect(wrapper.get('[data-corridor="a:b"] .hashi-hit').attributes('stroke-width')).toBe('28')
})
```

- [ ] **Step 2: Add Vue Test Utils and verify test failure**

Run: `npm install -D @vue/test-utils@latest jsdom`

Add `// @vitest-environment jsdom` to the component test, then run `npm test -- src/components/hashi/HashiBoard.test.ts`.

Expected: FAIL because `HashiBoard.vue` does not exist.

- [ ] **Step 3: Implement the SVG board**

Render grid lines, visible bridges, hit strokes, then islands in that DOM order. Use `bridgeSegments` for every visible line; never draw center-to-center lines and rely on island fill to hide them.

```vue
<g v-for="corridor in corridors" :key="corridor.id" :data-corridor="corridor.id"
  role="button" tabindex="0" :aria-label="corridorLabel(corridor)"
  @click="emit('cycle', corridor.id)" @keydown.enter.prevent="emit('cycle', corridor.id)"
  @keydown.space.prevent="emit('cycle', corridor.id)">
  <line class="hashi-hit" v-bind="hitSegment(corridor)" stroke="transparent" stroke-width="28" pointer-events="stroke" />
  <line v-for="segment in bridgeSegmentsFor(corridor)" :key="segmentKey(segment)"
    class="hashi-bridge" :class="bridgeStateClass(corridor)" v-bind="segment" />
</g>
```

Rounded-square islands use `38 × 38`, `rx="11"`, and centers at `x * 40`, `y * 40`. Apply `.is-satisfied { color: color-mix(in oklch, var(--site-accent) 42%, transparent) }` to the island and any incident bridge; apply `.is-overfilled` with a brick-red CSS variable.

- [ ] **Step 4: Implement category and history controls**

Use Nuxt UI buttons where they improve focus and disabled states. Keep category tabs in one horizontally scrollable row, expose `aria-current="page"` on the selected category, disable Undo with empty history, and show confirmations only when reset/new-puzzle would discard nonzero bridges.

- [ ] **Step 5: Run tests and commit**

Run: `npm test -- src/components/hashi/HashiBoard.test.ts`

Expected: PASS for click and keyboard activation, exact hit target, island shape, and endpoint attributes.

```bash
git add package.json package-lock.json src/components/hashi
git commit -m "feat: render accessible hashi board"
```

### Task 5: Game Page, Navigation, Rules, and Responsive Layout

**Files:**
- Create: `src/pages/HashiPage.vue`
- Modify: `src/router/index.ts`
- Modify: `src/App.vue`
- Test: `src/pages/HashiPage.test.ts`

**Interfaces:**
- Consumes: `useHashiGame`, `HashiBoard`, and `HashiControls`.
- Produces: playable `/hashi` route and navigation/search discovery.

- [ ] **Step 1: Write failing page-state tests**

```ts
it('places rules and leaderboard after the board', () => {
  const wrapper = mount(HashiPage)
  const children = [...wrapper.element.querySelectorAll('[data-section]')].map((node) => node.getAttribute('data-section'))
  expect(children).toEqual(['board', 'rules', 'leaderboard'])
})
```

- [ ] **Step 2: Run the page test and verify failure**

Run: `npm test -- src/pages/HashiPage.test.ts`

Expected: FAIL because `HashiPage.vue` does not exist.

- [ ] **Step 3: Implement the board-first page**

```vue
<main class="hashi-page">
  <header class="hashi-hero">
    <p class="hashi-kicker">Experiment 05 · Logic puzzle</p>
    <h1>Build some bridges.</h1>
    <p>Connect every island without crossing paths. One click adds a bridge; a third clears the corridor.</p>
  </header>
  <HashiControls v-bind="controlProps" @select-category="game.selectCategory" @undo="game.undo" @reset="confirmReset" @new-puzzle="confirmNewPuzzle" />
  <section data-section="board" aria-label="Hashi puzzle">
    <div class="hashi-meta"><span>{{ categoryLabel }}</span><time>{{ formattedElapsed }}</time></div>
    <HashiBoard :puzzle="game.puzzle" :bridge-counts="game.bridgeCounts" @cycle="game.cycleCorridor" />
    <p v-if="game.evaluation.allCountsMatch && !game.evaluation.connected" role="status">All islands have the right number of bridges, but some groups are still stranded.</p>
  </section>
  <section data-section="rules">
    <UCollapsible>
      <button type="button">How to play</button>
      <template #content>
        <ol>
          <li>Connect islands only horizontally or vertically.</li>
          <li>Connect only the nearest visible island in a row or column.</li>
          <li>Never pass a bridge through an island.</li>
          <li>Use no more than two bridges in one corridor.</li>
          <li>Never cross another bridge.</li>
          <li>Match every island's number exactly.</li>
          <li>Keep every island in one connected network.</li>
        </ol>
      </template>
    </UCollapsible>
  </section>
  <section data-section="leaderboard"><HashiLeaderboard /></section>
</main>
```

Implement the approved warm board styles with `max-width: none` for the board wrapper, a `40px` SVG cell, `overflow-x: auto`, no gradient, no card shadow, and `prefers-reduced-motion` handling.

- [ ] **Step 4: Add route and navigation entries**

```ts
{
  path: '/hashi',
  name: 'Hashi',
  component: lazy(() => import('../pages/HashiPage.vue')),
}
```

Add `Hashi`, `Bridge-building logic puzzle`, `/hashi`, and `i-lucide-git-branch` to both `baseSearchGroups` and the Playground navigation children in `App.vue`.

- [ ] **Step 5: Run page tests, type-check, and commit**

Run: `npm test -- src/pages/HashiPage.test.ts && npm run type-check`

Expected: PASS.

```bash
git add src/pages/HashiPage.vue src/router/index.ts src/App.vue
git commit -m "feat: add hashi playground page"
```

### Task 6: SQLite Leaderboard API

**Files:**
- Create: `server/hashi_leaderboard.py`
- Modify: `server/models.py`
- Modify: `server/main.py`
- Modify: `server/tests/test_api.py`

**Interfaces:**
- Produces: `HashiLeaderboard`, `GET /api/hashi/leaderboard`, and `POST /api/hashi/scores`.
- Consumes: `Settings.database_path`.

- [ ] **Step 1: Write failing API tests**

```py
def test_hashi_leaderboard_orders_times_and_isolates_categories(tmp_path: Path) -> None:
    client = build_client(tmp_path)
    for nickname, duration in [("Ada", 90000), ("Lin", 45000), ("Sam", 61000)]:
        response = client.post("/api/hashi/scores", json={
            "category": "daily", "puzzleFingerprint": "a" * 16,
            "nickname": nickname, "durationMs": duration,
        })
        assert response.status_code == 201
    client.post("/api/hashi/scores", json={
        "category": "weekly", "puzzleFingerprint": "b" * 16,
        "nickname": "Bea", "durationMs": 1000,
    })
    body = client.get("/api/hashi/leaderboard?category=daily&limit=2").json()
    assert [entry["nickname"] for entry in body["entries"]] == ["Lin", "Sam"]

def test_hashi_score_rejects_bad_category_nickname_duration_and_fingerprint(tmp_path: Path) -> None:
    client = build_client(tmp_path)
    response = client.post("/api/hashi/scores", json={
        "category": "yearly", "puzzleFingerprint": "x", "nickname": "", "durationMs": -1,
    })
    assert response.status_code == 422
```

- [ ] **Step 2: Run the API tests and verify failure**

Run: `npm run test:server -- -k hashi`

Expected: FAIL with 404 responses.

- [ ] **Step 3: Add Pydantic contracts**

```py
from typing import Literal

HashiCategory = Literal["intro", "daily", "weekly", "monthly"]

class HashiScoreCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    category: HashiCategory
    puzzle_fingerprint: str = Field(alias="puzzleFingerprint", min_length=16, max_length=64, pattern=r"^[a-zA-Z0-9_-]+$")
    nickname: str = Field(min_length=1, max_length=20, pattern=r"^[^\x00-\x1f<>]+$")
    duration_ms: int = Field(alias="durationMs", ge=1000, le=604800000)

class HashiScore(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    nickname: str
    duration_ms: int = Field(alias="durationMs")
    created_at: datetime = Field(alias="createdAt")

class HashiLeaderboardResponse(BaseModel):
    category: HashiCategory
    entries: list[HashiScore]
```

- [ ] **Step 4: Implement schema initialization and repository**

```py
class HashiLeaderboard:
    def __init__(self, database_path: str) -> None:
        self.database_path = database_path
        with sqlite3.connect(database_path) as connection:
            connection.execute("""CREATE TABLE IF NOT EXISTS hashi_scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL CHECK(category IN ('intro','daily','weekly','monthly')),
                puzzle_fingerprint TEXT NOT NULL,
                nickname TEXT NOT NULL,
                duration_ms INTEGER NOT NULL CHECK(duration_ms > 0),
                created_at INTEGER NOT NULL
            )""")
            connection.execute("CREATE INDEX IF NOT EXISTS hashi_scores_category_time ON hashi_scores(category, duration_ms, created_at)")

    def add(self, score: HashiScoreCreate) -> HashiScore:
        nickname = " ".join(score.nickname.split())
        created_at = int(datetime.now(UTC).timestamp() * 1000)
        with sqlite3.connect(self.database_path) as connection:
            connection.execute("INSERT INTO hashi_scores(category,puzzle_fingerprint,nickname,duration_ms,created_at) VALUES(?,?,?,?,?)", (score.category, score.puzzle_fingerprint, nickname, score.duration_ms, created_at))
        return HashiScore(nickname=nickname, durationMs=score.duration_ms, createdAt=datetime.fromtimestamp(created_at / 1000, UTC))
```

Implement `top(category, limit)` with `ORDER BY duration_ms ASC, created_at ASC LIMIT ?`.

- [ ] **Step 5: Register endpoints before the SPA fallback**

```py
leaderboard = HashiLeaderboard(settings.database_path)

@app.get("/api/hashi/leaderboard", response_model=HashiLeaderboardResponse)
async def get_hashi_leaderboard(category: HashiCategory, limit: int = Query(5, ge=1, le=20)):
    return HashiLeaderboardResponse(category=category, entries=leaderboard.top(category, limit))

@app.post("/api/hashi/scores", response_model=HashiScore, status_code=201)
async def create_hashi_score(score: HashiScoreCreate):
    return leaderboard.add(score)
```

- [ ] **Step 6: Run server tests and commit**

Run: `npm run test:server`

Expected: all API tests PASS.

```bash
git add server/hashi_leaderboard.py server/models.py server/main.py server/tests/test_api.py
git commit -m "feat: add hashi leaderboard api"
```

### Task 7: Leaderboard Client and Qualifying Nickname Flow

**Files:**
- Create: `src/features/hashi/useHashiLeaderboard.ts`
- Create: `src/features/hashi/useHashiLeaderboard.test.ts`
- Create: `src/components/hashi/HashiLeaderboard.vue`
- Modify: `src/pages/HashiPage.vue`
- Modify: `src/types/api-generated.ts`
- Test: `src/pages/HashiPage.test.ts`

**Interfaces:**
- Consumes: Task 6 JSON contracts and Task 5 completion data.
- Produces: `load(category)`, `qualifies(durationMs)`, `submit(score)`, and a nickname dialog shown only for qualifying solves.

- [ ] **Step 1: Write failing qualification tests**

```ts
it('qualifies when fewer than five scores exist or time beats fifth place', () => {
  expect(qualifies(90000, [{ durationMs: 120000 }])).toBe(true)
  expect(qualifies(90000, [1, 2, 3, 4, 80000].map((durationMs) => ({ durationMs })))).toBe(false)
  expect(qualifies(70000, [1, 2, 3, 4, 80000].map((durationMs) => ({ durationMs })))).toBe(true)
})
```

- [ ] **Step 2: Run test and verify failure**

Run: `npm test -- src/features/hashi/useHashiLeaderboard.test.ts`

Expected: FAIL because the composable does not exist.

- [ ] **Step 3: Add typed API contracts and composable**

```ts
export interface HashiScore { nickname: string; durationMs: number; createdAt: string }
export interface HashiLeaderboardResponse { category: HashiCategory; entries: HashiScore[] }
export interface HashiScoreCreate { category: HashiCategory; puzzleFingerprint: string; nickname: string; durationMs: number }

export function qualifies(durationMs: number, entries: Array<Pick<HashiScore, 'durationMs'>>) {
  return entries.length < 5 || durationMs < entries[4]!.durationMs
}
```

`load` and `submit` use `/api/hashi/leaderboard` and `/api/hashi/scores`, expose `loading` and a retryable `error`, and never throw into game state.

- [ ] **Step 4: Implement ranking and nickname dialog**

Render rank, nickname, and formatted duration. On the first solved transition, load the category top five and open `UModal` only when `qualifies` returns true. Validate trimmed nickname length 1–20 before enabling submit. Closing the modal discards the unpublished result. Mark the completed puzzle fingerprint as submitted after a successful POST to prevent a duplicate prompt.

- [ ] **Step 5: Run client tests and commit**

Run: `npm test -- src/features/hashi/useHashiLeaderboard.test.ts src/pages/HashiPage.test.ts && npm run type-check`

Expected: PASS.

```bash
git add src/features/hashi/useHashiLeaderboard.ts src/features/hashi/useHashiLeaderboard.test.ts src/components/hashi/HashiLeaderboard.vue src/pages/HashiPage.vue src/types/api-generated.ts
git commit -m "feat: add hashi qualifying leaderboard"
```

### Task 8: Build Notes and Full Verification

**Files:**
- Create: `src/content/blog/notes-from-building-hashi-one-rule-at-a-time.md`
- Modify: `src/pages/HashiPage.vue`
- Test: `src/content/blog/frontmatter-exports.test.ts`

**Interfaces:**
- Consumes: the completed feature.
- Produces: indexed build notes linked from `/hashi`.

- [ ] **Step 1: Add the post with valid frontmatter**

```md
---
title: Notes from building Hashi one rule at a time
date: 2026-09-08
description: What a bridge puzzle taught me about geometry, graph connectivity, and generating constraints backwards.
---

Hashi looks like a drawing game. The useful implementation model is a graph whose edges happen to be visible.

## Start with visible neighbors

An island can only connect to the nearest island in each cardinal direction. Computing those corridors first removes impossible interactions before rendering begins.

## Put the board on one coordinate system

The grid, rounded-square island centers, bridge centerlines, edge termination, and generous invisible hit strokes all derive from the same SVG coordinates.

## Local arithmetic is not the whole solution

A pair of `1` islands can satisfy each other and still strand themselves. Completion therefore combines clue totals with a graph traversal that must reach every island.

## Generate the solution first

The generator builds a connected non-crossing bridge graph, derives the clues, and keeps only puzzles for which the bounded solver finds exactly one solution.

## Keep competition casual

Each run is random, so the leaderboard is a small prompt to replay rather than a claim of tournament fairness. Only qualifying solves ask for a nickname.
```

- [ ] **Step 2: Link the post from the game footer**

Add a `RouterLink` to `/blog/notes-from-building-hashi-one-rule-at-a-time` with the copy `Read the build notes` and an `i-lucide-arrow-up-right` icon.

- [ ] **Step 3: Run automated verification**

Run:

```bash
npm run type-check
npm test
npm run test:server
npm run lint
npm run build
```

Expected: every command exits `0`; Vite reports a successful production build.

- [ ] **Step 4: Run browser verification**

Start the existing client/server development commands. At desktop width verify Intro, Daily, Weekly, and Monthly generation; exact horizontal/vertical bridge alignment; single/double/clear cycling; crossing rejection; satisfied/overfilled/stranded/completed states; undo/reset/new puzzle; timer; refresh persistence; qualifying nickname submission; leaderboard order; and blog navigation. At a `390 × 844` viewport verify category tab scrolling, minimum 28px corridor hit strokes, board horizontal scrolling, visible timer/actions, collapsed rules, and leaderboard stacking.

- [ ] **Step 5: Commit documentation and final fixes**

```bash
git add src/content/blog/notes-from-building-hashi-one-rule-at-a-time.md src/pages/HashiPage.vue src/content/blog/frontmatter-exports.test.ts
git commit -m "docs: publish hashi build notes"
```

After the final commit, run `git status --short` and confirm only pre-existing unrelated files remain.
