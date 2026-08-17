# Playground Frame Design

## Goal

Give every route in the Playground navigation the same opening and closing rhythm while preserving the distinct interaction and visual identity of each experiment.

## Scope

The shared frame applies to these five routes:

- `/orchestrator`
- `/ai-chat`
- `/tiptap-llm`
- `/watermark`
- `/vue-go`

It does not apply to the About, Blog, Media, Items, or Settings routes. Media remains a separate Pet projects surface.

## Design Direction

Use a quiet engineering-notebook frame. The frame should orient visitors and explain why the work matters without competing with the experiment itself.

Every Playground page has three layers:

1. A shared header that identifies the page as part of the Playground.
2. The page-specific experiment body.
3. A shared footer that records the conclusion and useful follow-up material.

The frame uses the warm site tokens, restrained accent color, strong type hierarchy, and generous vertical spacing already defined in `DESIGN.md`. It should not introduce cards, gradients, decorative badges, breadcrumbs, experiment numbers, or additional animation.

## Shared Header

Each page begins with one `ExperimentHeader` component containing:

- An eyebrow with the exact text `Playground`.
- One page-level `h1` containing the experiment title.
- A concise introduction of one or two sentences, ideally no more than 160 characters.

The header does not contain resource links, status badges, technology tags, breadcrumbs, or experiment numbering. Those details either belong in the experiment body or in the shared footer.

The title may retain the experiment's own voice. Consistency comes from structure, hierarchy, spacing, and typography, not from forcing every title into the same grammatical pattern.

## Experiment Body

Each page retains its purpose-built body. The chat palette, orchestration trace, editor workflow, watermark reading desk, and Vue/FastAPI technical walkthrough should not be forced into one common layout.

Existing explanatory sections can remain when they help someone use or understand the experiment. Content that merely duplicates the shared introduction or footer should be removed or consolidated.

## Shared Footer

Each page ends with one `ExperimentFooter` component containing:

- A `What I learned` heading.
- A short conclusion specific to the experiment. The conclusion should state a concrete engineering or product lesson rather than repeat the introduction.
- A `Notes & links` heading.
- At least one useful link to source code, a build note, primary documentation, or a directly relevant reference.

The footer renders as a quiet, full-width section separated from the body by a single top border. On wider screens, the conclusion and links may use two columns. On smaller screens they stack in reading order. Links clearly distinguish internal and external destinations, and external links use safe `target` and `rel` attributes.

The footer replaces inconsistent endings such as isolated alerts, ad hoc takeaway card grids, or link rows with no conclusion. A page can still contain deeper analysis in its body, but its final section always uses the shared footer.

## Initial Content

| Route | Title | Conclusion focus | Links |
| --- | --- | --- | --- |
| `/orchestrator` | Agent Orchestrator | A small router and explicit event contract make specialist selection and tool execution understandable. | Repository source and relevant implementation notes or API documentation available in the project. |
| `/ai-chat` | AI Interview | A stable message-part shape keeps streamed text and generated media compatible with the UI. | Repository source and OpenAI SDK documentation. |
| `/tiptap-llm` | Tiptap + LLMs | Reliable editor workflows depend on constrained output and deliberate synchronization between model responses and document state. | Repository source and Tiptap documentation. |
| `/watermark` | A watermark you cannot see | A weak per-token signal becomes useful only when evidence accumulates across enough text. | Existing build notes, Anthropic announcement, and SynthID-Text paper. |
| `/vue-go` | Vue + FastAPI | Typed contracts and a single deployable service keep a small AI-enabled product straightforward to operate. | Repository source and FastAPI documentation. |

Final copy may be tightened during implementation, but it must preserve these meanings and follow the voice rules in `PRODUCT.md`.

## Component Boundaries

`ExperimentHeader` owns only shared header semantics and presentation. It accepts a title and description; the eyebrow remains internal so every page uses the same label.

`ExperimentFooter` owns the conclusion and resource-list presentation. It accepts a conclusion and a typed list of links. Link data includes a label, destination, and whether the destination is external. The component, not each page, owns external-link attributes and icons.

Neither component knows about routes, experiment ordering, API state, or the internal layout of a demo. This keeps the shared frame reusable without centralizing page content in router metadata.

## Responsive And Accessibility Requirements

- Each route has exactly one page-level `h1`.
- The footer headings preserve a logical heading order after the page title and body sections.
- Descriptions maintain a readable line length of approximately 65 characters.
- Focus indicators use the site accent and remain visible against the warm background.
- Links have descriptive labels without relying on icon-only meaning.
- External-link icons are decorative and hidden from assistive technology.
- The header and footer work at narrow mobile widths without clipped text or horizontal scrolling.
- Reduced-motion behavior is unchanged because the shared frame adds no motion.

## Documentation Rule

Add a `Playground Experiment Anatomy` section to `PRODUCT.md`. It must name the five current Playground routes and make the following requirements explicit for future experiments:

- Use the shared header and footer components.
- Keep one `h1`, one concise introduction, one concrete conclusion, and at least one useful link.
- Keep resource links out of the header.
- Preserve purpose-built experiment bodies rather than standardizing every demo into cards.
- Add new experiments to the Playground navigation and follow the same content order.

## Testing And Verification

Component tests should prove that:

- The header renders the fixed eyebrow, provided title, and description with one `h1`.
- The footer renders the provided conclusion and links.
- Internal links use router navigation.
- External links open safely in a new tab and expose an external-link cue.

Page-level source checks should prove that all five scoped routes use both shared components. Existing unit tests, TypeScript checking, and the production build must remain green. The final verification should also inspect the five routes at desktop and mobile widths to catch spacing, overflow, or hierarchy regressions.

## Success Criteria

- Visitors can immediately recognize all five pages as part of the same Playground.
- Every page opens with the same information hierarchy and ends with a conclusion plus useful links.
- No experiment loses its distinctive interaction or body layout.
- A future experiment has one documented, reusable pattern to follow.
- The shared frame uses existing Nuxt UI and site tokens without adding dependencies.
