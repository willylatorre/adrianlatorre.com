# Hashi Article Demonstrations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add eight compact SVG demonstrations to the Hashi build article, mixing real interaction with fixed explanatory states.

**Architecture:** Build one article-only `HashiArticleDemo` component with a discriminated `kind` prop. It uses the production `HashiBoard`, `createHashiGame`, `bridgeSegments`, and rule evaluation for real board behavior; article-only captions, toggles, highlights, and geometry annotations remain inside the wrapper. Small deterministic fixtures keep every example understandable and fast.

**Tech Stack:** Vue 3, TypeScript, SVG, existing Hashi domain modules, Vue Test Utils, Vitest, Vue-flavored Markdown.

## Global Constraints

- Reuse production Hashi rendering and rules wherever the concept is gameplay-related.
- Keep tutorial-only controls and annotations out of the `/hashi` game.
- Every interactive control must support keyboard use and have an accessible name.
- Every example must include a text caption; animation cannot be required for understanding.
- Respect `prefers-reduced-motion`.
- Do not add leaderboard content.

---

### Task 1: Build the article demonstration component

**Files:**
- Create: `src/components/hashi/HashiArticleDemo.vue`
- Create: `src/components/hashi/HashiArticleDemo.test.ts`

**Interfaces:**
- Consumes: `HashiBoard`, `createHashiGame`, `bridgeSegments`, `getVisibleCorridors`, `evaluatePuzzle`, `HashiPuzzle`, and `BridgeCounts`.
- Produces: `<HashiArticleDemo kind="visible|cycle|crossing|totals|connectivity|generation|uniqueness|geometry" />`.

- [ ] **Step 1: Write failing rendering and interaction tests**

Mount every `kind` and assert that each renders a figure, a production `.hashi-board` where applicable, and a nonempty `<figcaption>`. For `cycle`, click the same production corridor hit target three times and assert visible bridge line counts `1`, `2`, then `0`. For `crossing`, activate the perpendicular corridor and assert that its bridge count remains zero while a `role="status"` explanation appears.

```ts
it('cycles a real corridor through zero, one, two, and zero bridges', async () => {
  const wrapper = mount(HashiArticleDemo, { props: { kind: 'cycle' } })
  const corridor = wrapper.get('[data-demo-corridor]')

  await corridor.trigger('click')
  expect(wrapper.findAll('.hashi-bridge')).toHaveLength(1)
  await corridor.trigger('click')
  expect(wrapper.findAll('.hashi-bridge')).toHaveLength(2)
  await corridor.trigger('click')
  expect(wrapper.findAll('.hashi-bridge')).toHaveLength(0)
})
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/components/hashi/HashiArticleDemo.test.ts`

Expected: FAIL because `HashiArticleDemo.vue` does not exist.

- [ ] **Step 3: Add deterministic demonstration fixtures**

Inside the article-only component, define small `HashiPuzzle` fixtures and bridge maps for all eight variants. Use 3–8 islands per fixture, valid corridor IDs from `corridorId`, and descriptive captions. Keep the fixtures independent from random generation.

- [ ] **Step 4: Implement the four live demonstrations**

- `cycle`: pass corridor events through `createHashiGame`, then refresh the reactive bridge map.
- `crossing`: begin with one active bridge; pass the attempted perpendicular corridor through `cycleCorridor`; show “That bridge would cross the active one.” when the production rule returns `reason: 'crossing'`.
- `totals`: use the real board interaction so the central island visibly moves through open, satisfied, and overfilled states.
- `connectivity`: toggle between a locally satisfied stranded bridge map and a connected solution; show the real `evaluatePuzzle` result in text.

- [ ] **Step 5: Implement the four explanatory demonstrations**

- `visible`: render only legal nearest-neighbor corridors as active bridges; use wrapper CSS and labels to identify the farther blocked island.
- `generation`: toggle production bridge counts between the hidden puzzle and its known solution while keeping clue values fixed.
- `uniqueness`: render two compact production boards side-by-side, with one fixed unique answer and two selectable valid arrangements for the ambiguous board.
- `geometry`: use `bridgeSegments` for the visible segment and add an article-only SVG overlay that labels centers, island edges, and the 28px transparent hit stroke.

- [ ] **Step 6: Add compact responsive styling**

Use `<figure>` with the site's border and muted colors, no card shadow, no gradient, and no nested cards. Cap the demo width near the prose measure, allow horizontal scrolling only when necessary, and disable nonessential transitions under `prefers-reduced-motion`.

- [ ] **Step 7: Run focused verification**

Run: `npm test -- src/components/hashi/HashiArticleDemo.test.ts && npm run type-check`

Expected: all component tests and type-check pass.

- [ ] **Step 8: Commit**

```bash
git add src/components/hashi/HashiArticleDemo.vue src/components/hashi/HashiArticleDemo.test.ts
git commit -m "feat: add hashi article demonstrations"
```

---

### Task 2: Place the demonstrations in the article

**Files:**
- Modify: `src/content/blog/notes-from-building-hashi-one-rule-at-a-time.md`
- Modify: `src/content/blog/frontmatter-exports.test.ts`

**Interfaces:**
- Consumes: `HashiArticleDemo` and its eight `kind` values.
- Produces: one contextual mini SVG immediately after each matching pseudocode explanation.

- [ ] **Step 1: Extend the article regression test**

Read the Markdown source and assert that it contains exactly eight `<HashiArticleDemo` instances and every required `kind` once.

```ts
const source = await import('./notes-from-building-hashi-one-rule-at-a-time.md?raw')
expect(source.default.match(/<HashiArticleDemo/g)).toHaveLength(8)
for (const kind of requiredKinds) expect(source.default).toContain(`kind="${kind}"`)
```

- [ ] **Step 2: Run the article test and verify RED**

Run: `npm test -- src/content/blog/frontmatter-exports.test.ts`

Expected: FAIL because the article does not contain the demonstrations.

- [ ] **Step 3: Import and place every demonstration**

Import `HashiArticleDemo` in the article `<script setup>`. Place the matching component after each pseudocode block, in this order:

```vue
<HashiArticleDemo kind="visible" />
<HashiArticleDemo kind="cycle" />
<HashiArticleDemo kind="crossing" />
<HashiArticleDemo kind="totals" />
<HashiArticleDemo kind="connectivity" />
<HashiArticleDemo kind="generation" />
<HashiArticleDemo kind="uniqueness" />
<HashiArticleDemo kind="geometry" />
```

- [ ] **Step 4: Run full verification**

Run:

```bash
npm test
npm run type-check
npm run lint
npm run build
```

Expected: 0 failures. Existing Vite dependency annotation and chunk-size warnings are acceptable.

- [ ] **Step 5: Commit**

```bash
git add src/content/blog/notes-from-building-hashi-one-rule-at-a-time.md src/content/blog/frontmatter-exports.test.ts
git commit -m "docs: illustrate hashi build steps"
```
