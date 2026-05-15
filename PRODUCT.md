# Adrian Latorre Playground Product Context

register: brand

## Product Purpose

Adrian Latorre's personal website is a portfolio, writing home, and technical playground. It should help visitors understand Adrian as a pragmatic full-stack engineer who builds polished product interfaces, AI-assisted workflows, and reliable production systems.

The site is intentionally not a traditional resume page. It is a working artifact: the navigation, experiments, blog, Go backend, AI chat, TipTap playground, coffee counter, and project notes all demonstrate how Adrian thinks and builds.

## Primary Users

- Hiring managers and engineering leaders evaluating senior frontend, full-stack, or AI engineering fit.
- Product-minded engineers who want to understand Adrian's technical taste and decision-making.
- Recruiters who need a fast read on experience, strengths, and contact paths.
- Peers who arrive through a blog post, demo, or shared experiment.
- Adrian, as the site owner, using it as a durable place to publish experiments and notes.

## User Goals

- Quickly understand what Adrian does and why his work is credible.
- See evidence of real production experience, especially Vue/Nuxt, TypeScript, Go, AI workflows, and high-traffic product surfaces.
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
- Experiments: AI chat, TipTap + LLM workflows, Vue + Go demos, side projects, and media.
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

## Product Constraints

- The frontend is Vue 3 with Vite and `@nuxt/ui` components, not a Nuxt app.
- Nuxt UI should remain the component foundation.
- The backend is Go/Gin with SQLite and SSE endpoints for AI chat.
- The site should stay responsive and usable on desktop and mobile.
- Design changes should be small enough to maintain while preserving room for experimental pages.
