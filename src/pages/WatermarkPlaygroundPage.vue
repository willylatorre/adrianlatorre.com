<script setup lang="ts">
import { computed, ref } from 'vue'
import WatermarkConfidence from '@/components/watermark/WatermarkConfidence.vue'
import WatermarkPassage from '@/components/watermark/WatermarkPassage.vue'
import { watermarkPassage } from '@/data/watermarkPassage'
import {
  DEMO_WATERMARK_KEY,
  createBaselineSelections,
  scoreWatermark,
  type SelectionMap,
} from '@/utils/watermarkSimulation'

const baseline = createBaselineSelections(watermarkPassage, DEMO_WATERMARK_KEY)
const selections = ref<SelectionMap>({ ...baseline })

const result = computed(() =>
  scoreWatermark(watermarkPassage, selections.value, baseline, DEMO_WATERMARK_KEY),
)

function selectWord(slotId: string, choiceId: string) {
  selections.value = { ...selections.value, [slotId]: choiceId }
}

function resetPassage() {
  selections.value = { ...baseline }
}
</script>

<template>
  <main class="watermark-page">
    <header class="watermark-hero">
      <div class="watermark-hero__meta">
        <p class="watermark-kicker">Experiment 04</p>
        <UBadge color="neutral" variant="outline" size="sm" icon="i-lucide-flask-conical">
          Educational simulation
        </UBadge>
      </div>
      <h1>A watermark you cannot see.</h1>
      <p class="watermark-hero__intro">
        Language models can leave a statistical signature in ordinary word choices. Change the
        marked words and watch that evidence move.
      </p>
    </header>

    <section class="reading-desk" aria-label="Text watermark playground">
      <div class="reading-desk__passage">
        <div class="reading-desk__caption">
          <span>Saturn, shortly before midnight</span>
          <span>{{ watermarkPassage.slots.length }} choices</span>
        </div>
        <WatermarkPassage
          :passage="watermarkPassage"
          :selections="selections"
          :baseline="baseline"
          @select="selectWord"
        />
      </div>

      <div class="reading-desk__confidence">
        <WatermarkConfidence
          :result="result"
          :total-slots="watermarkPassage.slots.length"
          @reset="resetPassage"
        />
      </div>
    </section>

    <section class="watermark-notes" aria-labelledby="watermark-notes-title">
      <UAlert
        title="A model of the mechanism, not a Claude detector"
        description="This playground uses its own demo key and a simplified local detector. It cannot identify Claude or arbitrary AI-written text."
        icon="i-lucide-info"
        color="neutral"
        variant="soft"
        :ui="{
          root: 'rounded-none border border-[var(--site-border)] bg-[var(--site-surface)] shadow-none',
          title: 'text-[var(--site-ink)]',
          description: 'text-[var(--site-muted)]',
        }"
      />

      <UCollapsible class="watermark-explainer">
        <template #default="{ open }">
          <button type="button" class="watermark-explainer__trigger">
            <span>
              <span class="watermark-explainer__eyebrow">Under the hood</span>
              <strong id="watermark-notes-title">How the simulation works</strong>
            </span>
            <UIcon
              name="i-lucide-chevron-down"
              class="h-4 w-4 transition-transform duration-200 motion-reduce:transition-none"
              :class="{ 'rotate-180': open }"
              aria-hidden="true"
            />
          </button>
        </template>

        <template #content>
          <div class="watermark-explainer__content">
            <p>
              Each marked position has several plausible words. A fixed key and the choices that
              came before it assign each candidate a hidden score, then the generated baseline
              picks a strong match.
            </p>
            <p>
              The detector adds those small observations across the passage and compares the total
              with random chance. One edit changes a little evidence, and it can also change how
              later words are scored because recent context is part of the key.
            </p>
            <p>
              Real systems work over model tokens and need much more text than a sentence. They are
              also weaker when the next word is constrained by a fact, a line of code, or a very
              literal proofreading request. In this teaching demo, 80% begins “Possible match”
              and 95% begins “Strong match”; those thresholds are not production detector cutoffs.
            </p>
          </div>
        </template>
      </UCollapsible>

      <footer class="watermark-links">
        <RouterLink to="/blog/notes-from-hiding-a-watermark-in-plain-text">
          Read the build notes
          <UIcon name="i-lucide-arrow-up-right" aria-hidden="true" />
        </RouterLink>
        <a
          href="https://www.anthropic.com/news/claude-text-watermark"
          target="_blank"
          rel="noreferrer"
        >
          Anthropic’s announcement
          <UIcon name="i-lucide-external-link" aria-hidden="true" />
        </a>
        <a
          href="https://www.nature.com/articles/s41586-024-08025-4"
          target="_blank"
          rel="noreferrer"
        >
          SynthID-Text paper
          <UIcon name="i-lucide-external-link" aria-hidden="true" />
        </a>
      </footer>
    </section>
  </main>
</template>

<style scoped>
.watermark-page {
  width: 100%;
  max-width: 70rem;
  margin: 0 auto;
  color: var(--site-ink);
}

.watermark-hero {
  max-width: 55rem;
  padding: clamp(0.5rem, 2vw, 1.25rem) 0 clamp(2rem, 6vw, 4.5rem);
}

.watermark-hero__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 1.2rem;
}

.watermark-kicker {
  margin: 0;
  color: var(--site-accent);
  font-size: 0.7rem;
  font-weight: 720;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.watermark-hero h1 {
  max-width: 13ch;
  margin: 0;
  font-size: clamp(2.65rem, 7vw, 5.6rem);
  font-weight: 660;
  letter-spacing: -0.065em;
  line-height: 0.94;
}

.watermark-hero__intro {
  max-width: 58ch;
  margin: clamp(1.25rem, 3vw, 2rem) 0 0;
  color: var(--site-muted);
  font-size: clamp(1.02rem, 0.95rem + 0.35vw, 1.25rem);
  line-height: 1.62;
}

.reading-desk {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(15rem, 19rem);
  border-top: 1px solid var(--site-border);
  border-bottom: 1px solid var(--site-border);
  background: oklch(0.975 0.009 95);
}

.reading-desk__passage {
  min-width: 0;
  padding: clamp(1.5rem, 4vw, 3.5rem) clamp(1.15rem, 4vw, 3.4rem);
}

.reading-desk__caption {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
  color: var(--site-faint);
  font-size: 0.66rem;
  font-weight: 650;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.reading-desk__confidence {
  padding: clamp(1.5rem, 4vw, 3.2rem) clamp(1.15rem, 3vw, 2.4rem);
  border-left: 1px solid var(--site-border);
  background: var(--site-surface);
}

.watermark-notes {
  display: grid;
  gap: 1.5rem;
  padding: clamp(2.2rem, 6vw, 4.8rem) 0 1rem;
}

.watermark-explainer {
  border-top: 1px solid var(--site-border);
  border-bottom: 1px solid var(--site-border);
}

.watermark-explainer__trigger {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.15rem 0;
  border: 0;
  background: transparent;
  color: var(--site-ink);
  text-align: left;
  cursor: pointer;
}

.watermark-explainer__trigger:focus-visible {
  outline: 2px solid var(--site-accent);
  outline-offset: 4px;
}

.watermark-explainer__trigger span:first-child {
  display: grid;
  gap: 0.2rem;
}

.watermark-explainer__trigger strong {
  font-size: 0.98rem;
  font-weight: 650;
}

.watermark-explainer__eyebrow {
  color: var(--site-faint);
  font-size: 0.65rem;
  font-weight: 650;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.watermark-explainer__content {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(1rem, 3vw, 2.4rem);
  padding: 0.4rem 0 1.5rem;
  color: var(--site-muted);
}

.watermark-explainer__content p {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.7;
}

.watermark-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem 1.25rem;
  padding-top: 0.25rem;
}

.watermark-links a {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--site-muted);
  font-size: 0.78rem;
  text-decoration: none;
}

.watermark-links a:hover {
  color: var(--site-ink);
}

.watermark-links a:focus-visible {
  border-radius: 0.2rem;
  outline: 2px solid var(--site-accent);
  outline-offset: 3px;
}

.watermark-links svg {
  width: 0.78rem;
  height: 0.78rem;
}

@media (max-width: 760px) {
  .watermark-hero {
    padding-bottom: 2.5rem;
  }

  .reading-desk {
    display: flex;
    flex-direction: column;
  }

  .reading-desk__confidence {
    order: -1;
    border-bottom: 1px solid var(--site-border);
    border-left: 0;
  }

  .watermark-explainer__content {
    grid-template-columns: 1fr;
  }
}
</style>
