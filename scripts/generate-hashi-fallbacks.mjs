// Run after generator changes: node scripts/generate-hashi-fallbacks.mjs
import { writeFile } from 'node:fs/promises'
import { createJiti } from 'jiti'

const jiti = createJiti(import.meta.url)
const { CATEGORY_CONFIG, generatePuzzle, generateFallbackPuzzle } = await jiti.import(
  '../src/features/hashi/generator.ts',
)
const { assessDifficulty } = await jiti.import('../src/features/hashi/difficulty.ts')
const { countSolutionsWithDeadline } = await jiti.import('../src/features/hashi/solver.ts')
const { evaluatePuzzle } = await jiti.import('../src/features/hashi/rules.ts')
const pools = {}
for (const category of Object.keys(CATEGORY_CONFIG)) {
  const pool = []
  const ids = new Set()
  const existingIds = new Set(
    Array.from({ length: 4 }, (_, seed) => generateFallbackPuzzle(category, seed).puzzle.id),
  )
  for (let seed = 0; seed < 40 && pool.length < 4; seed++) {
    const generated = generatePuzzle(category, 812000 + seed, { timeBudgetMs: 15000 })
    if (ids.has(generated.puzzle.id) || existingIds.has(generated.puzzle.id)) continue
    const result = countSolutionsWithDeadline(generated.puzzle, 2, {
      deadline: Date.now() + 10000,
      now: Date.now,
    })
    const grade = assessDifficulty(generated.puzzle)
    if (
      result.count !== 1 ||
      result.timedOut ||
      !evaluatePuzzle(generated.puzzle, generated.solution).solved ||
      grade.difficulty !== CATEGORY_CONFIG[category].difficulty
    )
      throw new Error(`Invalid ${category} fixture`)
    pool.push(generated)
    ids.add(generated.puzzle.id)
    console.log(category, pool.length, generated.puzzle.id)
  }
  if (pool.length !== 4) throw new Error(`Not enough fresh ${category} fixtures`)
  pools[category] = pool
}
// Keep each board on one line so generated fixture diffs stay manageable.
const serialized =
  '{\n' +
  Object.entries(pools)
    .map(
      ([category, pool]) =>
        `  "${category}": [\n${pool.map((puzzle) => '    ' + JSON.stringify(puzzle)).join(',\n')}\n  ]`,
    )
    .join(',\n') +
  '\n}\n'
await writeFile(new URL('../src/features/hashi/fallback-puzzles.json', import.meta.url), serialized)
