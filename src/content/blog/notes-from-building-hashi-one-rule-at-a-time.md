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

const boardBoundsSnippet = `positions = seed_one_island_on_each_boundary()

while positions.size < category.target:
    candidates = full_grid.filter(not_touching_an_island)
    candidates = candidates.filter(aligned_with_the_network)
    positions.add(least_blocking_random_candidate(candidates))

assert min(island.x) == 0
assert max(island.x) == width - 1
assert min(island.y) == 0
assert max(island.y) == height - 1`

const islandPlacementSnippet = `for each candidate position:
    reject if any of the eight neighboring cells has an island

assert island_count == category.target
assert visible_corridor_graph_is_connected()
assert occupied_rows_and_columns_have_no_large_gaps()`

const clueMixSnippet = `candidate = build_connected_non_crossing_network()
add_a_few_cycles(candidate)
make_about_one_in_five_bridges_double(candidate)

numbers = count_bridges_touching_each_island(candidate)

reject if 1_to_5_are_too_rare(numbers)
reject if 6_and_7_take_over(numbers)
reject if 8_is_not_rare(numbers)
reject if there_are_too_few_obvious_opening_deductions(numbers)`

const openingDeductionSnippet = `edge.maximum = min(2, island.number, neighbor.number)
capacity = sum(incident_edges.maximum)

for each incident edge:
    forced_minimum = island.number - (capacity - edge.maximum)

opening = any(forced_minimum > 0)`

const difficultyConfigSnippet = `daily:   { minimum_openings: 5,  cycles: 13, crossings: 4  }
weekly:  { minimum_openings: 8,  cycles: 22, crossings: 8  }
monthly: { minimum_openings: 12, cycles: 33, crossings: 12 }

double_bridge_share = 0.22`

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

### Density is the difficulty dial

A large board is not automatically a difficult board. Stretch ten islands across twice as much space and the puzzle mostly becomes a longer walk between the same ten decisions. More islands create more corridors, more competing bridge totals, and more places where a local choice changes the rest of the network.

So each category has an explicit island target. The 15×15 intro has 32 islands. Daily is 15×30 with 72 islands, weekly is 18×35 with 108, and monthly is 20×40 with 150. The larger boards grow vertically, while density stops them from becoming empty wallpaper.

Those numbers are deliberately simple rather than scientific. The boards are random and luck remains part of the experience; the targets merely keep each category in the right neighborhood.

<HashiArticleDemo kind="density" />

Even the empty grid needs a rule. If a puzzle says it has 15 rows, there should be an island in row 1 and another in row 15. Otherwise it is really a 13-row puzzle wearing an oversized coat. The same applies to the first and last columns, so the random coordinate picker begins with boundary anchors and grows inward:

<ProsePre language="text" :code="boardBoundsSnippet">
  <ProseCode class="language-text">
{{ boardBoundsSnippet }}
  </ProseCode>
</ProsePre>

Those are official dimensions, but spacing is an editorial choice. Hashi's rules do not forbid neighboring islands. This generator does: as a house rule, every island gets a one-cell moat, covering all eight neighboring cells. It prevents bridge stubs, crowded numbers, and the peculiar waterfront development where twelve islands all move into the same column.

<ProsePre language="text" :code="islandPlacementSnippet">
  <ProseCode class="language-text">
{{ islandPlacementSnippet }}
  </ProseCode>
</ProsePre>

The first version applied that moat to the coordinate system itself, accidentally banning every other row and column. The corrected generator scans the full grid and applies spacing only between actual island pairs. Each new island must align with the growing visibility network, and candidates that leave the most room for future islands are preferred. Literal grid rows may still be empty; that is the one-cell moat doing its job. The invariant is that the occupied area has no accidental empty band at an edge or through the middle. That gives randomness some room without turning the archipelago into graph paper wearing graph paper.

Once that hidden network exists, each clue is easy: add the bridge counts touching that island. The answer creates the question. Then I throw away the visible answer and keep the islands with their derived numbers.

The first version made nearly every bridge double. It was valid, but the resulting board was a wall of `6`, `7`, and `8` islands. Technically Hashi; spiritually a tax form.

The fix was to make the shape and the number mix separate decisions. I start with a spanning tree so every island belongs to one network. Then I add a controlled number of non-crossing edges to create loops and alternative-looking routes. About one bridge in five becomes double. Only after that do I derive the clues and inspect their distribution:

<ProsePre language="text" :code="clueMixSnippet">
  <ProseCode class="language-text">
{{ clueMixSnippet }}
  </ProseCode>
</ProsePre>

<HashiArticleDemo kind="mix" />

The generator keeps a healthy presence of `1` through `5`, allows a smaller group of `6` and `7`, and treats `8` as seasoning rather than soup. Candidates with too few crossings, too few cycles, or too few obvious opening deductions are rejected too. Those openings are the familiar capacity rules: an `8` in the middle, a `6` on an edge, a `5` with only three directions, or any equivalent clue that uses all—or all but one—of its available bridge capacity. This does not scientifically prove that one board will feel harder than another, but it reliably avoids the two boring extremes: a sparse board with nothing to reason about and a carpet of high numbers.

### From valid to interesting

This took a few iterations because “has an answer” and “is enjoyable to solve” are annoyingly different requirements.

The first generator stopped after validity. It produced a connected, non-crossing hidden network, turned its bridge totals into clues, and called it a day. That proves there is at least one answer. It says nothing about whether a human can find a first bridge without staring into the middle distance.

The second version treated density as difficulty. More islands do create more interacting totals, but increasing the island count mostly changes the amount of puzzle. It does not automatically create a useful sequence of deductions. A huge board can still be a huge shrug.

Next came topology. Added cycles make several routes look plausible, and empty corridors that cross other corridors let one confirmed bridge rule out another. Both are useful sources of tension. Too few and the hidden network reads like a tree; too many and every island appears to be negotiating with four neighbors at once. Cycle count and crossing count became separate limits rather than accidental side effects of placing more islands.

Then the wall of `8`s happened. Increasing double bridges created impressive-looking numbers but made many decisions immediate: a middle `8` simply takes two bridges in every direction. The clue histogram therefore became another control. Low numbers provide small local constraints, middle numbers combine with their neighbors, and high numbers are strongest when they appear occasionally. A board can look terrifying and still be mechanically repetitive. Typography is not difficulty, despite what tax forms suggest.

The latest rule checks whether the puzzle offers actual entry points. For an island, every visible corridor has a maximum of two bridges, sometimes reduced by a neighbor that can accept only one. Add those maxima to get the island's total available capacity. Then temporarily remove one corridor's capacity. Whatever part of the clue no longer fits anywhere else is forced onto that corridor:

<ProsePre language="text" :code="openingDeductionSnippet">
  <ProseCode class="language-text">
{{ openingDeductionSnippet }}
  </ProseCode>
</ProsePre>

That one formula contains several familiar Hashi techniques. A middle `8` forces two bridges in four directions. A middle `7` forces at least one in each. Edge `6` and corner `4` are the same full-capacity rule with fewer neighbors; edge `5` and corner `3` are one below full capacity. If a middle `6` faces one island marked `1`, its capacities are `1 + 2 + 2 + 2 = 7`, so each of the other three corridors must carry at least one bridge. A `1` or `2` with only one visible neighbor is the smallest version of exactly the same calculation.

This is useful for generation because it replaces a list of special cases with one measurable property. I count how many islands force at least one corridor before the player has drawn anything, then reject boards below the category's floor:

<ProsePre language="text" :code="difficultyConfigSnippet">
  <ProseCode class="language-text">
{{ difficultyConfigSnippet }}
  </ProseCode>
</ProsePre>

These are independent knobs. Island count controls scale and interaction density. Cycle count controls how many routes can look plausible. Potential crossings create deductions that close other corridors. The double-bridge share shapes the clue distribution. The opening floor controls how many honest first moves the board offers. Raising all of them together would not create a sophisticated puzzle; it would create a crowded puzzle with lots of obvious high numbers.

Daily therefore needs five opening islands, weekly eight, and monthly twelve. The larger number does not make monthly easier: it is spread across 150 islands, alongside more cycles and crossing choices. It simply prevents a large random board from beginning with no sensible handle. Normal generation and timeout recovery now pass through the same checks, so an unlucky deadline still returns a full category-sized puzzle rather than three islands wearing a monthly-puzzle name tag.

There is still an important limit. Counting good openings does not guarantee a complete deduction-only solve. It verifies the first footholds, not the whole climb. The next refinement would run a small deduction engine over each candidate and record deduction waves: capacity forces a bridge, that bridge closes a crossing corridor, the closure completes another island, and so on. A stalled set of unresolved corridors would then be measurable too. That trace could distinguish “many places to start” from “a chain that reaches the end,” and tune weekly or monthly boards by how deep the chain becomes before a contradiction check is needed.

For now I keep that as the next step rather than pretending the random generator already proves it. Luck is still allowed in the room; it just no longer gets to arrange all the furniture.

The intro uses the same idea with fewer islands, no added cycles, and no demand for high clues. The daily, weekly, and monthly puzzles add more islands and loops. Every category is a random, connected, non-crossing construction with a known valid answer, but the puzzle is not required to have only one possible answer. That keeps generation quick and the boards varied; occasionally luck offers a shortcut. For this little game, I like that better than pretending every random board is a tournament artifact.

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

The board comes first. Instructions, feedback, and build notes follow it rather than pushing the puzzle below a ceremonial landing page. Intro puzzles fit comfortably, while daily, weekly, and monthly boards grow downward into portrait shapes instead of turning the page into a railway timetable.

Completed islands and their bridges lower their opacity so attention moves toward unfinished work. Overfilled islands stay stronger and warmer. Save position records one deliberate checkpoint, reset clears the current board, and local storage keeps the preferred category, active puzzle, and checkpoint across refreshes.

Large puzzles are generated in a Web Worker. While it works, the page shows a quiet loading frame instead of pretending that a tiny emergency puzzle is the real thing. If the worker is unavailable, the page generates a full puzzle directly. A late response still cannot erase someone's bridges. Computers are fast, but apparently they still need rules about interrupting people.

That is the whole machine: discover legal corridors, cycle bridge counts, reject crossings, count locally, verify connectivity globally, generate from a hidden answer, and draw every part from one set of coordinates.

[Try the puzzle](/hashi).

Have fun.
