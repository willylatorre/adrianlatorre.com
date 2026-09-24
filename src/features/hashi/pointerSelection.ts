import type { PuzzleTopology } from './geometry'

export interface IntersectionChoice {
  x: number
  y: number
  horizontalId: string
  verticalId: string
}

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

export function buildIntersectionLookup(topology: PuzzleTopology, cellSize: number) {
  const result = new Map<string, IntersectionChoice>()
  for (const corridor of topology.corridors) {
    if (corridor.axis !== 'horizontal') continue
    const horizontalStart = topology.islandById.get(corridor.a)!
    for (const vertical of topology.crossings.get(corridor.id) ?? []) {
      const verticalStart = topology.islandById.get(vertical.a)!
      const x = verticalStart.x * cellSize
      const y = horizontalStart.y * cellSize
      result.set(`${x}:${y}`, {
        x,
        y,
        horizontalId: corridor.id,
        verticalId: vertical.id,
      })
    }
  }
  return result
}

export function selectPointerCorridor(input: PointerSelectionInput): PointerSelectionResult {
  const gridX = Math.round(input.point.x / input.cellSize) * input.cellSize
  const gridY = Math.round(input.point.y / input.cellSize) * input.cellSize
  const intersectionKey = `${gridX}:${gridY}`
  const intersection = input.intersections.get(intersectionKey)
  const distance = intersection
    ? Math.hypot(input.point.x - intersection.x, input.point.y - intersection.y)
    : Number.POSITIVE_INFINITY

  if (!intersection || distance > input.hotspotRadius) {
    return {
      corridorId:
        input.directCorridorId && !input.blocked.has(input.directCorridorId)
          ? input.directCorridorId
          : null,
      intersectionKey: null,
    }
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
        horizontalMovement > verticalMovement ? intersection.horizontalId : intersection.verticalId,
      intersectionKey,
    }
  }

  const horizontalDistance = Math.abs(input.point.y - intersection.y)
  const verticalDistance = Math.abs(input.point.x - intersection.x)
  return {
    corridorId:
      horizontalDistance === verticalDistance
        ? [intersection.horizontalId, intersection.verticalId].sort()[0]!
        : horizontalDistance < verticalDistance
          ? intersection.horizontalId
          : intersection.verticalId,
    intersectionKey,
  }
}
