---
title: Notes About Performant Sidebars
date: 2026-05-08
description: A practical note on making sidebars feel instant without turning the browser into soup.
---

Sidebars look harmless until they are not.

At first it is just a panel. Maybe it has a search view, a preview, a chat, a workflow helper, a dashboard, or some other small universe living on the right side of the page. You add a toggle, slide it in, slide it out, and move on with your life.

Then someone opens DevTools with CPU throttling enabled and the illusion collapses like a cheap camping chair.

The tricky part is that a good sidebar has several jobs that fight each other:

- it should open quickly
- it should close smoothly
- it should not reload expensive state every time
- it should not make the main page jank while animating
- it should not sit there burning resources forever

Pick any two and you can probably ship by lunch. Pick all five and suddenly you are reading browser rendering diagrams like it is a normal personality trait.

## The first trap: unmounting everything

The most obvious implementation is also the one I usually try first, because I enjoy being humbled by computers.

```tsx
{
  isOpen && <Sidebar />
}
```

This is clean. It is idiomatic. It also means that every close destroys the sidebar, and every open builds it again from zero.

If the sidebar is just a few links, fine. Delete it. Recreate it. Nobody cares.

But if the sidebar contains anything heavy—a document preview, an embedded app, a long-running connection, a complex editor, a local cache, a bunch of initialized JavaScript—then reopening becomes expensive. You pay for network requests again, parsing again, booting again, restoring state again, reconnecting again, and usually showing the user a little spinner that says “sorry, we forgot everything.”

Unmounting is great when closed really means done. It is less great when closed means “I will be back in eight seconds.”

## The second trap: `display: none`

The next idea is to keep the sidebar mounted and hide it with CSS.

```tsx
<div style={{ display: isOpen ? 'flex' : 'none' }}>
  <Sidebar />
</div>
```

This preserves the expensive stuff. The DOM stays around. The embedded view keeps its state. Connections do not necessarily have to reconnect. Reopening can feel instant.

The problem is that `display` does not animate. It is either there or it is not. No transition. No elegant slide. Just a UI magic trick with the subtlety of someone turning the lights on and off.

So `display: none` is good for preservation, bad for motion.

## The useful middle: hide it without destroying it

The pattern I keep coming back to is: mount lazily, then hide with transform.

```scss
.sidebar {
  position: fixed;
  right: 0;
  transform: translateX(0);
  transition: transform 250ms ease;
}

.sidebar[hidden] {
  display: flex; /* keep it mounted instead of using the browser default */
  transform: translateX(100%);
  visibility: hidden;
  pointer-events: none;
}
```

The important bit is not the exact class name. The important bit is the deal we are making with the browser:

- keep the expensive subtree alive
- move the sidebar with `transform`
- make it non-interactive while hidden
- preserve semantic hiding with `hidden`/`aria-hidden`
- avoid using `display: none` for the animated state

This gives the sidebar the thing users actually notice: it comes back immediately.

That immediacy matters more than it looks. A sidebar is often a temporary workspace. People peek at it, close it, compare something, open it again, copy a detail, close it again. If every toggle reloads the tiny universe inside the panel, the interface starts feeling sticky.

Sticky is bad. Sticky makes people sigh. Software should avoid creating new sighs.

## Why animating width is where the jank goblin lives

For a push sidebar, the tempting CSS is to animate the layout itself.

```scss
.main {
  flex: 1;
  transition: flex-basis 250ms ease;
}

.sidebar {
  width: 380px;
}
```

This works visually, but it asks the browser to redo layout work on every frame of the animation.

That means, roughly:

1. recalculate the sidebar width
2. recalculate the main content size
3. relayout the children
4. repaint the affected pixels
5. composite the result

Do that 60 times per second while the main app is also rendering tables, charts, editors, previews, or any other “just one more div” situation, and you get dropped frames.

This is the classic frontend tax: the demo looks fine, the real app has three dashboards open and a laptop fan trying to achieve flight.

## `transform` is boring magic

`transform` is different because it can usually run on the compositor. The browser can move an already-painted layer instead of recalculating the page around it.

That skips the expensive parts:

1. layout: skipped
2. paint: skipped
3. composite: move the layer

This is why `transform` and `opacity` are the usual animation workhorses. They are not always free, because nothing is free and browsers enjoy nuance, but they are the safe default when you care about smoothness.

The catch is that a pure transform sidebar overlays the page. It does not push the content out of the way.

Sometimes that is exactly what you want. For temporary drawers, overlays are great. For a productivity sidebar that should sit next to the work area, overlaying can be annoying. It covers the thing the user was looking at, which is rude in a very web-app-specific way.

## The push-layout compromise

The compromise is to let the sidebar animate with `transform`, and let the main content reserve space with a cheap-ish outer adjustment.

```scss
.content {
  transition: padding-right 250ms ease;
}

.sidebar-open .content {
  padding-right: 380px;
}
```

Is `padding-right` magically free? No. The content area still has to adapt.

But it is usually much cheaper than animating flex sizing or width across a shared layout container, because you avoid the worst cascading sibling recalculation. The sidebar itself moves on the compositor, while the content makes a simpler adjustment to leave room.

The result feels like a push layout without asking the entire app to stretch and shrink itself into a nervous breakdown.

That is usually the goal with UI performance: not zero work, just less ridiculous work.

## Mount once, hide after that

The lifecycle pattern I like is:

```text
Page loads
  ├─ user never opens sidebar -> mount nothing expensive
  └─ first open -> mount the sidebar
       ├─ close -> hide with CSS
       └─ reopen -> show instantly
```

In component terms, it is just a small “has this ever been opened?” gate.

```tsx
function SidebarGate({ isOpen }: { isOpen: boolean }) {
  const hasBeenOpened = useRef(false)

  if (isOpen) {
    hasBeenOpened.current = true
  }

  if (!hasBeenOpened.current) {
    return null
  }

  return <Sidebar visible={isOpen} />
}
```

This avoids paying the startup cost for people who never use the sidebar. Once they do use it, the sidebar becomes warm. Closing it is no longer destruction; it is more like putting it backstage.

A tiny theater metaphor for a tiny rectangle. We are all doing great.

## Do less when hidden

Keeping the sidebar mounted does not mean every side effect should keep running forever.

For example, keyboard listeners only need to exist while the panel is visible.

```tsx
useEffect(() => {
  if (!visible) return

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      closeSidebar()
    }
  }

  document.addEventListener('keydown', onKeyDown)
  return () => document.removeEventListener('keydown', onKeyDown)
}, [visible])
```

The same idea applies to polling, observers, timers, and subscriptions. Preserve the expensive user-facing state, but turn off anything that does not need to run while hidden.

This is the difference between “kept alive” and “haunting the tab.”

## Keep identities stable

Another easy way to accidentally ruin the whole thing is unstable identity.

If a child view is keyed by some generated ID, and that ID changes on each render, the framework will happily remount the thing you were trying to preserve. Very polite. Very destructive.

The boring fix is to generate once and keep the value stable until something meaningful changes.

```tsx
const generatedIdRef = useRef<string | null>(null)

if (!generatedIdRef.current) {
  generatedIdRef.current = createStableId()
}

return <ExpensivePanel instanceId={generatedIdRef.current} />
```

This matters for embedded views, editors, previews, or anything that treats identity as lifecycle. If the identity changes, you did not hide the sidebar. You reincarnated it.

## Memory is the tradeoff

The cost of this approach is memory. The hidden sidebar still exists. Its DOM exists. Its JavaScript state exists. If it contains an embedded app, that app is still warm.

A rough mental model:

| State             | Cost                                |
| ----------------- | ----------------------------------- |
| Never opened      | almost nothing                      |
| First open        | pay startup cost                    |
| Hidden after open | retain memory, avoid reload         |
| Visible           | retain memory plus active rendering |

For one sidebar in a desktop web app, this is often the right trade. Users get instant reopen, and the app avoids repeating expensive initialization work.

For many sidebars, mobile devices, or truly massive embedded views, you may need a different policy: unload after inactivity, suspend background work, or offer a lighter collapsed state. Performance work is mostly choosing which problem you prefer to have.

## The short version

My current default for performant sidebars is:

- do not mount the heavy panel until the first open
- after first open, keep it mounted
- hide it with `transform`, `visibility`, and `pointer-events`
- avoid `display: none` for the animated hidden state
- avoid animating `width`, `flex-basis`, or layout-heavy properties
- reserve content space with a simpler outer adjustment when a push layout is needed
- pause listeners, timers, and background work while hidden
- keep keys and generated IDs stable
- respect reduced-motion preferences because not everyone wants a 250ms drawer ballet

None of this is glamorous. It is not the part of the feature people screenshot.

But when it works, the sidebar feels calm. It opens. It closes. It remembers what it was doing. The page does not wobble like a shopping cart with one cursed wheel.

That is the whole game: make the fast path feel boring.

Boring, in UI performance, is a compliment.

## References

- [Sidebar Animation Performance — Joshua Wootonn](https://www.joshuawootonn.com/sidebar-animation-performance)
- [CSS Triggers](https://csstriggers.com/)
- [GitLab Super Sidebar](https://about.gitlab.com/blog/2023/07/26/super-sidebar/)
