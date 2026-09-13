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
  'density',
  'mix',
  'geometry',
  'layout',
  'diagonal',
  'reasoning',
  'trace',
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
    expect(wrapper.findAll('.hashi-bridge')).toHaveLength(2)
    expect(wrapper.get('figcaption').text()).toContain('two short corridors')
  })

  it('toggles the generated solution without changing the island clues', async () => {
    const wrapper = mount(HashiArticleDemo, { props: { kind: 'generation' } })
    const clues = wrapper.findAll('.hashi-island-number').map((node) => node.text())

    await wrapper.get('button').trigger('click')

    expect(wrapper.findAll('.hashi-bridge').length).toBeGreaterThan(0)
    expect(wrapper.findAll('.hashi-island-number').map((node) => node.text())).toEqual(clues)
  })

  it('labels the layout comparison as the same amount of puzzle', () => {
    const wrapper = mount(HashiArticleDemo, { props: { kind: 'layout' } })

    expect(wrapper.text()).toContain('Same island count')
    expect(wrapper.text()).toContain('Rails')
    expect(wrapper.text()).toContain('Staggered')
  })

  it('shows that diagonal islands are allowed without allowing orthogonal crowding', () => {
    const wrapper = mount(HashiArticleDemo, { props: { kind: 'diagonal' } })

    expect(wrapper.text()).toContain('Diagonal is allowed')
    expect(wrapper.text()).toContain('Orthogonal touching is not')
  })

  it('contrasts direct capacity with a contradiction deduction', () => {
    const wrapper = mount(HashiArticleDemo, { props: { kind: 'reasoning' } })

    expect(wrapper.text()).toContain('Shorter does not mean easier')
    expect(wrapper.text()).toContain('Direct capacity')
    expect(wrapper.text()).toContain('Contradiction')
  })

  it('renders the ordered deduction trace', () => {
    const wrapper = mount(HashiArticleDemo, { props: { kind: 'trace' } })

    expect(wrapper.findAll('li').map((item) => item.text())).toEqual([
      expect.stringContaining('Capacity'),
      expect.stringContaining('Crossing'),
      expect.stringContaining('Contradiction'),
    ])
  })
})
