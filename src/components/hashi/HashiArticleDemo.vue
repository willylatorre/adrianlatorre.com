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
  | 'uniqueness'
  | 'geometry'

const props = defineProps<{ kind: DemoKind }>()

const captions: Record<DemoKind, string> = {
  visible:
    'Only the nearest island in each direction gets a corridor. The faded island cannot skip over its neighbor.',
  cycle: 'Try the corridor: one bridge, two bridges, then clear it.',
  crossing: 'The horizontal bridge is already active. Try adding the vertical one.',
  totals: 'Add bridges around the center 2. It recedes when satisfied and warns when overfilled.',
  connectivity: 'Every 2 is satisfied in both views, but only one view connects all four islands.',
  generation:
    'The hidden bridge network creates the island numbers. Toggle it without changing the clues.',
  uniqueness:
    'The first puzzle has one answer. The second can swap between multiple valid networks.',
  geometry:
    'The visible bridge stops at each island edge; its transparent interaction stroke is deliberately wider.',
}

const island = (id: string, x: number, y: number, clue: number): Island => ({ id, x, y, clue })
const puzzle = (id: string, width: number, height: number, islands: Island[]): HashiPuzzle => ({
  id,
  category: 'intro',
  width,
  height,
  islands,
})

const demos: Record<Exclude<DemoKind, 'uniqueness' | 'geometry'>, HashiPuzzle> = {
  visible: puzzle('demo-visible', 7, 5, [
    island('visible-left', 1, 2, 1),
    island('visible-center', 3, 2, 4),
    island('visible-blocked', 5, 2, 1),
    island('visible-top', 3, 0, 1),
    island('visible-bottom', 3, 4, 1),
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
}

const uniquePuzzle = puzzle('demo-unique', 6, 3, [
  island('unique-a', 1, 1, 1),
  island('unique-b', 4, 1, 1),
])
const ambiguousPuzzle = puzzle('demo-ambiguous', 7, 5, [
  island('ambiguous-a', 1, 1, 2),
  island('ambiguous-b', 5, 1, 2),
  island('ambiguous-c', 1, 3, 2),
  island('ambiguous-d', 5, 3, 2),
])
const geometryPuzzle = puzzle('demo-geometry', 6, 3, [
  island('geometry-a', 1, 1, 1),
  island('geometry-b', 4, 1, 1),
])

const activePuzzle = computed(() =>
  props.kind === 'uniqueness' || props.kind === 'geometry' ? uniquePuzzle : demos[props.kind],
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
  [corridorId('visible-center', 'visible-top')]: 1,
  [corridorId('visible-center', 'visible-bottom')]: 1,
}

const displayCounts = computed<BridgeCounts>(() => {
  if (props.kind === 'visible') return visibleCounts
  if (props.kind === 'connectivity') return toggled.value ? squareCycle : strandedNetwork
  if (props.kind === 'generation') return toggled.value ? generatedSolution : {}
  return liveCounts.value
})

const ambiguousCounts = computed<BridgeCounts>(() =>
  toggled.value
    ? {
        [corridorId('ambiguous-a', 'ambiguous-c')]: 2,
        [corridorId('ambiguous-b', 'ambiguous-d')]: 2,
      }
    : {
        [corridorId('ambiguous-a', 'ambiguous-b')]: 2,
        [corridorId('ambiguous-c', 'ambiguous-d')]: 2,
      },
)

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
    <div v-if="kind === 'uniqueness'" class="hashi-demo-comparison">
      <div>
        <span class="hashi-demo-label">One answer</span>
        <HashiBoard
          :puzzle="uniquePuzzle"
          :bridge-counts="{ [corridorId('unique-a', 'unique-b')]: 1 }"
          :interactive="false"
        />
      </div>
      <div>
        <span class="hashi-demo-label">More than one</span>
        <HashiBoard
          :puzzle="ambiguousPuzzle"
          :bridge-counts="ambiguousCounts"
          :interactive="false"
        />
        <button type="button" class="hashi-demo-button" @click="toggled = !toggled">
          Show another answer
        </button>
      </div>
    </div>

    <div v-else-if="kind === 'geometry'" class="hashi-geometry-wrap">
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
      <HashiBoard
        :puzzle="activePuzzle"
        :bridge-counts="displayCounts"
        :interactive="kind === 'cycle' || kind === 'crossing' || kind === 'totals'"
        @cycle="cycle"
      />
      <p v-if="kind === 'visible'" class="hashi-demo-note">
        The nearer center island blocks the faded island behind it.
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

.hashi-demo-board,
.hashi-demo-comparison > div {
  min-width: 0;
}

.hashi-demo-comparison {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.hashi-demo-label {
  display: block;
  margin-bottom: 0.45rem;
  color: var(--site-muted);
  font-size: 0.72rem;
  font-weight: 680;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

:deep(.hashi-board-scroll) {
  max-width: 100%;
  border-color: color-mix(in oklch, var(--site-border) 78%, transparent);
}

.is-visible :deep([data-island='visible-blocked']) {
  opacity: 0.28;
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

@media (max-width: 620px) {
  .hashi-demo-comparison {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hashi-article-demo,
  .hashi-demo-button {
    transition: none;
  }
}
</style>
