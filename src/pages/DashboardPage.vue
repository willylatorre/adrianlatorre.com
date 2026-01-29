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
              I’ve worked across both product and platform-facing surfaces, with a strong focus on
              building polished customer experiences and the tooling that supports internal teams.
              My work spans everything from UX and component systems to API integration and
              performance.
            </p>
            <ul class="text-sm text-slate-700 space-y-2 ml-4">
              <li>
                • Frontend Engineer owning key parts of <span class="font-medium">Adyen.com</span>
                and related web properties
              </li>
              <li>
                • Previously in the Billing stream, improving invoicing and contract workflows for
                merchants and internal teams
              </li>
              <li>
                • Built and maintained internal tools with a strong emphasis on reliability, clear
                UX, and safe rollouts
              </li>
            </ul>
            <div class="mt-4 p-4 bg-slate-50 rounded-lg">
              <h4 class="font-medium text-slate-900 mb-2">
                Special focus: Adyen demos platform
              </h4>
              <p class="text-sm text-slate-700 mb-3 leading-relaxed">
                I helped create an internal demos platform that lets teams generate high-quality,
                consistent demos quickly, and used it as a place to explore AI-driven workflows and
                agent integrations.
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
                  • Prototyped AI/agent experiences (including MCP-style integrations) to streamline
                  demo creation and guided product exploration
                </li>
              </ul>
            </div>
          </div>

          <div>
            <h3 class="font-semibold text-lg">Housfy</h3>
            <p class="text-sm text-slate-600 mb-2">Barcelona, March 2019 - August 2020</p>
            <p class="text-slate-700 mb-3 leading-relaxed">
              In PropTech, I led frontend initiatives focused on performance, reliability, and a
              product experience that could scale with the business.
            </p>
            <ul class="text-sm text-slate-700 space-y-2 ml-4">
              <li>• Led the frontend stack (Vue.js, Nuxt.js) and established best practices</li>
              <li>• Built “MyHousfy”, a fully featured PWA that improved customer self-service</li>
              <li>• Set up automated testing and quality gates (Jest, Cypress)</li>
              <li>• Implemented analytics tracking to connect product decisions to real behavior</li>
            </ul>
          </div>

          <div>
            <h3 class="font-semibold text-lg">Glovoapp</h3>
            <p class="text-sm text-slate-600 mb-2">Barcelona, Sept 2015 - March 2019</p>
            <p class="text-slate-700 mb-3">
              I joined early and grew with the company as it scaled. As a technical lead, I helped
              ship growth initiatives, modernize the web stack, and improve the developer experience
              for a fast-moving product org.
            </p>
            <ul class="text-sm text-slate-700 space-y-2 ml-4">
              <li>• Led the frontend stack (Vue.js, Nuxt.js, Headless CMS)</li>
              <li>• Led a Growth / B2B team, delivering experiments and iteration at high cadence</li>
              <li>• Implemented and A/B tested multiple conversion improvements</li>
              <li>• Shipped key product lines (Prime, member-get-member referrals, Glovo Business)</li>
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
