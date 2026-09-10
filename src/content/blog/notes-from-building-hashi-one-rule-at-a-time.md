---
title: Notes From Building Hashi One Rule At A Time
date: 2026-09-08
description: What a bridge puzzle taught me about geometry, graph connectivity, and generating constraints backwards.
---

<script setup>
import HashiArticleDemo from '@/components/hashi/HashiArticleDemo.vue'

const visibleCorridorsSnippet = `for each island:
    look north, east, south, and west
    keep only the nearest island in each direction
    add one corridor for each visible pair`

const cycleBridgeSnippet = `next_bridge_count = (current_bridge_count + 1) % 3

0 → 1 → 2 → 0`

const crossingSnippet = `candidate = corridor_the_player_clicked()

if next_count > 0 and crosses_an_active_bridge(candidate):
    reject_the_move()
else:
    apply_the_move()`

const islandStatusSnippet = `total = sum(bridges_touching(island))

if total == island.number:
    state = SATISFIED
else if total > island.number:
    state = OVERFILLED
else:
    state = OPEN`

const connectivitySnippet = `visited = walk_from(first_island, using_active_bridges)

numbers_match = every_island_has_its_number()
connected = visited.size == islands.size

solved = numbers_match and connected`

const generatorSnippet = `solution = build_connected_non_crossing_network()

for each island:
    island.number = sum(solution.bridges_touching(island))

puzzle = remove_the_solution_but_keep_the_numbers()`

const boardBoundsSnippet = `coordinates = [first_edge, ...random_interior, last_edge]

assert min(island.x) == 0
assert max(island.x) == width - 1
assert min(island.y) == 0
assert max(island.y) == height - 1`

const uniquenessSnippet = `solutions = solve(puzzle, stop_after = 2)

if solutions == 1:
    publish(puzzle)
else:
    try_another_random_network()`

const svgSnippet = `center = grid_position * cell_size
island_edge = island_size / 2

bridge.start = first_center + direction * island_edge
bridge.end = second_center - direction * island_edge
nearest_bridge_length = cell_size - island_size
click_target = same_line_with_a_wider_transparent_stroke`
</script>

I have spent an unreasonable amount of time playing [Hashi](/hashi), a puzzle about connecting numbered islands with bridges. It has the dangerous quality of being easy but challenging at the same time.

As (video)games fascinate me, I've always wondered how would I code it.

Hashi is also a particularly nice programming puzzle because its rules arrive in layers. The first rule is local: an island can only see certain neighbors. The next few rules care about one bridge or one island. The final rule suddenly asks whether the entire board is connected. The interface can look like a drawing tool, but underneath it is a graph politely pretending to be a map.

I built it in that order, one rule at a time.

## First, decide which bridges can exist

The board begins as a set of islands. Each island has an `x` position, a `y` position, and a number. There are no arbitrary lines between them. An island may connect only to the nearest visible island in each cardinal direction.

If three islands share a row, the island on the left cannot leap over the middle one to reach the island on the right. Hashi is a bridge puzzle, not an express rail proposal.

So before rendering anything clickable, I compute every legal corridor:

<ProsePre language="text" :code="visibleCorridorsSnippet">
  <ProseCode class="language-text">
{{ visibleCorridorsSnippet }}
  </ProseCode>
</ProsePre>

<HashiArticleDemo kind="visible" />

For each island, I collect the other islands on the same row or column. I split those candidates by direction, sort them by distance, and keep the first one. A pair is stored only once, even though both islands can discover it.

This calculation happens when the puzzle is loaded. The resulting corridor list becomes the shared vocabulary for everything else: drawing bridges, handling clicks, adding totals, checking crossings, solving the puzzle, and generating a new one. If a connection is not in that list, the rest of the application gets to behave as if it has never heard of it.

That is useful because impossible interactions disappear early. The renderer does not need to wonder whether a line passes through an island. The click handler does not need to interpret where the player was vaguely pointing. It receives the ID of a corridor that is already known to be legal.

## One corridor, three states

Each corridor can hold zero, one, or two bridges. Clicking it should add the first bridge, then the second, then clear both. The entire interaction is a tiny state machine:

<ProsePre language="text" :code="cycleBridgeSnippet">
  <ProseCode class="language-text">
{{ cycleBridgeSnippet }}
  </ProseCode>
</ProsePre>

<HashiArticleDemo kind="cycle" />

Modulo arithmetic does all the administrative work. No bridge becomes one, one becomes two, and two wraps back to zero. The current board state is just a map from corridor IDs to those counts.

This runs on every corridor click or keyboard activation. Before changing the count, I save the previous value in a small history stack. Undo then has a wonderfully boring job: take the latest entry and put its old value back. Boring undo code is a luxury. It means the interesting mistakes can remain on the board where they belong.

## Stop crossings before they happen

A legal corridor is not always a legal move. Two corridors may cross in the empty space between four islands, but only one may contain bridges at a time.

The useful moment to check this is just before activating a corridor:

<ProsePre language="text" :code="crossingSnippet">
  <ProseCode class="language-text">
{{ crossingSnippet }}
  </ProseCode>
</ProsePre>

<HashiArticleDemo kind="crossing" />

If the next state is zero, the move is always safe because it removes bridges. If the next state is one or two, I compare the candidate with every active corridor.

The geometry is pleasantly small because every line is horizontal or vertical. Two horizontal corridors cannot cross. Two vertical corridors cannot cross. For a horizontal and a vertical corridor, I only need to ask whether the vertical line's `x` sits strictly between the horizontal endpoints and whether the horizontal line's `y` sits strictly between the vertical endpoints.

“Strictly” is doing useful work there. Corridors that meet at an island share an endpoint; that is a connection, not a crossing. The forbidden case is an intersection in the open space between islands.

I reject the move immediately rather than allowing an invalid bridge and showing an error afterward. Overfilling an island can be useful temporary information, so that remains allowed. Crossing is different: it can never be part of a solution, and letting it onto the board only creates a line the player must remove. The best crossing animation turned out to be no crossing at all.

## Count locally after every move

Every island's number tells you how many bridges must touch it. A `3` might have three single bridges, one single and one double, or another legal combination involving its visible neighbors.

After every accepted move, I sum the active bridge counts for each island:

<ProsePre language="text" :code="islandStatusSnippet">
  <ProseCode class="language-text">
{{ islandStatusSnippet }}
  </ProseCode>
</ProsePre>

<HashiArticleDemo kind="totals" />

This is a continuous feedback check, not a final validation step. When the total matches, the island recedes into a quiet green state. When the total exceeds the clue, it becomes clearly overfilled. Otherwise it stays open.

I deliberately allow overfilling. Suppose a `2` already has one bridge and the player clicks another corridor twice. The board now knows the island has three bridges and can say so. Silently refusing the second click would protect the player from seeing the state they just asked for, which is a peculiar kind of helpfulness.

Satisfied bridges fade along with their islands. This makes the unfinished areas louder without covering the board in badges, checkmarks, or tiny municipal inspectors. The puzzle remains readable as a drawing, and the state change is also described in accessible labels so color is not the only messenger.

## Matching every number is still not enough

This is the rule that makes Hashi more than arithmetic.

Imagine two islands marked `1` connected to each other, with no bridge from that pair to the rest of the board. Both numbers are correct. Locally, they are delighted with their arrangement. Globally, they have seceded.

The finished puzzle must contain one connected network, so completion needs two separate checks:

<ProsePre language="text" :code="connectivitySnippet">
  <ProseCode class="language-text">
{{ connectivitySnippet }}
  </ProseCode>
</ProsePre>

<HashiArticleDemo kind="connectivity" />

The first check repeats the island totals and confirms that every clue matches exactly. Only then does the board need the global question: starting from one island, how many islands can I reach by following active bridges?

I use a straightforward breadth-first walk. Begin with any island, follow every corridor whose bridge count is greater than zero, and collect each island reached. If the visited set contains every island, the network is connected.

This evaluation runs after every accepted move too, because the final bridge should finish the puzzle immediately. Most of the time the local totals fail first. When all totals match but the graph is split, the interface gives the more specific message that some groups are stranded. This catches the technically satisfied `1—1` pair before it can declare independence and issue stamps.

The separation is important. “Every number matches” and “everything is connected” are different facts, so the code keeps them different until the final `and`. That makes the UI explanation precise and the tests much easier to understand.

## Generate the answer, then hide it

Hand-authoring one Hashi puzzle is entertaining. Hand-authoring a new daily, weekly, and monthly puzzle forever is a suspicious career choice.

Randomly placing island numbers does not work well. Most arrangements are impossible, disconnected, or have several solutions. Asking a generator to invent clues first is like scattering house numbers across a field and hoping a sensible town appears.

The more reliable direction is backward:

<ProsePre language="text" :code="generatorSnippet">
  <ProseCode class="language-text">
{{ generatorSnippet }}
  </ProseCode>
</ProsePre>

<HashiArticleDemo kind="generation" />

First I place islands on the grid. From their visible corridors, I build a connected spanning network while refusing crossings. Some selected corridors receive double bridges, and the harder categories get more islands, more optional edges, and more doubles.

Even the empty grid needs a rule. If a puzzle says it has 15 rows, there should be an island in row 1 and another in row 15. Otherwise it is really a 13-row puzzle wearing an oversized coat. The same applies to the first and last columns, so the random coordinate picker always keeps both edges and shuffles only the interior:

<ProsePre language="text" :code="boardBoundsSnippet">
  <ProseCode class="language-text">
{{ boardBoundsSnippet }}
  </ProseCode>
</ProsePre>

Once that hidden network exists, each clue is easy: add the bridge counts touching that island. The answer creates the question. Then I throw away the visible answer and keep the islands with their derived numbers.

This guarantees that at least one solution exists and that it obeys the main rules. It does not guarantee that the solution is unique. A cycle can often redistribute bridges while preserving every island total, which is clever when a player discovers it and less charming when the generator shipped it by accident.

So every candidate puzzle has to sit its own exam:

<ProsePre language="text" :code="uniquenessSnippet">
  <ProseCode class="language-text">
{{ uniquenessSnippet }}
  </ProseCode>
</ProsePre>

<HashiArticleDemo kind="uniqueness" />

The solver tries bridge counts for each corridor, abandoning branches as soon as an island cannot possibly reach its clue or a bridge would cross an active one. It stops after finding two solutions because the difference between two and four hundred is academically interesting but equally fatal to this puzzle.

If it finds exactly one solution, the puzzle is accepted. If it finds none or reaches a second, the generator tries another network. Both generation and solving have time limits, with known fallback boards waiting nearby. A monthly puzzle should be difficult for the player, not for the browser's event loop.

## One coordinate system for everything

My first visual mistake was drawing bridges between island centers and trusting the islands to cover the middle. That can look almost correct while still producing little lines inside the shapes, uneven double bridges, or horizontal and vertical endpoints that disagree about where an island begins.

“Almost correct” is especially visible in a puzzle made almost entirely from straight lines.

The fix was to derive every visual measurement from the same SVG coordinate system:

<ProsePre language="text" :code="svgSnippet">
  <ProseCode class="language-text">
{{ svgSnippet }}
  </ProseCode>
</ProsePre>

<HashiArticleDemo kind="geometry" />

Island centers live on grid coordinates multiplied by a fixed cell size. Bridges begin and end at the island edges, not at their centers and not in the gap a few pixels away. A double bridge uses equal offsets on either side of that centerline. Rounded-square islands sit above all bridge lines, and the grid sits behind everything.

The shortest corridor needs room too. With 40 pixels between neighboring grid points and a 30-pixel island, even two adjacent islands leave a visible 10-pixel bridge. My earlier 38-pixel islands technically left a line, in the same sense that a cupboard gap technically counts as a hallway.

SVG also gives every corridor a second line that the player never sees: a wide transparent stroke used only for clicking and keyboard focus. The visible bridge can stay thin and precise while the hit target remains forgiving. This is particularly important on an empty corridor, where the clickable thing has no visible bridge yet. A collection of absolutely positioned `div` elements could do the job, but SVG lets the drawing and its interactions share the same geometry instead of negotiating through CSS from neighboring countries.

## The rest of the interface

Once the rules and geometry were stable, the remaining interface choices became much smaller.

The board comes first. Instructions, feedback, and build notes follow it rather than pushing the puzzle below a ceremonial landing page. Intro puzzles fit comfortably, while daily, weekly, and monthly boards become progressively wider and scroll horizontally instead of shrinking the islands into aspirin.

Completed islands and their bridges lower their opacity so attention moves toward unfinished work. Overfilled islands stay stronger and warmer. Undo stores corridor changes, reset clears the current board, and local storage keeps the preferred category and active puzzle across refreshes.

Large puzzles are generated in a Web Worker. The page can show a ready fallback immediately, then replace it with the generated puzzle only if the player has not already started interacting. A late worker response is not allowed to erase someone's bridges. Computers are fast, but apparently they still need rules about interrupting people.

That is the whole machine: discover legal corridors, cycle bridge counts, reject crossings, count locally, verify connectivity globally, generate from a hidden answer, and draw every part from one set of coordinates.

[Try the puzzle](/hashi).

Have fun.
