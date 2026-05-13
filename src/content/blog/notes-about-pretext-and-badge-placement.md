---
title: Notes About Pretext And Badge Placement
date: 2026-05-13
description: A practical note on measuring badge overflow without asking the DOM to do a rehearsal.
---

I have been thinking about one of those tiny UI problems that looks too small to deserve much attention, right up until it is sitting above the most important input in the product and making everything feel slightly heavier than it should.

The problem was badge placement.

In this case the badges lived above a chat input. They represented the context attached to the conversation: a customer, a company, a file, a ticket, a project, a workflow, whatever the user had pulled into the thread. When there are two or three of them, the component is barely a component. You render a few rounded chips and move on with your life.

Then someone selects sixty things.

Now the row has a real job. It needs to show as many badges as fit on a single line, keep the input calm, and collapse the rest behind a `+N more` dropdown. The user should not have to know that anything interesting happened. They should just see the right badges, the right overflow count, and no weird layout shiver while the app figures itself out.

That is the part I care about. Not because badges are precious, but because chat inputs are latency-sensitive in a very human way. When people add context to a conversation, they expect the surface to keep up. Any delay there feels personal, like the product briefly forgot what it was doing.

## The DOM measurement trap

The obvious way to solve this is also the way I have reached for many times: render all of the badges in a hidden row, measure them, decide how many fit, and then render the visible row.

It usually starts as something harmless:

```tsx
function BadgeRow({ badges }) {
  const measurements = measureHiddenBadgesSomehow(badges)
  const visibleCount = computeVisibleCount(measurements)

  return (
    <>
      <HiddenMeasurementRow badges={badges} />
      <VisibleBadgeRow badges={badges.slice(0, visibleCount)} />
    </>
  )
}
```

This works in the same way that carrying groceries by balancing every bag on your head technically works. The browser is very good at telling us how big rendered things are, so it is tempting to use it as the measuring tool for everything.

But the cost is in the shape of the work. To know which badges should exist, we first create badges that should not exist. We put them somewhere hidden, ask for `getBoundingClientRect()` or `offsetWidth`, and then make the real rendering decision after the browser has done layout for a row the user will never see.

For a tiny list, fine. For a chat input that can update often, resize with sidebars, and receive dozens of context entities, it starts to feel like the component is making the browser rehearse before every performance.

The annoying parts are familiar: every badge can be rendered twice, hidden DOM nodes still need to be laid out, layout reads can become synchronous checkpoints, and every resize means the hidden measuring tape has to come back out. None of those costs is catastrophic alone. Together, they are exactly the kind of little tax that makes an interface feel less immediate.

## The better question

What changed the shape of the problem for me was asking a slightly different question. Instead of “how do I measure these hidden DOM nodes more efficiently?”, the useful question became “do I need DOM nodes to answer this at all?”

A badge is not an unknowable object. It has a pretty boring structure:

```text
[optional icon] [label text]
```

Most of the badge is fixed by the design system. The padding is known. The icon width is known. The gap between badges is known. The overflow trigger has a predictable shape. The only part with real variability is the label text.

So the badge placement problem becomes less mystical. It is not “render a second UI and interrogate the browser.” It is “measure a string, add the badge chrome, and run a fit calculation.”

That is where [Pretext](https://github.com/chenglou/pretext) fits nicely.

Pretext is Cheng Lou’s JavaScript and TypeScript library for text measurement and layout. The important thing, at least for this use case, is that it lets you measure text without going through DOM layout APIs like `getBoundingClientRect` or `offsetHeight`. Instead of creating elements just to ask how wide their text is, you can use the browser’s Canvas-backed font measurement path and keep the decision in application code.

Cheng talks about the broader reason this matters in the video below. Text measurement is not just a typography detail; it sits underneath wrapping, anchoring, virtualization, overflow, and a surprising amount of “why did this UI jump?” work. If the primitive for knowing text size requires waking up layout every time, a lot of advanced UI starts from a slow place.

<div class="video-embed">
  <iframe
    src="https://www.youtube-nocookie.com/embed/CUAuy5SWJcw"
    title="Cheng Lou video on the importance of text measurement"
    loading="lazy"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
  ></iframe>
</div>

If the embed does not load, the video is also available [directly on YouTube](https://www.youtube.com/watch?v=CUAuy5SWJcw).

I like this framing because it moves text measurement out of the category of “micro-optimization” and into the category of “better primitive.” The goal is not to win a benchmark for one chip row. The goal is to avoid making layout part of the control flow when the information we need can be calculated before the DOM exists.

## Measuring the badge, not the row

For the badge row, the measurement code can stay very small. The badge label is shortened the same way the UI shortens it, Pretext measures the natural width of that display label, and the component adds the fixed width around it.

```js
import { measureNaturalWidth, prepareWithSegments } from '@chenglou/pretext'

const BADGE_FONT = '11px system-ui, -apple-system, sans-serif'
const BADGE_PADDING = 16
const BADGE_ICON_WIDTH = 18

function measureBadgeWidth(badge) {
  const displayLabel = shortenName(badge.label)
  const prepared = prepareWithSegments(displayLabel, BADGE_FONT)
  const textWidth = measureNaturalWidth(prepared)
  const iconWidth = badge.icon ? BADGE_ICON_WIDTH : 0

  return Math.ceil(textWidth + BADGE_PADDING + iconWidth)
}
```

The specific numbers are not the interesting part. In a real component they should come from, or at least sit very close to, the same design constants that style the badge. What matters is that the badge has been reduced to something the program can reason about before rendering:

```text
badge width = measured label width + known badge chrome
```

That one shift removes the hidden measurement row entirely. There is no fake render, no invisible badges, and no layout read just to decide what the first visible render should contain.

## Placing the badges

Once the badges are numbers, the overflow logic is pleasantly boring. Walk the list, keep a running width, and stop when the next badge would leave no room for the `+N more` control.

```js
function computeVisibleCount(badges, badgeWidths, containerWidth) {
  let usedWidth = 0

  for (let i = 0; i < badges.length; i++) {
    const badgeGap = i > 0 ? GAP : 0
    const nextUsed = usedWidth + badgeGap + badgeWidths[i]
    const remaining = badges.length - (i + 1)
    const moreSpace = remaining > 0 ? GAP + MORE_CHIP_WIDTH : 0

    if (nextUsed + moreSpace > containerWidth) {
      return Math.max(1, i)
    }

    usedWidth = nextUsed
  }

  return badges.length
}
```

The loop is asking one question over and over: if this badge becomes visible, can the row still afford the overflow chip for everything that remains? The moment the answer is no, we stop.

I like algorithms like this in UI code because there is almost nothing theatrical about them. No second tree. No measuring pass. No “render, ask, render again” choreography. It is just a list of widths and a container size.

The container size is the one thing we still need from the page, and that is a perfectly reasonable job for `ResizeObserver`.

```js
const observer = new ResizeObserver(([entry]) => {
  setContainerWidth(entry.contentRect.width)
})

observer.observe(containerElement)
```

When the container changes because the viewport moved, a sidebar opened, or a split pane was dragged, the component can rerun the fit calculation with cached badge widths. That distinction is the whole win: badge text changes require text measurement, but container width changes only require arithmetic.

For a responsive UI, that matters a lot. Resize is not an edge case anymore. Modern product screens are full of drawers, panels, assistants, command palettes, and adjustable regions. A component that recalculates overflow should not need to recreate a private measurement universe every time the available width changes.

## The shape of the tradeoff

The hidden-DOM version and the Pretext version are both technically O(n), but they are not doing the same kind of work.

With hidden DOM measurement, the component pays for a second representation of the row. On first render, it creates measurement elements, waits for layout information, and then renders the row the user actually sees. On resize, it has to ask layout about those measurement elements again.

With Pretext, the expensive part is measuring the text labels, and that can be memoized against the badge list. Resizing the container becomes a much cheaper path: reuse the widths and rerun the placement loop.

The tradeoff is that the component now owns some layout knowledge. The font string passed to Pretext has to match the CSS font used by the badge. Padding, icon width, gaps, and overflow chip width have to stay honest. If the design changes from `11px system-ui` to `12px Inter`, the measurement constants need to move with it.

That is not free, but it is a trade I am usually happy to make for components on the interaction path. The browser remains the source of truth for actual rendering; the application just stops using hidden DOM as a calculator for a shape it already understands.

There are also the usual details that can create small drift: letter spacing, font features, icon sizing, text transforms, and anything else that changes the rendered width without being reflected in the measurement code. For short badge labels, a pixel or two of slack is usually enough. For more precise layouts, I would rather make the calculation conservative than let a badge flirt with the edge of the container.

## Why this matters

The thing I like about this example is that it is not really about badges. Badges are just small enough to make the pattern obvious.

A lot of frontend code uses the DOM as an oracle because it is accurate and always there. Render something invisibly, ask how big it is, then render the real thing. Sometimes that is the right call. Sometimes it quietly puts layout on the critical path of an interaction that should have stayed boring.

A chat input is one of the places where I want boring. When a user attaches context, removes it, switches conversations, opens a sidebar, or resizes the window, I do not want the input waiting for a hidden row of chips to finish its audition.

Pretext gives this little badge component a better primitive. Measure the text without DOM, add the known badge chrome, compute overflow, and render the row once.

The result is not dramatic. Nobody screenshots it. The badges just appear in the right place, the overflow count is correct, and resizing does not feel haunted.

That is usually my favorite kind of performance work: the user never learns what almost went wrong.

## References

- [Pretext by Cheng Lou](https://github.com/chenglou/pretext)
- [Cheng Lou video on the importance of text measurement](https://www.youtube.com/watch?v=CUAuy5SWJcw)
