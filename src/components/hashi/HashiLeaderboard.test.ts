// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import HashiLeaderboard from './HashiLeaderboard.vue'

describe('HashiLeaderboard', () => {
  it('shows recorded hints and labels legacy scores as unknown', () => {
    const wrapper = mount(HashiLeaderboard, {
      props: {
        category: 'daily',
        loading: false,
        error: null,
        entries: [
          { nickname: 'Ada', durationMs: 60_000, hintsUsed: 2, createdAt: '2026-09-24' },
          { nickname: 'Legacy', durationMs: 61_000, hintsUsed: null, createdAt: '2026-09-23' },
        ],
      },
    })

    expect(wrapper.get('[aria-label="2 hints used"]').text()).toContain('2')
    expect(wrapper.get('[aria-label="Hint use not recorded"]').text()).toContain('—')
  })
})
