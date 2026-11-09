// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TokenCounter from './TokenCounter.vue'
import { createInitialState, deriveStats } from '../../features/token-eater/engine'
import { toMicro } from '../../features/token-eater/numbers'
import type { Milestone } from '../../features/token-eater/content'

const AT = 1_700_000_000_000

const milestone: Milestone = {
  at: 1_000n,
  label: '1K tokens',
  note: 'One short conversation. You have already spent more.',
}

function mountCounter(
  overrides: {
    tokensMicro?: bigint
    lifetimeMicro?: bigint
    exactView?: boolean
    won?: boolean
    nextMilestone?: Milestone | null
  } = {},
) {
  const state = createInitialState(AT)
  const tokensMicro = overrides.tokensMicro ?? 0n
  const lifetimeMicro = overrides.lifetimeMicro ?? tokensMicro
  const stats = deriveStats({ ...state, tokens: tokensMicro, lifetimeTokens: lifetimeMicro })
  const props: {
    tokensMicro: bigint
    lifetimeMicro: bigint
    stats: ReturnType<typeof deriveStats>
    nextMilestone: Milestone | null
    clickYieldMicro: bigint
    exactView: boolean
    won: boolean
  } = {
    tokensMicro,
    lifetimeMicro,
    stats,
    nextMilestone: milestone,
    clickYieldMicro: stats.clickYieldMicro,
    exactView: overrides.exactView ?? false,
    won: overrides.won ?? false,
  }
  // `null` is a meaningful value here, not "use the default".
  if ('nextMilestone' in overrides) props.nextMilestone = overrides.nextMilestone ?? null
  return mount(TokenCounter, { props })
}

describe('TokenCounter', () => {
  it('emits a click when the muncher is pressed', async () => {
    const wrapper = mountCounter()
    await wrapper.get('[data-token-muncher]').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('shows the compact value by default', () => {
    const wrapper = mountCounter({ tokensMicro: toMicro(1_234n) })
    expect(wrapper.get('[data-token-balance]').text()).toBe('1.23K')
    expect(wrapper.get('[data-token-balance]').classes()).not.toContain('is-exact')
  })

  it('shows every digit in exact mode', async () => {
    const wrapper = mountCounter({ tokensMicro: toMicro(1_234n) })
    await wrapper.get('.counter__exact-toggle').trigger('click')
    expect(wrapper.emitted('toggle-exact')).toHaveLength(1)
  })

  it('renders the grouped number when exact view is on', () => {
    const wrapper = mountCounter({ tokensMicro: toMicro(1_234n), exactView: true })
    expect(wrapper.get('[data-token-balance]').text()).toBe('1,234')
    expect(wrapper.get('[data-token-balance]').classes()).toContain('is-exact')
  })

  it('forces the exact view when the run is won', () => {
    // The whole point of the page is the 18-digit number, so a finished run
    // must not hide it behind "999.99Qa".
    const wrapper = mountCounter({
      tokensMicro: toMicro(999_999_999_999_999_999n),
      won: true,
    })
    expect(wrapper.get('[data-token-balance]').text()).toBe('999,999,999,999,999,999')
  })

  it('disables the muncher once won', () => {
    const wrapper = mountCounter({ won: true })
    expect(wrapper.get('[data-token-muncher]').attributes('disabled')).toBeDefined()
  })

  it('reports progress through an accessible progressbar', () => {
    const wrapper = mountCounter({
      tokensMicro: toMicro(500_000_000_000_000_000n),
      lifetimeMicro: toMicro(500_000_000_000_000_000n),
    })
    const bar = wrapper.get('[role="progressbar"]')
    expect(bar.attributes('aria-valuemin')).toBe('0')
    expect(bar.attributes('aria-valuemax')).toBe('100')
    expect(Number(bar.attributes('aria-valuenow'))).toBeGreaterThan(49)
    expect(Number(bar.attributes('aria-valuenow'))).toBeLessThan(51)
  })

  it('names the next milestone and its note', () => {
    const wrapper = mountCounter({ tokensMicro: toMicro(10n) })
    expect(wrapper.get('[data-next-milestone]').text()).toContain('1K tokens')
    expect(wrapper.get('[data-milestone-note]').text()).toContain('One short conversation')
  })

  it('shows the final stretch when there is no milestone left', () => {
    const wrapper = mountCounter({ nextMilestone: null })
    expect(wrapper.text()).toContain('Final stretch')
  })

  it('shows a fractional click yield instead of rounding to zero', () => {
    const wrapper = mountCounter()
    expect(wrapper.get('[data-click-yield]').text()).toBe('1')
  })
})
