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

## Mini board demonstrations

Place a compact SVG demonstration beside or immediately after each pseudocode example. Reuse the production `HashiBoard`, game state, geometry helpers, and rule evaluation rather than maintaining a separate interpretation of Hashi.

Use interaction only when it makes the rule easier to understand:

- **Visible neighbors:** A fixed annotated board highlights the nearest legal corridors and dims a farther island blocked by a nearer one.
- **Bridge cycle:** A live corridor cycles through `0 → 1 → 2 → 0` using the production click and keyboard interaction.
- **Crossings:** One bridge starts active. Attempting the perpendicular corridor is refused by the production crossing rule and accompanied by concise visible feedback.
- **Island totals:** A live small board lets the reader move an island between open, satisfied, and overfilled states.
- **Connectivity:** A fixed locally satisfied but stranded network can be toggled to its connected solution.
- **Generation:** A toggle reveals the generated solution network, then hides it while retaining the derived island clues.
- **Uniqueness:** A compact comparison shows a puzzle with one solution and an ambiguous puzzle with two valid arrangements.
- **SVG geometry:** A fixed annotated diagram labels island centers, island edges, the visible bridge segment, and the wider transparent hit stroke.

Create one article-only wrapper responsible for the example puzzles, captions, annotations, and toggles. Do not add tutorial-specific controls or annotations to the main `/hashi` game. Every control must be keyboard accessible, every demonstration needs a short text caption, and motion must not be required to understand the rule.

## Exclusions

- No leaderboard discussion.
- No broad philosophical conclusion.
- No claim that the simplified pseudocode is production code.
- No exhaustive walkthrough of Vue component structure or styling tokens.
