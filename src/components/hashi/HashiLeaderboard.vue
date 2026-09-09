<script setup lang="ts">
import type { HashiScore } from '../../types/api-generated'
import type { HashiCategory } from '../../features/hashi/types'

defineProps<{
  category: HashiCategory
  entries: HashiScore[]
  loading: boolean
  error: string | null
}>()

defineEmits<{ retry: [] }>()

function formatDuration(durationMs: number) {
  const seconds = Math.floor(durationMs / 1_000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
</script>

<template>
  <div class="hashi-leaderboard-content">
    <div class="hashi-leaderboard-heading">
      <div>
        <p class="hashi-kicker">Fastest {{ category }}</p>
        <h2 id="hashi-leaderboard-title">Leaderboard</h2>
      </div>
      <span v-if="loading" class="hashi-leaderboard-note">Loading</span>
    </div>
    <p v-if="error" class="hashi-leaderboard-note" role="status">
      {{ error }}
      <button type="button" @click="$emit('retry')">Try again</button>
    </p>
    <ol v-else-if="entries.length" class="hashi-score-list">
      <li v-for="(entry, index) in entries" :key="`${entry.nickname}-${entry.createdAt}`">
        <span>{{ index + 1 }}</span
        ><strong>{{ entry.nickname }}</strong
        ><time>{{ formatDuration(entry.durationMs) }}</time>
      </li>
    </ol>
    <p v-else class="hashi-leaderboard-note">No recorded solves yet.</p>
  </div>
</template>

<style scoped>
.hashi-leaderboard-content {
  padding: 1.2rem 0 0;
}
.hashi-leaderboard-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
}
.hashi-leaderboard-heading h2 {
  margin: 0.5rem 0 0;
  font-size: 1.05rem;
  font-weight: 680;
  letter-spacing: -0.02em;
}
.hashi-leaderboard-note {
  margin: 0.55rem 0 0;
  color: var(--site-muted);
  font-size: 0.82rem;
}
.hashi-leaderboard-note button {
  margin-left: 0.4rem;
  border: 0;
  background: transparent;
  color: var(--site-ink);
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
}
.hashi-score-list {
  display: grid;
  gap: 0.15rem;
  margin: 0.75rem 0 0;
  padding: 0;
  list-style: none;
  font-size: 0.88rem;
}
.hashi-score-list li {
  display: grid;
  grid-template-columns: 1.5rem 1fr auto;
  gap: 0.6rem;
  padding: 0.35rem 0;
  border-top: 1px solid color-mix(in oklch, var(--site-border) 70%, transparent);
}
.hashi-score-list span,
.hashi-score-list time {
  color: var(--site-muted);
  font-variant-numeric: tabular-nums;
}
.hashi-score-list strong {
  font-weight: 580;
}
</style>
