# Adrian Latorre Playground Design Context

## Design Direction

Minimal, warm, and technical. The site should feel like a carefully typeset engineering notebook wrapped in a quiet app shell, not a colorful dashboard. The current direction is restrained: tinted neutrals, one low-chroma accent, strong typography, and generous spacing.

Physical scene: a hiring manager or engineering peer opens the site in a normal browser during work hours, scanning for signal and taste without wanting a performance. This supports a light theme with warm paper-like neutrals and subdued interaction color.

## Color Strategy

Restrained. Use warm tinted neutrals for most surfaces and a single muted green accent for orientation, active states, bullets, and links. Accent usage should stay sparse.

Current core tokens live in `src/assets/imports.css`:

```css
--site-bg: oklch(0.985 0.006 95);
--site-surface: oklch(0.965 0.007 95);
--site-surface-soft: oklch(0.94 0.008 95);
--site-border: oklch(0.86 0.01 95);
--site-ink: oklch(0.235 0.012 260);
--site-muted: oklch(0.49 0.018 260);
--site-faint: oklch(0.64 0.014 260);
--site-accent: oklch(0.43 0.045 170);
```

Rules:

- Use OKLCH for new project-level colors.
- Do not use pure black or pure white.
- Avoid teal as the brand color; it made the site feel too generic and too saturated.
- Avoid gradients, gradient text, and neon AI palettes.
- Use color to clarify, not decorate.

## Typography

- Use the system sans stack unless there is a deliberate typography project.
- Prioritize careful scale, weight, letter-spacing, and line length over font novelty.
- Hero headings can be large, tight, and editorial in scale, but not decorative.
- Body copy should stay around 65 to 75 characters per line.
- Section labels can use small uppercase text with increased tracking.
- Blog surfaces may use a more note-like reading treatment, but should not drift into unrelated magazine aesthetics.

Current home page hierarchy:

- Hero name: large clamp scale, tight tracking, strong weight.
- Hero summary: larger than body, muted, compact line-height.
- Section labels: small uppercase, faint or accent on mobile.
- Body: relaxed line-height around `1.8`.

## Layout

- Keep the app shell quiet. Navigation should orient, not dominate.
- The home page uses a narrow left-aligned content column with section dividers and two-column metadata where useful.
- Prefer section rhythm and typography over cards.
- Use cards only for interactive components, embedded demos, or places where Nuxt UI's affordance helps.
- Avoid identical card grids for core portfolio content.
- Mobile should collapse to one column with clear vertical rhythm.

## Components

Nuxt UI remains the component layer. Tune it through theme settings, utility classes, and project tokens instead of replacing it wholesale.

Current Nuxt UI theme in `vite.config.ts`:

```ts
colors: {
  primary: 'zinc',
  neutral: 'stone',
}
```

Component guidance:

- `UDashboardSidebar` and `UDashboardNavbar` should use the site background and quiet borders.
- Header action buttons should be `neutral` and mostly `ghost` unless an action truly needs emphasis.
- `UCard` shadows should be minimal or removed on brand/profile surfaces.
- Modals are acceptable for contact because the shell already uses a compact contact trigger, but do not default to modals for new flows.
- Prose code blocks use local `src/components/prose/ProsePre.vue` and `ProseCode.vue` because the latest Nuxt UI package does not expose the old prose component path used previously.

## Motion

- Keep motion subtle.
- Use color and opacity transitions for hovers.
- Avoid layout animation unless it is clearly purposeful.
- No bounce or elastic easing.

## Imagery

- The profile photo can be used sparingly in contact or personal identity areas.
- Technical experiments can use generated or embedded media when they explain the work.
- Do not add generic stock imagery to the core profile page.

## Copy Rules

- Keep headings short.
- Avoid restating headings in the first sentence below them.
- Avoid em dashes.
- Use specific production language over broad marketing claims.
- Let playful copy appear in experiments, not in the first impression or professional credibility sections.

## Accessibility And Responsiveness

- Maintain semantic sections with labelled headings.
- Keep contrast high enough for muted text on warm backgrounds.
- Preserve keyboard-accessible Nuxt UI controls.
- Ensure the sidebar shell and main content work at mobile widths.
- Avoid color-only meaning for important status or errors.

## Current Anti-Patterns To Continue Reducing

- Saturated teal active states across the shell.
- Heavy card shadows on personal/brand surfaces.
- Manual bullet glyphs in list items.
- Overly playful copy where credibility is the goal.
- Inconsistent old `slate-*` styling across secondary pages.
- Large identical card grids on project/media pages.

## Future Design Opportunities

- Bring the blog list and post typography onto the same warm neutral token system.
- Quiet the AI chat and TipTap pages so demos feel integrated with the new shell.
- Rework the media/projects page away from equal card grids into a more curated project index.
- Consider code-splitting heavy playground routes so the minimal portfolio shell stays fast.
