import { getPuzzleTopology, type PuzzleTopology } from './geometry'
import type { BridgeCounts, Corridor, HashiPuzzle, Island } from './types'

export type HashiHintRule =
  | 'only-route'
  | 'capacity'
  | 'crossing'
  | 'connectivity'
  | 'contradiction'

export interface HashiHint {
  corridorId: string
  minimumCount: 1 | 2
  rule: HashiHintRule
  title: string
  explanation: string
}

export type HashiHintSearchResult =
  | { kind: 'hint'; hint: HashiHint }
  | { kind: 'invalid'; message: string }
  | { kind: 'none'; message: string }

interface HintContext {
  puzzle: HashiPuzzle
  counts: BridgeCounts
  corridors: Corridor[]
  islandById: Map<string, Island>
  totals: Map<string, number>
  topology: PuzzleTopology
}

interface Bounds {
  lower: number[]
  upper: number[]
}

export function findHashiHint(puzzle: HashiPuzzle, counts: BridgeCounts): HashiHintSearchResult {
  const topology = getPuzzleTopology(puzzle)
  const corridors = topology.corridors
  const context: HintContext = {
    puzzle: { ...puzzle, islands: topology.islands },
    topology,
    counts,
    corridors,
    islandById: topology.islandById,
    totals: new Map(puzzle.islands.map((island) => [island.id, 0])),
  }

  for (const edge of corridors) {
    const count = counts[edge.id] ?? 0
    context.totals.set(edge.a, context.totals.get(edge.a)! + count)
    context.totals.set(edge.b, context.totals.get(edge.b)! + count)
  }
  if (
    puzzle.islands.every((island) => context.totals.get(island.id) === island.clue) &&
    activeComponents(context).length === 1 &&
    !hasActiveCrossing(context)
  ) {
    return { kind: 'none', message: 'This puzzle is already complete.' }
  }

  const invalid = findInvalidState(context)
  if (invalid) return invalid

  return (
    findCapacityHint(context) ??
    findConnectivityHint(context) ??
    findContradictionHint(context) ?? {
      kind: 'none',
      message: 'No simple deduction is available here. Try another part of the board.',
    }
  )
}

function findInvalidState(context: HintContext): HashiHintSearchResult | undefined {
  const overfilled = context.puzzle.islands.find(
    (island) => context.totals.get(island.id)! > island.clue,
  )
  if (overfilled) {
    return {
      kind: 'invalid',
      message: `Island ${overfilled.clue} is overfilled. Remove a bridge there before asking for a hint.`,
    }
  }

  if (hasActiveCrossing(context)) {
    return {
      kind: 'invalid',
      message: 'Two bridges cross. Remove one of them before asking for a hint.',
    }
  }

  for (const island of context.puzzle.islands) {
    const remaining = island.clue - context.totals.get(island.id)!
    const capacity = incidentCorridors(island.id, context).reduce(
      (total, corridor) => total + maximumIncrement(corridor, context),
      0,
    )
    if (remaining > capacity) {
      return {
        kind: 'invalid',
        message: `Island ${island.clue} no longer has enough room for its remaining bridges.`,
      }
    }
  }

  const closed = activeComponents(context).find(
    (component) =>
      component.size < context.puzzle.islands.length &&
      ([...component].every(
        (islandId) => context.totals.get(islandId) === context.islandById.get(islandId)!.clue,
      ) ||
        !context.corridors.some(
          (corridor) =>
            component.has(corridor.a) !== component.has(corridor.b) &&
            maximumIncrement(corridor, context) > 0,
        )),
  )
  if (closed) {
    return {
      kind: 'invalid',
      message: 'Those bridges make a closed group and strand the rest of the board.',
    }
  }

  return undefined
}

function findCapacityHint(context: HintContext): HashiHintSearchResult | undefined {
  for (const island of context.puzzle.islands) {
    const remaining = island.clue - context.totals.get(island.id)!
    if (remaining <= 0) continue

    const incident = incidentCorridors(island.id, context)
    const capacities = incident.map((corridor) => maximumIncrement(corridor, context))
    const usableCount = capacities.filter((capacity) => capacity > 0).length
    const totalCapacity = capacities.reduce((sum, capacity) => sum + capacity, 0)

    for (const [index, corridor] of incident.entries()) {
      const forcedIncrease = remaining - (totalCapacity - capacities[index]!)
      if (forcedIncrease <= 0) continue

      const current = context.counts[corridor.id] ?? 0
      const minimumCount = Math.min(2, current + forcedIncrease) as 1 | 2
      const crossingClosedRoute = incident.some(
        (candidate) =>
          candidate.id !== corridor.id &&
          crossesActiveCorridor(candidate, context) &&
          intrinsicMaximumIncrement(candidate, context) > 0,
      )
      const rule = crossingClosedRoute ? 'crossing' : usableCount === 1 ? 'only-route' : 'capacity'
      const title =
        rule === 'crossing'
          ? 'Crossing rule'
          : rule === 'only-route'
            ? 'Only route'
            : 'Capacity rule'
      const bridgeWord = forcedIncrease === 1 ? 'bridge' : 'bridges'
      const explanation =
        rule === 'crossing'
          ? `An existing bridge closes another route from island ${island.clue}, so this corridor must reach ${minimumCount}.`
          : rule === 'only-route'
            ? `Island ${island.clue} has only one usable route, so this corridor needs ${forcedIncrease} more ${bridgeWord}.`
            : `Island ${island.clue} still needs ${remaining}. Its other routes cannot hold enough, so this corridor must reach ${minimumCount}.`

      return {
        kind: 'hint',
        hint: { corridorId: corridor.id, minimumCount, rule, title, explanation },
      }
    }
  }

  return undefined
}

function findConnectivityHint(context: HintContext): HashiHintSearchResult | undefined {
  for (const component of activeComponents(context)) {
    if (component.size === context.puzzle.islands.length) continue

    const exits = context.corridors.filter((corridor) => {
      const crossesBoundary = component.has(corridor.a) !== component.has(corridor.b)
      return crossesBoundary && maximumIncrement(corridor, context) > 0
    })
    if (exits.length !== 1) continue

    const corridor = exits[0]!
    const minimumCount = ((context.counts[corridor.id] ?? 0) + 1) as 1 | 2
    return {
      kind: 'hint',
      hint: {
        corridorId: corridor.id,
        minimumCount,
        rule: 'connectivity',
        title: 'Keep it connected',
        explanation:
          'This is the only remaining exit from a connected group. It needs a bridge so the group does not become stranded.',
      },
    }
  }

  return undefined
}

function findContradictionHint(context: HintContext): HashiHintSearchResult | undefined {
  const base = createBounds(context)

  for (const [index, corridor] of context.corridors.entries()) {
    const current = context.counts[corridor.id] ?? 0
    if (base.upper[index]! <= current) continue

    const assumed = { lower: [...base.lower], upper: [...base.upper] }
    assumed.upper[index] = current
    if (!propagationFindsContradiction(context, assumed)) continue

    return {
      kind: 'hint',
      hint: {
        corridorId: corridor.id,
        minimumCount: (current + 1) as 1 | 2,
        rule: 'contradiction',
        title: 'Contradiction check',
        explanation:
          'If this corridor gets no additional bridge, the remaining islands cannot be completed legally. So it needs at least one more.',
      },
    }
  }

  return undefined
}

function maximumIncrement(corridor: Corridor, context: HintContext) {
  if (crossesActiveCorridor(corridor, context)) return 0

  return intrinsicMaximumIncrement(corridor, context)
}

function intrinsicMaximumIncrement(corridor: Corridor, context: HintContext) {
  const current = context.counts[corridor.id] ?? 0

  const a = context.islandById.get(corridor.a)!
  const b = context.islandById.get(corridor.b)!
  const aRemaining = a.clue - context.totals.get(a.id)!
  const bRemaining = b.clue - context.totals.get(b.id)!

  return Math.max(0, Math.min(2 - current, aRemaining, bRemaining))
}

function crossesActiveCorridor(candidate: Corridor, context: HintContext) {
  return context.topology.crossings
    .get(candidate.id)!
    .some((edge) => (context.counts[edge.id] ?? 0) > 0)
}

function hasActiveCrossing(context: HintContext) {
  return context.corridors.some(
    (edge) => (context.counts[edge.id] ?? 0) > 0 && crossesActiveCorridor(edge, context),
  )
}

function incidentCorridors(islandId: string, context: HintContext) {
  return context.topology.incident.get(islandId)!
}

function activeComponents(context: HintContext) {
  const unseen = new Set(context.puzzle.islands.map(({ id }) => id))
  const components: Set<string>[] = []

  while (unseen.size > 0) {
    const first = unseen.values().next().value as string
    const component = new Set<string>()
    const stack = [first]

    while (stack.length > 0) {
      const islandId = stack.pop()!
      if (component.has(islandId)) continue
      component.add(islandId)
      unseen.delete(islandId)

      for (const corridor of incidentCorridors(islandId, context)) {
        if ((context.counts[corridor.id] ?? 0) === 0) continue
        stack.push(corridor.a === islandId ? corridor.b : corridor.a)
      }
    }

    components.push(component)
  }

  return components
}

function createBounds(context: HintContext): Bounds {
  return {
    lower: context.corridors.map((corridor) => context.counts[corridor.id] ?? 0),
    upper: context.corridors.map(
      (corridor) => (context.counts[corridor.id] ?? 0) + maximumIncrement(corridor, context),
    ),
  }
}

function propagationFindsContradiction(context: HintContext, bounds: Bounds) {
  let changed = true

  while (changed) {
    changed = false

    for (let index = 0; index < context.corridors.length; index++) {
      if (bounds.lower[index] === 0) continue
      for (const otherIndex of context.topology.crossingIndexes[index]!) {
        if (bounds.lower[otherIndex]! > 0) return true
        if (bounds.upper[otherIndex] !== 0) {
          bounds.upper[otherIndex] = 0
          changed = true
        }
      }
    }

    for (const [islandIndex, island] of context.puzzle.islands.entries()) {
      const indexes = context.topology.incidentIndexes[islandIndex]!
      const lowerTotal = indexes.reduce((sum, index) => sum + bounds.lower[index]!, 0)
      const upperTotal = indexes.reduce((sum, index) => sum + bounds.upper[index]!, 0)
      if (lowerTotal > island.clue || upperTotal < island.clue) return true

      for (const index of indexes) {
        const nextLower = Math.max(
          bounds.lower[index]!,
          island.clue - (upperTotal - bounds.upper[index]!),
        )
        const nextUpper = Math.min(
          bounds.upper[index]!,
          island.clue - (lowerTotal - bounds.lower[index]!),
        )
        if (nextLower > nextUpper) return true
        if (nextLower !== bounds.lower[index]) {
          bounds.lower[index] = nextLower
          changed = true
        }
        if (nextUpper !== bounds.upper[index]) {
          bounds.upper[index] = nextUpper
          changed = true
        }
      }
    }
  }

  return boundsHaveDisconnectedCompletion(context, bounds)
}

function boundsHaveDisconnectedCompletion(context: HintContext, bounds: Bounds) {
  const unseen = new Set(context.puzzle.islands.map(({ id }) => id))

  while (unseen.size > 0) {
    const first = unseen.values().next().value as string
    const component = new Set<string>()
    const stack = [first]

    while (stack.length > 0) {
      const islandId = stack.pop()!
      if (component.has(islandId)) continue
      component.add(islandId)
      unseen.delete(islandId)
      for (const [index, corridor] of context.corridors.entries()) {
        if (bounds.lower[index]! === 0) continue
        if (corridor.a === islandId) stack.push(corridor.b)
        if (corridor.b === islandId) stack.push(corridor.a)
      }
    }

    if (component.size === context.puzzle.islands.length) return false
    const hasPossibleExit = context.corridors.some(
      (corridor, index) =>
        component.has(corridor.a) !== component.has(corridor.b) && bounds.upper[index]! > 0,
    )
    if (!hasPossibleExit) return true
  }

  return false
}

export function isHintMinimumCount(value: unknown): value is 1 | 2 {
  return value === 1 || value === 2
}
