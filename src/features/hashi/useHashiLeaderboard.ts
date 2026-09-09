import { ref } from 'vue'
import type {
  HashiLeaderboardResponse,
  HashiScore,
  HashiScoreCreate,
} from '../../types/api-generated'
import type { HashiCategory } from './types'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export function qualifies(
  durationMs: number,
  entries: ReadonlyArray<Pick<HashiScore, 'durationMs'>>,
) {
  return entries.length < 5 || durationMs < entries[4]!.durationMs
}

export function useHashiLeaderboard() {
  const entries = ref<HashiScore[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load(category: HashiCategory) {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE_URL}/hashi/leaderboard?category=${category}&limit=5`)
      if (!response.ok) throw new Error('Could not load the leaderboard.')
      const data = (await response.json()) as HashiLeaderboardResponse
      entries.value = data.entries
      return data.entries
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Could not load the leaderboard.'
      return []
    } finally {
      loading.value = false
    }
  }

  async function submit(score: HashiScoreCreate) {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE_URL}/hashi/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(score),
      })
      if (!response.ok) throw new Error('Could not save your score.')
      const saved = (await response.json()) as HashiScore
      await load(score.category)
      return saved
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Could not save your score.'
      return null
    } finally {
      loading.value = false
    }
  }

  return { entries, loading, error, load, submit, qualifies }
}
