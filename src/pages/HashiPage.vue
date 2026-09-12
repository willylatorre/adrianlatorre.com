<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import HashiBoard from '../components/hashi/HashiBoard.vue'
import HashiControls from '../components/hashi/HashiControls.vue'
import { useHashiGame } from '../features/hashi/useHashiGame'
import HashiLeaderboard from '../components/hashi/HashiLeaderboard.vue'
import { useHashiLeaderboard } from '../features/hashi/useHashiLeaderboard'

const game = useHashiGame()
const leaderboard = useHashiLeaderboard()
const nicknameDialogOpen = ref(false)
const nickname = ref('')
const pendingScore = ref<{ durationMs: number; puzzleFingerprint: string } | null>(null)
const submittedFingerprints = new Set<string>()

const categoryLabels = {
  intro: 'Intro puzzle',
  daily: 'Daily puzzle',
  weekly: 'Weekly puzzle',
  monthly: 'Monthly puzzle',
} as const

const categoryLabel = computed(() => categoryLabels[game.preferredCategory.value])
const formattedElapsed = computed(() => {
  const totalSeconds = Math.floor(game.elapsedMs.value / 1_000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})
const validNickname = computed(
  () => nickname.value.trim().length >= 1 && nickname.value.trim().length <= 20,
)

async function loadLeaderboard() {
  await leaderboard.load(game.preferredCategory.value)
}

async function maybeQualify() {
  const fingerprint = game.puzzle.value.id
  if (!game.evaluation.value.solved || submittedFingerprints.has(fingerprint) || pendingScore.value)
    return
  const entries = await leaderboard.load(game.preferredCategory.value)
  if (!leaderboard.error.value && leaderboard.qualifies(game.elapsedMs.value, entries)) {
    pendingScore.value = { durationMs: game.elapsedMs.value, puzzleFingerprint: fingerprint }
    nickname.value = ''
    nicknameDialogOpen.value = true
  }
}

async function submitScore() {
  if (!pendingScore.value || !validNickname.value) return
  const saved = await leaderboard.submit({
    category: game.preferredCategory.value,
    puzzleFingerprint: pendingScore.value.puzzleFingerprint,
    nickname: nickname.value.trim(),
    durationMs: pendingScore.value.durationMs,
  })
  if (!saved) return
  submittedFingerprints.add(pendingScore.value.puzzleFingerprint)
  pendingScore.value = null
  nicknameDialogOpen.value = false
}

function discardScore() {
  pendingScore.value = null
  nicknameDialogOpen.value = false
}

onMounted(loadLeaderboard)
watch(() => game.preferredCategory.value, loadLeaderboard)
watch(
  () => game.evaluation.value.solved,
  (solved) => {
    if (solved) void maybeQualify()
  },
)
</script>

<template>
  <main class="hashi-page">
    <header class="hashi-hero">
      <p class="hashi-kicker">Experiment 05 · Logic puzzle</p>
      <h1>Build some bridges.</h1>
      <p class="hashi-intro">
        Connect every island without crossing paths. One click adds a bridge; a third clears the
        corridor.
      </p>
    </header>

    <HashiControls
      :category="game.preferredCategory.value"
      :bridge-counts="game.bridgeCounts.value"
      :can-restore-snapshot="game.canRestoreSnapshot.value"
      @select-category="game.selectCategory"
      @save-snapshot="game.saveSnapshot"
      @restore-snapshot="game.restoreSnapshot"
      @reset="game.reset"
      @new-puzzle="game.newPuzzle"
    />

    <section data-section="board" class="hashi-board-section" aria-label="Hashi puzzle">
      <div class="hashi-meta">
        <span>{{ categoryLabel }}</span>
        <time :datetime="`PT${Math.floor(game.elapsedMs.value / 1_000)}S`">{{
          formattedElapsed
        }}</time>
      </div>
      <div v-if="game.generating.value" class="hashi-board-loading" role="status">
        Building puzzle…
      </div>
      <div
        v-else-if="game.puzzle.value.id.startsWith('fallback-')"
        class="hashi-board-loading"
        role="status"
      >
        This puzzle could not be built. Try “New puzzle”.
      </div>
      <HashiBoard
        v-else
        :puzzle="game.puzzle.value"
        :bridge-counts="game.bridgeCounts.value"
        @cycle="game.cycleCorridor"
      />
      <aside class="hashi-legend" data-board-legend aria-label="Board feedback">
        <span>
          <i class="hashi-legend-mark is-satisfied" aria-hidden="true" />
          Satisfied islands and bridges recede
        </span>
        <span>
          <i class="hashi-legend-mark is-overfilled" aria-hidden="true" />
          Overfilled islands need a bridge removed
        </span>
      </aside>
      <p
        v-if="game.evaluation.value.allCountsMatch && !game.evaluation.value.connected"
        class="hashi-status"
        role="status"
      >
        All islands have the right number of bridges, but some groups are still stranded.
      </p>
    </section>

    <section data-section="rules" class="hashi-rules" aria-labelledby="hashi-rules-title">
      <UCollapsible :ui="{ content: 'motion-reduce:!animate-none' }">
        <template #default>
          <button
            id="hashi-rules-title"
            type="button"
            data-rules-trigger
            class="hashi-rules-trigger"
          >
            How to play
            <UIcon name="i-lucide-chevron-down" aria-hidden="true" />
          </button>
        </template>
        <template #content>
          <p class="hashi-rules-intro">
            Each corridor cycles 0 → 1 → 2 → 0. Satisfied islands recede; overfilled islands need a
            bridge removed. If every number matches but groups are stranded, keep connecting.
          </p>
          <ol>
            <li>Connect islands only horizontally or vertically.</li>
            <li>Connect only the nearest visible island in a row or column.</li>
            <li>Never pass a bridge through an island.</li>
            <li>Use no more than two bridges in one corridor.</li>
            <li>Never cross another bridge.</li>
            <li>Match every island's number exactly.</li>
            <li>Keep every island in one connected network.</li>
          </ol>
          <div class="hashi-techniques">
            <h3>Useful deductions</h3>
            <ul>
              <li>A 1 or 2 with only one neighbor sends that many bridges to it.</li>
              <li>Corner 4, edge 6, and middle 8 force two bridges in every direction.</li>
              <li>Corner 3, edge 5, and middle 7 force at least one bridge in every direction.</li>
              <li>
                A middle 6 facing a 1 forces at least one bridge toward each of its other three
                neighbors.
              </li>
              <li>
                A forced bridge closes every route that would cross it, often starting a cascade.
              </li>
              <li>
                Never complete a closed island segment—such as 1–1 or a doubled 2–2—before the whole
                board is connected.
              </li>
            </ul>
            <a
              data-hashi-techniques-source
              href="https://www.conceptispuzzles.com/index.aspx?uri=puzzle/hashi/techniques"
              >See the illustrated Conceptis techniques</a
            >
          </div>
        </template>
      </UCollapsible>
    </section>

    <section
      data-section="leaderboard"
      class="hashi-leaderboard"
      aria-labelledby="hashi-leaderboard-title"
    >
      <HashiLeaderboard
        :category="game.preferredCategory.value"
        :entries="leaderboard.entries.value"
        :loading="leaderboard.loading.value"
        :error="leaderboard.error.value"
        @retry="loadLeaderboard"
      />
      <RouterLink class="hashi-build-notes" to="/blog/notes-from-building-hashi-one-rule-at-a-time">
        Read the build notes
        <UIcon name="i-lucide-arrow-up-right" aria-hidden="true" />
      </RouterLink>
    </section>

    <UModal
      v-model:open="nicknameDialogOpen"
      :dismissible="true"
      @update:open="(open: boolean) => !open && discardScore()"
    >
      <template #content>
        <form class="hashi-nickname-dialog" @submit.prevent="submitScore">
          <p class="hashi-kicker">Top five time</p>
          <h2>Put a name on it?</h2>
          <p>Your solve joins the {{ categoryLabel.toLowerCase() }} board.</p>
          <label for="hashi-nickname">Nickname</label>
          <UInput
            id="hashi-nickname"
            v-model="nickname"
            maxlength="20"
            autocomplete="nickname"
            autofocus
          />
          <div class="hashi-nickname-actions">
            <UButton type="button" color="neutral" variant="ghost" @click="discardScore"
              >Not now</UButton
            >
            <UButton
              type="submit"
              color="primary"
              :disabled="!validNickname || leaderboard.loading.value"
              >Save time</UButton
            >
          </div>
        </form>
      </template>
    </UModal>
  </main>
</template>

<style scoped>
.hashi-page {
  width: 100%;
  max-width: none;
  color: var(--site-ink);
}

.hashi-hero {
  max-width: 54rem;
  padding: 0.5rem 0 2.4rem;
}

.hashi-kicker {
  margin: 0;
  color: var(--site-accent);
  font-size: 0.68rem;
  font-weight: 720;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.hashi-hero h1 {
  margin: 0.8rem 0 0;
  font-size: clamp(2.6rem, 6vw, 5rem);
  font-weight: 680;
  letter-spacing: -0.06em;
  line-height: 0.96;
}

.hashi-intro {
  max-width: 60ch;
  margin: 1.25rem 0 0;
  color: var(--site-muted);
  font-size: 1.04rem;
  line-height: 1.65;
}

.hashi-board-section {
  width: 100%;
  max-width: none;
  margin-top: 1.35rem;
}

.hashi-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.7rem;
  color: var(--site-muted);
  font-size: 0.72rem;
  font-weight: 680;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hashi-meta time {
  color: var(--site-ink);
  font-variant-numeric: tabular-nums;
}

.hashi-status {
  margin: 0.9rem 0 0;
  color: var(--site-muted);
  font-size: 0.88rem;
  line-height: 1.55;
}

.hashi-board-loading {
  display: grid;
  min-height: min(64vh, 34rem);
  place-items: center;
  border: 1px solid var(--site-border);
  color: var(--site-muted);
  font-size: 0.82rem;
}

.hashi-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem 1.15rem;
  margin-top: 0.8rem;
  color: var(--site-muted);
  font-size: 0.74rem;
  line-height: 1.45;
}

.hashi-legend span {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
}

.hashi-legend-mark {
  display: inline-block;
  width: 0.7rem;
  height: 0.7rem;
  border: 1px solid currentColor;
  border-radius: 0.2rem;
}

.hashi-legend-mark.is-satisfied {
  color: color-mix(in oklch, var(--site-accent) 60%, var(--site-ink));
  background: color-mix(in oklch, var(--site-accent) 17%, var(--site-bg));
}

.hashi-legend-mark.is-overfilled {
  color: oklch(0.48 0.105 32);
  background: color-mix(in oklch, oklch(0.48 0.105 32) 11%, var(--site-bg));
}

.hashi-rules,
.hashi-leaderboard {
  max-width: 48rem;
  border-top: 1px solid var(--site-border);
}

.hashi-rules {
  margin-top: clamp(2.5rem, 7vw, 5rem);
}

.hashi-rules-trigger {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 0;
  border: 0;
  background: transparent;
  color: var(--site-ink);
  font: inherit;
  font-size: 0.95rem;
  font-weight: 650;
  text-align: left;
  cursor: pointer;
}

.hashi-rules-trigger:focus-visible {
  outline: 2px solid var(--site-accent);
  outline-offset: 3px;
}

.hashi-rules ol {
  display: grid;
  gap: 0.55rem;
  margin: 0;
  padding: 0 0 1.45rem 1.35rem;
  color: var(--site-muted);
  font-size: 0.86rem;
  line-height: 1.55;
}

.hashi-techniques {
  padding: 0 0 1.45rem;
}

.hashi-techniques h3 {
  margin: 0 0 0.7rem;
  font-size: 0.86rem;
  font-weight: 680;
}

.hashi-techniques ul {
  display: grid;
  gap: 0.55rem;
  margin: 0;
  padding-left: 1.35rem;
  color: var(--site-muted);
  font-size: 0.86rem;
  line-height: 1.55;
}

.hashi-techniques a {
  display: inline-block;
  margin-top: 0.8rem;
  color: var(--site-ink);
  font-size: 0.8rem;
}

.hashi-rules-intro {
  max-width: 62ch;
  margin: 0 0 0.9rem;
  color: var(--site-muted);
  font-size: 0.86rem;
  line-height: 1.55;
}

.hashi-leaderboard {
  margin-top: clamp(2.2rem, 6vw, 4rem);
}

.hashi-leaderboard h2 {
  margin: 0.5rem 0 0;
  font-size: 1.05rem;
  font-weight: 680;
  letter-spacing: -0.02em;
}

.hashi-leaderboard p:last-child {
  margin: 0.35rem 0 0;
  color: var(--site-muted);
  font-size: 0.86rem;
}

.hashi-nickname-dialog {
  width: min(100vw - 2rem, 24rem);
  padding: 1.5rem;
  background: var(--site-surface);
}
.hashi-nickname-dialog h2 {
  margin: 0.55rem 0 0;
  font-size: 1.45rem;
  letter-spacing: -0.04em;
}
.hashi-nickname-dialog > p:not(.hashi-kicker) {
  margin: 0.45rem 0 1.3rem;
  color: var(--site-muted);
  font-size: 0.9rem;
}
.hashi-nickname-dialog label {
  display: block;
  margin-bottom: 0.45rem;
  font-size: 0.8rem;
  font-weight: 650;
}
.hashi-nickname-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.45rem;
  margin-top: 1.1rem;
}

.hashi-build-notes {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 1rem;
  color: var(--site-ink);
  font-size: 0.84rem;
  font-weight: 620;
  text-decoration: none;
}
.hashi-build-notes:hover {
  text-decoration: underline;
}

@media (max-width: 700px) {
  .hashi-hero {
    padding-bottom: 1.8rem;
  }

  .hashi-hero h1 {
    font-size: 2.75rem;
  }

  .hashi-intro {
    font-size: 0.98rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hashi-rules-trigger {
    transition: none;
  }
}
</style>
