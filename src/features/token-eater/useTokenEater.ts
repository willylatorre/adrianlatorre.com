import { computed, getCurrentScope, onScopeDispose, ref, shallowRef, type Ref } from 'vue'
import {
  createInitialState,
  click as clickState,
  buyAutoClicker as buyAutoClickerState,
  buyClickUpgrade,
  buyProducer,
  buyUpgrade,
  deriveStats,
  tick,
  usePowerup,
  type DerivedStats,
  type EngineState,
  type PowerupResult,
  type PurchaseResult,
} from './engine'
import {
  POWERUPS,
  PRODUCERS,
  type ClickUpgradeId,
  type PowerupId,
  type ProducerId,
  type UpgradeId,
} from './content'
import {
  createChannel,
  loadState,
  OFFLINE_REPORT_MIN_MS,
  offlineElapsedMs,
  saveState,
  type ChannelFactory,
  type SaveChannel,
  type StorageLike,
} from './persistence'

/**
 * Vue binding for the engine.
 *
 * Responsibilities, in order:
 * - hold the authoritative state in a `shallowRef` (the state object is
 *   replaced, never mutated, so Vue only re-renders on real transitions);
 * - run one animation-frame loop that advances the simulation;
 * - throttle writes to localStorage;
 * - pay offline earnings once on load;
 * - adopt newer saves from other tabs over a BroadcastChannel.
 *
 * The engine itself stays pure, which is why this file is mostly scheduling.
 */

export interface UseTokenEaterOptions {
  storage?: StorageLike | null
  now?: () => number
  channelFactory?: ChannelFactory
  /** Injectable loop for tests. Receives a callback and returns a cancel fn. */
  schedule?: (callback: (nowMs: number) => void) => () => void
  /** How often to persist, in milliseconds. */
  saveIntervalMs?: number
  /** Time source that can be advanced in tests. */
  autoStart?: boolean
}

export interface OfflineReport {
  elapsedMs: number
  gainedMicro: bigint
}

export interface TokenEaterGame {
  readonly state: Readonly<Ref<EngineState>>
  readonly stats: Readonly<Ref<DerivedStats>>
  readonly won: Readonly<Ref<boolean>>
  readonly offlineReport: Readonly<Ref<OfflineReport | null>>
  readonly saveError: Readonly<Ref<boolean>>
  readonly producers: typeof PRODUCERS
  readonly powerups: typeof POWERUPS
  readonly nextProducer: Readonly<Ref<ProducerId | null>>
  click(): void
  buyAutoClicker(amount?: number | 'max'): PurchaseResult
  buy(id: ProducerId, amount?: number | 'max'): PurchaseResult
  buyGlobalUpgrade(id: UpgradeId): PurchaseResult
  buyClick(id: ClickUpgradeId): PurchaseResult
  usePowerup(id: PowerupId): PowerupResult
  reset(): void
  dismissOfflineReport(): void
  /** Force a tick; useful when the tab was hidden and the loop was paused. */
  refresh(): void
}

const DEFAULT_SAVE_INTERVAL_MS = 1_500

export function useTokenEater(options: UseTokenEaterOptions = {}): TokenEaterGame {
  const now = options.now ?? Date.now
  const startedAt = now()

  const restored = loadState(options.storage, startedAt)
  const initial = restored?.state ?? createInitialState(startedAt)

  const state = shallowRef<EngineState>(initial)
  const offlineReport = ref<OfflineReport | null>(null)
  const saveError = ref(false)
  const lastSavedAt = ref(startedAt)
  const clock = ref(startedAt)

  const stats = computed(() => deriveStats(state.value, clock.value))
  const won = computed(() => state.value.wonAt !== null)

  const nextProducer = computed<ProducerId | null>(() => {
    const current = state.value
    const locked = PRODUCERS.find((producer) => (current.producers[producer.id] ?? 0) === 0)
    return locked?.id ?? null
  })

  // Pay offline progress exactly once, through the same tick used by the loop.
  // Short gaps are simulated silently; only a real absence is worth a dialog.
  if (restored) {
    const elapsed = offlineElapsedMs(restored.savedAt, startedAt)
    if (elapsed > 1_000) {
      const before = restored.state.tokens
      const advanced = tick(restored.state, elapsed, startedAt)
      const gained = advanced.tokens - before
      if (gained > 0n && elapsed >= OFFLINE_REPORT_MIN_MS) {
        offlineReport.value = { elapsedMs: elapsed, gainedMicro: gained }
      }
      state.value = advanced
    }
  }

  const channel: SaveChannel | null = options.channelFactory
    ? createChannel(options.channelFactory)
    : createChannel()

  const persist = (force = false) => {
    const at = now()
    if (!force && at - lastSavedAt.value < (options.saveIntervalMs ?? DEFAULT_SAVE_INTERVAL_MS)) {
      return
    }
    const ok = saveState(state.value, options.storage, at)
    saveError.value = !ok
    if (ok) {
      lastSavedAt.value = at
      channel?.postMessage({ type: 'save', savedAt: at, state: state.value })
    }
  }

  if (channel && typeof channel.addEventListener === 'function') {
    channel.addEventListener('message', (event: MessageEvent) => {
      const payload = event.data as { type?: string; savedAt?: number; state?: EngineState } | null
      if (!payload || payload.type !== 'save' || !payload.state) return
      // Adopt another tab's save only when it is meaningfully newer, so the
      // two tabs cannot ping-pong writes at each other.
      if ((payload.savedAt ?? 0) <= lastSavedAt.value + 1_000) return
      state.value = payload.state
      lastSavedAt.value = payload.savedAt ?? now()
    })
  } else if (channel) {
    channel.onmessage = (event: MessageEvent) => {
      const payload = event.data as { type?: string; savedAt?: number; state?: EngineState } | null
      if (!payload || payload.type !== 'save' || !payload.state) return
      if ((payload.savedAt ?? 0) <= lastSavedAt.value + 1_000) return
      state.value = payload.state
      lastSavedAt.value = payload.savedAt ?? now()
    }
  }

  let cancel: (() => void) | null = null
  let lastFrameAt = now()

  const advance = (frameAt: number) => {
    const elapsed = Math.min(frameAt - lastFrameAt, 5_000)
    lastFrameAt = frameAt
    clock.value = frameAt
    if (elapsed <= 0) return
    const next = tick(state.value, elapsed, frameAt)
    if (next !== state.value) {
      state.value = next
      persist()
    }
  }

  const defaultSchedule = (callback: (nowMs: number) => void) => {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      return () => {}
    }
    let frame = 0
    let stopped = false
    const loop = (at: number) => {
      if (stopped) return
      callback(at)
      frame = window.requestAnimationFrame(loop)
    }
    frame = window.requestAnimationFrame(loop)
    return () => {
      stopped = true
      window.cancelAnimationFrame(frame)
    }
  }

  if (options.autoStart !== false) {
    cancel = (options.schedule ?? defaultSchedule)((frameAt) => advance(frameAt))
  }

  const finish = () => {
    cancel?.()
    channel?.close()
    persist(true)
  }

  if (getCurrentScope()) {
    onScopeDispose(finish)
  }

  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        persist(true)
      } else {
        // Coming back from a hidden tab: the animation loop may have been
        // throttled, so treat the gap as elapsed time and pay it through the
        // same capped tick path.
        const at = now()
        const elapsed = Math.min(at - state.value.lastTickAt, 60 * 60 * 1_000)
        lastFrameAt = at
        if (elapsed > 0) {
          clock.value = at
          state.value = tick(state.value, elapsed, at)
        }
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    if (getCurrentScope()) {
      onScopeDispose(() => document.removeEventListener('visibilitychange', onVisibility))
    }
  }

  return {
    state,
    stats,
    won,
    offlineReport,
    saveError,
    producers: PRODUCERS,
    powerups: POWERUPS,
    nextProducer,
    click() {
      const result = clickState(state.value, now())
      if (result.gainedMicro > 0n) {
        state.value = result.state
        persist()
      }
    },
    buyAutoClicker(amount = 1) {
      const result = buyAutoClickerState(state.value, amount, now())
      if (result.ok) {
        state.value = result.state
        persist(true)
      }
      return result
    },
    buy(id, amount = 1) {
      const result = buyProducer(state.value, id, amount, now())
      if (result.ok) {
        state.value = result.state
        persist(true)
      }
      return result
    },
    buyGlobalUpgrade(id) {
      const result = buyUpgrade(state.value, id, now())
      if (result.ok) {
        state.value = result.state
        persist(true)
      }
      return result
    },
    buyClick(id) {
      const result = buyClickUpgrade(state.value, id, now())
      if (result.ok) {
        state.value = result.state
        persist(true)
      }
      return result
    },
    usePowerup(id) {
      const result = usePowerup(state.value, id, now())
      if (result.ok) {
        state.value = result.state
        persist(true)
      }
      return result
    },
    reset() {
      state.value = createInitialState(now())
      lastFrameAt = now()
      clock.value = lastFrameAt
      lastSavedAt.value = 0
      offlineReport.value = null
      persist(true)
    },
    dismissOfflineReport() {
      offlineReport.value = null
    },
    refresh() {
      const at = now()
      const elapsed = Math.min(at - state.value.lastTickAt, 60 * 60 * 1_000)
      lastFrameAt = at
      clock.value = at
      if (elapsed > 0) state.value = tick(state.value, elapsed, at)
    },
  }
}
