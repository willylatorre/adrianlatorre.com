import { describe, expect, it } from 'vitest'
import { findHashiHint } from './hints'
import { countSolutions } from './solver'
import type { BridgeCount, BridgeCounts, HashiPuzzle } from './types'

type Point = readonly [number, number]
interface Edge {
  a: number
  b: number
  id: string
  interior: Set<string>
}

// Intentionally independent of production geometry, evaluation and propagation.
// Enumerate all bridge assignments, then group valid networks by their clue vector.
function enumerateNetworks(points: readonly Point[]) {
  const edges: Edge[] = []
  for (let a = 0; a < points.length; a++) {
    for (let b = a + 1; b < points.length; b++) {
      const [ax, ay] = points[a]!
      const [bx, by] = points[b]!
      if (ax !== bx && ay !== by) continue
      const interior = new Set<string>()
      const dx = Math.sign(bx - ax)
      const dy = Math.sign(by - ay)
      for (let x = ax + dx, y = ay + dy; x !== bx || y !== by; x += dx, y += dy) {
        interior.add(`${x},${y}`)
      }
      if (points.some(([x, y]) => interior.has(`${x},${y}`))) continue
      edges.push({ a, b, id: `i${a}:i${b}`, interior })
    }
  }

  const solutions = new Map<string, number[][]>()
  for (let encoding = 0; encoding < 3 ** edges.length; encoding++) {
    let digits = encoding
    const counts = edges.map(() => {
      const count = digits % 3
      digits = Math.floor(digits / 3)
      return count
    })
    const occupied = new Set<string>()
    const groups = points.map((_, index) => index)
    const clues = points.map(() => 0)
    let crosses = false
    for (const [index, edge] of edges.entries()) {
      const count = counts[index]!
      if (!count) continue
      if ([...edge.interior].some((cell) => occupied.has(cell))) {
        crosses = true
        break
      }
      for (const cell of edge.interior) occupied.add(cell)
      const from = groups[edge.a]!
      const to = groups[edge.b]!
      for (let island = 0; island < groups.length; island++) {
        if (groups[island] === from) groups[island] = to
      }
      clues[edge.a]! += count
      clues[edge.b]! += count
    }
    if (crosses || groups.some((group) => group !== groups[0])) continue
    if (clues.some((clue) => clue < 1 || clue > 8)) continue
    const key = clues.join(',')
    const matches = solutions.get(key) ?? []
    matches.push(counts)
    solutions.set(key, matches)
  }

  return { edges, solutions }
}

function* clueVectors(maxima: number[], prefix: number[] = []): Generator<number[]> {
  if (prefix.length === maxima.length) {
    yield prefix
    return
  }
  for (let clue = 1; clue <= maxima[prefix.length]!; clue++) {
    yield* clueVectors(maxima, [...prefix, clue])
  }
}

function makePuzzle(name: string, points: readonly Point[], clues: number[]): HashiPuzzle {
  return {
    id: `oracle-${name}-${clues.join(',')}`,
    category: 'intro',
    width: Math.max(...points.map(([x]) => x)) + 1,
    height: Math.max(...points.map(([, y]) => y)) + 1,
    islands: points.map(([x, y], index) => ({ id: `i${index}`, x, y, clue: clues[index]! })),
  }
}

const layouts: { name: string; points: Point[] }[] = [
  {
    name: 'pair',
    points: [
      [0, 0],
      [2, 0],
    ],
  },
  {
    name: 'nearest island in a chain',
    points: [
      [0, 0],
      [2, 0],
      [4, 0],
    ],
  },
  {
    name: 'square cycle',
    points: [
      [0, 0],
      [2, 0],
      [0, 2],
      [2, 2],
    ],
  },
  {
    name: 'disconnected pairs',
    points: [
      [0, 0],
      [2, 0],
      [1, 2],
      [3, 2],
    ],
  },
  {
    name: 'four directions',
    points: [
      [2, 2],
      [0, 2],
      [4, 2],
      [2, 0],
      [2, 4],
    ],
  },
  {
    name: 'crossing routes with an outer connection',
    points: [
      [0, 2],
      [4, 2],
      [2, 0],
      [2, 4],
      [0, 0],
    ],
  },
  {
    name: 'two adjacent cycles',
    points: [
      [0, 0],
      [2, 0],
      [4, 0],
      [0, 2],
      [2, 2],
      [4, 2],
    ],
  },
]

describe('independent exhaustive small-board oracle', () => {
  for (const { name, points } of layouts) {
    const { edges, solutions } = enumerateNetworks(points)

    it(`matches exact solution counts for every locally possible clue vector: ${name}`, () => {
      const maxima = points.map((_, island) =>
        Math.min(8, 2 * edges.filter((edge) => edge.a === island || edge.b === island).length),
      )
      for (const clues of clueVectors(maxima)) {
        const puzzle = makePuzzle(name, points, clues)
        expect(countSolutions(puzzle, Infinity), puzzle.id).toBe(
          solutions.get(clues.join(','))?.length ?? 0,
        )
      }
    })

    it(`only gives hints required by every compatible completion: ${name}`, () => {
      for (const [clueKey, completions] of solutions) {
        const puzzle = makePuzzle(name, points, clueKey.split(',').map(Number))
        // Blank state, all single-corridor partial states, and every prefix of
        // each solution include both unfilled and already doubled corridors.
        const partials = new Map<string, number[]>()
        const add = (counts: number[]) => partials.set(counts.join(','), [...counts])
        add(edges.map(() => 0))
        for (const completion of completions) {
          const prefix = edges.map(() => 0)
          for (let index = 0; index < edges.length; index++) {
            for (let count = 1; count <= completion[index]!; count++) {
              const single = edges.map(() => 0)
              single[index] = count
              add(single)
              prefix[index] = count
              add(prefix)
            }
          }
        }

        for (const partial of partials.values()) {
          const compatible = completions.filter((solution) =>
            partial.every((count, index) => count <= solution[index]!),
          )
          const counts: BridgeCounts = Object.fromEntries(
            edges.map((edge, index) => [edge.id, partial[index] as BridgeCount]),
          )
          const result = findHashiHint(puzzle, counts)
          const context = `${puzzle.id}; partial=${partial.join(',')}`
          expect(result.kind, context).not.toBe('invalid')
          if (result.kind !== 'hint') continue
          const index = edges.findIndex((edge) => edge.id === result.hint.corridorId)
          expect(index, context).toBeGreaterThanOrEqual(0)
          expect(result.hint.minimumCount, context).toBeGreaterThan(partial[index]!)
          expect(
            compatible.every((solution) => solution[index]! >= result.hint.minimumCount),
            `${context}; hint=${JSON.stringify(result.hint)}`,
          ).toBe(true)
        }
      }
    })
  }

  it('includes impossible, unique, ambiguous, and crossing-sensitive boards in the corpus', () => {
    const square = enumerateNetworks(layouts[2]!.points).solutions
    expect(square.has('1,1,1,1')).toBe(false)
    expect(square.get('2,2,2,2')).toHaveLength(1)
    expect(square.get('3,3,3,3')!.length).toBeGreaterThan(1)
    expect(enumerateNetworks(layouts[3]!.points).solutions.size).toBe(0)
    // The only clue-matching connected assignment uses both crossing routes.
    expect(enumerateNetworks(layouts[5]!.points).solutions.has('2,1,2,1,2')).toBe(false)
  })
})
