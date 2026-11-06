---
title: Notes From A Game About Big Numbers
date: 2026-11-06
description: I built a token clicker to find out what actually breaks when a game counts to 999,999,999,999,999,999. The answer was mostly JavaScript, and partly me.
---

<script setup>
import BlogCallout from '@/components/blog/BlogCallout.vue'

const floatSnippet = `const goal = 999999999999999999

console.log(goal === 1e18)      // true
console.log(goal + 1 === goal)  // true

// The gap between two representable numbers near 1e18 is 256,
// so counting by one stops working long before the game ends.`

const microSnippet = `const MICRO_PER_TOKEN = 1_000_000n

// A rate of 0.5 tokens per second is not a fraction in the engine.
// It is 500,000 micro-tokens per second, which is an integer.
const rate = 500_000n
const earnedLastSecond = rate * 1_000n / 1_000n`

const costSnippet = `const base = 30n * MICRO_PER_TOKEN      // 30 tokens
const growth = 115n                      // 1.15 as an exact fraction
const denominator = 100n

function costAt(owned) {
  let numerator = base
  let divisor = 1n
  for (let i = 0; i < owned; i++) {
    numerator *= growth
    divisor *= denominator
  }
  return numerator / divisor
}`

const saveSnippet = `{
  "version": 1,
  "savedAt": 1762430400000,
  "tokens": "12345000000",
  "lifetimeTokens": "98765000000",
  "producers": { "autocomplete": 7, "chat": 2 },
  "upgrades": ["batching", "caching"],
  "wonAt": null
}`

const bigintJsonSnippet = `JSON.stringify({ tokens: 1n })
// TypeError: Do not know how to serialize a BigInt

JSON.stringify({ tokens: 1n.toString() })
// '{"tokens":"1"}'`

const offlineSnippet = `const CAP = 8 * 60 * 60 * 1000

function offlineElapsed(savedAt, now) {
  if (now <= savedAt) return 0
  return Math.min(now - savedAt, CAP)
}

// Pay it through the same tick() the live loop uses.
// Offline time must not get its own economy.`

const channelSnippet = `const channel = new BroadcastChannel('adrianlatorre.token-eater.v1')

// After every committed save:
channel.postMessage({ type: 'save', savedAt, state })

// In the other tab, adopt only saves that are meaningfully newer,
// so two open tabs cannot ping-pong writes at each other.`
</script>

I wanted to build a clicker for the same reason I wanted to build the bridge puzzle: incremental games look trivial from outside and are strange from inside. The loop is one button and a number. The number goes up. That is the whole promise.

Then you look at what happens when the number goes up a lot.

This one has a specific target. You consume tokens, you buy the machinery that consumes tokens for you, and you stop at **999,999,999,999,999,999**. That is one short of a quintillion. It is also, accidentally, a perfect stress test for the arithmetic underneath, because it is a number JavaScript cannot store exactly.

Here is what actually broke, and what I did about it.

<BlogCallout title="Try it">
<p><RouterLink to="/token-eater">Play Token Eater</RouterLink>. It saves locally, so you can leave and come back.</p>
</BlogCallout>

## The number that does not exist

Most tutorials about money in JavaScript tell you to avoid floats for cents. That advice is about rounding. This problem is coarser than rounding.

A JavaScript `number` is an IEEE-754 double. It can represent integers exactly up to 9,007,199,254,740,991. Past that, the spacing between representable values widens. Near 10^18 the gap is 256.

<ProsePre language="javascript" :code="floatSnippet">
  <ProseCode class="language-javascript">
{{ floatSnippet }}
  </ProseCode>
</ProsePre>

So the literal `999999999999999999` is not that number. It is the nearest double, which is `1e18`. And once you are there, `n + 1` does nothing. A game that adds one token per click would silently stop counting.

This is not a hypothetical. It is the first test in the suite, because if that assertion ever starts passing, someone has quietly changed the goal to something a double can hold, and the article is lying.

The fix is `bigint`. Every currency value in the engine, every price, every lifetime total, and the win condition itself are `bigint`. It is the only type that can count to that number exactly.

## Half a token per second

`bigint` solves integers and creates a new problem immediately: the first producer earns **0.5 tokens per second**.

You cannot add 0.5 to an integer without either drifting into floats or losing the fraction. The standard clicker solution is a tick that adds `rate * delta` as a float and rounds for display. That works, and it also means the number you show and the number you store are two different things that slowly disagree.

I did not want that, because the entire point of this experiment is to keep the number honest.

Instead the engine stores **micro-tokens**. One token is one million micro-tokens. A rate of 0.5 per second is 500,000 micro-tokens per second, which is an integer. Rendering divides by a million at the very last moment.

<ProsePre language="javascript" :code="microSnippet">
  <ProseCode class="language-javascript">
{{ microSnippet }}
  </ProseCode>
</ProsePre>

The nice property is that the same integer arithmetic powers the live loop, the offline payout, and the save file. There is one representation and one path that mutates it. What you see is what is stored, scaled by a constant.

The unglamorous cost is discipline at the boundary. Anywhere a designer wants to write `0.5`, the code has to convert once, at module load, and never let the float back in. That conversion is a single function, and the balance tests fail loudly if a rate ever sneaks through unrounded.

## Prices that stay exact

The second place floats creep in is the price curve. Each unit of a producer costs 15% more than the previous one. The obvious code is `base * Math.pow(1.15, owned)`.

By the fiftieth purchase that float is carrying rounding error, and the error compounds every time the price is recomputed. For a game about exact numbers, that felt like the wrong kind of authenticity.

So the growth is written as an exact rational: 115 over 100. The price is `base * 115^n / 100^n`, computed in integers.

<ProsePre language="javascript" :code="costSnippet">
  <ProseCode class="language-javascript">
{{ costSnippet }}
  </ProseCode>
</ProsePre>

It is slower than `Math.pow` and it does not matter. A player buys a producer a few hundred times in a session; a loop of a few hundred integer multiplications is invisible, and the price never drifts.

## Designing a curve that ends

The design constraint that shaped everything else: **it has to end.**

Most incremental games are deliberately endless. The number goes up forever and the pleasure is the curve. That is a good design, and it is also why so many of them feel like a treadmill with a progress bar. For a playground experiment I wanted a run with a beginning, a middle, and a finish line, so the visitor can see the whole shape in one sitting.

That meant balance work, and balance work is mostly simulation, not taste.

Three things control the arc:

- **Producer tiers.** Twelve of them, priced roughly 26x apart and producing roughly 22x more. Each new tier is a real step, but the gap between tiers stays visible instead of collapsing.
- **Global multipliers.** Eleven one-time upgrades that double everything. These are the "powerups along the way": they arrive by price, not by menu, and each one is a visible jump.
- **The endgame.** The last tier and the final upgrade are deliberately expensive. Without that, the compounding from cheap upgrades flattens the entire curve into ten minutes.

Getting that last point right took more attempts than I expected. My first versions finished in six minutes because the upgrades were so cheap relative to income that a player could buy every multiplier almost immediately, and every multiplier compounds. The fix was not a smarter player model. It was making late content genuinely expensive, so the curve has a long tail instead of a cliff.

The suite replays a greedy bot against the real catalog. With the new intern, the model finishes in about 10 minutes for an engaged player (2 clicks/s plus powerups), 14 for a casual player (0.5 clicks/s plus powerups), and 26 for a low-input run (0.2 clicks/s, no powerups). These are pacing checks, not promises about a human playthrough.

That last one is a design rule, not a coincidence. Powerups should be a convenience, not a subscription to notifications. If the game cannot be finished without them, it is not a game, it is a schedule.

## Powerups with a reason to exist

The brief asked for powerups along the way, so each one is a real inference technique rather than a generic boost:

- **Cache hit** pays out 30 seconds of production.
- **Batch window** pays three minutes.
- **Overclock** triples production for 20 seconds.
- **Test-time compute** multiplies by ten for 10 seconds.
- **Distillation run** pays fifteen minutes, on a ten minute cooldown.

The instant powerups pay a multiple of your _current_ rate, so they scale with you and never become useless. The multipliers are short and strong, which makes them a decision about timing rather than a button you hold down.

The clicking itself is also a producer. A click earns at least one token and at least 1% of your passive rate, multiplied by five click upgrades. Early on that is the fastest way out of the tutorial. Late in the run it is a rounding error, which is the joke the copy is making.

The first automation is deliberately tiny: for ten tokens, hire an **unsupervised intern** who clicks the button once every second. Hire more interns to add more clicks per second; each new hire gets a 10× raise. That is the moment the game stops being only a clicker and becomes an incremental game. It also makes the loop legible: click ten times, hire the intern, then watch the number move on its own. The intern's partial interval is saved too, so a tab closing at nine-tenths of a second does not make them forget the job.

## Saving a number nobody stores

This is where I expected the trouble, and it delivered.

Three separate problems, in order of how quickly they bite:

**1. `JSON.stringify` refuses BigInt.**

<ProsePre language="javascript" :code="bigintJsonSnippet">
  <ProseCode class="language-javascript">
{{ bigintJsonSnippet }}
  </ProseCode>
</ProsePre>

Every currency field therefore serializes as a decimal string. The save is plain JSON you can read in DevTools, and the parser accepts only plain non-negative integer strings. No exponents, no decimal points, no signs. `"1e18"` is rejected rather than silently parsed, because an exponent is exactly the kind of thing that looks fine and is not.

<ProsePre language="json" :code="saveSnippet">
  <ProseCode class="language-json">
{{ saveSnippet }}
  </ProseCode>
</ProsePre>

The record is versioned. An unknown version is discarded rather than guessed at, which is the only safe move when the shape might have changed.

**2. A corrupted save must not become a cheat.**

Parsing validates far more than the JSON shape. Negative balances are rejected. A spendable balance larger than lifetime earnings is repaired, because money cannot exceed everything ever earned. Unknown producer ids are dropped. An absurd producer count is capped.

This is not security. Anyone can edit `localStorage`. It is robustness: a hand-edited or partially written save should produce a boring fallback, not a broken page or a NaN that poisons every price.

**3. Time passes while the tab is closed.**

Offline progress is a feature. Unbounded offline progress is a way to skip the game.

<ProsePre language="javascript" :code="offlineSnippet">
  <ProseCode class="language-javascript">
{{ offlineSnippet }}
  </ProseCode>
</ProsePre>

The important detail is that offline time runs through the **same** `tick` as the live loop. It would have been easy and wrong to invent a separate offline formula; then the two economies drift and the save becomes a source of numbers the simulation cannot reproduce.

The cap is eight hours. Return after a week and you get eight hours of production, not a shortcut to the end. Returning after two hours, which I tested with a seeded save, pays the rate you left with for exactly the elapsed time and shows it in a dialog. That dialog is the only modal in the experiment, and it exists because silent offline money is confusing.

## Two tabs, one truth

The last thing a local-only game needs is a story about concurrency, but open the page twice and you have one.

Two tabs each advance their own clock, each write their own save, and last write wins. That is survivable but unpleasant: the tab with the older state can overwrite the newer one, and the player watches their balance go backwards.

The fix is a `BroadcastChannel`. Every committed save is broadcast with its timestamp, and another tab adopts it only when it is meaningfully newer.

<ProsePre language="javascript" :code="channelSnippet">
  <ProseCode class="language-javascript">
{{ channelSnippet }}
  </ProseCode>
</ProsePre>

The "meaningfully newer" threshold matters. Without it, two tabs push each other back and forth a few milliseconds apart and neither settles. With it, the newest state wins and the other tab simply adopts it.

I considered a stricter model, where one tab elects itself leader through the Web Locks API and owns the tick loop. It is the correct answer for a real product. For a playground it was more machinery than the problem deserved, so I documented the tradeoff instead of building it.

## What the numbers taught me

The math was the least interesting part, which surprised me.

`bigint` is not hard. Exact fractions are not hard. Versioned saves are not hard. What took the time was the shape: how large the numbers get, how fast, and when the player should feel a step change rather than a slope. That is a design problem wearing an arithmetic costume.

The second lesson is that a save file is a contract with your future self. Every field you write is a field you will have to migrate, validate, or explain. Keeping it flat, versioned, and string-heavy made it boring, and boring is what you want from the thing that holds a player's entire run.

The third is that "local only" is not a limitation, it is a design position. There is no account, no leaderboard, no server, and no anti-cheat, because there is nothing to cheat at. The game is a conversation between the player and a curve. `localStorage`, an eight hour offline cap, and a broadcast channel are enough to make that conversation survive a closed tab and a second window.

And the goal being one short of a round number is still the most realistic part of it.

<BlogCallout title="If you want to read the code">
<p>
The engine, the save layer, and the number primitives live in
<code>src/features/token-eater/</code>. The balance suite replays a bot against the real catalog,
so changing the curve without re-checking the pacing fails the tests.
</p>
</BlogCallout>
