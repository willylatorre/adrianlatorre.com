// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import HashiLeaderboard from './HashiLeaderboard.vue'

describe('HashiLeaderboard', () => {
  it('shows ranked solve times without a hint column', () => {
    const wrapper = mount(HashiLeaderboard, {
      props: {
        category: 'daily',
        loading: false,
        error: null,
        entries: [
          { nickname: 'Ada', durationMs: 60_000, createdAt: '2026-09-24' },
          { nickname: 'Legacy', durationMs: 61_000, createdAt: '2026-09-23' },
        ],
      },
    })

    expect(wrapper.text()).toContain('1:00')
    expect(wrapper.find('[aria-label*="hint"]').exists()).toBe(false)
  })
})
