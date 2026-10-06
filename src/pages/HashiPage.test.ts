// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeAll, describe, expect, it } from 'vitest'
import HashiPage from './HashiPage.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    {
      path: '/blog/notes-from-building-hashi-one-rule-at-a-time',
      component: { template: '<div />' },
    },
  ],
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
    expect(wrapper.text()).toContain('same row or column')
    expect(wrapper.text()).toContain('nearest island')
    expect(wrapper.text()).toContain('up to two bridges')
    expect(wrapper.text()).toContain('Bridges cannot cross')
    expect(wrapper.text()).toContain('all islands belong to the same network')
    expect(wrapper.text()).toContain('none → one → two → none')
    expect(wrapper.text()).toContain('Satisfied')
    expect(wrapper.text()).toContain('Overfilled')
    expect(wrapper.text()).toContain('whole board is connected')
    expect(wrapper.text()).toContain('If you’re stuck')
    expect(wrapper.text()).toContain('Corner 4, edge 6, and middle 8')
    expect(wrapper.text()).toContain('Corner 3, edge 5, and middle 7')
    expect(wrapper.text()).toContain('A middle 6 facing a 1')
    expect(wrapper.text()).toContain('closed island segment')
    expect(wrapper.get('[data-hashi-techniques-source]').attributes('href')).toContain(
      'conceptispuzzles.com',
    )
  })

  it('offers a saved position instead of linear undo', () => {
    const wrapper = mount(HashiPage, { global: { plugins: [router] } })

    expect(wrapper.find('[data-action="undo"]').exists()).toBe(false)
    expect(wrapper.get('[data-action="save-snapshot"]').text()).toContain('Save position')
    expect(wrapper.get('[data-action="restore-snapshot"]').text()).toContain('Restore position')
  })

  it('keeps the leaderboard nickname out of payment autofill', async () => {
    const wrapper = mount(HashiPage, { global: { plugins: [router] } })
    ;(wrapper.vm as unknown as { nicknameDialogOpen: boolean }).nicknameDialogOpen = true
    await nextTick()
    const input = document.querySelector<HTMLInputElement>('#hashi-nickname')!

    expect(input.getAttribute('autocomplete')).toBe('off')
    expect(input.getAttribute('name')).toBe('hashi-player-alias')
    wrapper.unmount()
  })

  it('fits the board by default and changes its canvas size when zooming', async () => {
    const wrapper = mount(HashiPage, { global: { plugins: [router] } })
    const board = wrapper.get('.hashi-board')

    expect(board.attributes('style')).toContain('width: 100%;')
    expect(wrapper.get('[data-board-zoom]').text()).toBe('Fit')

    await wrapper.get('[data-action="zoom-in"]').trigger('click')

    expect(wrapper.get('.hashi-board').attributes('style')).toContain('width: 110%;')
    expect(wrapper.get('[data-board-zoom]').text()).toBe('110%')

    await wrapper.get('[data-action="zoom-fit"]').trigger('click')
    expect(wrapper.get('.hashi-board').attributes('style')).toContain('width: 100%;')
  })

  it('offers rule-based hints without placing the highlighted bridge', async () => {
    const wrapper = mount(HashiPage, { global: { plugins: [router] } })

    expect(wrapper.get('[data-action="hint"]').text()).toContain('+20s')
    await wrapper.get('[data-action="hint"]').trigger('click')

    expect(wrapper.get('[data-hashi-hint]').attributes('role')).toBe('status')
    expect(wrapper.get('[data-hashi-hint]').text()).toMatch(
      /Only route|Capacity rule|Crossing rule|Keep it connected|Contradiction check/,
    )
    const hinted = wrapper.get('.hashi-corridor-hit.is-hinted')
    expect(hinted.attributes('aria-label')).toContain('0 bridges')
    expect(wrapper.find('[data-hint-hearts]').exists()).toBe(false)
  })

  it('labels satisfied and overfilled board feedback without relying on color', () => {
    const wrapper = mount(HashiPage, { global: { plugins: [router] } })
    const legend = wrapper.get('[data-board-legend]')

    expect(legend.text()).toContain('Satisfied islands and bridges recede')
    expect(legend.text()).toContain('Overfilled islands need a bridge removed')
  })

  it('disables the collapsible content animation for reduced motion', () => {
    const wrapper = mount(HashiPage, { global: { plugins: [router] } })

    expect(wrapper.get('[data-slot="content"]').classes()).toContain('motion-reduce:!animate-none')
    expect(wrapper.get('[data-slot="content"]').classes()).toContain(
      'motion-reduce:data-[state=closed]:hidden',
    )
  })
})
