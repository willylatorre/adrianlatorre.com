<template>
  <div class="max-w-6xl mx-auto py-8">
    <div class="space-y-8">
      <!-- Header -->
      <div>
        <h1 class="text-3xl font-bold mb-4">Pet projects + media</h1>
        <p class="text-slate-600">Personal projects and professional presentations</p>
      </div>

      <!-- Pet Projects -->
      <div>
        <h2 class="text-2xl font-semibold mb-6">Pet Projects</h2>
        <p class="text-slate-600 mb-8 italic">
          When I'm not building things for work, I tinker with crazy ideas that might actually
          change the world... or at least make trading more fun and teaching less boring! 🚀
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <!-- Moneeda -->
          <UCard class="hover:shadow-lg transition-shadow">
            <template #header>
              <h3 class="text-xl font-semibold">Moneeda</h3>
            </template>

            <p class="text-slate-700 mb-4">
              A fintech sandbox to explore ML models to optimize trading decisions
            </p>
            <ul class="text-sm text-slate-600 space-y-2 mb-4">
              <li>• Smart integration with polygon.io to fetch market data in a performant way</li>
              <li>
                • Strategy simulations over a period of time, in parallel and using web workers to
                be more performant
              </li>
              <li>• Book process and import, fetching the historic of the options snapshots</li>
              <li>• Plenty of chart plotting</li>
            </ul>

            <template #footer>
              <a
                href="https://moneeda.com"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
              >
                <UIcon name="i-lucide-external-link" class="w-4 h-4" />
                Visit Moneeda
              </a>
            </template>
          </UCard>

          <!-- Plannerie -->
          <UCard class="hover:shadow-lg transition-shadow">
            <template #header>
              <h3 class="text-xl font-semibold">Plannerie</h3>
            </template>

            <p class="text-slate-700 mb-4">AI-powered teaching assistant</p>
            <ul class="text-sm text-slate-600 space-y-2 mb-4">
              <li>• Integration with serverless infrastructure</li>
              <li>• On-the-fly persistence of image and audio generations to Cloudinary</li>
              <li>• AI SDK to TinyMCE editor integration</li>
            </ul>

            <template #footer>
              <a
                href="https://plannerie.com"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
              >
                <UIcon name="i-lucide-external-link" class="w-4 h-4" />
                Visit Plannerie
              </a>
            </template>
          </UCard>

          <!-- Litesubs -->
          <UCard class="hover:shadow-lg transition-shadow">
            <template #header>
              <h3 class="text-xl font-semibold">Litesubs</h3>
            </template>

            <p class="text-slate-700 mb-4">
              Simple credit plans instead of heavy subscriptions
            </p>
            <ul class="text-sm text-slate-600 space-y-2 mb-4">
              <li>• One-time credit bundles or auto-refill credits in one system</li>
              <li>• Payments integration with dynamic subscription syncing via calendar hooks</li>
              <li>• Exploring React Query performance for flexible billing UX</li>
            </ul>

            <template #footer>
              <a
                href="https://litesubs.com"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
              >
                <UIcon name="i-lucide-external-link" class="w-4 h-4" />
                Visit Litesubs
              </a>
            </template>
          </UCard>
        </div>
      </div>

      <!-- Videos -->
      <div>
        <h2 class="text-2xl font-semibold mb-6">Media</h2>
        <p class="text-slate-600 mb-8 italic">
          Because who doesn't love watching me talk about tech stuff? These are my professional
          ramblings, conference talks, and the occasional "how I broke production" stories! 🎬
        </p>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- Video 1 -->
          <div class="space-y-4">
            <div class="aspect-video">
              <iframe
                src="https://www.youtube.com/embed/wQlmEspvC98"
                title="YouTube video player"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
                class="w-full h-full rounded-lg"
              ></iframe>
            </div>
            <h3 class="text-lg font-semibold">Presentation 1</h3>
          </div>

          <!-- Video 2 -->
          <div class="space-y-4">
            <div class="aspect-video">
              <iframe
                src="https://www.youtube.com/embed/t6en3oPbYTI"
                title="YouTube video player"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
                class="w-full h-full rounded-lg"
              ></iframe>
            </div>
            <h3 class="text-lg font-semibold">Presentation 2</h3>
          </div>

          <!-- Video 3 -->
          <div class="space-y-4">
            <div class="aspect-video">
              <iframe
                src="https://www.youtube.com/embed/nBr2fJ_0Xrk"
                title="YouTube video player"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
                class="w-full h-full rounded-lg"
              ></iframe>
            </div>
            <h3 class="text-lg font-semibold">Presentation 3</h3>
          </div>

          <!-- Video 4 -->
          <div class="space-y-4">
            <div class="aspect-video">
              <iframe
                src="https://www.youtube.com/embed/asUqQjPAGY4"
                title="YouTube video player"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
                class="w-full h-full rounded-lg"
              ></iframe>
            </div>
            <h3 class="text-lg font-semibold">Presentation 4</h3>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
