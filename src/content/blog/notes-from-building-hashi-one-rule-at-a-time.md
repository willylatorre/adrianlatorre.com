---
title: Notes From Building Hashi One Rule At A Time
date: 2026-09-08
description: What a bridge puzzle taught me about geometry, graph connectivity, and generating constraints backwards.
---

<script setup>
import HashiArticleDemo from '@/components/hashi/HashiArticleDemo.vue'

const visibleCorridorsSnippet = `right_side = islands on the same row, farther right
visible_right = nearest island in right_side

if visible_right exists:
    add_pair(current_island, visible_right)

// Do the same looking left, up, and down.`

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

const svgSnippet = `center = grid_position * cell_size
island_edge = island_size / 2

bridge.start = first_center + direction * island_edge
bridge.end = second_center - direction * island_edge
nearest_bridge_length = cell_size - island_size
click_target = same_line_with_a_wider_transparent_stroke`
</script>

I have spent an unreasonable amount of time playing [Hashi](/hashi), a puzzle about connecting numbered islands with bridges. It has the dangerous quality of being easy but challenging at the same time.

As (video)games fascinate me, I've always wondered how I would code one.

Hashi is also a particularly nice programming puzzle because its rules arrive in layers. The first rule is local: an island can only see certain neighbors. The next few rules care about one bridge or one island. The final rule suddenly asks whether the entire board is connected. The interface can look like a drawing tool, but underneath it is a graph politely pretending to be a map.

I built it in that order, one rule at a time.

## Start with what each island can see

Take three islands in one row: left, middle, and right. The left island may connect to the middle one. It may not connect directly to the right one because the middle island is in the way.

That single example defines the first useful piece of the game. From each island, look in four directions: left, right, up, and down. Keep only the first island you meet. Each visible pair is a place where the player might draw zero, one, or two bridges. I call that place a corridor.

Here is the right-facing part of the search:

<ProsePre language="text" :code="visibleCorridorsSnippet">
  <ProseCode class="language-text">
{{ visibleCorridorsSnippet }}
  </ProseCode>
</ProsePre>

<HashiArticleDemo kind="visible" />

The other three directions use the same test. If both islands discover each other, I still store the pair only once.

I do this once when the puzzle loads. The resulting list answers a very plain question: exactly where is the player allowed to click? The same list is then reused to draw bridges, add island totals, check crossings, and solve the puzzle.

The important bit is what never enters the list. In the three-island example, there is no left-to-right corridor, so the renderer cannot draw a bridge through the middle island and the click handler cannot accidentally create one. That impossible move is removed before play begins.

## One corridor, three states

Each corridor can hold zero, one, or two bridges. Clicking it should add the first bridge, then the second, then clear both. The entire interaction is a tiny state machine:

<ProsePre language="text" :code="cycleBridgeSnippet">
  <ProseCode class="language-text">
{{ cycleBridgeSnippet }}
  </ProseCode>
</ProsePre>

<HashiArticleDemo kind="cycle" />

Modulo arithmetic does all the administrative work. No bridge becomes one, one becomes two, and two wraps back to zero. The current board state is just a map from corridor IDs to those counts.

This runs on every corridor click or keyboard activation. Before trying a suspicious chain of bridges, the player can save the whole bridge map as a position. Restore simply swaps the current map for that saved copy. Saving again replaces it. One deliberate checkpoint is more useful here than walking backward through twenty individually sensible clicks.

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

First I place islands on the grid. From their visible corridors, I build a connected spanning network while refusing crossings.

Once that hidden network exists, each clue is easy: add the bridge counts touching that island. The answer creates the question. Then I throw away the visible answer and keep the islands with their derived numbers.

This proves there is at least one valid answer. It does not prove that the answer is unique, that the board feels natural, or that finding the answer is enjoyable. The first version stopped at that lower bar. I came back to the difference in [a follow-up about a Hashi game that technically worked](/blog/notes-from-a-hashi-game-that-technically-worked).

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

The board comes first. Instructions, feedback, and build notes follow it rather than pushing the puzzle below a ceremonial landing page. Intro puzzles fit comfortably, while the larger boards scroll to leave enough room for the islands and their click targets.

Completed islands and their bridges lower their opacity so attention moves toward unfinished work. Overfilled islands stay stronger and warmer. Save position records one deliberate checkpoint, reset clears the current board, and local storage keeps the preferred category, active puzzle, and checkpoint across refreshes.

Large puzzles are generated in a Web Worker. While it works, the page shows a quiet loading frame instead of pretending that a tiny emergency puzzle is the real thing. If the worker is unavailable, the page generates a full puzzle directly. A late response still cannot erase someone's bridges. Computers are fast, but apparently they still need rules about interrupting people.

That is the whole machine: discover legal corridors, cycle bridge counts, reject crossings, count locally, verify connectivity globally, generate from a hidden answer, and draw every part from one set of coordinates.

[Try the puzzle](/hashi), or [read what happened when I compared it with one I actually enjoyed playing](/blog/notes-from-a-hashi-game-that-technically-worked).

Have fun.
