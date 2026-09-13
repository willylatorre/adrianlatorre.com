---
title: Notes From A Hashi Game That Technically Worked
date: 2026-09-13
description: The tests passed, the bridges connected, and the puzzles still felt wrong. A second round of building Hashi, this time with a less cooperative definition of working.
---

In [the first Hashi article](/blog/notes-from-building-hashi-one-rule-at-a-time), I built a game one rule at a time. Islands could see their neighbors. Bridges could not cross. Numbers had to match. Everything had to belong to one connected network.

It worked.

Then I spent some time looking at the puzzles it produced, next to the ones I actually enjoyed playing on [Puzzle Bridges](https://www.puzzle-bridges.com/?size=13).

Ours looked as though the islands had been allocated plots by a very organized council. Repeated columns. Regular gaps. Little rectangular neighborhoods. The other board was dense and staggered, with short connections beside long ones and islands appearing in places ours seemed unwilling to visit.

The bridges were legal. The numbers added up. The generator had passed its tests.

I would still rather have played the other puzzle.

## The tests were answering the questions I had asked

There was no mysterious failure hiding behind the screenshots. The generator was doing quite a good job of satisfying a bad description of what I wanted.

An earlier version could leave whole areas empty, so I had added checks for coverage. Reach every boundary. Use enough rows and columns. Keep every part of the grid reasonably close to an island. Give each category a respectable number of islands.

Each check addressed something I had actually seen go wrong. Together, they sounded reassuringly close to a specification for a good board.

But “uses most columns” says nothing about how those columns repeat. “No large empty areas” does not mean the occupied areas are interesting. A board can satisfy both while looking like an apartment building with several tenants missing.

The tests were not lying. I had asked them whether the board was populated, and then treated their answer as evidence that it was well composed.

That distinction is easy to miss when the thing you are building has formal rules. Correctness feels unusually available. You can write down the conditions, automate the checks, and watch the green marks accumulate. Eventually it becomes tempting to let those marks answer questions they have never been asked.

## My spacing rule had removed the interesting places

One of the culprits was a decision I had been quite confident about: every island got a one-cell moat.

I wanted enough room to draw bridges and read the numbers. So a candidate position was rejected if any of its eight neighboring cells already contained an island.

That includes diagonals.

An island one cell across and one cell down does not shorten a bridge. The two islands are not on the same row or column; no bridge can connect them directly anyway. But I had excluded that arrangement along with genuinely cramped horizontal and vertical neighbors.

Those diagonal neighbors were everywhere in the reference board. They let consecutive rows shift sideways, breaking up the repeated columns without abandoning the underlying grid.

My rule had removed exactly the positions that could make the board feel less regimented. Then I had spent several iterations adjusting scores to persuade the remaining positions to look random.

There is probably a general lesson in trying to tune your way around something you have explicitly forbidden.

The new placement rule still leaves space between islands on the same row or column. Diagonal neighbors are allowed. The larger boards also have more islands for their area: the monthly board now has 280 islands on a 30×30 grid, roughly nine per row on average. Individual rows vary. They are allowed to have different plans for the afternoon.

That density helps, but the important change is where those islands are allowed to go.

## Randomness was losing every vote

The spacing rule was only part of it.

The old placement score strongly rewarded covering empty space, reaching boundaries, and forming useful connections. Randomness mostly settled ties after those preferences had made the important decisions.

I had added a random number to a process whose priorities were overwhelmingly deterministic. Predictably, the result looked overwhelmingly deterministic.

There was another problem during growth. Each new island connected to every available neighbor that could join without a crossing. That sounds helpful: more connections, more possibilities. In practice, it built rectangular enclosures early. Later islands had to fit around decisions the generator had already made.

The replacement grows a connected backbone first. It chooses positions through weighted randomness, with a preference for unused lines and a mixture of bridge lengths. If a new island lands on a planned bridge, that bridge becomes two shorter ones. Extra connections and loops come afterward, once the islands have had room to spread.

There are still constraints. This is a bridge puzzle, not a bag of confetti. The board has to remain connected, fit its dimensions, and leave room for legal bridges. But those constraints no longer choose nearly every placement in advance.

I kept the coverage checks because empty deserts are still unhelpful. I stopped asking the coverage score to design the entire coastline.

## More puzzle is not more difficult puzzle

While this was taking shape, another question interrupted the comfortable progress of the implementation: how was I going to handle difficulty?

Adding islands was not a sufficient answer.

A larger board can take longer simply because there is more clicking and more space to inspect. That is length. It may contain exactly the same small deduction repeated thirty times.

I had tried several other convenient measurements. More loops. More potential crossings. A carefully managed mixture of clue numbers. A minimum number of obvious opening moves.

These affect a puzzle, but none of them tells me what solving it is like.

An `8` looks impressive until you notice that it fills every available direction immediately. A low-numbered island can be much more troublesome because its few bridges have several plausible destinations. Ten places to start do not guarantee that any of those starts leads somewhere useful.

The clue histogram was particularly seductive. It gave me numbers I could adjust and tests I could write. Unfortunately, a balanced distribution of numbers is not the same thing as a satisfying sequence of decisions.

I removed those distribution targets. Keeping them would have meant continuing to optimize an answer sheet's appearance while claiming to measure the experience of finding it.

## Let the generator try to play

The hint system provided a better starting point.

It already knew how to explain a forced bridge: an island's other corridors cannot hold enough, an existing bridge closes a crossing route, or a connected group has only one exit left. It could also test a limited assumption and show that it led to a contradiction.

Crucially, it worked from the current board. It did not consult the hidden network used to generate the clues.

So the new generator asks that system to start from a blank board and keep going. Apply a provable move. Record which rule found it. Ask for the next move. Continue until the puzzle is solved or the logic stalls.

That is a much more relevant question than how many `6`s the board contains.

It also immediately embarrassed the category labels. One small Intro sample needed two contradiction deductions to finish. Thirty islands had made it short, but had not made it introductory.

Intro now has to finish through direct capacity, only-route, and crossing deductions. Daily can require connectivity or contradiction reasoning. Weekly and Monthly require a higher proportion of contradiction steps in the recorded solve. The proportion matters: doubling the length of an easy sequence should not promote it to hard.

Weekly and Monthly deliberately share the same reasoning tier. Monthly has more puzzle to work through. I do not want its larger dimensions quietly doing a second job as evidence of greater sophistication.

## A known answer was another low bar

The first generator built an answer and derived the clues from it. That guarantees at least one solution. It does not guarantee only one.

I had accepted that trade-off before. But once I started trying to shape a particular reasoning experience, allowing another answer made the intended experience even less meaningful.

There is now a separate exact solver checking for a second solution. It narrows bridge counts using island capacities, crossing restrictions, and connectivity, then searches the remaining choices when necessary.

If it finds ambiguity, the generator can adjust a bridge in the hidden network and derive the clues again, provided the network remains valid and connected. If it cannot establish uniqueness within its limits, the candidate is rejected.

The logical solve and the uniqueness check answer different questions. One asks whether the available explanation rules can take a player from a blank board to the end. The other asks whether another legal answer exists. Neither gets to stand in for the other.

There is also a time budget. A beautifully conscientious generator that leaves the page waiting indefinitely is another form of technically working. When the budget expires, the game selects from a small pool of distinct boards that have already passed both checks and their difficulty grade.

Those boards can repeat. That is a real limitation, rather than something a loading indicator makes disappear.

## What the new checks still cannot tell me

The new difficulty grade is still a heuristic.

It follows one deterministic order of deductions. It counts the rules used and how often the more advanced ones appear. It does not yet measure how hard a useful move is to notice, how much a player has to remember, or how deep a particular chain feels when you are following it without a computer's patience.

Even a contradiction check can range from obvious to unpleasant. Counting both as one step is useful bookkeeping, but it is not a complete account of difficulty.

The thresholds need playtesting. They need comparison with puzzles whose difficulty people already agree on. Passing the new tests means the generator meets a better set of conditions than before. It still does not mean I would choose every board it produces over the reference game.

That is the reality check I wanted to keep from this round of building.

The first version taught me how to implement Hashi's rules. The next versions taught me how easily I could mistake my own convenient measurements for the thing I was trying to make. Every correction had a sensible explanation. Several of those explanations survived much longer than they should have because the code behaved exactly as instructed.

Looking at the boards side by side was useful. Playing them was more useful. Asking why I preferred one made the work less tidy and the specification much better.

[The puzzle is still here](/hashi). It has a better generator now. Whether it has become a better game is a question I need to keep answering with something other than the test runner.
