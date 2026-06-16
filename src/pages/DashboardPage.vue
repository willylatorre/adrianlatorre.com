<template>
  <main class="profile-page">
    <header class="profile-hero">
      <p class="eyebrow">Full-stack engineer, AI engineering</p>
      <h1>Adrian Latorre</h1>
      <p class="hero-copy">
        I build end-to-end products with careful interfaces, useful LLM workflows, and the
        reliability work needed to ship them.
      </p>
    </header>

    <section class="profile-section" aria-labelledby="about-heading">
      <h2 id="about-heading">About</h2>
      <div class="prose-block">
        <p>
          I’m a full-stack engineer who loves building end-to-end products: the UI people use, the
          APIs behind it, and the infrastructure that keeps it reliable. My day-to-day has been
          heavily focused on frontend (Vue/Nuxt, TypeScript), but I’m most energized when I can own
          the full system and ship features all the way to production.
        </p>
        <p>
          Over the last few years, a big part of my work and side projects has centered on
          <span class="font-medium">AI engineering</span>: turning LLM ideas into real workflows
          with strong UX, solid data grounding, and pragmatic production constraints. That means
          building RAG pipelines, tool/agent integrations, evaluation loops, and the "boring"
          reliability pieces (observability, latency, cost, and safety).
        </p>
        <p>
          This site is my playground for experiments and demos, and I also write on the
          <RouterLink class="underline underline-offset-2" to="/blog">blog</RouterLink>
          about engineering, product lessons, and whatever I’m currently learning.
        </p>
      </div>
    </section>

    <section class="profile-section" aria-labelledby="ai-heading">
      <h2 id="ai-heading">AI projects and experiments</h2>
      <div class="prose-block">
        <p>
          I enjoy building small, focused projects that explore “what actually works” when you put
          AI features in front of users. You can explore several of these around the site, including
          the
          <RouterLink class="underline underline-offset-2" to="/ai-chat">AI Chat</RouterLink>
          playground, the
          <RouterLink class="underline underline-offset-2" to="/vue-go">Vue + FastAPI</RouterLink>
          stack demo, and other
          <RouterLink class="underline underline-offset-2" to="/media">projects</RouterLink>.
        </p>
        <ul class="compact-list">
          <li>
            Building LLM-powered tools that integrate with APIs, data sources, and internal
            workflows
          </li>
          <li>
            Retrieval-augmented generation: ingestion, chunking, search, grounding, and UX patterns
            that help users trust the output
          </li>
          <li>
            Agent and tooling patterns: function calling, orchestration, and guardrails for reliable
            outcomes
          </li>
          <li>
            Evaluation and production readiness: latency and cost tradeoffs, monitoring, and
            iterative improvement loops
          </li>
        </ul>
        <p class="note">
          If you’re curious about the “why” behind these choices, I expand on them in longer form on
          the
          <RouterLink class="underline underline-offset-2" to="/blog">blog</RouterLink>.
        </p>
      </div>
    </section>

    <section class="profile-section" aria-labelledby="experience-heading">
      <h2 id="experience-heading">Experience</h2>
      <div class="timeline">
        <article class="role">
          <div class="role-meta">
            <h3>Revvity</h3>
            <p>Boston, MA, April 2026 - Present</p>
          </div>
          <div class="role-body">
            <p>
              Senior Software Engineer, AI. Building AI-powered features for Revvity's Cloud ELN
              platform. Designing and developing the Frontend architecture that brings intelligent
              capabilities (natural language search, conversational data exploration) directly into
              scientists' workflows.
            </p>
            <ul class="compact-list">
              <li>
                Focused on creating scalable, reusable component libraries and seamless AI service
                integrations behind feature-flagged rollouts
              </li>
              <li>
                Currently architecting the foundation that will enable AI experiences across the
                entire app
              </li>
            </ul>
          </div>
        </article>

        <article class="role">
          <div class="role-meta">
            <h3>Adyen</h3>
            <p>Amsterdam, August 2020 - March 2026</p>
          </div>
          <div class="role-body">
            <p>
              Senior Frontend Engineer (with full-stack scope) working across Adyen.com, internal
              tooling, and product-facing experiences. I care a lot about UX, performance, and the
              engineering fundamentals that keep high-traffic systems reliable.
            </p>
            <ul class="compact-list">
              <li>
                Built and maintained <span class="font-medium">Adyen.com</span> and
                <span class="font-medium">careers.adyen.com</span> with Nuxt 3 using hybrid and
                incremental rendering
              </li>
              <li>
                Implemented build and rendering optimizations to reliably generate
                <span class="font-medium">20k+ static pages</span>, improving load performance and
                overall site experience
              </li>
              <li>
                Improved invoicing workflows for both merchants and account managers through better
                UX and safer internal tooling
              </li>
              <li>
                Integrated genAI and agent workflows, including MCP-style integrations, to enable
                guided payment integrations via chat-driven experiences
              </li>
            </ul>
            <div class="focus-block">
              <h4>Special focus: Adyen demos platform</h4>
              <p>
                I built the official internal demos platform used across sales processes and
                <span class="font-medium">300+ events per year</span>, designed to generate
                high-quality demos in under a minute while staying consistent and easy to operate.
              </p>
              <ul class="compact-list">
                <li>
                  Built the official demos platform so employees can generate product demos in under
                  a minute (Nuxt 3, Aurora Serverless v2)
                </li>
                <li>
                  Integrated multiple Adyen products (Checkout, POS, Platforms, Tap to Pay, tipping,
                  giving, and more) into a single cohesive experience
                </li>
                <li>
                  Designed complex demo flows and guardrails so non-technical users can reliably
                  generate consistent demo setups
                </li>
              </ul>
            </div>
          </div>
        </article>

        <article class="role">
          <div class="role-meta">
            <h3>Housfy</h3>
            <p>Barcelona, March 2019 - August 2020</p>
          </div>
          <div class="role-body">
            <p>
              Lead Software Engineer in PropTech, owning core frontend architecture while partnering
              closely with payments and growth initiatives.
            </p>
            <ul class="compact-list">
              <li>
                Led the frontend stack (Vue.js, Nuxt.js, Tailwind) and established best practices
              </li>
              <li>
                Led the payments integration, improving payment processing efficiency by
                <span class="font-medium">~40%</span>
              </li>
              <li>Implemented the new properties listing and search experience</li>
              <li>
                Integrated Contentful to generate landing pages dynamically, enabling faster
                go-to-market
              </li>
              <li>Implemented and A/B tested multiple RPO improvements</li>
            </ul>
          </div>
        </article>

        <article class="role">
          <div class="role-meta">
            <h3>Glovoapp</h3>
            <p>Barcelona, Sept 2015 - March 2019</p>
          </div>
          <div class="role-body">
            <p>
              One of the initial engineers, helping scale the company from
              <span class="font-medium">~30 to ~400 employees</span>. As team lead / senior frontend
              engineer, I built the foundations of the web stack and shipped core growth and B2B
              initiatives.
            </p>
            <ul class="compact-list">
              <li>Led the frontend stack (Vue.js, Nuxt.js, Node, GraphQL)</li>
              <li>Led the Growth / B2B team, delivering experiments at high cadence</li>
              <li>Implemented and A/B tested multiple RPO improvements</li>
              <li>Shipped key product lines (Prime, member-get-member, Glovo Business)</li>
              <li>Migrated the web app from Angular to Vue.js</li>
            </ul>
            <p class="note">
              I wrote about part of this journey: migrating from Angular to Vue (and lessons
              learned).
            </p>
          </div>
        </article>

        <article class="role">
          <div class="role-meta">
            <h3>Oliva App</h3>
            <p>Barcelona, Feb 2015 - Sept 2015</p>
          </div>
          <div class="role-body">
            <p>
              At a small startup, I built a full product across mobile and web. We experimented with
              NFC and QR-code based experiences to improve loyalty and engagement for merchants and
              customers.
            </p>
          </div>
        </article>
      </div>
    </section>

    <section class="profile-section" aria-labelledby="contact-heading">
      <h2 id="contact-heading">Contact</h2>
      <div class="contact-links">
        <p>
          Email:
          <a class="underline underline-offset-2" href="mailto:adri.latorre@gmail.com"
            >adri.latorre@gmail.com</a
          >
        </p>
        <p>
          LinkedIn:
          <a
            class="underline underline-offset-2"
            href="https://www.linkedin.com/in/adrianlatorre/"
            target="_blank"
            rel="noreferrer"
            >linkedin.com/in/adrianlatorre</a
          >
        </p>
        <p>
          GitHub:
          <a
            class="underline underline-offset-2"
            href="https://github.com/willylatorre"
            target="_blank"
            rel="noreferrer"
            >github.com/willylatorre</a
          >
        </p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.profile-page {
  max-width: 48rem;
  color: var(--site-ink);
}

.profile-hero {
  padding-block: clamp(1rem, 4vw, 3.5rem) clamp(2.75rem, 7vw, 6rem);
}

.eyebrow {
  margin-bottom: 1rem;
  color: var(--site-accent);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

h1 {
  max-width: 11ch;
  font-size: clamp(3.25rem, 11vw, 7.5rem);
  font-weight: 680;
  letter-spacing: -0.075em;
  line-height: 0.88;
}

.hero-copy {
  max-width: 39rem;
  margin-top: clamp(1.5rem, 4vw, 2.5rem);
  color: var(--site-muted);
  font-size: clamp(1.18rem, 2vw, 1.55rem);
  letter-spacing: -0.025em;
  line-height: 1.42;
}

.profile-section {
  display: grid;
  grid-template-columns: minmax(7rem, 0.32fr) minmax(0, 1fr);
  gap: clamp(1.25rem, 4vw, 3rem);
  padding-block: clamp(2.25rem, 6vw, 4.75rem);
  border-top: 1px solid var(--site-border);
}

.profile-section h2 {
  color: var(--site-faint);
  font-size: 0.78rem;
  font-weight: 650;
  letter-spacing: 0.08em;
  line-height: 1.4;
  text-transform: uppercase;
}

.prose-block,
.role-body,
.contact-links {
  color: var(--site-muted);
  font-size: clamp(1rem, 1.3vw, 1.08rem);
  letter-spacing: -0.012em;
  line-height: 1.8;
}

.prose-block > * + *,
.role-body > * + * {
  margin-top: 1rem;
}

.profile-page a {
  color: var(--site-ink);
  text-decoration-color: oklch(0.72 0.018 170);
  text-decoration-thickness: 1px;
  transition:
    color 180ms cubic-bezier(0.22, 1, 0.36, 1),
    text-decoration-color 180ms cubic-bezier(0.22, 1, 0.36, 1);
}

.profile-page a:hover {
  color: var(--site-accent);
  text-decoration-color: var(--site-accent);
}

.compact-list {
  display: grid;
  gap: 0.7rem;
  padding: 0;
  list-style: none;
}

.compact-list li {
  position: relative;
  padding-left: 1.15rem;
}

.compact-list li::before {
  position: absolute;
  top: 0.82em;
  left: 0;
  width: 0.28rem;
  height: 0.28rem;
  border-radius: 999px;
  background: var(--site-accent);
  content: '';
}

.note {
  color: var(--site-faint);
  font-size: 0.95rem;
}

.timeline {
  display: grid;
  gap: clamp(2rem, 5vw, 3.5rem);
}

.role {
  display: grid;
  grid-template-columns: minmax(8rem, 0.35fr) minmax(0, 1fr);
  gap: clamp(1rem, 3vw, 2rem);
}

.role + .role {
  padding-top: clamp(2rem, 5vw, 3.5rem);
  border-top: 1px solid oklch(0.9 0.008 95);
}

.role-meta h3 {
  font-size: clamp(1.1rem, 1.6vw, 1.28rem);
  font-weight: 650;
  letter-spacing: -0.03em;
}

.role-meta p {
  margin-top: 0.35rem;
  color: var(--site-faint);
  font-size: 0.9rem;
  line-height: 1.5;
}

.focus-block {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid oklch(0.9 0.008 95);
}

.focus-block h4 {
  margin-bottom: 0.65rem;
  color: var(--site-ink);
  font-size: 0.98rem;
  font-weight: 650;
}

.contact-links {
  display: grid;
  gap: 0.3rem;
}

@media (max-width: 760px) {
  .profile-page {
    max-width: none;
  }

  h1 {
    max-width: 8ch;
  }

  .profile-section,
  .role {
    grid-template-columns: 1fr;
  }

  .profile-section h2 {
    color: var(--site-accent);
  }
}
</style>
