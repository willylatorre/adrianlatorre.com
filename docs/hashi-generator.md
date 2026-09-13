# Hashi generation

The v7 generator separates placement, a valid bridge network, uniqueness, and reasoning difficulty. Existing game/worker interfaces are unchanged; the version prefix invalidates generated boards from older algorithms.

## Layout

| Category | Grid  | Islands | Reasoning tier |
| -------- | ----- | ------- | -------------- |
| Intro    | 10×10 | 30      | Easy           |
| Daily    | 20×20 | 120     | Medium         |
| Weekly   | 25×25 | 190     | Hard           |
| Monthly  | 30×30 | 280     | Hard           |

Placement grows a connected planar backbone using seeded weighted randomness. New rows/columns and varying bridge lengths are encouraged, but there is no greedy rectangular mesh or blanket 3×3 exclusion around islands. Diagonal neighbors are allowed; orthogonally touching islands are excluded so bridges have room. Inserting an island into a bridge splits the edge while preserving connectivity. Extra noncrossing edges are added after growth.

Every accepted placement reaches the boundaries, uses at least 75% of both coordinate axes, covers local areas, and has no large empty bands. Tests additionally check density and diagonal staggering across multiple seeds.

## Uniqueness

The exact solver propagates island capacities, crossing exclusions, and required cut edges of the remaining possible graph, then branches if needed. Generation counts up to two solutions. On ambiguity, it changes a differing single bridge to zero or two, retaining a connected valid solution and deriving new clues. Each successful repair eliminates a single from the candidate network, so repair iterations are bounded. Failure to prove uniqueness causes rejection, including when search reaches its 2,000-node limit or generation deadline.

A supplied answer only orders search branches; it does not prove uniqueness or bypass search. The independent solver tests do not supply an answer.

## Difficulty

`assessDifficulty` starts with no bridges and repeatedly applies the same explainable rules as the player's hints. It never reads the generated answer. A candidate must finish this logical solve as well as pass the exact uniqueness check.

- **Easy:** solved entirely with only-route, capacity, and crossing deductions.
- **Medium:** needs connectivity or contradiction deductions, with contradiction steps below 1.5% of all hint steps.
- **Hard:** contradiction steps are at least 1.5% of hint steps.
- **Unrated:** logical solve stalls or grading exceeds its budget. Rejected.

These are initial reproducible heuristics, not empirically calibrated human ratings. They measure the weakest available rule along one deterministic solve order and normalize advanced-rule frequency for length. They do not yet measure deduction chain depth, visual search burden, or the number of alternative easy moves. Thresholds should be calibrated against player solves and a curated puzzle corpus before claiming expert-level grading. Weekly and Monthly intentionally share a reasoning tier; Monthly is longer, not automatically harder.

## Budgets and fallbacks

Online generation has a cooperative three-second budget, checked during placement, exact search, and between logical deductions. A single deduction or graph operation can finish slightly after the deadline. Normal seeded generation is deterministic when it completes; reaching the wall-clock deadline can select a fallback instead.

There are four distinct, prevalidated puzzles per category. The seed selects one on exhaustion, and callers receive a deep clone. Fallback selection performs no generation or solving. This keeps the game usable on slower devices without returning ambiguous or misgraded puzzles, though repeated timeouts can repeat one of these four boards.

Regenerate fixtures after changing the algorithm, sizes, or difficulty rules:

```sh
node scripts/generate-hashi-fallbacks.mjs
```

The script uses a longer offline budget, rejects existing fallback IDs, and validates connectivity, uniqueness, and reasoning tier before replacing the fixture file. All fixtures are checked again by the test suite.

## Validation

```sh
npm test -- src/features/hashi src/components/hashi src/pages/HashiPage.test.ts
npm run type-check
npm run build
```

Regression coverage includes diagonal spacing, density, seed variety, full geometry coverage, unique solutions, reasoning tiers independent of solve length, deadline fallback behavior, clone isolation, and all stored fixtures. Hints cache immutable puzzle topology to make complete logical traces affordable.
