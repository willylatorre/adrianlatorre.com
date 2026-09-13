<script setup lang="ts">
import { computed, ref } from 'vue'
import { bridgeSegments, corridorId } from '../../features/hashi/geometry'
import { createHashiGame } from '../../features/hashi/useHashiGame'
import type { BridgeCounts, HashiPuzzle, Island } from '../../features/hashi/types'
import HashiBoard from './HashiBoard.vue'

type DemoKind =
  | 'visible'
  | 'cycle'
  | 'crossing'
  | 'totals'
  | 'connectivity'
  | 'generation'
  | 'density'
  | 'mix'
  | 'geometry'
  | 'layout'
  | 'diagonal'
  | 'reasoning'
  | 'trace'

const props = defineProps<{ kind: DemoKind }>()

const captions: Record<DemoKind, string> = {
  visible:
    'The three islands create two short corridors. There is no long left-to-right corridor through the middle island.',
  cycle: 'Try the corridor: one bridge, two bridges, then clear it.',
  crossing: 'The horizontal bridge is already active. Try adding the vertical one.',
  totals: 'Add bridges around the center 2. It recedes when satisfied and warns when overfilled.',
  connectivity: 'Every 2 is satisfied in both views, but only one view connects all four islands.',
  generation:
    'The hidden bridge network creates the island numbers. Toggle it without changing the clues.',
  density:
    'More islands create more choices and dependencies. Difficulty comes from decisions, not empty distance.',
  mix: 'A useful random board has plenty of 1–5 clues, fewer 6s and 7s, and only the occasional 8.',
  geometry:
    'The visible bridge stops at each island edge; its transparent interaction stroke is deliberately wider.',
  layout:
    'Both boards contain twelve islands. The first repeats its columns; the second uses the same amount of puzzle in a staggered arrangement.',
  diagonal:
    'Diagonal neighbours do not share a possible bridge. Orthogonal neighbours leave no visible gap for one.',
  reasoning:
    'More islands make a puzzle longer. The rules needed to make progress are what make it easier or harder.',
  trace:
    'This is the kind of solve trace the generator records: a sequence of provable moves, not a claim that a clue distribution is difficulty.',
}

const island = (id: string, x: number, y: number, clue: number): Island => ({ id, x, y, clue })
const puzzle = (id: string, width: number, height: number, islands: Island[]): HashiPuzzle => ({
  id,
  category: 'intro',
  width,
  height,
  islands,
})

const demos: Record<Exclude<DemoKind, 'geometry'>, HashiPuzzle> = {
  visible: puzzle('demo-visible', 7, 3, [
    island('visible-left', 1, 1, 1),
    island('visible-center', 3, 1, 2),
    island('visible-blocked', 5, 1, 1),
  ]),
  cycle: puzzle('demo-cycle', 6, 3, [island('cycle-a', 1, 1, 2), island('cycle-b', 4, 1, 2)]),
  crossing: puzzle('demo-crossing', 7, 5, [
    island('cross-left', 1, 2, 1),
    island('cross-right', 5, 2, 1),
    island('cross-top', 3, 0, 1),
    island('cross-bottom', 3, 4, 1),
  ]),
  totals: puzzle('demo-totals', 7, 5, [
    island('totals-left', 1, 2, 2),
    island('totals-center', 3, 2, 2),
    island('totals-right', 5, 2, 2),
    island('totals-top', 3, 0, 2),
  ]),
  connectivity: puzzle('demo-connectivity', 7, 5, [
    island('network-a', 1, 1, 2),
    island('network-b', 5, 1, 2),
    island('network-c', 1, 3, 2),
    island('network-d', 5, 3, 2),
  ]),
  generation: puzzle('demo-generation', 7, 5, [
    island('generate-a', 1, 1, 2),
    island('generate-b', 5, 1, 2),
    island('generate-c', 1, 3, 2),
    island('generate-d', 5, 3, 2),
  ]),
  density: puzzle('demo-density', 5, 5, [
    island('density-a', 0, 0, 2),
    island('density-b', 2, 0, 3),
    island('density-c', 4, 0, 2),
    island('density-d', 0, 2, 3),
    island('density-e', 2, 2, 4),
    island('density-f', 4, 2, 3),
    island('density-g', 0, 4, 2),
    island('density-h', 2, 4, 3),
    island('density-i', 4, 4, 2),
  ]),
  mix: puzzle('demo-mix', 7, 7, [
    island('mix-a', 0, 0, 1),
    island('mix-b', 2, 0, 4),
    island('mix-c', 4, 0, 3),
    island('mix-d', 6, 0, 1),
    island('mix-e', 0, 2, 3),
    island('mix-f', 2, 2, 8),
    island('mix-g', 4, 2, 5),
    island('mix-h', 6, 2, 2),
    island('mix-i', 0, 4, 2),
    island('mix-j', 2, 4, 5),
    island('mix-k', 4, 4, 7),
    island('mix-l', 6, 4, 4),
    island('mix-m', 0, 6, 2),
    island('mix-n', 2, 6, 3),
    island('mix-o', 4, 6, 4),
    island('mix-p', 6, 6, 2),
  ]),
  layout: puzzle('demo-layout', 7, 7, [
    island('layout-a', 0, 0, 2),
    island('layout-b', 2, 0, 3),
    island('layout-c', 4, 0, 2),
    island('layout-d', 6, 0, 3),
    island('layout-e', 0, 3, 3),
    island('layout-f', 2, 3, 4),
    island('layout-g', 4, 3, 3),
    island('layout-h', 6, 3, 4),
    island('layout-i', 0, 6, 2),
    island('layout-j', 2, 6, 3),
    island('layout-k', 4, 6, 2),
    island('layout-l', 6, 6, 3),
  ]),
  diagonal: puzzle('demo-diagonal', 7, 5, [
    island('diagonal-a', 1, 1, 2),
    island('diagonal-b', 2, 2, 3),
    island('diagonal-c', 4, 1, 2),
    island('diagonal-d', 5, 2, 3),
  ]),
  reasoning: puzzle('demo-reasoning', 7, 5, [
    island('reasoning-a', 0, 2, 2),
    island('reasoning-b', 2, 2, 4),
    island('reasoning-c', 4, 2, 3),
    island('reasoning-d', 6, 2, 1),
    island('reasoning-e', 2, 0, 2),
    island('reasoning-f', 4, 4, 2),
  ]),
  trace: puzzle('demo-trace', 7, 5, [
    island('trace-a', 1, 2, 2),
    island('trace-b', 3, 0, 2),
    island('trace-c', 5, 2, 3),
    island('trace-d', 3, 4, 2),
  ]),
}

const staggeredLayout = puzzle('demo-layout-staggered', 7, 7, [
  island('staggered-a', 0, 0, 2),
  island('staggered-b', 3, 0, 3),
  island('staggered-c', 6, 0, 2),
  island('staggered-d', 1, 1, 3),
  island('staggered-e', 4, 1, 4),
  island('staggered-f', 6, 1, 3),
  island('staggered-g', 0, 3, 2),
  island('staggered-h', 3, 3, 4),
  island('staggered-i', 6, 3, 2),
  island('staggered-j', 1, 5, 3),
  island('staggered-k', 4, 5, 2),
  island('staggered-l', 3, 6, 3),
])

const orthogonalCrowding = puzzle('demo-orthogonal-crowding', 7, 5, [
  island('orthogonal-a', 1, 1, 2),
  island('orthogonal-b', 2, 1, 2),
  island('orthogonal-c', 4, 1, 2),
  island('orthogonal-d', 5, 1, 2),
])

const geometryPuzzle = puzzle('demo-geometry', 6, 3, [
  island('geometry-a', 1, 1, 1),
  island('geometry-b', 4, 1, 1),
])

const activePuzzle = computed(() =>
  props.kind === 'geometry' ? geometryPuzzle : demos[props.kind],
)
const game = createHashiGame(activePuzzle.value, Date.now, { storage: null })
const liveCounts = ref<BridgeCounts>({})
const toggled = ref(false)
const feedback = ref('')

if (props.kind === 'crossing') {
  game.cycleCorridor(corridorId('cross-left', 'cross-right'))
  liveCounts.value = { ...game.bridgeCounts }
}

const squareCycle: BridgeCounts = {
  [corridorId('network-a', 'network-b')]: 1,
  [corridorId('network-a', 'network-c')]: 1,
  [corridorId('network-b', 'network-d')]: 1,
  [corridorId('network-c', 'network-d')]: 1,
}
const strandedNetwork: BridgeCounts = {
  [corridorId('network-a', 'network-b')]: 2,
  [corridorId('network-c', 'network-d')]: 2,
}
const generatedSolution: BridgeCounts = {
  [corridorId('generate-a', 'generate-b')]: 1,
  [corridorId('generate-a', 'generate-c')]: 1,
  [corridorId('generate-b', 'generate-d')]: 1,
  [corridorId('generate-c', 'generate-d')]: 1,
}
const visibleCounts: BridgeCounts = {
  [corridorId('visible-left', 'visible-center')]: 1,
  [corridorId('visible-center', 'visible-blocked')]: 1,
}

const displayCounts = computed<BridgeCounts>(() => {
  if (props.kind === 'visible') return visibleCounts
  if (props.kind === 'connectivity') return toggled.value ? squareCycle : strandedNetwork
  if (props.kind === 'generation') return toggled.value ? generatedSolution : {}
  return liveCounts.value
})

const geometrySegment = bridgeSegments(
  { id: 'geometry', a: 'geometry-a', b: 'geometry-b', axis: 'horizontal' },
  geometryPuzzle,
  40,
  19,
  1,
)[0]!

function cycle(corridor: string) {
  if (!['cycle', 'crossing', 'totals'].includes(props.kind)) return
  const result = game.cycleCorridor(corridor)
  liveCounts.value = { ...game.bridgeCounts }
  feedback.value =
    result.changed === false && result.reason === 'crossing'
      ? 'That bridge would cross the active one.'
      : ''
}
</script>

<template>
  <figure class="hashi-article-demo" :data-demo="kind">
    <div v-if="kind === 'geometry'" class="hashi-geometry-wrap">
      <svg viewBox="0 0 240 130" role="img" aria-label="Bridge and hit target geometry">
        <line class="hashi-geometry-hit" v-bind="geometrySegment" />
        <line class="hashi-geometry-bridge" v-bind="geometrySegment" />
        <rect x="21" y="21" width="38" height="38" rx="11" />
        <rect x="141" y="21" width="38" height="38" rx="11" />
        <circle cx="40" cy="40" r="2.5" />
        <circle cx="160" cy="40" r="2.5" />
        <text x="40" y="82">center</text>
        <text x="100" y="104">wide hit stroke</text>
        <path d="M59 62 L59 45 M141 62 L141 45" />
        <text x="100" y="72">island edges</text>
      </svg>
    </div>

    <div v-else class="hashi-demo-board" :class="`is-${kind}`">
      <div v-if="kind === 'layout'" class="hashi-demo-comparison">
        <section>
          <p class="hashi-demo-label">Rails</p>
          <HashiBoard :puzzle="activePuzzle" :bridge-counts="{}" :interactive="false" />
        </section>
        <section>
          <p class="hashi-demo-label">Staggered</p>
          <HashiBoard :puzzle="staggeredLayout" :bridge-counts="{}" :interactive="false" />
        </section>
        <p class="hashi-demo-summary">Same island count: 12</p>
      </div>
      <div v-else-if="kind === 'diagonal'" class="hashi-demo-comparison">
        <section>
          <p class="hashi-demo-label">Diagonal is allowed</p>
          <HashiBoard :puzzle="activePuzzle" :bridge-counts="{}" :interactive="false" />
        </section>
        <section>
          <p class="hashi-demo-label">Orthogonal touching is not</p>
          <HashiBoard :puzzle="orthogonalCrowding" :bridge-counts="{}" :interactive="false" />
        </section>
      </div>
      <div v-else-if="kind === 'reasoning'" class="hashi-demo-reasoning">
        <HashiBoard :puzzle="activePuzzle" :bridge-counts="{}" :interactive="false" />
        <div>
          <p class="hashi-demo-label">Shorter does not mean easier</p>
          <p><strong>Longer board:</strong> Direct capacity can keep forcing bridges.</p>
          <p><strong>Smaller board — Contradiction:</strong> the first useful move can be an assumption that fails.</p>
        </div>
      </div>
      <div v-else-if="kind === 'trace'" class="hashi-demo-trace">
        <HashiBoard :puzzle="activePuzzle" :bridge-counts="{}" :interactive="false" />
        <ol>
          <li><strong>Capacity:</strong> the other routes cannot hold enough.</li>
          <li><strong>Crossing:</strong> that bridge closes the perpendicular route.</li>
          <li><strong>Contradiction:</strong> leaving this corridor empty strands the remainder.</li>
        </ol>
      </div>
      <HashiBoard
        v-else
        :puzzle="activePuzzle"
        :bridge-counts="displayCounts"
        :interactive="kind === 'cycle' || kind === 'crossing' || kind === 'totals'"
        @cycle="cycle"
      />
      <p v-if="kind === 'visible'" class="hashi-demo-note">
        Each search stops at the first island it meets.
      </p>
      <p v-if="feedback" role="status" class="hashi-demo-status">{{ feedback }}</p>
      <button
        v-if="kind === 'connectivity' || kind === 'generation'"
        type="button"
        class="hashi-demo-button"
        @click="toggled = !toggled"
      >
        {{
          kind === 'generation'
            ? toggled
              ? 'Hide solution'
              : 'Reveal solution'
            : toggled
              ? 'Strand the groups'
              : 'Connect the groups'
        }}
      </button>
    </div>

    <figcaption>{{ captions[kind] }}</figcaption>
  </figure>
</template>

<style scoped>
.hashi-article-demo {
  max-width: 42rem;
  margin: 1.35rem 0 1.8rem;
  padding: 1rem;
  overflow: hidden;
  border: 1px solid var(--site-border);
  border-radius: 0.8rem;
  background: color-mix(in oklch, var(--site-surface) 74%, transparent);
}

.hashi-demo-board {
  min-width: 0;
}

.hashi-demo-comparison {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.hashi-demo-comparison section,
.hashi-demo-reasoning,
.hashi-demo-trace {
  min-width: 0;
}

.hashi-demo-label,
.hashi-demo-summary {
  margin: 0 0 0.45rem;
  color: var(--site-ink);
  font-size: 0.76rem;
  font-weight: 700;
}

.hashi-demo-summary {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--site-muted);
  font-weight: 500;
}

.hashi-demo-reasoning,
.hashi-demo-trace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(11rem, 0.8fr);
  gap: 1rem;
  align-items: center;
}

.hashi-demo-reasoning p,
.hashi-demo-trace ol {
  margin: 0.55rem 0 0;
  color: var(--site-muted);
  font-size: 0.78rem;
  line-height: 1.45;
}

.hashi-demo-trace ol {
  padding-left: 1.25rem;
}

.hashi-demo-trace li + li {
  margin-top: 0.45rem;
}

@media (max-width: 34rem) {
  .hashi-demo-comparison,
  .hashi-demo-reasoning,
  .hashi-demo-trace {
    grid-template-columns: 1fr;
  }
}

:deep(.hashi-board-scroll) {
  max-width: 100%;
  border-color: color-mix(in oklch, var(--site-border) 78%, transparent);
}

.hashi-demo-button {
  margin-top: 0.75rem;
  padding: 0.45rem 0.7rem;
  border: 1px solid var(--site-border);
  border-radius: 0.5rem;
  background: var(--site-surface);
  color: var(--site-ink);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 620;
  cursor: pointer;
}

.hashi-demo-button:focus-visible {
  outline: 2px solid var(--site-accent);
  outline-offset: 2px;
}

.hashi-demo-note,
.hashi-demo-status {
  margin: 0.7rem 0 0;
  color: var(--site-muted);
  font-size: 0.78rem;
}

.hashi-demo-status {
  color: oklch(0.48 0.105 32);
}

.hashi-geometry-wrap svg {
  display: block;
  width: min(100%, 28rem);
  color: var(--site-ink);
}

.hashi-geometry-wrap rect {
  fill: var(--site-surface);
  stroke: currentColor;
  stroke-width: 2;
}

.hashi-geometry-wrap circle {
  fill: var(--site-accent);
}

.hashi-geometry-bridge {
  stroke: currentColor;
  stroke-width: 3;
}

.hashi-geometry-hit {
  stroke: color-mix(in oklch, var(--site-accent) 22%, transparent);
  stroke-width: 28;
}

.hashi-geometry-wrap path {
  fill: none;
  stroke: var(--site-muted);
  stroke-width: 1;
}

.hashi-geometry-wrap text {
  fill: var(--site-muted);
  font-size: 9px;
  text-anchor: middle;
}

figcaption {
  max-width: 62ch;
  margin-top: 0.85rem;
  color: var(--site-muted);
  font-size: 0.78rem;
  line-height: 1.5;
}

@media (prefers-reduced-motion: reduce) {
  .hashi-article-demo,
  .hashi-demo-button {
    transition: none;
  }
}
</style>
