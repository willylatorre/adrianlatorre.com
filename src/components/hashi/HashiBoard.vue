<script setup lang="ts">
import { computed } from 'vue'
import { bridgeSegments, getPuzzleTopology } from '../../features/hashi/geometry'
import { getBoardState } from '../../features/hashi/rules'
import type {
  BridgeCount,
  BridgeCounts,
  Corridor,
  HashiPuzzle,
  Island,
  LineSegment,
} from '../../features/hashi/types'

const CELL_SIZE = 40
const ISLAND_SIZE = 30
const ISLAND_HALF = ISLAND_SIZE / 2
const BOARD_INSET = 16
const BOARD_MARGIN = ISLAND_HALF + BOARD_INSET

const props = withDefaults(
  defineProps<{
    puzzle: HashiPuzzle
    bridgeCounts: BridgeCounts
    interactive?: boolean
    hintCorridorId?: string | null
    zoom?: number
  }>(),
  { interactive: true, hintCorridorId: null, zoom: 1 },
)

const emit = defineEmits<{
  cycle: [corridorId: string]
}>()

const topology = computed(() => getPuzzleTopology(props.puzzle))
const corridors = computed(() => topology.value.corridors)
const islandById = computed(() => topology.value.islandById)
const position = computed(() => getBoardState(props.puzzle, props.bridgeCounts))
const islandStates = computed(() => position.value.states)
const boardWidth = computed(() => (props.puzzle.width - 1) * CELL_SIZE + BOARD_MARGIN * 2)
const boardHeight = computed(() => (props.puzzle.height - 1) * CELL_SIZE + BOARD_MARGIN * 2)
const viewBox = computed(
  () => `${-BOARD_MARGIN} ${-BOARD_MARGIN} ${boardWidth.value} ${boardHeight.value}`,
)
const zoomPercent = computed(() => Math.round(props.zoom * 100))

function bridgeCount(corridor: Corridor): BridgeCount {
  return props.bridgeCounts[corridor.id] ?? 0
}

function bridgeSegmentsFor(corridor: Corridor) {
  return bridgeSegments(corridor, props.puzzle, CELL_SIZE, ISLAND_HALF, bridgeCount(corridor))
}

function hitSegment(corridor: Corridor) {
  return bridgeSegments(corridor, props.puzzle, CELL_SIZE, ISLAND_HALF, 1)[0]!
}

function segmentKey(segment: LineSegment) {
  return `${segment.x1}:${segment.y1}:${segment.x2}:${segment.y2}`
}

function corridorStateClasses(corridor: Corridor) {
  const states = [islandStates.value.get(corridor.a), islandStates.value.get(corridor.b)]
  return {
    'is-satisfied': states.includes('satisfied'),
    'is-overfilled': states.includes('overfilled'),
  }
}

function corridorLabel(corridor: Corridor) {
  const first = islandById.value.get(corridor.a)!
  const second = islandById.value.get(corridor.b)!
  const count = bridgeCount(corridor)
  const countLabel = count === 1 ? '1 bridge' : `${count} bridges`

  const hintLabel = props.hintCorridorId === corridor.id ? ', current hint' : ''

  return `Corridor between island ${first.clue} and island ${second.clue}, ${countLabel}${hintLabel}`
}

function islandLabel(island: Island) {
  const total = position.value.totals.get(island.id)!
  const state = islandStates.value.get(island.id)!
  const stateLabel =
    state === 'satisfied'
      ? 'satisfied'
      : state === 'overfilled'
        ? 'overfilled'
        : `${island.clue - total} remaining`

  return `Island ${island.clue}, ${total} of ${island.clue} bridges, ${stateLabel}`
}
</script>

<template>
  <div class="hashi-board-scroll" role="region" tabindex="0" aria-label="Scrollable Hashi board">
    <svg
      class="hashi-board"
      :viewBox="viewBox"
      :width="boardWidth"
      :height="boardHeight"
      :style="{ width: `${zoomPercent}%`, height: 'auto' }"
      role="group"
      aria-label="Hashi puzzle board"
    >
      <g class="hashi-grid" aria-hidden="true">
        <line
          v-for="x in puzzle.width"
          :key="`grid-x-${x - 1}`"
          :x1="(x - 1) * CELL_SIZE"
          y1="0"
          :x2="(x - 1) * CELL_SIZE"
          :y2="(puzzle.height - 1) * CELL_SIZE"
        />
        <line
          v-for="y in puzzle.height"
          :key="`grid-y-${y - 1}`"
          x1="0"
          :y1="(y - 1) * CELL_SIZE"
          :x2="(puzzle.width - 1) * CELL_SIZE"
          :y2="(y - 1) * CELL_SIZE"
        />
      </g>

      <g class="hashi-bridges" aria-hidden="true">
        <g
          v-for="corridor in corridors"
          :key="corridor.id"
          class="hashi-corridor"
          :class="[corridorStateClasses(corridor), { 'is-hinted': hintCorridorId === corridor.id }]"
          :data-corridor="corridor.id"
        >
          <line
            v-for="segment in bridgeSegmentsFor(corridor)"
            :key="segmentKey(segment)"
            class="hashi-bridge"
            :class="corridorStateClasses(corridor)"
            v-bind="segment"
          />
        </g>
      </g>

      <g class="hashi-hits">
        <g
          v-for="corridor in corridors"
          :key="corridor.id"
          class="hashi-corridor-hit"
          :class="{
            'is-readonly': !interactive,
            'is-hinted': hintCorridorId === corridor.id,
            'is-blocked': position.blocked.has(corridor.id),
          }"
          :data-corridor-hit="corridor.id"
          :role="interactive ? 'button' : undefined"
          :tabindex="interactive ? 0 : undefined"
          :aria-label="corridorLabel(corridor)"
          @click="interactive && emit('cycle', corridor.id)"
          @keydown.enter.prevent="interactive && emit('cycle', corridor.id)"
          @keydown.space.prevent="interactive && emit('cycle', corridor.id)"
        >
          <line
            class="hashi-hit"
            v-bind="hitSegment(corridor)"
            stroke="transparent"
            stroke-width="28"
            :pointer-events="interactive ? 'stroke' : 'none'"
          />
          <line
            v-if="!position.blocked.has(corridor.id)"
            class="hashi-focus"
            :class="{ 'is-hinted': hintCorridorId === corridor.id }"
            v-bind="hitSegment(corridor)"
            stroke="transparent"
            stroke-width="3"
            pointer-events="none"
            aria-hidden="true"
          />
        </g>
      </g>

      <g class="hashi-islands">
        <g
          v-for="island in puzzle.islands"
          :key="island.id"
          class="hashi-island"
          :class="`is-${islandStates.get(island.id)}`"
          :data-island="island.id"
          role="img"
          :aria-label="islandLabel(island)"
        >
          <rect
            :x="island.x * CELL_SIZE - ISLAND_HALF"
            :y="island.y * CELL_SIZE - ISLAND_HALF"
            :width="ISLAND_SIZE"
            :height="ISLAND_SIZE"
            rx="11"
          />
          <text
            class="hashi-island-number"
            :x="island.x * CELL_SIZE"
            :y="island.y * CELL_SIZE"
            aria-hidden="true"
          >
            {{ island.clue }}
          </text>
          <text
            v-if="islandStates.get(island.id) === 'overfilled'"
            class="hashi-island-status"
            :x="island.x * CELL_SIZE + 13"
            :y="island.y * CELL_SIZE - 10"
            aria-hidden="true"
          >
            !
          </text>
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.hashi-board-scroll {
  --hashi-overfilled: oklch(0.48 0.105 32);

  max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  border: 1px solid var(--site-border);
  background: color-mix(in oklch, var(--site-bg) 90%, var(--site-surface));
}

.hashi-board-scroll:focus-visible {
  outline: 2px solid color-mix(in oklch, var(--site-accent) 62%, transparent);
  outline-offset: 3px;
}

.hashi-board {
  display: block;
  max-width: none;
  color: var(--site-ink);
}

.hashi-grid {
  stroke: color-mix(in oklch, var(--site-border) 54%, transparent);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.hashi-corridor {
  cursor: pointer;
  outline: none;
}

.hashi-bridge {
  stroke: currentColor;
  stroke-width: 3;
  stroke-linecap: round;
  pointer-events: none;
  transition:
    stroke 180ms ease-out,
    opacity 180ms ease-out;
}

.hashi-focus {
  transition: stroke 180ms ease-out;
}

.hashi-corridor-hit {
  cursor: pointer;
  outline: none;
}

.hashi-corridor-hit.is-readonly {
  cursor: default;
}

.hashi-corridor-hit:not(.is-blocked):hover .hashi-focus,
.hashi-corridor-hit:not(.is-blocked):focus-visible .hashi-focus {
  stroke: color-mix(in oklch, var(--site-accent) 22%, transparent);
}

.hashi-corridor-hit:focus-visible .hashi-focus {
  stroke-dasharray: 3 3;
}

.hashi-corridor-hit.is-hinted .hashi-focus {
  stroke: color-mix(in oklch, var(--site-accent) 72%, var(--site-ink));
  stroke-dasharray: 7 5;
}

.hashi-corridor.is-hinted .hashi-bridge {
  color: color-mix(in oklch, var(--site-accent) 72%, var(--site-ink));
  opacity: 1;
}

.hashi-bridge.is-satisfied {
  color: color-mix(in oklch, var(--site-accent) 42%, transparent);
  opacity: 0.62;
}

.hashi-bridge.is-overfilled {
  color: var(--hashi-overfilled);
}

.hashi-island {
  --hashi-island-fill: var(--site-bg);
  --hashi-island-stroke: var(--site-ink);
  color: var(--site-ink);
}

.hashi-island rect {
  fill: var(--hashi-island-fill);
  stroke: var(--hashi-island-stroke);
  stroke-width: 2.5;
  vector-effect: non-scaling-stroke;
  transition:
    fill 180ms ease-out,
    stroke 180ms ease-out;
}

.hashi-island.is-satisfied {
  color: color-mix(in oklch, var(--site-accent) 42%, transparent);
  --hashi-island-fill: color-mix(in oklch, var(--site-accent) 12%, var(--site-bg));
  --hashi-island-stroke: color-mix(in oklch, var(--site-accent) 64%, var(--site-ink));
}

.hashi-island.is-overfilled {
  color: var(--hashi-overfilled);
  --hashi-island-fill: color-mix(in oklch, var(--hashi-overfilled) 8%, var(--site-bg));
  --hashi-island-stroke: var(--hashi-overfilled);
}

.hashi-island-number {
  fill: currentColor;
  font-size: 15px;
  font-weight: 750;
  text-anchor: middle;
  dominant-baseline: central;
  user-select: none;
}

.hashi-island-status {
  fill: currentColor;
  font-size: 10px;
  font-weight: 800;
  text-anchor: middle;
  dominant-baseline: central;
  user-select: none;
}

@media (prefers-reduced-motion: reduce) {
  .hashi-bridge,
  .hashi-hit,
  .hashi-island rect {
    transition: none;
  }
}
</style>
