<script setup lang="ts">
// About Me page - no complex functionality needed
</script>

<template>
  <div class="max-w-4xl mx-auto py-8">
    <div class="space-y-8">
      <!-- Header -->
      <div>
        <h1 class="text-2xl font-bold mb-2">Adrian Latorre</h1>
        <p class="text-slate-600">Full-Stack Engineer • AI Engineering (LLMs, agents, RAG)</p>
      </div>

      <!-- Bio -->
      <div>
        <h2 class="text-lg font-semibold mb-3">About</h2>
        <div class="space-y-3 text-slate-700 leading-relaxed">
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
            building RAG pipelines, tool/agent integrations, evaluation loops, and the “boring”
            reliability pieces (observability, latency, cost, and safety).
          </p>
          <p>
            This site is my playground for experiments and demos, and I also write on the
            <RouterLink class="underline underline-offset-2" to="/blog">blog</RouterLink>
            about engineering, product lessons, and whatever I’m currently learning.
          </p>
        </div>
      </div>

      <!-- AI / Projects -->
      <div>
        <h2 class="text-lg font-semibold mb-3">AI projects & experiments</h2>
        <div class="space-y-3 text-slate-700 leading-relaxed">
          <p>
            I enjoy building small, focused projects that explore “what actually works” when you
            put AI features in front of users. You can explore several of these around the site,
            including the
            <RouterLink class="underline underline-offset-2" to="/ai-chat">AI Chat</RouterLink>
            playground, the
            <RouterLink class="underline underline-offset-2" to="/vue-go">Vue + Go</RouterLink>
            stack demo, and other
            <RouterLink class="underline underline-offset-2" to="/media">projects</RouterLink>.
          </p>
          <ul class="text-sm text-slate-700 space-y-2 ml-4">
            <li>
              • Building LLM-powered tools that integrate with real systems (APIs, data sources, and
              internal workflows)
            </li>
            <li>
              • Retrieval-augmented generation (RAG): ingestion, chunking, search, grounding, and
              UX patterns that help users trust the output
            </li>
            <li>
              • Agent/tooling patterns: function calling, orchestration, and guardrails for reliable
              outcomes
            </li>
            <li>
              • Evaluation and production readiness: latency/cost tradeoffs, monitoring, and
              iterative improvement loops
            </li>
          </ul>
          <p class="text-sm text-slate-600">
            If you’re curious about the “why” behind these choices, I expand on them in longer
            form on the
            <RouterLink class="underline underline-offset-2" to="/blog">blog</RouterLink>.
          </p>
        </div>
      </div>

      <!-- Experience -->
      <div>
        <h2 class="text-lg font-semibold mb-3">Experience</h2>
        <div class="space-y-6">
          <div>
            <h3 class="font-semibold text-lg">Adyen</h3>
            <p class="text-sm text-slate-600 mb-2">Amsterdam, August 2020 - Present</p>
            <p class="text-slate-700 mb-3 leading-relaxed">
              Senior Frontend Engineer (with full-stack scope) working across Adyen.com, internal
              tooling, and product-facing experiences. I care a lot about UX, performance, and the
              engineering fundamentals that keep high-traffic systems reliable.
            </p>
            <ul class="text-sm text-slate-700 space-y-2 ml-4">
              <li>
                • Built and maintained <span class="font-medium">Adyen.com</span> and
                <span class="font-medium">careers.adyen.com</span> with Nuxt 3 using hybrid /
                incremental rendering
              </li>
              <li>
                • Implemented build and rendering optimizations to reliably generate
                <span class="font-medium">20k+ static pages</span>, improving load performance and
                overall site experience
              </li>
              <li>
                • Improved invoicing workflows for both merchants and account managers through
                better UX and safer internal tooling
              </li>
              <li>
                • Integrated genAI/agent workflows (including MCP-style integrations) to enable
                guided payment integrations via chat-driven experiences
              </li>
            </ul>
            <div class="mt-4 p-4 bg-slate-50 rounded-lg">
              <h4 class="font-medium text-slate-900 mb-2">
                Special focus: Adyen demos platform
              </h4>
              <p class="text-sm text-slate-700 mb-3 leading-relaxed">
                I built the official internal demos platform used across sales processes and
                <span class="font-medium">300+ events per year</span>, designed to generate
                high-quality demos in under a minute while staying consistent and easy to operate.
              </p>
              <ul class="text-sm text-slate-700 space-y-2 ml-4">
                <li>
                  • Built the official demos platform so employees can generate product demos in
                  under a minute (Nuxt 3, Aurora Serverless v2)
                </li>
                <li>
                  • Integrated multiple Adyen products (Checkout, POS, Platforms, Tap to Pay,
                  tipping, giving, and more) into a single cohesive experience
                </li>
                <li>
                  • Designed complex demo flows and guardrails so non-technical users can reliably
                  generate consistent demo setups
                </li>
              </ul>
            </div>
          </div>

          <div>
            <h3 class="font-semibold text-lg">Housfy</h3>
            <p class="text-sm text-slate-600 mb-2">Barcelona, March 2019 - August 2020</p>
            <p class="text-slate-700 mb-3 leading-relaxed">
              Lead Software Engineer in PropTech, owning core frontend architecture while partnering
              closely with payments and growth initiatives.
            </p>
            <ul class="text-sm text-slate-700 space-y-2 ml-4">
              <li>• Led the frontend stack (Vue.js, Nuxt.js, Tailwind) and established best practices</li>
              <li>
                • Led the payments integration, improving payment processing efficiency by
                <span class="font-medium">~40%</span>
              </li>
              <li>• Implemented the new properties listing and search experience</li>
              <li>
                • Integrated Contentful to generate landing pages dynamically, enabling faster
                go-to-market
              </li>
              <li>• Implemented and A/B tested multiple RPO improvements</li>
            </ul>
          </div>

          <div>
            <h3 class="font-semibold text-lg">Glovoapp</h3>
            <p class="text-sm text-slate-600 mb-2">Barcelona, Sept 2015 - March 2019</p>
            <p class="text-slate-700 mb-3">
              One of the initial engineers, helping scale the company from
              <span class="font-medium">~30 to ~400 employees</span>. As team lead / senior frontend
              engineer, I built the foundations of the web stack and shipped core growth and B2B
              initiatives.
            </p>
            <ul class="text-sm text-slate-700 space-y-2 ml-4">
              <li>• Led the frontend stack (Vue.js, Nuxt.js, Node, GraphQL)</li>
              <li>• Led the Growth / B2B team, delivering experiments at high cadence</li>
              <li>• Implemented and A/B tested multiple RPO improvements</li>
              <li>• Shipped key product lines (Prime, member-get-member, Glovo Business)</li>
              <li>• Migrated the web app from Angular to Vue.js</li>
            </ul>
            <p class="text-sm text-slate-600 mt-2 italic">
              I wrote about part of this journey: migrating from Angular to Vue (and lessons learned).
            </p>
          </div>

          <div>
            <h3 class="font-semibold text-lg">Oliva App</h3>
            <p class="text-sm text-slate-600 mb-2">Barcelona, Feb 2015 - Sept 2015</p>
            <p class="text-slate-700 mb-3">
              At a small startup, I built a full product across mobile and web. We experimented with
              NFC and QR-code based experiences to improve loyalty and engagement for merchants and
              customers.
            </p>
          </div>
        </div>
      </div>

      <!-- Contact -->
      <div>
        <h2 class="text-lg font-semibold mb-3">Contact</h2>
        <div class="text-sm text-slate-700">
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
      </div>
    </div>
  </div>
</template>
