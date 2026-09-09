// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeAll, describe, expect, it } from 'vitest'
import HashiPage from './HashiPage.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: { template: '<div />' } }],
})

beforeAll(async () => {
  await router.push('/')
  await router.isReady()
})

describe('HashiPage', () => {
  it('places rules and leaderboard after the board', () => {
    const wrapper = mount(HashiPage, { global: { plugins: [router] } })
    const sections = [...wrapper.element.querySelectorAll('[data-section]')].map((node) =>
      node.getAttribute('data-section'),
    )

    expect(sections).toEqual(['board', 'rules', 'leaderboard'])
  })

  it('keeps every Hashi rule available in the collapsed guide', async () => {
    const wrapper = mount(HashiPage, { global: { plugins: [router] } })

    await wrapper.get('[data-rules-trigger]').trigger('click')

    expect(wrapper.text()).toContain('How to play')
    expect(wrapper.text()).toContain('horizontally or vertically')
    expect(wrapper.text()).toContain('nearest visible island')
    expect(wrapper.text()).toContain('no more than two bridges')
    expect(wrapper.text()).toContain('Never cross another bridge')
    expect(wrapper.text()).toContain('one connected network')
    expect(wrapper.text()).toContain('0 → 1 → 2 → 0')
    expect(wrapper.text()).toContain('Satisfied')
    expect(wrapper.text()).toContain('overfilled')
    expect(wrapper.text()).toContain('stranded')
  })

  it('labels satisfied and overfilled board feedback without relying on color', () => {
    const wrapper = mount(HashiPage, { global: { plugins: [router] } })
    const legend = wrapper.get('[data-board-legend]')

    expect(legend.text()).toContain('Satisfied islands and bridges recede')
    expect(legend.text()).toContain('Overfilled islands need a bridge removed')
  })
})
