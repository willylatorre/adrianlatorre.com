# Blog sidebar recent entries

## Goal

Expand the Blog navigation item to reveal the four newest articles and a link to the full article index.

## Design

- Keep Blog as a top-level item in the existing `UNavigationMenu` sidebar.
- Make Blog expanded by default and derive its four child links from the existing date-sorted `blogPosts` collection.
- Add a final child link labelled `View all entries` that routes to `/blog`.
- Article children show only their title and truncate to one line.
- Explore whether the navigation menu exposes a supported class or slot hook for a hover-only short date on the right. If so, the date uses `MMM DD` formatting and is revealed over a background gradient that masks the end of the title.
- If this cannot be done through supported menu customization without fragile DOM targeting, omit the date treatment; title truncation and navigation remain the shipped behavior.

## Verification

- Add a focused test for the derived sidebar items: newest four posts plus the all-entries link.
- Run the focused test, TypeScript check, production build, and the full frontend test suite.
