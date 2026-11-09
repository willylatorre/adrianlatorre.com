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
 * - pause the simulation whenever the document is hidden;
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

export interface TokenEaterGame {
  readonly state: Readonly<Ref<EngineState>>
  readonly stats: Readonly<Ref<DerivedStats>>
  readonly won: Readonly<Ref<boolean>>
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
}

const DEFAULT_SAVE_INTERVAL_MS = 1_500

export function useTokenEater(options: UseTokenEaterOptions = {}): TokenEaterGame {
  const now = options.now ?? Date.now
  const startedAt = now()

  const restored = loadState(options.storage)
  const initial = restored?.state ?? createInitialState(startedAt)

  const state = shallowRef<EngineState>(initial)
  const saveError = ref(false)
  const lastSavedAt = ref(restored?.savedAt ?? startedAt)

  const stats = computed(() => deriveStats(state.value))
  const won = computed(() => state.value.wonAt !== null)

  const nextProducer = computed<ProducerId | null>(() => {
    const current = state.value
    const locked = PRODUCERS.find((producer) => (current.producers[producer.id] ?? 0) === 0)
    return locked?.id ?? null
  })

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
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      lastFrameAt = frameAt
      return
    }
    const elapsed = Math.min(frameAt - lastFrameAt, 5_000)
    lastFrameAt = frameAt
    if (elapsed <= 0) return
    const next = tick(state.value, elapsed, now())
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
    const loop = () => {
      if (stopped) return
      // RAF timestamps are performance-relative, while saves and cooldowns
      // use wall time. Feed the same clock used to seed lastFrameAt.
      callback(now())
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
        lastFrameAt = now()
        persist(true)
      } else {
        // Restart the frame baseline without catching up hidden time. The
        // economy and its cooldowns only advance while this tab is visible.
        lastFrameAt = now()
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
      const result = buyAutoClickerState(state.value, amount)
      if (result.ok) {
        state.value = result.state
        persist(true)
      }
      return result
    },
    buy(id, amount = 1) {
      const result = buyProducer(state.value, id, amount)
      if (result.ok) {
        state.value = result.state
        persist(true)
      }
      return result
    },
    buyGlobalUpgrade(id) {
      const result = buyUpgrade(state.value, id)
      if (result.ok) {
        state.value = result.state
        persist(true)
      }
      return result
    },
    buyClick(id) {
      const result = buyClickUpgrade(state.value, id)
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
      lastSavedAt.value = 0
      persist(true)
    },
  }
}
