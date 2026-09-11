// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import HashiArticleDemo from './HashiArticleDemo.vue'

const kinds = [
  'visible',
  'cycle',
  'crossing',
  'totals',
  'connectivity',
  'generation',
  'uniqueness',
  'geometry',
] as const

describe('HashiArticleDemo', () => {
  it.each(kinds)('renders the %s explanation with a caption', (kind) => {
    const wrapper = mount(HashiArticleDemo, { props: { kind } })

    expect(wrapper.get('figure').attributes('data-demo')).toBe(kind)
    expect(wrapper.get('figcaption').text().length).toBeGreaterThan(0)
  })

  it('cycles a production corridor through one, two, and zero bridges', async () => {
    const wrapper = mount(HashiArticleDemo, { props: { kind: 'cycle' } })
    const corridor = wrapper.get('[data-corridor-hit="cycle-a:cycle-b"]')

    await corridor.trigger('click')
    expect(wrapper.findAll('.hashi-bridge')).toHaveLength(1)
    await corridor.trigger('click')
    expect(wrapper.findAll('.hashi-bridge')).toHaveLength(2)
    await corridor.trigger('click')
    expect(wrapper.findAll('.hashi-bridge')).toHaveLength(0)
  })

  it('uses the production crossing rule to refuse an intersecting bridge', async () => {
    const wrapper = mount(HashiArticleDemo, { props: { kind: 'crossing' } })

    await wrapper.get('[data-corridor-hit="cross-bottom:cross-top"]').trigger('click')

    expect(wrapper.findAll('.hashi-bridge')).toHaveLength(1)
    expect(wrapper.get('[role="status"]').text()).toContain('would cross')
  })

  it('isolates the nearest-visible-island rule in its opening example', () => {
    const wrapper = mount(HashiArticleDemo, { props: { kind: 'visible' } })

    expect(wrapper.findAll('.hashi-island')).toHaveLength(3)
    expect(wrapper.findAll('.hashi-bridge')).toHaveLength(1)
    expect(wrapper.get('figcaption').text()).toContain('left island can reach the middle island')
  })

  it('toggles the generated solution without changing the island clues', async () => {
    const wrapper = mount(HashiArticleDemo, { props: { kind: 'generation' } })
    const clues = wrapper.findAll('.hashi-island-number').map((node) => node.text())

    await wrapper.get('button').trigger('click')

    expect(wrapper.findAll('.hashi-bridge').length).toBeGreaterThan(0)
    expect(wrapper.findAll('.hashi-island-number').map((node) => node.text())).toEqual(clues)
  })
})
