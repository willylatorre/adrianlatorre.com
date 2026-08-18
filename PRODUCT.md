# Adrian Latorre Playground Product Context

register: brand

## Product Purpose

Adrian Latorre's personal website is a portfolio, writing home, and technical playground. It should help visitors understand Adrian as a pragmatic full-stack engineer who builds polished product interfaces, AI-assisted workflows, and reliable production systems.

The site is intentionally not a traditional resume page. It is a working artifact: the navigation, experiments, blog, FastAPI backend, AI chat, TipTap playground, coffee counter, and project notes all demonstrate how Adrian thinks and builds.

## Primary Users

- Hiring managers and engineering leaders evaluating senior frontend, full-stack, or AI engineering fit.
- Product-minded engineers who want to understand Adrian's technical taste and decision-making.
- Recruiters who need a fast read on experience, strengths, and contact paths.
- Peers who arrive through a blog post, demo, or shared experiment.
- Adrian, as the site owner, using it as a durable place to publish experiments and notes.

## User Goals

- Quickly understand what Adrian does and why his work is credible.
- See evidence of real production experience, especially Vue/Nuxt, TypeScript, Python/FastAPI, AI workflows, and high-traffic product surfaces.
- Explore experiments without feeling like the site is only a gimmick.
- Read practical writing about engineering lessons, AI interfaces, and product tradeoffs.
- Find contact links without friction.

## Brand Positioning

Calm technical craft. The site should feel precise, understated, and built by someone who cares about the full system. It should avoid loud startup energy, novelty-chasing AI aesthetics, and generic portfolio templates.

Adrian's edge is not "AI hype." It is turning exploratory technology into usable workflows with good UX, grounded data, reliability, and production constraints.

## Voice And Tone

- Direct, warm, and concise.
- Practical over performative.
- Confident without self-mythologizing.
- Slightly playful in experiments, restrained on the core profile and writing surfaces.
- Specific about systems, tradeoffs, and outcomes.

Use concrete language: "built," "shipped," "integrated," "measured," "reliable," "workflow," "production." Avoid vague adjectives like "innovative," "cutting-edge," or "passionate" unless the surrounding detail earns them.

## Strategic Principles

- Lead with signal. The first screen should say who Adrian is, what he builds, and why it matters.
- Preserve the playground. The site can be minimal without becoming sterile; experiments are part of the proof.
- Make production judgment visible. AI demos should highlight constraints, integration, evaluation, and user trust.
- Keep the interface quieter than the work. Navigation, chrome, and decorative elements should not compete with content.
- Prefer real artifacts over claims. Link to demos, posts, projects, and implementation details when possible.
- Let writing feel like notes from practice, not content marketing.

## Content Pillars

- Full-stack product engineering: frontend, APIs, data, deployment, and reliability.
- AI engineering: LLM workflows, RAG, agents, tool calls, evaluation loops, latency, cost, and safety.
- Frontend craft: Vue, Nuxt, TypeScript, performance, composition, and UX details.
- Experiments: AI chat, TipTap + LLM workflows, Vue + FastAPI demos, side projects, and media.
- Career evidence: Adyen, Housfy, Glovoapp, Oliva App, and shipped production outcomes.

## Anti-References

- Neon-on-black AI dashboard aesthetics.
- Generic SaaS landing pages with metric cards and gradient text.
- Overdesigned personal brands with excessive motion or visual noise.
- Resume templates that flatten everything into identical cards.
- Corporate blandness that hides personality and experiments.
- Joke-heavy copy on serious credibility surfaces.

## Success Criteria

- A visitor can describe Adrian's profile in one sentence after 10 seconds.
- The core page feels calmer and more deliberate than a default Nuxt UI dashboard.
- Experiments feel discoverable but secondary to the central professional story.
- Blog and project pages feel like part of the same world, even when they use different layouts.
- The design still benefits from Nuxt UI components instead of replacing the component system.

## Playground Experiment Anatomy

The Playground currently contains five routes: `/orchestrator`, `/ai-chat`, `/tiptap-llm`, `/watermark`, and `/vue-go`. Media is a separate Pet projects surface and does not use this pattern.

Every current and future Playground experiment follows the same content order:

1. `ExperimentHeader` with the fixed `Playground` eyebrow, one page-level `h1`, and a concise one- or two-sentence introduction.
2. A purpose-built experiment body shaped around the interaction or technical idea.
3. `ExperimentFooter` with one concrete `What I learned` conclusion and a `Notes & links` list containing at least one useful source, build note, primary document, or repository link.

Rules for future experiments:

- Use `src/components/experiment/ExperimentHeader.vue` and `ExperimentFooter.vue`; do not recreate their markup or styling locally.
- Keep breadcrumbs, experiment numbers, status badges, technology tags, and resource links out of the header.
- Keep the introduction concise and do not repeat it in the first body section.
- State an engineering or product lesson in the conclusion rather than summarizing the page again.
- Preserve a purpose-built body. Shared framing should not turn distinct experiments into identical card layouts.
- Use descriptive link labels. External destinations open safely in a new tab and display the shared external-link cue.
- Keep a logical heading order, visible keyboard focus, readable line lengths, and mobile layouts without horizontal overflow.
- Add new routes to the Playground navigation and search group when publishing them.

## Product Constraints

- The frontend is Vue 3 with Vite and `@nuxt/ui` components, not a Nuxt app.
- Nuxt UI should remain the component foundation.
- The backend is FastAPI with SQLite and SSE endpoints for AI chat.
- The site should stay responsive and usable on desktop and mobile.
- Design changes should be small enough to maintain while preserving room for experimental pages.
