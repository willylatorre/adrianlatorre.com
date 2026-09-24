# Hashi Interaction Polish Design

## Goal

Make routine Hashi interactions feel explicit and dependable without adding visual noise or bringing expensive puzzle evaluation back into pointer movement. This pass covers saved-position feedback, leaderboard hint metadata, section spacing, and ambiguous bridge selection at corridor intersections.

## Saved Position Feedback

The controls expose three distinct states:

- With no saved position, **Save position** is available and **Restore position** is disabled.
- After saving, the save control shows a check icon and **Position saved** for as long as the snapshot exists. Restore remains disabled while the live position matches the snapshot.
- After the player changes the board, the saved indicator remains and **Restore position** becomes enabled.

Restoring a snapshot briefly changes the restore control to a check icon and **Restored**. The persistent saved state remains because restore does not delete the snapshot. Saving again replaces the existing snapshot without confirmation.

Transient labels return to their normal wording after roughly 1.5 seconds. The controls expose the same feedback through a compact `aria-live` status. Feedback must not use a toast, move surrounding controls, or depend on color alone.

The game state exposes both `hasSnapshot` and `canRestoreSnapshot`. `hasSnapshot` distinguishes an absent snapshot from a snapshot that already matches the board; `canRestoreSnapshot` continues to indicate whether restore would change anything.

## Leaderboard Hint Information

Every new score records an integer `hintsUsed` from 0 through 3. The value comes from the game state at completion and is included in the score submission, API models, database row, and leaderboard response.

Ranking remains time-first:

1. Shorter solve duration.
2. Fewer hints when durations are exactly equal.
3. Earlier submission time as the stable final tie-breaker.

Qualification for the visible top five uses the same ordering. Hint count never compensates for a slower time.

Existing database rows predate this field. A nullable `hints_used` column is added through an idempotent startup migration. Historical rows remain `NULL` and render an em dash with the accessible label “Hint usage not recorded.” New rows render a small lightbulb followed by `0`, `1`, `2`, or `3`. The nickname and time remain the visually dominant fields.

## Section Spacing

The collapsed **How to play** section occupies only its trigger row. It must not reserve space for hidden collapsible content. Expanded content retains comfortable reading rhythm.

The page uses a deliberate vertical sequence:

- A generous separation between the board feedback and the rules divider.
- A compact rules trigger row.
- A clear but smaller separation between the rules section and leaderboard.
- Reduced spacing at mobile widths without changing the content order.

The implementation should correct the collapsible wrapper or local layout rule causing the blank area rather than hiding it with a fixed negative margin or fixed section height.

## Bridge Selection At Intersections

The board uses hybrid sticky selection for pointer input.

Outside an intersection hotspot, the corridor under the pointer remains the selected corridor. Inside a small hotspot around a horizontal and vertical corridor crossing, the dominant recent pointer direction selects the axis:

- Predominantly horizontal movement selects the horizontal corridor.
- Predominantly vertical movement selects the vertical corridor.
- Movement below a small threshold keeps the existing selection. If no selection exists yet, proximity to each corridor is the fallback.

Once an axis is selected inside a hotspot, it remains selected until the pointer leaves that hotspot. This prevents flicker when the pointer slows or stops. Clicking uses the sticky selected corridor, not the SVG element that happens to be highest in paint order.

Blocked corridors cannot become the selected click target. If one axis is blocked and the other is viable, the viable corridor wins regardless of pointer direction. Keyboard behavior remains corridor-based and unchanged. Touch input continues to use direct taps without direction inference.

The highlighted projection must match the corridor that a click will change.

## Pointer Performance

Pointer handling must not call the solver, hint engine, crossing evaluator, or visibility graph builder.

When a puzzle changes, the board precomputes a lookup from intersection coordinates to the horizontal and vertical corridor IDs at that point. Runtime pointer work uses:

- One delegated pointer handler for the SVG board.
- At most one update per animation frame.
- A coordinate transform and constant-time intersection lookup.
- A reactive selection update only when the chosen corridor changes.

Click and keyboard events are delegated from the corridor layer where practical, reducing the number of individual event listeners on large Monthly boards. Existing cached topology and board-state calculations remain the source of blocked-corridor flags.

## Failure And Reset Behavior

- Moving a bridge clears transient save or restore confirmation text, but does not remove the saved snapshot indicator.
- Reset and puzzle replacement remove the snapshot and all related feedback.
- A failed score submission retains the pending score and its hint count for retry.
- Missing historical hint information never appears as zero.
- Leaving the board clears pointer selection so no corridor remains visually active.

## Verification

Tests cover:

- Save, changed-after-save, restore, reset, and replacement control states.
- Transient status labels and accessible announcements.
- Hint count submission, storage migration, response serialization, time-first sorting, exact-time hint tie-breaking, and legacy rows.
- Collapsed rules content taking no layout space.
- Horizontal and vertical approach at an intersection, sticky behavior while stationary, blocked-axis fallback, click routing, pointer exit, and unchanged keyboard interaction.
- Pointer handlers avoiding puzzle-rule functions and coalescing repeated movement into one animation-frame update.

The focused Hashi frontend and server tests, TypeScript checks, lint, and production build must pass.
