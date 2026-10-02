<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, onUnmounted, ref, watch } from 'vue'
import HashiBoard from '../components/hashi/HashiBoard.vue'
import HashiControls from '../components/hashi/HashiControls.vue'
import HashiArticleDemo from '../components/hashi/HashiArticleDemo.vue'
import { useHashiGame } from '../features/hashi/useHashiGame'
import HashiLeaderboard from '../components/hashi/HashiLeaderboard.vue'
import { useHashiLeaderboard } from '../features/hashi/useHashiLeaderboard'
import { HASHI_CATEGORY_LABELS } from '../features/hashi/types'

const game = useHashiGame()
const leaderboard = useHashiLeaderboard()
const nicknameDialogOpen = ref(false)
const nickname = ref('')
const completionState = ref<'checking' | 'qualified' | 'missed' | 'unavailable' | null>(null)
const completionResult = ref<{
  category: Parameters<typeof game.selectCategory>[0]
  durationMs: number
  hintsUsed: number
  puzzleFingerprint: string
} | null>(null)
const pendingScore = ref<{
  durationMs: number
  hintsUsed: number
  puzzleFingerprint: string
} | null>(null)
const submittedFingerprints = new Set<string>()
const boardZoom = ref<number | null>(null)
const positionFeedback = ref<'saved' | 'restored' | null>(null)
let positionFeedbackTimer: ReturnType<typeof setTimeout> | undefined
let confettiTimer: ReturnType<typeof setTimeout> | undefined
let completionHandledForRun = false

const confetti = getCurrentInstance()?.appContext.config.globalProperties.$confetti

const categoryLabel = computed(() => HASHI_CATEGORY_LABELS[game.preferredCategory.value])
const categoryPuzzleLabel = computed(() => `${categoryLabel.value} puzzle`)
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

async function checkCompletionResult() {
  const result = completionResult.value
  if (!result) return

  completionState.value = 'checking'
  const entries = await leaderboard.load(result.category)
  if (completionResult.value !== result || game.puzzle.value.id !== result.puzzleFingerprint) return

  if (leaderboard.error.value) {
    completionState.value = 'unavailable'
    return
  }

  if (leaderboard.qualifies(result.durationMs, result.hintsUsed, entries)) {
    pendingScore.value = result
    nickname.value = ''
    completionState.value = 'qualified'
    return
  }

  pendingScore.value = null
  completionState.value = 'missed'
}

function celebrateCompletion() {
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (prefersReducedMotion || !confetti) return
  if (confettiTimer) clearTimeout(confettiTimer)
  confetti.remove()
  confetti.start({
    particles: [
      { type: 'circle', size: 7 },
      { type: 'rect', size: 6 },
    ],
    defaultColors: ['#38645a', '#c9a96e', '#8b929d'],
    particlesPerFrame: 0.45,
    defaultDropRate: 7,
  })
  confettiTimer = setTimeout(() => {
    confetti.stop()
    confetti.remove()
  }, 2_200)
}

function resetCompletionState() {
  completionHandledForRun = false
  completionState.value = null
  completionResult.value = null
  pendingScore.value = null
  nicknameDialogOpen.value = false
}

function handleCompletion() {
  const fingerprint = game.puzzle.value.id
  if (completionHandledForRun || submittedFingerprints.has(fingerprint)) return
  completionHandledForRun = true
  completionResult.value = {
    category: game.preferredCategory.value,
    durationMs: game.elapsedMs.value,
    hintsUsed: game.hintsUsed.value,
    puzzleFingerprint: fingerprint,
  }
  nicknameDialogOpen.value = true
  celebrateCompletion()
  void checkCompletionResult()
}

async function submitScore() {
  if (!pendingScore.value || !validNickname.value) return
  const saved = await leaderboard.submit({
    category: game.preferredCategory.value,
    puzzleFingerprint: pendingScore.value.puzzleFingerprint,
    nickname: nickname.value.trim(),
    durationMs: pendingScore.value.durationMs,
    hintsUsed: pendingScore.value.hintsUsed,
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

function retryCompletionCheck() {
  void checkCompletionResult()
}

function zoomBoard(direction: 'in' | 'out') {
  const current = boardZoom.value ?? 1
  const next = current + (direction === 'in' ? 0.1 : -0.1)
  boardZoom.value = Math.round(Math.min(1.6, Math.max(0.6, next)) * 10) / 10
}

function showPositionFeedback(feedback: 'saved' | 'restored') {
  if (positionFeedbackTimer) clearTimeout(positionFeedbackTimer)
  positionFeedback.value = feedback
  positionFeedbackTimer = setTimeout(() => {
    positionFeedback.value = null
  }, 1_500)
}

function savePosition() {
  game.saveSnapshot()
  showPositionFeedback('saved')
}

function restorePosition() {
  game.restoreSnapshot()
  showPositionFeedback('restored')
}

function clearPositionFeedback() {
  if (positionFeedbackTimer) clearTimeout(positionFeedbackTimer)
  positionFeedback.value = null
}

function resetPuzzle() {
  clearPositionFeedback()
  resetCompletionState()
  game.reset()
}

function newPuzzle() {
  clearPositionFeedback()
  resetCompletionState()
  game.newPuzzle()
}

function selectCategory(category: Parameters<typeof game.selectCategory>[0]) {
  clearPositionFeedback()
  resetCompletionState()
  game.selectCategory(category)
}

onMounted(loadLeaderboard)
onUnmounted(() => {
  clearPositionFeedback()
  if (confettiTimer) clearTimeout(confettiTimer)
  confetti?.remove()
})
watch(() => game.preferredCategory.value, loadLeaderboard)
watch(
  () => game.evaluation.value.solved,
  (solved) => {
    if (solved) handleCompletion()
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
      :has-snapshot="game.hasSnapshot.value"
      :position-feedback="positionFeedback"
      :hints-remaining="game.hintsRemaining.value"
      :has-active-hint="game.activeHint.value !== null"
      :hint-unavailable="game.generating.value"
      :board-zoom="boardZoom"
      @select-category="selectCategory"
      @save-snapshot="savePosition"
      @restore-snapshot="restorePosition"
      @request-hint="game.requestHint"
      @zoom-out="zoomBoard('out')"
      @zoom-fit="boardZoom = null"
      @zoom-in="zoomBoard('in')"
      @reset="resetPuzzle"
      @new-puzzle="newPuzzle"
    />
    <p v-if="game.hintFeedback.value" class="hashi-hint-feedback" data-hashi-hint role="status">
      <strong v-if="game.activeHint.value">{{ game.activeHint.value.title }}.</strong>
      {{ game.hintFeedback.value }}
    </p>

    <section data-section="board" class="hashi-board-section" aria-label="Hashi puzzle">
      <div class="hashi-meta">
        <span>{{ categoryPuzzleLabel }}</span>
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
        :hint-corridor-id="game.activeHint.value?.corridorId"
        :hint-minimum-count="game.activeHint.value?.minimumCount"
        :feedback-corridor-ids="game.feedbackCorridorIds.value"
        :zoom="boardZoom ?? 1"
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
      <UCollapsible
        :unmount-on-hide="true"
        :ui="{
          content:
            'overflow-hidden data-[state=open]:animate-[collapsible-down_200ms_ease-out] data-[state=closed]:animate-[collapsible-up_200ms_ease-out] motion-reduce:data-[state=closed]:hidden motion-reduce:!animate-none',
        }"
      >
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
          <div class="hashi-rules-content">
            <section class="hashi-rules-group" aria-labelledby="hashi-goal-title">
              <h3 id="hashi-goal-title">The goal</h3>
              <p>
                Connect every island in a single network. Its number is the total bridges touching
                it; a double bridge counts as two.
              </p>
            </section>

            <section class="hashi-rules-group" aria-labelledby="hashi-rules-list-title">
              <h3 id="hashi-rules-list-title">The rules</h3>
              <ol>
                <li>
                  Join islands in the same row or column, using the nearest island. Bridges cannot
                  pass through another island.
                </li>
                <li>
                  A corridor can hold up to two bridges. Click it to cycle: none → one → two → none.
                </li>
                <li>Bridges cannot cross.</li>
                <li>Match every number, then check that all islands belong to the same network.</li>
              </ol>
            </section>

            <section class="hashi-example" aria-labelledby="hashi-example-title">
              <h3 id="hashi-example-title">Example: two islands marked 2</h3>
              <p>Each island sees only the other, so two bridges satisfy both clues.</p>
              <HashiArticleDemo kind="cycle" />
            </section>

            <div class="hashi-techniques">
              <h3>If you’re stuck</h3>
              <ul>
                <li>A 1 or 2 with only one neighbor sends that many bridges to it.</li>
                <li>Corner 4, edge 6, and middle 8 force two bridges in every direction.</li>
                <li>
                  Corner 3, edge 5, and middle 7 force at least one bridge in every direction.
                </li>
                <li>
                  A middle 6 facing a 1 forces at least one bridge toward each of its other three
                  neighbors.
                </li>
                <li>
                  A forced bridge closes every route that would cross it, often starting a cascade.
                </li>
                <li>
                  Never complete a closed island segment—such as 1–1 or a doubled 2–2—before the
                  whole board is connected.
                </li>
              </ul>
              <a
                data-hashi-techniques-source
                href="https://www.conceptispuzzles.com/index.aspx?uri=puzzle/hashi/techniques"
                >See the illustrated Conceptis techniques</a
              >
            </div>
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
        <div
          class="hashi-nickname-dialog"
          :class="{
            'has-leaderboard': completionState === 'missed' || completionState === 'unavailable',
          }"
        >
          <template v-if="completionState === 'checking'">
            <p class="hashi-kicker">Puzzle complete</p>
            <h2>Checking your time…</h2>
            <p>One moment while we check the {{ categoryLabel.toLowerCase() }} leaderboard.</p>
          </template>
          <template v-else-if="completionState === 'qualified' || completionState === null">
            <form @submit.prevent="submitScore">
              <p class="hashi-kicker">Top five time</p>
              <h2>Put a name on it?</h2>
              <p>Your solve joins the {{ categoryLabel.toLowerCase() }} board.</p>
              <label for="hashi-nickname">Nickname</label>
              <UInput
                id="hashi-nickname"
                v-model="nickname"
                name="hashi-player-alias"
                maxlength="20"
                autocomplete="off"
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
          <template v-else>
            <p class="hashi-kicker">Puzzle complete</p>
            <h2 v-if="completionState === 'missed'">Hmm, you didn’t make the leaderboard.</h2>
            <h2 v-else>Your time is ready to check.</h2>
            <p v-if="completionState === 'missed'">
              Here are the current fastest {{ categoryLabel.toLowerCase() }} solves.
            </p>
            <p v-else>We couldn’t reach the leaderboard just now. Try again in a moment.</p>
            <HashiLeaderboard
              heading-id="hashi-completion-leaderboard-title"
              :category="completionResult?.category ?? game.preferredCategory.value"
              :entries="leaderboard.entries.value"
              :loading="leaderboard.loading.value"
              :error="leaderboard.error.value"
              @retry="retryCompletionCheck"
            />
            <div class="hashi-nickname-actions">
              <UButton type="button" color="primary" @click="discardScore">Close</UButton>
            </div>
          </template>
        </div>
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

.hashi-hint-feedback {
  max-width: 54rem;
  margin: 0.85rem 0 0;
  padding: 0.65rem 0.8rem;
  border: 1px solid color-mix(in oklch, var(--site-accent) 24%, var(--site-border));
  border-radius: 0.55rem;
  background: color-mix(in oklch, var(--site-accent) 5%, var(--site-bg));
  color: var(--site-muted);
  font-size: 0.84rem;
  line-height: 1.55;
}

.hashi-hint-feedback strong {
  color: var(--site-ink);
  font-weight: 700;
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

.hashi-rules-content {
  display: grid;
  max-width: 43rem;
  gap: 1.2rem;
  padding-bottom: 1.5rem;
}

.hashi-rules-group h3,
.hashi-techniques h3 {
  margin: 0 0 0.45rem;
  font-size: 0.88rem;
  font-weight: 680;
}

.hashi-rules-group p {
  margin: 0;
  color: var(--site-muted);
  font-size: 0.86rem;
  line-height: 1.55;
}

.hashi-rules ol {
  display: grid;
  gap: 0.65rem;
  margin: 0;
  padding: 0;
  color: var(--site-muted);
  font-size: 0.86rem;
  line-height: 1.55;
  list-style: none;
  counter-reset: hashi-rule;
}

.hashi-rules ol li {
  display: grid;
  grid-template-columns: 1.35rem 1fr;
  gap: 0.55rem;
  counter-increment: hashi-rule;
}

.hashi-rules ol li::before {
  content: counter(hashi-rule) '.';
  color: var(--site-accent);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.hashi-example {
  display: grid;
  gap: 0.35rem;
  margin: 0;
  padding: 0.95rem 0;
  border-block: 1px solid var(--site-border);
}

.hashi-example h3 {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 680;
}

.hashi-example > p {
  margin: 0;
  color: var(--site-muted);
  font-size: 0.86rem;
  line-height: 1.55;
}

:deep(.hashi-example .hashi-article-demo) {
  max-width: none;
  margin: 0.4rem 0 0;
}

.hashi-techniques {
  padding-top: 0.1rem;
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
.hashi-nickname-dialog.has-leaderboard {
  width: min(100vw - 2rem, 34rem);
  max-height: min(85vh, 42rem);
  overflow-y: auto;
}
.hashi-nickname-dialog > form {
  display: grid;
}
.hashi-nickname-dialog h2 {
  margin: 0.55rem 0 0;
  font-size: 1.45rem;
  letter-spacing: -0.04em;
}
.hashi-nickname-dialog p:not(.hashi-kicker) {
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
.hashi-nickname-dialog.has-leaderboard .hashi-nickname-actions {
  margin-top: 1rem;
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
