# Hashi Article Rewrite Design

## Goal

Replace the current short Hashi build note with a useful, entertaining engineering article that matches the conversational tone and depth of the existing site articles.

## Voice

- First-person build diary with dry jokes arising from the implementation.
- Concrete and modest, without treating the puzzle as a grand philosophical lesson.
- Clear enough for a reader who has never implemented a graph puzzle.
- Prefer readable pseudocode over code copied directly from the TypeScript implementation.

## Structure

1. Open with why the puzzle was worth rebuilding.
2. Model islands and find only the nearest visible neighbors.
3. Explain corridor interaction as `0 → 1 → 2 → 0`.
4. Reject crossing bridges when a bridge is added.
5. Recalculate island totals continuously to show satisfied and overfilled states.
6. Check connectivity separately when assessing completion, including the locally valid but globally stranded `1—1` case.
7. Generate a solved network first, derive clues from it, and use a bounded solver to reject ambiguous puzzles.
8. Use one SVG coordinate system for the grid, rounded islands, bridge endpoints, and generous invisible click targets.
9. Compress the remaining UI decisions into one section: edge alignment, opacity, wide boards, persistence, and background-worker generation.
10. End with “Have fun.”

## Snippets

Each snippet answers one practical question and appears immediately after the idea it demonstrates. Snippets should cover visible corridors, bridge cycling, crossing rejection, island totals, connectivity, solution-first generation, uniqueness checking, and SVG edge endpoints.

## Exclusions

- No leaderboard discussion.
- No broad philosophical conclusion.
- No claim that the simplified pseudocode is production code.
- No exhaustive walkthrough of Vue component structure or styling tokens.
