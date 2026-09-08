# Hashi Game Design

Date: 2026-09-08
Status: Approved for implementation

## Purpose

Add a complete Hashi puzzle game at `/hashi` that borrows the clarity and board-first interaction of established Hashi sites while matching Adrian's warm, restrained engineering-notebook style. The result should feel like a polished playground experiment rather than a separate game product.

The game should be immediately playable, generate fresh random puzzles, enforce every classic Hashi rule, remember the player's preferred challenge category, and offer a small nickname-based leaderboard for qualifying solves. A companion blog post will explain the implementation in incremental steps.

## Scope

The first release includes:

- A new `/hashi` route and Playground navigation entry.
- Four categories: Intro, Daily, Weekly, and Monthly.
- Random, solvable puzzles generated on demand.
- A board-first SVG interface with corridor click targets.
- Timer, undo, reset, new puzzle, and concise rules.
- Automatic island and puzzle-state feedback.
- Local persistence for the preferred category and active puzzle state.
- A top-five SQLite leaderboard per category.
- A nickname prompt only when a completed time qualifies.
- A Markdown build-notes post linked from the game.

Accounts, authentication, strict anti-cheat measures, puzzle sharing, historical challenge calendars, and globally identical puzzles are out of scope. The leaderboard is intentionally playful because each run uses a random puzzle and luck is part of the experience.

## Challenge Categories

The categories differ in board width, island count, branching, and expected solve time:

| Category | Grid target | Intent |
| --- | --- | --- |
| Intro | 15 × 15 | Easy teaching puzzle with fewer islands and forced early moves |
| Daily | 30 × 15 | Challenging, based on the narrower supplied reference |
| Weekly | 35 × 18 | Larger and more interconnected |
| Monthly | 40 × 20 | Widest and densest challenge, based on the wider supplied reference |

These are generator targets rather than guarantees about exact island count. The player may request a new random puzzle at any time. The chosen category is stored in `localStorage` and restored on the next visit.

## Rules and Completion

The engine treats the complete classic Hashi rules as invariants:

1. Islands connect only horizontally or vertically.
2. A bridge connects two distinct, mutually visible islands in the same row or column.
3. A bridge cannot pass through another island.
4. A corridor contains zero, one, or two bridges.
5. Bridges cannot cross other bridges.
6. The number on an island equals the total bridges connected to it.
7. The final graph must be a single connected network, so every island is reachable from every other island.

Local satisfaction and global completion are deliberately separate. A `1—1` pair may satisfy both island counts, but if it forms a disconnected component the puzzle is not solved. If every count matches while the graph remains disconnected, the game stays active and explains that one or more groups are stranded.

Completion is automatic when every island count matches and a graph traversal reaches all islands. There is no separate Done button.

## Puzzle Generation

Generation is solution-first:

1. Place islands on integer grid intersections according to category density and spacing constraints.
2. Build a connected, planar orthogonal graph using only nearest visible neighbors.
3. Assign one or two bridges to selected graph edges while keeping every clue between 1 and 8.
4. Add non-crossing optional edges to increase branching for the harder categories.
5. Derive each island clue from the completed bridge graph.
6. Run the solver against the clue-only puzzle and accept it only when exactly one solution is found.

Generation and uniqueness checks run in a dedicated Web Worker so larger puzzles do not freeze the interface. They use bounded attempts and a time budget. If an attempt fails validation or exceeds the budget, the worker retries with a new seed. A small bundled fallback puzzle exists for each category so the page never becomes unusable.

Every accepted puzzle receives a stable fingerprint derived from its grid size and sorted island coordinates/clues. The fingerprint is persisted with the active game and included with leaderboard submissions for diagnostics, but rankings remain category-wide.

## Interaction Model

The board exposes only legal geometric corridors between mutually visible islands. Each corridor has a visible bridge layer and a much wider transparent SVG stroke used as the pointer and touch target.

Clicking a corridor cycles its state:

`0 bridges → 1 bridge → 2 bridges → 0 bridges`

Keyboard users can focus a corridor and use Enter or Space for the same cycle. Each corridor exposes an accessible label naming its two islands and current bridge count.

The game permits an island to become overfilled so the requested error feedback is meaningful. An overfilled island and its offending incident bridges use a restrained brick-red state. A bridge that would cross an existing bridge is not placed; the attempted corridor receives a brief non-color-only invalid cue. Passing through an island is impossible because such corridors are never generated.

Undo restores the previous bridge state. Reset clears all player bridges after confirmation when progress exists. New puzzle replaces the active puzzle after confirmation when progress exists.

## Visual Design

The approved direction is "Engineering notebook, board first."

- A compact experiment label, headline, one-line instruction, and category tabs precede the board.
- Challenge metadata and the timer sit immediately above the board.
- The board receives the maximum available content width; rules and leaderboard appear below it.
- Large Daily, Weekly, and Monthly boards retain a comfortable minimum cell size and scroll horizontally on narrow viewports rather than shrinking into tiny targets.
- The background uses the site's warm paper neutrals and quiet grid lines.
- Islands are rounded squares with dark ink borders and bold numbers.
- All island centers, grid lines, corridor centerlines, and hit areas derive from the same SVG coordinate system.
- Visible bridges terminate at island borders. Single bridges follow the corridor centerline. Double bridges offset symmetrically around it.
- A satisfied island uses low-opacity muted green. Every incident bridge also reduces opacity when the island is satisfied, allowing completed areas to recede.
- An overfilled island uses a brick-red border and text, supported by a legend and status message so meaning never depends on color alone.
- Motion is limited to short opacity/color transitions and a restrained invalid-corridor pulse. Reduced-motion preferences disable that pulse.

## Client Architecture

The feature is split into small modules:

- `HashiPage.vue`: page composition, category selection, timer, persistence, completion flow, and leaderboard coordination.
- `HashiBoard.vue`: SVG rendering, responsive board sizing, corridor pointer/keyboard events, and accessible labels.
- `HashiControls.vue`: category tabs and undo/reset/new-puzzle actions.
- `HashiLeaderboard.vue`: ranking display, loading/error/empty states, and qualifying nickname dialog.
- `hashi/types.ts`: puzzle, island, corridor, bridge-state, category, and score types.
- `hashi/geometry.ts`: visible-neighbor discovery, bridge endpoints at rounded-square edges, crossing detection, and SVG layout.
- `hashi/rules.ts`: clue totals, satisfaction/overfill state, connectivity, stranded components, and completion.
- `hashi/generator.ts`: seeded solution-first puzzle construction.
- `hashi/solver.ts`: bounded solution counting used by generation validation.
- `hashi/generator.worker.ts`: background generation protocol and retry/fallback coordination.
- `useHashiGame.ts`: state transitions, history, timing, and local persistence.
- `useHashiLeaderboard.ts`: typed leaderboard requests and qualification flow.

Core game logic remains framework-independent and is tested without rendering Vue components.

## State and Persistence

The active client state contains the puzzle definition, bridge counts, category, start timestamp, elapsed time, history, and completion state. A versioned `localStorage` record stores:

- preferred category;
- active random puzzle and its fingerprint;
- current bridge counts;
- timer start/elapsed values.

A corrupted or obsolete record is discarded safely and replaced with a new puzzle. Timer calculations use wall-clock timestamps so leaving the tab does not pause a run. Reset preserves the current puzzle and restarts its timer; New puzzle generates a different puzzle and restarts the timer.

## Leaderboard and API

SQLite adds a `hashi_scores` table with:

- integer primary key;
- category;
- puzzle fingerprint;
- normalized nickname;
- duration in milliseconds;
- creation timestamp.

Indexes support category/time ordering. The API provides:

- `GET /api/hashi/leaderboard?category=<category>&limit=5`
- `POST /api/hashi/scores`

The server validates category values, nickname length/content, positive plausible durations, and fingerprint shape. It returns only the requested top entries ordered by time, then creation time. Because there is no account or server-side solve replay, this is a casual leaderboard rather than a cheat-proof competition.

After a solve, the client fetches the current top five. If fewer than five entries exist or the new time beats the fifth entry, a nickname dialog opens. Submitting publishes the score and refreshes the list. Dismissing discards the score. Non-qualifying solves show the completion result without requesting a nickname.

If the API is unavailable, gameplay and local completion continue normally. The leaderboard displays a quiet retry state and never blocks a new puzzle.

## Content

The page includes a collapsed "How to play" section covering every rule, the three-click corridor cycle, satisfied/overfilled states, and stranded groups. Copy stays concise and links to the full build notes.

The blog post, `notes-from-building-hashi-one-rule-at-a-time.md`, explains:

1. Modeling islands and visible corridors.
2. Rendering exact SVG geometry and generous hit targets.
3. Cycling bridge state and detecting crossings.
4. Separating local clue satisfaction from global graph connectivity.
5. Generating and validating random puzzles.
6. Adding local persistence and the casual leaderboard.

## Error Handling

- Generator retries are bounded and fall back to a known valid puzzle.
- Invalid or stale local state is ignored without breaking the page.
- Crossing attempts do not mutate bridge state and receive clear feedback.
- Leaderboard network errors remain isolated from gameplay.
- Duplicate submissions from a completed local game are prevented client-side.
- Server validation returns specific 4xx errors for malformed score submissions.

## Testing

Frontend unit tests cover:

- nearest visible corridor discovery;
- horizontal and vertical edge-to-edge SVG endpoints;
- symmetric double-bridge offsets;
- bridge crossing detection;
- the `0 → 1 → 2 → 0` state cycle;
- island satisfied and overfilled states;
- the disconnected `1—1` case;
- full-graph completion;
- generator validity and solution uniqueness across representative seeds;
- versioned persistence and corrupt-state recovery;
- leaderboard qualification.

Component tests cover pointer and keyboard corridor activation, status messaging, and completion flow. FastAPI tests cover table initialization, score validation, ranking order, result limits, and category isolation.

The finished feature must pass type checking, frontend tests, backend tests, linting, and a production build. Browser verification covers desktop and narrow mobile layouts, horizontal board scrolling, corridor hit targets, timer behavior, visual states, and the nickname prompt.

## Success Criteria

- `/hashi` is discoverable from the Playground navigation and works without instructions beyond the one-line interaction hint.
- Clicking a corridor reliably cycles zero, one, two, and zero bridges.
- Bridge geometry aligns with the grid and stops at rounded-square island borders in both orientations.
- The UI distinguishes incomplete, satisfied, overfilled, invalid-crossing, stranded, and completed states.
- No puzzle can complete unless all clue counts match and the entire island graph is connected.
- Intro feels approachable; Daily, Weekly, and Monthly feel increasingly large and challenging.
- The player can leave and return without losing the chosen category or active run.
- A qualifying solve can be published under a nickname and appears in the correct category leaderboard.
- The game remains fully playable when the leaderboard service is unavailable.
