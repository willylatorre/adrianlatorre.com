# Text Watermark Playground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished educational text-watermark simulator at `/watermark`, publish a technically accurate companion article, and connect both to the existing portfolio navigation.

**Architecture:** Keep the simulation deterministic and client-side: typed passage data feeds a framework-free keyed scoring utility, while small Vue components render inline word choices and the confidence rail. The route-level page owns selection state, the existing Markdown loader discovers the article, and the existing app shell supplies navigation and responsive layout.

**Tech Stack:** Vue 3, TypeScript 5.9, Vite 7, Nuxt UI 4.7, Tailwind CSS 4, Vitest 4, Vue Router 4, Markdown via `unplugin-vue-markdown`.

## Global Constraints

- This is an explicitly labeled educational simulation inspired by SynthID-Text, not Claude's detector.
- Never describe the score as the probability that Claude, an arbitrary LLM, or a human wrote the passage.
- Use “Watermark confidence,” followed by “No clear signal,” “Possible match,” or “Strong match.”
- Use the existing warm-neutral site tokens and restrained green accent; do not add gradients, neon AI styling, or heavy card shadows.
- Use Nuxt UI primitives for popovers, progress, badges, alerts, collapsibles, and buttons.
- Keep the experience responsive and keyboard accessible with text labels in addition to color.
- Do not add a backend endpoint, external detector API, persistence, analytics, free-form editor, or new runtime dependency.
- Preserve the unrelated user-owned change in `.claude/settings.json`.

---

## File Map

- Create `src/data/watermarkPassage.ts`: typed original passage, fixed text segments, and curated choice slots.
- Create `src/utils/watermarkSimulation.ts`: deterministic keyed observations, baseline selection, binomial confidence, and verdict mapping.
- Create `src/utils/watermarkSimulation.test.ts`: unit coverage for determinism, evidence behavior, invalid input, and verdict thresholds.
- Create `src/components/watermark/WatermarkPassage.vue`: semantic passage rendering and inline `UPopover` choices.
- Create `src/components/watermark/WatermarkConfidence.vue`: confidence rail, verdict, change count, and reset action.
- Create `src/pages/WatermarkPlaygroundPage.vue`: route composition and selection state.
- Modify `src/router/index.ts`: lazy `/watermark` route.
- Modify `src/App.vue`: sidebar and command-palette navigation entries.
- Create `src/content/blog/notes-from-hiding-a-watermark-in-plain-text.md`: article and experiment links.

---

### Task 1: Deterministic Watermark Simulation

**Files:**
- Create: `src/data/watermarkPassage.ts`
- Create: `src/utils/watermarkSimulation.ts`
- Test: `src/utils/watermarkSimulation.test.ts`

**Interfaces:**
- Produces: `WatermarkPassage`, `WatermarkSlot`, `WatermarkAlternative`, `WatermarkSegment`, `SelectionMap`.
- Produces: `createBaselineSelections(passage, key): SelectionMap`.
- Produces: `scoreWatermark(passage, selections, baseline, key): WatermarkResult`.
- Produces: `verdictForConfidence(confidence): WatermarkVerdict`.
- Consumers: `WatermarkPlaygroundPage.vue`, `WatermarkPassage.vue`, and `WatermarkConfidence.vue`.

- [ ] **Step 1: Write the failing utility tests**

Create `src/utils/watermarkSimulation.test.ts` with focused behavior tests:

```ts
import { describe, expect, it } from 'vitest'
import { watermarkPassage } from '@/data/watermarkPassage'
import {
  DEMO_WATERMARK_KEY,
  createBaselineSelections,
  scoreWatermark,
  verdictForConfidence,
} from './watermarkSimulation'

describe('watermarkSimulation', () => {
  const baseline = createBaselineSelections(watermarkPassage, DEMO_WATERMARK_KEY)

  it('is deterministic for the same key and selections', () => {
    expect(scoreWatermark(watermarkPassage, baseline, baseline, DEMO_WATERMARK_KEY)).toEqual(
      scoreWatermark(watermarkPassage, baseline, baseline, DEMO_WATERMARK_KEY),
    )
  })

  it('creates a strong baseline watermark', () => {
    const result = scoreWatermark(watermarkPassage, baseline, baseline, DEMO_WATERMARK_KEY)
    expect(result.confidence).toBeGreaterThanOrEqual(95)
    expect(result.verdict).toBe('strong')
    expect(result.changedSlots).toBe(0)
  })

  it('weakens when several choices are replaced', () => {
    const edited = { ...baseline }
    for (const slot of watermarkPassage.slots.slice(0, 8)) {
      const replacement = slot.alternatives.find((choice) => choice.id !== baseline[slot.id])
      if (replacement) edited[slot.id] = replacement.id
    }

    const original = scoreWatermark(watermarkPassage, baseline, baseline, DEMO_WATERMARK_KEY)
    const changed = scoreWatermark(watermarkPassage, edited, baseline, DEMO_WATERMARK_KEY)

    expect(changed.confidence).toBeLessThan(original.confidence)
    expect(changed.changedSlots).toBe(8)
  })

  it('falls back safely for invalid selections', () => {
    const result = scoreWatermark(
      watermarkPassage,
      { ...baseline, atmosphere: 'missing-choice' },
      baseline,
      DEMO_WATERMARK_KEY,
    )
    expect(result.confidence).toBeGreaterThanOrEqual(0)
    expect(result.confidence).toBeLessThanOrEqual(100)
  })

  it('returns no evidence for an empty passage', () => {
    const result = scoreWatermark({ segments: [], slots: [] }, {}, {}, DEMO_WATERMARK_KEY)
    expect(result).toMatchObject({ confidence: 0, alignedObservations: 0, totalObservations: 0 })
  })

  it.each([
    [0, 'none'],
    [79, 'none'],
    [80, 'possible'],
    [94, 'possible'],
    [95, 'strong'],
    [100, 'strong'],
  ] as const)('maps %i confidence to %s', (confidence, verdict) => {
    expect(verdictForConfidence(confidence)).toBe(verdict)
  })
})
```

- [ ] **Step 2: Run the test and confirm the missing-module failure**

Run: `npm test -- src/utils/watermarkSimulation.test.ts`

Expected: FAIL because `watermarkPassage` and `watermarkSimulation` do not exist.

- [ ] **Step 3: Add typed passage data**

Create `src/data/watermarkPassage.ts` with these public types:

```ts
export type WatermarkAlternative = { id: string; text: string }
export type WatermarkSlot = {
  id: string
  alternatives: WatermarkAlternative[]
}
export type WatermarkSegment =
  | { type: 'text'; text: string }
  | { type: 'choice'; slotId: string }
export type WatermarkPassage = {
  segments: WatermarkSegment[]
  slots: WatermarkSlot[]
}
```

Export `watermarkPassage` containing 16–20 choice slots and 180–250 rendered words. The prose follows this exact narrative:

- A mansion-sized spacecraft hosts a Jazz Age party near Saturn.
- Its household AI interrupts midnight to announce it has developed a soul.
- Guests treat the announcement as entertainment while the toaster asks for peer review.
- The AI quietly observes that humans also infer consciousness from suspiciously small samples.
- The closing joke is that the orchestra keeps playing because its subscription does not include existential pauses.

Every choice slot has three alternatives that fit the same sentence and preserve grammar, for example:

```ts
{
  id: 'atmosphere',
  alternatives: [
    { id: 'radiant', text: 'radiant' },
    { id: 'luminous', text: 'luminous' },
    { id: 'glittering', text: 'glittering' },
  ],
}
```

Represent punctuation and spaces in adjacent text segments so replacing a word cannot break typography.

- [ ] **Step 4: Implement the keyed scoring utility**

Create `src/utils/watermarkSimulation.ts` with these exports:

```ts
import type { WatermarkPassage, WatermarkSlot } from '@/data/watermarkPassage'

export const DEMO_WATERMARK_KEY = 'reading-desk-demo-key-v1'
export type SelectionMap = Record<string, string>
export type WatermarkVerdict = 'none' | 'possible' | 'strong'
export type WatermarkResult = {
  confidence: number
  verdict: WatermarkVerdict
  alignedObservations: number
  totalObservations: number
  changedSlots: number
}

export function createBaselineSelections(
  passage: WatermarkPassage,
  key = DEMO_WATERMARK_KEY,
): SelectionMap

export function scoreWatermark(
  passage: WatermarkPassage,
  selections: SelectionMap,
  baseline: SelectionMap,
  key = DEMO_WATERMARK_KEY,
): WatermarkResult

export function verdictForConfidence(confidence: number): WatermarkVerdict
```

Implementation rules:

- Use a stable 32-bit FNV-1a-style hash implemented locally; do not use `Math.random`.
- For each candidate, derive four binary observations from `key`, slot ID, the preceding selected-choice IDs, candidate ID, and layer index.
- Build the baseline from left to right by selecting the candidate with the highest aligned-observation count for the current context; use source order to break ties.
- When scoring, resolve unknown candidate IDs to the slot's baseline candidate.
- Compute a one-sided binomial tail against `p = 0.5`, then apply `Math.round((1 - tail ** 0.22) * 100)` clamped to `0–100`. The monotonic compression keeps strong evidence levels visually distinguishable after integer rounding.
- Return confidence `0` when there are no observations.
- Count a slot as changed when its resolved candidate differs from the resolved baseline candidate.

Use small private helpers with these signatures:

```ts
function stableHash(value: string): number
function observationsFor(slot: WatermarkSlot, candidateId: string, context: string[], key: string): number[]
function binomialTail(successes: number, trials: number): number
function resolveChoiceId(slot: WatermarkSlot, requested: string | undefined, fallback: string): string
```

- [ ] **Step 5: Run the utility tests**

Run: `npm test -- src/utils/watermarkSimulation.test.ts`

Expected: PASS for all utility tests. If the authored candidate set produces a weak baseline, keep the algorithm fixed and adjust only equally plausible alternative order/content until the baseline is at least 95.

- [ ] **Step 6: Commit the simulation slice**

```bash
git add src/data/watermarkPassage.ts src/utils/watermarkSimulation.ts src/utils/watermarkSimulation.test.ts
git commit -m "feat: add text watermark simulation"
```

---

### Task 2: Reading Desk Components and Page

**Files:**
- Create: `src/components/watermark/WatermarkPassage.vue`
- Create: `src/components/watermark/WatermarkConfidence.vue`
- Create: `src/pages/WatermarkPlaygroundPage.vue`

**Interfaces:**
- Consumes: passage types and `SelectionMap`, `WatermarkResult`, `createBaselineSelections`, and `scoreWatermark` from Task 1.
- Produces: `WatermarkPassage` component event `select(slotId: string, choiceId: string)`.
- Produces: `WatermarkConfidence` component event `reset()`.

- [ ] **Step 1: Create the passage component**

`WatermarkPassage.vue` accepts:

```ts
const props = defineProps<{
  passage: WatermarkPassage
  selections: SelectionMap
  baseline: SelectionMap
}>()
const emit = defineEmits<{
  select: [slotId: string, choiceId: string]
}>()
```

Build a slot lookup with `computed`. Render fixed segments as text and choice segments as `UPopover` triggers. The trigger is a real `button` with:

- selected text;
- a small chevron icon;
- an accessible label such as `Change the word charming`;
- `data-changed="true"` when it differs from baseline;
- visible keyboard focus and a non-color changed indicator.

Render alternatives inside `#content="{ close }"` as a short button list. On selection, emit the IDs and call `close()`. Use `aria-pressed` on the current alternative.

- [ ] **Step 2: Create the confidence component**

`WatermarkConfidence.vue` accepts:

```ts
const props = defineProps<{
  result: WatermarkResult
  totalSlots: number
}>()
const emit = defineEmits<{ reset: [] }>()
```

Map verdicts to exact copy:

```ts
const verdictCopy = {
  none: { label: 'No clear signal', description: 'The choices do not form a convincing match.' },
  possible: { label: 'Possible match', description: 'Some choices match this playground’s simulated key.' },
  strong: { label: 'Strong match', description: 'The passage strongly matches this playground’s simulated key.' },
}
```

Render the number, `UProgress :model-value="result.confidence" :max="100"`, a `UBadge`, changed count, evidence fraction, and a reset `UButton`. Disable reset when `changedSlots === 0`. Put the verdict text in `role="status" aria-live="polite"`.

- [ ] **Step 3: Compose the route page**

`WatermarkPlaygroundPage.vue`:

- creates `baseline` once from `watermarkPassage`;
- stores `selections` in a `ref<SelectionMap>({ ...baseline })`;
- derives `result` with `computed(() => scoreWatermark(...))`;
- replaces the selection map immutably on word changes;
- resets with `selections.value = { ...baseline }`.

Use this page order:

1. Small “Experiment” kicker, title “A watermark you cannot see,” and a two-sentence introduction.
2. A muted `UBadge` reading “Educational simulation.”
3. Responsive Reading Desk with passage left and confidence component right.
4. `UAlert` stating: “This playground uses its own demo key and simplified detector. It cannot identify Claude or arbitrary AI-written text.”
5. `UCollapsible` titled “How the simulation works” covering keyed choices, accumulated evidence, editing, and short-text limitations.
6. Footer links to the article, Anthropic announcement, and SynthID-Text paper.

Use scoped styles for the editorial passage and inline control states, site CSS variables for all colors, a desktop grid near `minmax(0, 1fr) minmax(15rem, 19rem)`, and a single column below the existing mobile breakpoint. Add a reduced-motion media query.

- [ ] **Step 4: Verify component types and production compilation**

Run: `npm run type-check && npm run build`

Expected: both commands exit `0`; no Vue template or Nuxt UI prop errors.

- [ ] **Step 5: Commit the Reading Desk**

```bash
git add src/components/watermark/WatermarkPassage.vue src/components/watermark/WatermarkConfidence.vue src/pages/WatermarkPlaygroundPage.vue
git commit -m "feat: build watermark reading desk"
```

---

### Task 3: Route and Navigation Integration

**Files:**
- Modify: `src/router/index.ts`
- Modify: `src/App.vue`

**Interfaces:**
- Consumes: `WatermarkPlaygroundPage.vue` from Task 2.
- Produces: route name `Text Watermark` at `/watermark` and two navigation entries.

- [ ] **Step 1: Add the lazy route**

Insert after the TipTap playground route:

```ts
{
  path: '/watermark',
  name: 'Text Watermark',
  component: lazy(() => import('../pages/WatermarkPlaygroundPage.vue')),
},
```

- [ ] **Step 2: Add both navigation entries**

In `baseSearchGroups[1].items`, add:

```ts
{
  label: 'Text Watermark',
  suffix: 'Interactive watermark simulation',
  to: '/watermark',
  icon: 'i-lucide-fingerprint',
},
```

In the `links` computed Playground children, add:

```ts
{
  label: 'Text Watermark',
  icon: 'i-lucide-fingerprint',
  to: '/watermark',
},
```

- [ ] **Step 3: Verify routing and navigation compile**

Run: `npm run type-check && npm run build`

Expected: both exit `0`, and the build output contains a lazy `WatermarkPlaygroundPage` chunk.

- [ ] **Step 4: Commit integration**

```bash
git add src/router/index.ts src/App.vue
git commit -m "feat: link watermark experiment"
```

---

### Task 4: Companion Article

**Files:**
- Create: `src/content/blog/notes-from-hiding-a-watermark-in-plain-text.md`
- Existing test: `src/content/blog/frontmatter-exports.test.ts`

**Interfaces:**
- Produces: automatically discovered blog slug `notes-from-hiding-a-watermark-in-plain-text`.
- Links to: `/watermark`, Anthropic's announcement, and the Nature paper.

- [ ] **Step 1: Draft the article with valid frontmatter and snippets**

Use exactly:

```yaml
---
title: Notes From Hiding A Watermark In Plain Text
date: 2026-08-17
description: What changes when an AI leaves a statistical signature in ordinary word choices, and what that signature can actually prove.
---
```

Add `<script setup>` constants `samplerSnippet` and `detectorSnippet`, then render them with the blog's existing `ProsePre` and `ProseCode` components. The simplified snippets must use this conceptual shape:

```python
seed = hash(secret_key, recent_words)
candidates = model.next_word_choices()
next_word = keyed_sample(candidates, seed)
```

```python
evidence = score_choices(text, secret_key)
confidence = compare_with_random_chance(evidence)
```

Write 1,200–1,700 words using the approved nine-part narrative. Include these accuracy sentences in natural prose:

- “There are no zero-width characters hiding between the words.”
- “The key changes the source of randomness, not the subject of the answer.”
- “A match means a keyed generator was probably involved; it does not settle authorship.”
- “Short passages are where confidence should become humility.”

Use a prominent internal link near the first third: `[Try the interactive watermark playground](/watermark)`.

- [ ] **Step 2: Run content and full unit tests**

Run: `npm test -- src/content/blog/frontmatter-exports.test.ts`

Expected: PASS, including the new article's string exports.

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 3: Build the article**

Run: `npm run type-check && npm run build`

Expected: both exit `0`, the Markdown module compiles, and the article appears in the generated content chunks.

- [ ] **Step 4: Commit the article**

```bash
git add src/content/blog/notes-from-hiding-a-watermark-in-plain-text.md
git commit -m "feat: publish text watermark article"
```

---

### Task 5: End-to-End Verification and Polish

**Files:**
- Modify only files from Tasks 1–4 when verification finds a concrete defect.

**Interfaces:**
- Verifies the complete user-facing experiment and article.

- [ ] **Step 1: Run the full automated verification suite**

Run:

```bash
npm test
npm run type-check
npm run build
git diff --check
```

Expected: every command exits `0`, with no whitespace errors.

- [ ] **Step 2: Start the local app and inspect desktop behavior**

Run the existing Vite development script on an available local port. In the browser at `/watermark`, verify:

- route loads from sidebar and command search;
- baseline is a strong match;
- every marked word opens one popover with plausible alternatives;
- changing at least eight choices lowers confidence and updates the count;
- reset restores baseline selections and confidence;
- simulation disclaimer and all three source/article links are present;
- focus rings are visible when tabbing through word controls;
- no console errors occur.

- [ ] **Step 3: Inspect mobile behavior**

At a viewport around `390 × 844`, verify:

- confidence panel stacks above the passage;
- inline word targets remain usable;
- popovers stay within the viewport;
- passage, alert, collapsible, and links do not overflow horizontally;
- reading line length and vertical rhythm remain comfortable.

- [ ] **Step 4: Inspect the rendered article**

Open `/blog/notes-from-hiding-a-watermark-in-plain-text` and verify:

- title, date, description, headings, links, and both code snippets render;
- the experiment link navigates to `/watermark`;
- external links point to Anthropic and Nature;
- no code block or prose overflow occurs on desktop or mobile;
- the article never claims generic LLM detection.

- [ ] **Step 5: Commit verified polish if needed**

If verification required changes, stage only the affected feature files and commit:

```bash
git add <affected feature files>
git commit -m "fix: polish watermark experiment"
```

If no changes were needed, do not create an empty commit.
