# Hashi Interaction Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add explicit saved-position feedback, time-first leaderboard hint metadata, compact section spacing, and fast direction-aware bridge selection at corridor intersections.

**Architecture:** Keep durable puzzle state in `useHashiGame`, transient control feedback in `HashiPage`, and leaderboard ordering in the server so every client sees the same rank. Put pointer-choice math in a pure Hashi module, then let `HashiBoard` delegate pointer and click events through one SVG layer using cached topology and board-state flags.

**Tech Stack:** Vue 3 composition API, TypeScript, Vitest and Vue Test Utils, FastAPI/Pydantic, SQLite, pytest, SVG pointer events, Nuxt UI components.

## Global Constraints

- Ranking is solve duration ascending, then hints used ascending only for equal durations, then creation time ascending.
- Historical leaderboard rows keep unknown hint usage as `null`; never display them as zero hints.
- Save and restore feedback must not shift surrounding controls or rely on color alone.
- Pointer movement must not call the solver, hint engine, crossing evaluator, or visibility graph builder.
- Use one animation-frame-coalesced pointer path and update reactive state only when the selected corridor changes.
- Keyboard corridor interaction and direct touch taps remain available.
- Use the existing warm neutral palette and restrained accent tokens; do not add new decorative colors.
- Do not add a dependency.

---

### Task 1: Expose Snapshot Presence And Hint Usage

**Files:**
- Modify: `src/features/hashi/useHashiGame.ts`
- Test: `src/features/hashi/useHashiGame.test.ts`

**Interfaces:**
- Produces: `HashiGame.hasSnapshot: boolean`
- Produces: `HashiGame.hintsUsed: number`
- Produces from `useHashiGame`: readonly computed refs `hasSnapshot` and `hintsUsed`
- Keeps: `canRestoreSnapshot` means restoring would change the live position

- [ ] **Step 1: Write failing state tests**

Add assertions that distinguish snapshot presence from restorability and derive hint usage from the three-heart budget:

```ts
it('distinguishes a saved position from a restorable position', () => {
  const game = createHashiGame(fixedPuzzle, () => 1_000)

  expect(game.hasSnapshot).toBe(false)
  expect(game.canRestoreSnapshot).toBe(false)
  game.saveSnapshot()
  expect(game.hasSnapshot).toBe(true)
  expect(game.canRestoreSnapshot).toBe(false)
  game.cycleCorridor('a:b')
  expect(game.hasSnapshot).toBe(true)
  expect(game.canRestoreSnapshot).toBe(true)
  game.reset()
  expect(game.hasSnapshot).toBe(false)
})

it('reports how many hints were spent on the current puzzle', () => {
  const game = createHashiGame(fixedPuzzle, () => 1_000)

  expect(game.hintsUsed).toBe(0)
  game.requestHint()
  expect(game.hintsUsed).toBe(1)
  game.reset()
  expect(game.hintsUsed).toBe(1)
  game.newPuzzle()
  expect(game.hintsUsed).toBe(0)
})
```

- [ ] **Step 2: Run the new state tests and verify RED**

Run:

```bash
node node_modules/vitest/vitest.mjs run src/features/hashi/useHashiGame.test.ts -t 'distinguishes|reports how many hints'
```

Expected: FAIL because `hasSnapshot` and `hintsUsed` do not exist.

- [ ] **Step 3: Add the minimal getters**

Extend `HashiGame` and its returned object:

```ts
readonly hasSnapshot: boolean
readonly hintsUsed: number

get hasSnapshot() {
  return snapshot !== null
},
get hintsUsed() {
  return 3 - hintsRemaining
},
```

Expose both through `useHashiGame` with the existing `value(() => ...)` helper:

```ts
hasSnapshot: value(() => game.hasSnapshot),
hintsUsed: value(() => game.hintsUsed),
```

- [ ] **Step 4: Run the full game-state test file**

Run:

```bash
node node_modules/vitest/vitest.mjs run src/features/hashi/useHashiGame.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit the state contract**

```bash
git add src/features/hashi/useHashiGame.ts src/features/hashi/useHashiGame.test.ts
git commit -m "Expose Hashi snapshot and hint usage state"
```

---

### Task 2: Store And Rank Leaderboard Hint Usage

**Files:**
- Modify: `server/models.py`
- Modify: `server/hashi_leaderboard.py`
- Modify: `server/tests/test_api.py`

**Interfaces:**
- Consumes: JSON `hintsUsed: int` on new score submissions
- Produces: JSON `hintsUsed: int | null` on saved scores and leaderboard entries
- Database: nullable `hashi_scores.hints_used INTEGER CHECK(hints_used BETWEEN 0 AND 3)`

- [ ] **Step 1: Write failing API and migration tests**

Update existing score payloads to include `"hintsUsed": 0`. Add a ranking test with equal durations and different hint counts, plus a legacy-schema migration test:

```py
def test_hashi_leaderboard_uses_hints_only_to_break_equal_times(tmp_path: Path) -> None:
    client = build_client(tmp_path)
    scores = [
        ("Slow clean", 61_000, 0),
        ("Fast hinted", 60_000, 3),
        ("Fast clean", 60_000, 0),
    ]
    for nickname, duration_ms, hints_used in scores:
        response = client.post(
            "/api/hashi/scores",
            json={
                "category": "daily",
                "puzzleFingerprint": "a" * 16,
                "nickname": nickname,
                "durationMs": duration_ms,
                "hintsUsed": hints_used,
            },
        )
        assert response.status_code == 201

    entries = client.get("/api/hashi/leaderboard?category=daily&limit=5").json()["entries"]
    assert [entry["nickname"] for entry in entries] == [
        "Fast clean",
        "Fast hinted",
        "Slow clean",
    ]
    assert [entry["hintsUsed"] for entry in entries] == [0, 3, 0]


def test_hashi_leaderboard_migrates_legacy_hint_rows_as_unknown(tmp_path: Path) -> None:
    database = tmp_path / "test.db"
    with sqlite3.connect(database) as connection:
        connection.execute(
            """CREATE TABLE hashi_scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL,
                puzzle_fingerprint TEXT NOT NULL,
                nickname TEXT NOT NULL,
                duration_ms INTEGER NOT NULL,
                created_at INTEGER NOT NULL
            )"""
        )
        connection.execute(
            "INSERT INTO hashi_scores(category, puzzle_fingerprint, nickname, duration_ms, created_at) VALUES(?, ?, ?, ?, ?)",
            ("daily", "a" * 16, "Legacy", 50_000, 1_000),
        )

    client = build_client(tmp_path)
    entry = client.get("/api/hashi/leaderboard?category=daily&limit=5").json()["entries"][0]
    assert entry["hintsUsed"] is None
```

Also extend the invalid-payload test with `"hintsUsed": 4` and require HTTP 422.

- [ ] **Step 2: Run server tests and verify RED**

Run:

```bash
.venv/bin/python -m pytest server/tests/test_api.py -k hashi -q
```

Expected: FAIL because the API models and SQLite table do not contain hint usage.

- [ ] **Step 3: Extend Pydantic models**

Add aliases with separate create and response nullability:

```py
class HashiScoreCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    category: HashiCategory
    puzzle_fingerprint: str = Field(
        alias="puzzleFingerprint",
        min_length=16,
        max_length=64,
        pattern=r"^[a-zA-Z0-9_-]+$",
    )
    nickname: str = Field(min_length=1, max_length=20, pattern=r"^[^\x00-\x1f<>]+$")
    duration_ms: int = Field(alias="durationMs", ge=1_000, le=604_800_000)
    hints_used: int = Field(alias="hintsUsed", ge=0, le=3)


class HashiScore(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    nickname: str
    duration_ms: int = Field(alias="durationMs")
    hints_used: int | None = Field(alias="hintsUsed")
    created_at: datetime = Field(alias="createdAt")
```

Add `hints_used INTEGER CHECK(hints_used BETWEEN 0 AND 3)` to the `CREATE TABLE IF NOT EXISTS` definition for fresh databases.

- [ ] **Step 4: Add the idempotent SQLite migration and ordering**

After `CREATE TABLE IF NOT EXISTS`, inspect the schema and add the nullable column only when absent:

```py
columns = {
    row[1]
    for row in connection.execute("PRAGMA table_info(hashi_scores)").fetchall()
}
if "hints_used" not in columns:
    connection.execute(
        "ALTER TABLE hashi_scores ADD COLUMN hints_used INTEGER CHECK(hints_used BETWEEN 0 AND 3)"
    )
```

Include `hints_used` in insert, select, `_score`, and the ordering:

```sql
ORDER BY duration_ms ASC, hints_used IS NULL ASC, hints_used ASC, created_at ASC
```

The `hints_used IS NULL ASC` expression puts known values before historical unknowns when times are equal. Pass `score.hints_used` into new rows and serialize legacy `NULL` as `None`.

- [ ] **Step 5: Run server tests**

Run:

```bash
.venv/bin/python -m pytest server/tests -q
```

Expected: all server tests PASS.

- [ ] **Step 6: Commit the server contract**

```bash
git add server/models.py server/hashi_leaderboard.py server/tests/test_api.py
git commit -m "Record hint usage in Hashi scores"
```

---

### Task 3: Submit, Qualify, And Display Hint Usage

**Files:**
- Modify: `src/types/api-generated.ts`
- Modify: `src/features/hashi/useHashiLeaderboard.ts`
- Modify: `src/features/hashi/useHashiLeaderboard.test.ts`
- Modify: `src/components/hashi/HashiLeaderboard.vue`
- Create: `src/components/hashi/HashiLeaderboard.test.ts`
- Modify: `src/pages/HashiPage.vue`
- Modify: `src/pages/HashiPage.test.ts`

**Interfaces:**
- Consumes: `game.hintsUsed.value` from Task 1
- Produces: `HashiScore.hintsUsed: number | null`
- Produces: `HashiScoreCreate.hintsUsed: number`
- Changes: `qualifies(durationMs, hintsUsed, entries): boolean`

- [ ] **Step 1: Write failing qualification and rendering tests**

Replace the qualification test with time-first tuple cases:

```ts
const five = [
  { durationMs: 10_000, hintsUsed: 0 },
  { durationMs: 20_000, hintsUsed: 0 },
  { durationMs: 30_000, hintsUsed: 1 },
  { durationMs: 40_000, hintsUsed: 2 },
  { durationMs: 50_000, hintsUsed: 2 },
]

expect(qualifies(49_999, 3, five)).toBe(true)
expect(qualifies(50_000, 1, five)).toBe(true)
expect(qualifies(50_000, 3, five)).toBe(false)
expect(qualifies(50_001, 0, five)).toBe(false)
```

Mount `HashiLeaderboard` in the new component test file with one known and one legacy row. Assert `data-hints-used="2"` renders `2`, and `data-hints-used="unknown"` has `aria-label="Hint usage not recorded"` and displays `—`.

In `useHashiLeaderboard.test.ts`, stub the POST and follow-up GET, submit a score with one hint, and inspect the request body:

```ts
it('submits exact hint usage with a score', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ nickname: 'Ada', durationMs: 60_000, hintsUsed: 1, createdAt: '2026-09-24T12:00:00Z' }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ category: 'daily', entries: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  vi.stubGlobal('fetch', fetchMock)
  const leaderboard = useHashiLeaderboard()

  await leaderboard.submit({
    category: 'daily',
    puzzleFingerprint: 'a'.repeat(16),
    nickname: 'Ada',
    durationMs: 60_000,
    hintsUsed: 1,
  })

  expect(JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)).toMatchObject({ hintsUsed: 1 })
})
```

- [ ] **Step 2: Run client tests and verify RED**

Run:

```bash
node node_modules/vitest/vitest.mjs run src/features/hashi/useHashiLeaderboard.test.ts src/components/hashi/HashiLeaderboard.test.ts src/pages/HashiPage.test.ts
```

Expected: FAIL on missing fields, old `qualifies` signature, and absent hint UI.

- [ ] **Step 3: Update generated API types and qualification**

```ts
export interface HashiScore {
  nickname: string
  durationMs: number
  hintsUsed: number | null
  createdAt: string
}

export interface HashiScoreCreate {
  category: HashiCategory
  puzzleFingerprint: string
  nickname: string
  durationMs: number
  hintsUsed: number
}
```

Update qualification to compare the fifth row without allowing hints to beat a faster time:

```ts
export function qualifies(
  durationMs: number,
  hintsUsed: number,
  entries: ReadonlyArray<Pick<HashiScore, 'durationMs' | 'hintsUsed'>>,
) {
  if (entries.length < 5) return true
  const fifth = entries[4]!
  return (
    durationMs < fifth.durationMs ||
    (durationMs === fifth.durationMs &&
      (fifth.hintsUsed === null || hintsUsed < fifth.hintsUsed))
  )
}
```

- [ ] **Step 4: Wire completion metadata into the page**

Extend `pendingScore` to keep `hintsUsed`, call qualification with it, and include it in submission:

```ts
const pendingScore = ref<{
  durationMs: number
  puzzleFingerprint: string
  hintsUsed: number
} | null>(null)

const hintsUsed = game.hintsUsed.value
if (!leaderboard.error.value && leaderboard.qualifies(game.elapsedMs.value, hintsUsed, entries)) {
  pendingScore.value = {
    durationMs: game.elapsedMs.value,
    puzzleFingerprint: fingerprint,
    hintsUsed,
  }
}

await leaderboard.submit({
  category: game.preferredCategory.value,
  puzzleFingerprint: pendingScore.value.puzzleFingerprint,
  nickname: nickname.value.trim(),
  durationMs: pendingScore.value.durationMs,
  hintsUsed: pendingScore.value.hintsUsed,
})
```

- [ ] **Step 5: Render quiet hint metadata**

Add a fourth compact leaderboard column:

```vue
<span
  class="hashi-score-hints"
  :data-hints-used="entry.hintsUsed ?? 'unknown'"
  :aria-label="entry.hintsUsed === null ? 'Hint usage not recorded' : `${entry.hintsUsed} hints used`"
>
  <UIcon v-if="entry.hintsUsed !== null" name="i-lucide-lightbulb" aria-hidden="true" />
  {{ entry.hintsUsed ?? '—' }}
</span>
```

Use `grid-template-columns: 1.5rem 1fr auto 2.5rem`, muted color, tabular numbers, and a 0.75rem icon. Keep nickname and time more prominent.

- [ ] **Step 6: Run the focused client tests**

Run:

```bash
node node_modules/vitest/vitest.mjs run src/features/hashi/useHashiLeaderboard.test.ts src/components/hashi/HashiLeaderboard.test.ts src/pages/HashiPage.test.ts
```

Expected: all tests PASS.

- [ ] **Step 7: Commit leaderboard UI integration**

```bash
git add src/types/api-generated.ts src/features/hashi/useHashiLeaderboard.ts src/features/hashi/useHashiLeaderboard.test.ts src/components/hashi/HashiLeaderboard.vue src/components/hashi/HashiLeaderboard.test.ts src/pages/HashiPage.vue src/pages/HashiPage.test.ts
git commit -m "Show hint usage on Hashi leaderboard"
```

---

### Task 4: Add Save And Restore Control Feedback

**Files:**
- Modify: `src/components/hashi/HashiControls.vue`
- Modify: `src/components/hashi/HashiBoard.test.ts`
- Modify: `src/pages/HashiPage.vue`
- Modify: `src/pages/HashiPage.test.ts`

**Interfaces:**
- Consumes: `hasSnapshot` and `canRestoreSnapshot` from Task 1
- Page-local state: `positionFeedback: 'saved' | 'restored' | null`
- Controls props: `hasSnapshot?: boolean`, `positionFeedback?: 'saved' | 'restored' | null`

- [ ] **Step 1: Write failing control-state tests with fake timers**

Cover no snapshot, exact saved snapshot, changed snapshot, and restored feedback:

```ts
it('shows persistent saved state and transient restored feedback', async () => {
  const saved = mountControls({ hasSnapshot: true, canRestoreSnapshot: false })
  expect(saved.get('[data-action="save-snapshot"]').text()).toContain('Position saved')
  expect(saved.get('[data-action="save-snapshot"]').attributes('data-position-state')).toBe('saved')
  expect(saved.get('[data-action="restore-snapshot"]').attributes('disabled')).toBeDefined()

  const changed = mountControls({ hasSnapshot: true, canRestoreSnapshot: true })
  expect(changed.get('[data-action="restore-snapshot"]').attributes('disabled')).toBeUndefined()

  const restored = mountControls({
    hasSnapshot: true,
    canRestoreSnapshot: false,
    positionFeedback: 'restored',
  })
  expect(restored.get('[data-action="restore-snapshot"]').text()).toContain('Restored')
  expect(restored.get('[role="status"]').text()).toBe('Position restored')
})
```

In `HashiPage.test.ts`, use fake timers to click save, make a move, restore, advance 1,500 ms, and assert the transient restored text clears while the persistent saved indication remains.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
node node_modules/vitest/vitest.mjs run src/components/hashi/HashiBoard.test.ts src/pages/HashiPage.test.ts -t 'saved|restored'
```

Expected: FAIL because snapshot presence and feedback props are not rendered.

- [ ] **Step 3: Add stable-width control states**

Compute labels and icons without adding/removing separate layout elements:

```ts
const saveLabel = computed(() => (props.hasSnapshot ? 'Position saved' : 'Save position'))
const saveIcon = computed(() => (props.hasSnapshot ? 'i-lucide-check' : 'i-lucide-save'))
const restoreLabel = computed(() =>
  props.positionFeedback === 'restored' ? 'Restored' : 'Restore position',
)
```

Bind these to the existing `UButton`s. Give each action a fixed `min-inline-size` large enough for its longest label. Add one visually compact live region:

```vue
<span class="sr-only" role="status" aria-live="polite">
  {{ positionFeedback === 'saved' ? 'Position saved' : positionFeedback === 'restored' ? 'Position restored' : '' }}
</span>
```

Restore remains `:disabled="!canRestoreSnapshot"`; the save button uses `variant="hasSnapshot ? 'soft' : 'ghost'"` so the icon and words, rather than color alone, convey persistence.

- [ ] **Step 4: Manage transient feedback in `HashiPage`**

Wrap the game calls:

```ts
const positionFeedback = ref<'saved' | 'restored' | null>(null)
let positionFeedbackTimer: ReturnType<typeof setTimeout> | undefined

function showPositionFeedback(value: 'saved' | 'restored') {
  positionFeedback.value = value
  if (positionFeedbackTimer) clearTimeout(positionFeedbackTimer)
  positionFeedbackTimer = setTimeout(() => {
    positionFeedback.value = null
  }, 1_500)
}

function savePosition() {
  game.saveSnapshot()
  showPositionFeedback('saved')
}

function restorePosition() {
  if (game.restoreSnapshot()) showPositionFeedback('restored')
}
```

Clear the timer with `onUnmounted`. Pass `hasSnapshot`, `positionFeedback`, and the wrappers to `HashiControls`. Add a `cycleCorridor` wrapper that clears transient feedback before calling `game.cycleCorridor`; use it for the board's `cycle` event. Reset, category-selection, and new-puzzle wrappers also clear feedback synchronously.

- [ ] **Step 5: Run component and page tests**

Run:

```bash
node node_modules/vitest/vitest.mjs run src/components/hashi/HashiBoard.test.ts src/pages/HashiPage.test.ts
```

Expected: all tests PASS.

- [ ] **Step 6: Commit control feedback**

```bash
git add src/components/hashi/HashiControls.vue src/components/hashi/HashiBoard.test.ts src/pages/HashiPage.vue src/pages/HashiPage.test.ts
git commit -m "Add Hashi save and restore feedback"
```

---

### Task 5: Remove Collapsed Rules Dead Space

**Files:**
- Modify: `src/pages/HashiPage.vue`
- Test: `src/pages/HashiPage.test.ts`

**Interfaces:**
- Keeps the existing `UCollapsible` and content order
- Adds no fixed section height or negative margin

- [ ] **Step 1: Write a failing collapsed-layout regression**

Assert that the closed content is removed or hidden, including under reduced-motion styling:

```ts
it('hides closed rules content when reduced motion disables its exit animation', async () => {
  const wrapper = mount(HashiPage, { global: { plugins: [router] } })
  await wrapper.get('[data-rules-trigger]').trigger('click')
  const content = wrapper.get('[data-slot="content"]')
  expect(content.classes()).toContain('motion-reduce:data-[state=closed]:hidden')
})
```

- [ ] **Step 2: Run the layout test and verify RED**

Run:

```bash
node node_modules/vitest/vitest.mjs run src/pages/HashiPage.test.ts -t 'hides closed rules'
```

Expected: FAIL because the reduced-motion class disables the exit animation without explicitly hiding the closed state.

- [ ] **Step 3: Make reduced-motion closure explicit**

Keep unmounting enabled and hide the closed state directly when animation is disabled:

```vue
<UCollapsible
  :unmount-on-hide="true"
  :ui="{
    content:
      'overflow-hidden data-[state=open]:animate-[collapsible-down_200ms_ease-out] data-[state=closed]:animate-[collapsible-up_200ms_ease-out] motion-reduce:data-[state=closed]:hidden motion-reduce:!animate-none',
  }"
>
```

Normalize local rhythm to a compact trigger and separate section margins:

```css
.hashi-rules { margin-top: clamp(2.5rem, 6vw, 4rem); }
.hashi-rules-trigger { min-height: 3.5rem; padding: 0.85rem 0; }
.hashi-leaderboard { margin-top: clamp(2rem, 5vw, 3.25rem); }
@media (max-width: 700px) {
  .hashi-rules { margin-top: 2.25rem; }
  .hashi-leaderboard { margin-top: 1.75rem; }
}
```

- [ ] **Step 4: Run page tests**

Run:

```bash
node node_modules/vitest/vitest.mjs run src/pages/HashiPage.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit spacing correction**

```bash
git add src/pages/HashiPage.vue src/pages/HashiPage.test.ts
git commit -m "Fix collapsed Hashi section spacing"
```

---

### Task 6: Build A Pure Hybrid Pointer Resolver

**Files:**
- Create: `src/features/hashi/pointerSelection.ts`
- Create: `src/features/hashi/pointerSelection.test.ts`

**Interfaces:**
- Produces: `buildIntersectionLookup(topology: PuzzleTopology, cellSize: number): Map<string, IntersectionChoice>`
- Produces: `selectPointerCorridor(input: PointerSelectionInput): PointerSelectionResult`
- `IntersectionChoice = { x: number; y: number; horizontalId: string; verticalId: string }`
- Uses SVG puzzle coordinates, not screen pixels

- [ ] **Step 1: Write failing pure resolver tests**

Use a four-island crossing topology and cover both directions, stickiness, proximity fallback, and blocking:

```ts
it('uses direction in a crossing hotspot and keeps the selection while movement stops', () => {
  const lookup = buildIntersectionLookup(getPuzzleTopology(crossingPuzzle), 40)
  const horizontal = selectPointerCorridor({
    point: { x: 80, y: 80 },
    movement: { x: 7, y: 1 },
    directCorridorId: 'bottom:top',
    previousCorridorId: null,
    previousIntersectionKey: null,
    blocked: new Set(),
    intersections: lookup,
    cellSize: 40,
    hotspotRadius: 12,
  })
  expect(horizontal).toMatchObject({ corridorId: 'left:right', intersectionKey: '80:80' })

  const stationary = selectPointerCorridor({
    point: { x: 81, y: 80 },
    movement: { x: 0, y: 0 },
    directCorridorId: 'bottom:top',
    previousCorridorId: 'left:right',
    previousIntersectionKey: '80:80',
    blocked: new Set(),
    intersections: lookup,
    cellSize: 40,
    hotspotRadius: 12,
  })
  expect(stationary.corridorId).toBe('left:right')
})

it('chooses the viable axis when the directional choice is blocked', () => {
  const result = selectPointerCorridor({
    point: { x: 80, y: 80 },
    movement: { x: 1, y: 7 },
    directCorridorId: 'left:right',
    previousCorridorId: null,
    previousIntersectionKey: null,
    blocked: new Set(['bottom:top']),
    intersections: buildIntersectionLookup(getPuzzleTopology(crossingPuzzle), 40),
    cellSize: 40,
    hotspotRadius: 12,
  })
  expect(result.corridorId).toBe('left:right')
})
```

Add cases for leaving the hotspot (returns the direct corridor), no direct corridor (returns null), and exact-center zero movement (nearest axis, then stable corridor-ID order if distances tie).

- [ ] **Step 2: Run resolver tests and verify RED**

Run:

```bash
node node_modules/vitest/vitest.mjs run src/features/hashi/pointerSelection.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the precomputed lookup**

Use `topology.crossings` once per puzzle. For each horizontal/vertical crossing pair, obtain island endpoints from `topology.islandById`, calculate their shared grid coordinate, multiply by the board cell size supplied to the function, and store one entry by `${x}:${y}`. Deduplicate symmetric crossing pairs.

```ts
export interface IntersectionChoice {
  x: number
  y: number
  horizontalId: string
  verticalId: string
}

export function buildIntersectionLookup(topology: PuzzleTopology, cellSize: number) {
  const result = new Map<string, IntersectionChoice>()
  // Iterate each crossing pair once and store its horizontal/vertical IDs.
  return result
}
```

- [ ] **Step 4: Implement constant-time selection**

Round the point to the nearest cell coordinate, read one lookup entry, confirm Euclidean distance is within `hotspotRadius`, then select:

1. The sole unblocked axis, if only one is viable.
2. The previous corridor when still in the same hotspot and movement magnitude is below 2 SVG units.
3. Horizontal when `abs(dx) > abs(dy)`, vertical when `abs(dy) > abs(dx)`.
4. The geometrically nearer axis; use corridor ID order only for an exact tie.

Return both the corridor and hotspot key:

```ts
export interface PointerSelectionInput {
  point: { x: number; y: number }
  movement: { x: number; y: number }
  directCorridorId: string | null
  previousCorridorId: string | null
  previousIntersectionKey: string | null
  blocked: ReadonlySet<string>
  intersections: ReadonlyMap<string, IntersectionChoice>
  cellSize: number
  hotspotRadius: number
}

export interface PointerSelectionResult {
  corridorId: string | null
  intersectionKey: string | null
}

export function selectPointerCorridor(
  input: PointerSelectionInput,
): PointerSelectionResult {
  const gridX = Math.round(input.point.x / input.cellSize) * input.cellSize
  const gridY = Math.round(input.point.y / input.cellSize) * input.cellSize
  const intersectionKey = `${gridX}:${gridY}`
  const intersection = input.intersections.get(intersectionKey)
  const distance = intersection
    ? Math.hypot(input.point.x - intersection.x, input.point.y - intersection.y)
    : Number.POSITIVE_INFINITY

  if (!intersection || distance > input.hotspotRadius) {
    const corridorId =
      input.directCorridorId && !input.blocked.has(input.directCorridorId)
        ? input.directCorridorId
        : null
    return { corridorId, intersectionKey: null }
  }

  const horizontalOpen = !input.blocked.has(intersection.horizontalId)
  const verticalOpen = !input.blocked.has(intersection.verticalId)
  if (!horizontalOpen || !verticalOpen) {
    return {
      corridorId: horizontalOpen
        ? intersection.horizontalId
        : verticalOpen
          ? intersection.verticalId
          : null,
      intersectionKey,
    }
  }

  const speed = Math.hypot(input.movement.x, input.movement.y)
  if (
    speed < 2 &&
    input.previousIntersectionKey === intersectionKey &&
    (input.previousCorridorId === intersection.horizontalId ||
      input.previousCorridorId === intersection.verticalId)
  ) {
    return { corridorId: input.previousCorridorId, intersectionKey }
  }

  const horizontalMovement = Math.abs(input.movement.x)
  const verticalMovement = Math.abs(input.movement.y)
  if (horizontalMovement !== verticalMovement) {
    return {
      corridorId:
        horizontalMovement > verticalMovement
          ? intersection.horizontalId
          : intersection.verticalId,
      intersectionKey,
    }
  }

  const horizontalDistance = Math.abs(input.point.y - intersection.y)
  const verticalDistance = Math.abs(input.point.x - intersection.x)
  const corridorId =
    horizontalDistance === verticalDistance
      ? [intersection.horizontalId, intersection.verticalId].sort()[0]!
      : horizontalDistance < verticalDistance
        ? intersection.horizontalId
        : intersection.verticalId
  return { corridorId, intersectionKey }
}
```

- [ ] **Step 5: Run pure resolver tests**

Run:

```bash
node node_modules/vitest/vitest.mjs run src/features/hashi/pointerSelection.test.ts
```

Expected: all tests PASS in under 100 ms of test execution time.

- [ ] **Step 6: Commit the resolver**

```bash
git add src/features/hashi/pointerSelection.ts src/features/hashi/pointerSelection.test.ts
git commit -m "Add Hashi intersection pointer resolver"
```

---

### Task 7: Integrate Delegated Sticky Pointer Selection

**Files:**
- Modify: `src/components/hashi/HashiBoard.vue`
- Modify: `src/components/hashi/HashiBoard.test.ts`

**Interfaces:**
- Consumes: `buildIntersectionLookup` and `selectPointerCorridor` from Task 6
- Keeps: `cycle` event payload is the selected corridor ID
- Adds visual class: `.is-pointer-selected`

- [ ] **Step 1: Write failing board interaction tests**

Capture `requestAnimationFrame` callbacks, fix the SVG rectangle to its 222-unit view box, approach the crossing horizontally, and click through the vertical DOM target:

```ts
it('routes an intersection click to the sticky directional corridor', async () => {
  let frame: FrameRequestCallback | undefined
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frame = callback
    return 1
  })
  const wrapper = mount(HashiBoard, {
    props: { puzzle: crossingPuzzle, bridgeCounts: {} },
  })
  vi.spyOn(wrapper.get('svg').element, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, 222, 222),
  )
  const horizontal = wrapper.get('[data-corridor-hit="left:right"]')
  const vertical = wrapper.get('[data-corridor-hit="bottom:top"]')

  await horizontal.trigger('pointermove', {
    clientX: 99,
    clientY: 111,
    pointerType: 'mouse',
  })
  frame?.(0)
  await vertical.trigger('pointermove', {
    clientX: 111,
    clientY: 111,
    pointerType: 'mouse',
  })
  frame?.(16)
  expect(wrapper.get('[data-corridor-hit="left:right"]').classes()).toContain(
    'is-pointer-selected',
  )
  await vertical.trigger('click', { clientX: 111, clientY: 111 })
  expect(wrapper.emitted('cycle')).toEqual([['left:right']])
})
```

Add tests that vertical movement selects `bottom:top`, a blocked directional route falls back to the viable route, `pointerleave` clears selection, touch click uses its direct `data-corridor-hit`, and Enter/Space still emit the focused corridor ID.

Add a coalescing test that fires ten pointer moves before invoking the captured frame callback and asserts the resolver is applied once.

- [ ] **Step 2: Run board tests and verify RED**

Run:

```bash
node node_modules/vitest/vitest.mjs run src/components/hashi/HashiBoard.test.ts -t 'intersection|pointer|touch'
```

Expected: FAIL because the board still relies on per-corridor CSS hover and direct click handlers.

- [ ] **Step 3: Add one delegated pointer pipeline**

Add an SVG template ref, cached intersection lookup, pending pointer sample, and one scheduled frame:

```ts
const svg = useTemplateRef<SVGSVGElement>('boardSvg')
const pointerCorridorId = ref<string | null>(null)
const pointerIntersectionKey = ref<string | null>(null)
const intersections = computed(() => buildIntersectionLookup(topology.value, CELL_SIZE))
let pendingPointer: PointerEvent | null = null
let pointerFrame = 0
```

Convert the current and previously processed screen coordinates into SVG view-box coordinates once per frame using the SVG bounding rectangle and `viewBox.baseVal`. Derive movement from those two SVG points, invoke the pure resolver with `position.value.blocked`, and assign only when IDs change. Cancel the frame and clear both refs on `pointerleave` and `onUnmounted`.

- [ ] **Step 4: Delegate click and keyboard events**

Move pointer, click, and key handlers to `.hashi-hits`. Resolve the direct corridor with:

```ts
function corridorIdFromTarget(target: EventTarget | null) {
  return target instanceof Element
    ? target.closest<SVGGElement>('[data-corridor-hit]')?.dataset.corridorHit ?? null
    : null
}
```

For mouse clicks, emit `pointerCorridorId.value ?? directId`. For touch and pen clicks, emit `directId`. For Enter and Space, emit `directId` and preserve `preventDefault`. Never emit a blocked corridor.

Remove per-corridor `@click` and `@keydown` bindings. Keep each corridor group's `role="button"` and `tabindex="0"` for accessibility.

- [ ] **Step 5: Make projection and click target agree**

Add `is-pointer-selected` when `pointerCorridorId === corridor.id`. Replace the generic CSS hover projection with the selected class for mouse input while retaining `:focus-visible` for keyboard users:

```css
.hashi-corridor-hit.is-pointer-selected .hashi-focus,
.hashi-corridor-hit:not(.is-blocked):focus-visible .hashi-focus {
  stroke: color-mix(in oklch, var(--site-accent) 22%, transparent);
}
```

Hint and invalid-feedback selectors remain later in the stylesheet so they keep visual priority.

- [ ] **Step 6: Run all board tests**

Run:

```bash
node node_modules/vitest/vitest.mjs run src/components/hashi/HashiBoard.test.ts
```

Expected: all tests PASS, including existing click, keyboard, blocked-route, hint, and second-bridge regressions.

- [ ] **Step 7: Commit pointer integration**

```bash
git add src/components/hashi/HashiBoard.vue src/components/hashi/HashiBoard.test.ts
git commit -m "Improve Hashi bridge selection at intersections"
```

---

### Task 8: Verify The Complete Hashi Pass

**Files:**
- Verify only; fix failures in the owning task's files

**Interfaces:**
- Confirms the spec in `docs/superpowers/specs/2026-09-24-hashi-interaction-polish-design.md`

- [ ] **Step 1: Run frontend Hashi tests**

```bash
node node_modules/vitest/vitest.mjs run src/features/hashi src/components/hashi src/pages/HashiPage.test.ts
```

Expected: all Hashi test files PASS with zero failures.

- [ ] **Step 2: Run server tests**

```bash
.venv/bin/python -m pytest server/tests -q
```

Expected: all server tests PASS.

- [ ] **Step 3: Run static checks**

```bash
npm run type-check
node node_modules/eslint/bin/eslint.js src/features/hashi src/components/hashi src/pages/HashiPage.vue src/pages/HashiPage.test.ts
git diff --check
```

Expected: every command exits 0 with no lint or whitespace errors.

- [ ] **Step 4: Build production assets**

```bash
npm run build
```

Expected: Vite completes successfully. Existing dependency annotation and chunk-size warnings are acceptable; new warnings are not.

- [ ] **Step 5: Perform one browser interaction check**

On a Monthly board:

1. Save, make a move, and restore; confirm labels change without toolbar movement.
2. Hover into the same crossing horizontally and vertically; confirm projection and click follow the selected axis.
3. Confirm a blocked axis yields to the viable axis.
4. Collapse **How to play** with reduced motion enabled; confirm no blank content height remains.
5. Inspect a leaderboard row with known and legacy hint usage.

If verification requires a correction, return to the task that owns the failing file, repeat its RED/GREEN cycle, and amend that task before considering the plan complete. Do not create an empty verification commit.
