import { rateToMicro, toMicro } from './numbers'

/**
 * Everything the game knows about its own content.
 *
 * Money is written as `bigint` literals rather than `number` because the late
 * tiers and upgrades exceed `Number.MAX_SAFE_INTEGER`. Writing
 * `196_000_000_000_000_000` as a `number` would silently become
 * `196000000000000000`, which happens to look right until you try to subtract
 * from it. BigInt literals keep the table honest all the way to the goal.
 *
 * The curve is a classic incremental shape: each tier costs roughly 26x the
 * last and produces about 22x as much, so a new tier is always a real step up
 * while still requiring a visible wait. Global upgrades then multiply
 * everything. `balance.test.ts` replays a greedy player against these numbers
 * and asserts the run lands in a sane window, so changing the table without
 * re-checking the pacing fails the suite.
 */

export type ProducerId =
  | 'autocomplete'
  | 'chat'
  | 'toolcall'
  | 'embeddings'
  | 'finetune'
  | 'cluster'
  | 'datacenter'
  | 'frontier'
  | 'selfplay'
  | 'corpus'
  | 'rnd'
  | 'singularity'

export interface ProducerDefinition {
  id: ProducerId
  name: string
  /** Short, slightly dry description used in the shop. */
  blurb: string
  icon: string
  /** Cost of the first unit, in whole tokens. */
  baseCost: bigint
  /** Tokens per second contributed by one unit. */
  baseRate: number
  /** Human-facing tier number, starting at 1. */
  tier: number
}

export const PRODUCERS: readonly ProducerDefinition[] = [
  {
    id: 'autocomplete',
    name: 'Autocomplete',
    blurb: 'Finishes your sentence. Occasionally your thought.',
    icon: 'i-lucide-sparkles',
    baseCost: 30n,
    baseRate: 0.5,
    tier: 1,
  },
  {
    id: 'chat',
    name: 'Chat',
    blurb: 'Answers questions you could have answered yourself.',
    icon: 'i-lucide-message-circle',
    baseCost: 780n,
    baseRate: 11,
    tier: 2,
  },
  {
    id: 'toolcall',
    name: 'Tool call',
    blurb: 'Reads a file, edits a file, apologises for the file.',
    icon: 'i-lucide-wrench',
    baseCost: 19_500n,
    baseRate: 242,
    tier: 3,
  },
  {
    id: 'embeddings',
    name: 'Embeddings',
    blurb: 'Turns meaning into vectors, then mostly loses them.',
    icon: 'i-lucide-database',
    baseCost: 508_000n,
    baseRate: 5_324,
    tier: 4,
  },
  {
    id: 'finetune',
    name: 'Fine-tune',
    blurb: 'Teaches a model your house style. And your typos.',
    icon: 'i-lucide-sliders-horizontal',
    baseCost: 13_300_000n,
    baseRate: 117_128,
    tier: 5,
  },
  {
    id: 'cluster',
    name: 'GPU cluster',
    blurb: 'A room that turns electricity into tokens and heat.',
    icon: 'i-lucide-server',
    baseCost: 352_000_000n,
    baseRate: 2_576_816,
    tier: 6,
  },
  {
    id: 'datacenter',
    name: 'Datacenter',
    blurb: 'The cluster got a building. The building got a budget.',
    icon: 'i-lucide-building-2',
    baseCost: 9_800_000_000n,
    baseRate: 56_689_952,
    tier: 7,
  },
  {
    id: 'frontier',
    name: 'Frontier lab',
    blurb: 'Hires researchers to argue about whether this counts.',
    icon: 'i-lucide-brain',
    baseCost: 274_000_000_000n,
    baseRate: 1_247_178_944,
    tier: 8,
  },
  {
    id: 'selfplay',
    name: 'Self-play',
    blurb: 'The model writes prompts for the model. Nobody sleeps.',
    icon: 'i-lucide-repeat-2',
    baseCost: 7_800_000_000_000n,
    baseRate: 27_437_936_768,
    tier: 9,
  },
  {
    id: 'corpus',
    name: 'The corpus',
    blurb: 'Everything anyone ever wrote, fed back in.',
    icon: 'i-lucide-layers',
    baseCost: 235_000_000_000_000n,
    baseRate: 603_634_608_896,
    tier: 10,
  },
  {
    id: 'rnd',
    name: 'R&D department',
    blurb: 'A department whose product is the next department.',
    icon: 'i-lucide-flask-conical',
    baseCost: 6_800_000_000_000_000n,
    baseRate: 13_279_961_395_712,
    tier: 11,
  },
  {
    id: 'singularity',
    name: 'Recursive improvement',
    blurb: 'At this point the roadmap writes itself. Literally.',
    icon: 'i-lucide-infinity',
    baseCost: 196_000_000_000_000_000n,
    baseRate: 292_159_150_705_664,
    tier: 12,
  },
] as const

export type UpgradeId =
  | 'batching'
  | 'caching'
  | 'speculative'
  | 'quantization'
  | 'distillation'
  | 'moe'
  | 'fusion'
  | 'consistency'
  | 'recursion'
  | 'scaling'
  | 'emergence'

export interface UpgradeDefinition {
  id: UpgradeId
  name: string
  blurb: string
  icon: string
  /** Whole-token price. */
  cost: bigint
  /** Multiplier applied to every producer rate. */
  multiplier: number
}

/**
 * One-time global multipliers. This is the "powerups along the way" layer:
 * each is a visible jump in income, unlocked by price rather than by menu
 * navigation, and each names a real inference trick.
 */
export const UPGRADES: readonly UpgradeDefinition[] = [
  {
    id: 'batching',
    name: 'Request batching',
    blurb: 'One GPU, many prompts. The first real efficiency win.',
    icon: 'i-lucide-boxes',
    cost: 900n,
    multiplier: 2,
  },
  {
    id: 'caching',
    name: 'Prompt caching',
    blurb: 'Stop paying full price to re-read the same system prompt.',
    icon: 'i-lucide-database',
    cost: 25_000n,
    multiplier: 2,
  },
  {
    id: 'speculative',
    name: 'Speculative decoding',
    blurb: 'A small model guesses. The big model checks. Faster.',
    icon: 'i-lucide-zap',
    cost: 650_000n,
    multiplier: 2,
  },
  {
    id: 'quantization',
    name: 'Quantization',
    blurb: 'Four bits, most of the meaning, a fraction of the bill.',
    icon: 'i-lucide-package',
    cost: 17_000_000n,
    multiplier: 2,
  },
  {
    id: 'distillation',
    name: 'Distillation',
    blurb: 'The big model teaches a small one to do its job.',
    icon: 'i-lucide-flask-conical',
    cost: 450_000_000n,
    multiplier: 2,
  },
  {
    id: 'moe',
    name: 'Mixture of experts',
    blurb: 'Only wake the parameters that might know something.',
    icon: 'i-lucide-orbit',
    cost: 12_000_000_000n,
    multiplier: 2,
  },
  {
    id: 'fusion',
    name: 'Inference fusion',
    blurb: 'Several steps of reasoning collapse into one pass.',
    icon: 'i-lucide-atom',
    cost: 350_000_000_000n,
    multiplier: 2,
  },
  {
    id: 'consistency',
    name: 'Self-consistency',
    blurb: 'Ask the same question several ways and take the vote.',
    icon: 'i-lucide-repeat-2',
    cost: 10_000_000_000_000n,
    multiplier: 2,
  },
  {
    id: 'recursion',
    name: 'Recursive summarisation',
    blurb: 'Summarise the summaries. The context window breathes.',
    icon: 'i-lucide-layers',
    cost: 300_000_000_000_000n,
    multiplier: 2,
  },
  {
    id: 'scaling',
    name: 'Scaling laws',
    blurb: 'More of everything, predictably better. Allegedly.',
    icon: 'i-lucide-trending-up',
    cost: 9_000_000_000_000_000n,
    multiplier: 2,
  },
  {
    id: 'emergence',
    name: 'Emergent behaviour',
    blurb: 'It started doing the thing nobody asked it to do.',
    icon: 'i-lucide-sparkles',
    cost: 250_000_000_000_000_000n,
    multiplier: 3,
  },
] as const

export type PowerupId = 'cache-hit' | 'batch-window' | 'overclock' | 'test-time' | 'distill'

export interface PowerupDefinition {
  id: PowerupId
  name: string
  blurb: string
  icon: string
  /** Lifetime tokens that must be earned before this appears. */
  unlockAt: bigint
  /** Seconds before it can be used again. */
  cooldownSeconds: number
  kind: 'instant' | 'multiplier'
  /** For instant powerups: seconds of production granted. */
  secondsOfProduction?: number
  /** For multiplier powerups: how long it runs and how strong it is. */
  durationSeconds?: number
  multiplier?: number
}

/**
 * The active layer. Each powerup has a cooldown so using it is a decision
 * rather than a held button, and the instant ones pay out multiples of your
 * own production so they stay relevant late in the run.
 */
export const POWERUPS: readonly PowerupDefinition[] = [
  {
    id: 'cache-hit',
    name: 'Cache hit',
    blurb: 'Collect 30 seconds of production, immediately.',
    icon: 'i-lucide-database',
    unlockAt: 2_000n,
    cooldownSeconds: 90,
    kind: 'instant',
    secondsOfProduction: 30,
  },
  {
    id: 'batch-window',
    name: 'Batch window',
    blurb: 'Collect three minutes of production in one go.',
    icon: 'i-lucide-timer',
    unlockAt: 60_000n,
    cooldownSeconds: 240,
    kind: 'instant',
    secondsOfProduction: 180,
  },
  {
    id: 'overclock',
    name: 'Overclock',
    blurb: 'Triple production for 20 seconds. Mind the thermals.',
    icon: 'i-lucide-gauge',
    unlockAt: 8_000_000n,
    cooldownSeconds: 150,
    kind: 'multiplier',
    durationSeconds: 20,
    multiplier: 3,
  },
  {
    id: 'test-time',
    name: 'Test-time compute',
    blurb: 'Ten times production for 10 seconds. Think harder.',
    icon: 'i-lucide-brain',
    unlockAt: 5_000_000_000n,
    cooldownSeconds: 240,
    kind: 'multiplier',
    durationSeconds: 10,
    multiplier: 10,
  },
  {
    id: 'distill',
    name: 'Distillation run',
    blurb: 'Collect fifteen minutes of production. Spend it wisely.',
    icon: 'i-lucide-flask-conical',
    unlockAt: 2_000_000_000_000n,
    cooldownSeconds: 600,
    kind: 'instant',
    secondsOfProduction: 900,
  },
] as const

export type ClickUpgradeId = 'spoon' | 'ladle' | 'excavator' | 'vacuum' | 'horizon'

export const AUTO_CLICKER = {
  name: 'Unsupervised intern',
  blurb: 'Has access to the big button. HR is reviewing the setup.',
  icon: 'i-lucide-mouse-pointer-click',
  cost: 10n,
  costGrowthNumerator: 10n,
  costGrowthDenominator: 1n,
  intervalMs: 1_000,
} as const

export interface ClickUpgradeDefinition {
  id: ClickUpgradeId
  name: string
  blurb: string
  icon: string
  cost: bigint
  multiplier: number
}

/**
 * The click is itself a producer: it earns at least one percent of your
 * passive rate, and these upgrades multiply that. Early on they are the
 * fastest way out of the tutorial. Later they are a rounding error, which is
 * the joke.
 */
export const CLICK_UPGRADES: readonly ClickUpgradeDefinition[] = [
  {
    id: 'spoon',
    name: 'Bigger spoon',
    blurb: 'The default clicking utensil is improved.',
    icon: 'i-lucide-utensils',
    cost: 30n,
    multiplier: 3,
  },
  {
    id: 'ladle',
    name: 'Ladle',
    blurb: 'Spoon is to soup as ladle is to tokens.',
    icon: 'i-lucide-hand-coins',
    cost: 800n,
    multiplier: 3,
  },
  {
    id: 'excavator',
    name: 'Excavator',
    blurb: 'No longer a utensil. Now a capital expense.',
    icon: 'i-lucide-construction',
    cost: 50_000n,
    multiplier: 3,
  },
  {
    id: 'vacuum',
    name: 'Token vacuum',
    blurb: 'Pulls tokens out of the air, which is where they live.',
    icon: 'i-lucide-wind',
    cost: 7_000_000n,
    multiplier: 3,
  },
  {
    id: 'horizon',
    name: 'Event horizon',
    blurb: 'At this point the tokens are falling toward you.',
    icon: 'i-lucide-orbit',
    cost: 2_000_000_000n,
    multiplier: 5,
  },
] as const

export const PRODUCER_BY_ID = new Map(PRODUCERS.map((item) => [item.id, item]))
export const UPGRADE_BY_ID = new Map(UPGRADES.map((item) => [item.id, item]))
export const POWERUP_BY_ID = new Map(POWERUPS.map((item) => [item.id, item]))
export const CLICK_UPGRADE_BY_ID = new Map(CLICK_UPGRADES.map((item) => [item.id, item]))

/** Converted once so the engine never multiplies a cost by a float. */
export const PRODUCER_BASE_COST_MICRO: ReadonlyMap<ProducerId, bigint> = new Map(
  PRODUCERS.map((item) => [item.id, toMicro(item.baseCost)]),
)

export const PRODUCER_BASE_RATE_MICRO: ReadonlyMap<ProducerId, bigint> = new Map(
  PRODUCERS.map((item) => [item.id, rateToMicro(item.baseRate)]),
)

export const UPGRADE_COST_MICRO: ReadonlyMap<UpgradeId, bigint> = new Map(
  UPGRADES.map((item) => [item.id, toMicro(item.cost)]),
)

export const CLICK_UPGRADE_COST_MICRO: ReadonlyMap<ClickUpgradeId, bigint> = new Map(
  CLICK_UPGRADES.map((item) => [item.id, toMicro(item.cost)]),
)

/**
 * The click floor is one percent of passive production. Expressed as the
 * divisor so the engine stays in integers.
 */
export const CLICK_RATE_DIVISOR = 100n

/** Narrative beats shown as a quiet line as the lifetime total crosses them. */
export interface Milestone {
  at: bigint
  label: string
  note: string
}

export const MILESTONES: readonly Milestone[] = [
  {
    at: 1_000n,
    label: '1K tokens',
    note: 'One short conversation. You have already spent more.',
  },
  {
    at: 1_000_000n,
    label: '1M tokens',
    note: 'A small novel, or one very confident agent.',
  },
  {
    at: 1_000_000_000n,
    label: '1B tokens',
    note: 'Enough context to lose track of what you were doing.',
  },
  {
    at: 1_000_000_000_000n,
    label: '1T tokens',
    note: 'The number from the brief. There is further to go.',
  },
  {
    at: 1_000_000_000_000_000n,
    label: '1Qa tokens',
    note: 'You are now past what a double can count exactly.',
  },
] as const

export const WIN_NOTE =
  'You reached 999,999,999,999,999,999 tokens. One short of a round number, which is the most realistic part of this game.'
