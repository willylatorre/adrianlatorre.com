// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import HashiBoard from './HashiBoard.vue'
import HashiControls from './HashiControls.vue'
import type { HashiPuzzle } from '../../features/hashi/types'

const puzzle: HashiPuzzle = {
  id: 'board-test',
  category: 'intro',
  width: 7,
  height: 7,
  islands: [
    { id: 'a', x: 1, y: 1, clue: 1 },
    { id: 'b', x: 5, y: 1, clue: 1 },
    { id: 'c', x: 3, y: 3, clue: 1 },
    { id: 'd', x: 3, y: 5, clue: 1 },
  ],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('HashiBoard', () => {
  it('emits cycle from click, Enter, and Space', async () => {
    const wrapper = mount(HashiBoard, { props: { puzzle, bridgeCounts: {} } })
    const target = wrapper.get('[data-corridor-hit="a:b"]')

    await target.trigger('click')
    await target.trigger('keydown.enter')
    await target.trigger('keydown.space')

    expect(wrapper.emitted('cycle')?.map(([id]) => id)).toEqual(['a:b', 'a:b', 'a:b'])
  })

  it('keeps zero-bridge corridors interactive through their hit target', async () => {
    const wrapper = mount(HashiBoard, { props: { puzzle, bridgeCounts: {} } })
    const target = wrapper.get('[data-corridor-hit="c:d"]')

    await target.trigger('click')
    await target.trigger('keydown.enter')
    await target.trigger('keydown.space')

    expect(wrapper.emitted('cycle')?.map(([id]) => id)).toEqual(['c:d', 'c:d', 'c:d'])
  })

  it('renders an expanded transparent corridor hit stroke', () => {
    const wrapper = mount(HashiBoard, { props: { puzzle, bridgeCounts: {} } })
    const hit = wrapper.get('[data-corridor-hit="a:b"] .hashi-hit')

    expect(hit.attributes('stroke')).toBe('transparent')
    expect(hit.attributes('stroke-width')).toBe('28')
    expect(hit.attributes('pointer-events')).toBe('stroke')
  })

  it('renders global grid, bridge, hit, and island layers in order', () => {
    const wrapper = mount(HashiBoard, {
      props: { puzzle, bridgeCounts: { 'a:b': 1, 'c:d': 2 } },
    })
    const layers = wrapper.get('svg').element.children

    expect([...layers].map((layer) => layer.getAttribute('class'))).toEqual([
      'hashi-grid',
      'hashi-bridges',
      'hashi-hits',
      'hashi-islands',
    ])
    expect(wrapper.findAll('.hashi-bridges .hashi-bridge')).toHaveLength(3)
    expect(wrapper.findAll('.hashi-hits .hashi-hit')).toHaveLength(2)
    expect(wrapper.get('.hashi-bridges').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('.hashi-bridges').attributes('role')).toBeUndefined()
    expect(wrapper.get('.hashi-bridges').attributes('tabindex')).toBeUndefined()
    expect(wrapper.get('[data-corridor-hit="a:b"]').attributes()).toMatchObject({
      role: 'button',
      tabindex: '0',
    })
  })

  it('uses one coordinate system for exact island and bridge geometry', () => {
    const wrapper = mount(HashiBoard, {
      props: { puzzle, bridgeCounts: { 'a:b': 1, 'c:d': 2 } },
    })
    const island = wrapper.get('[data-island="a"] rect')
    const horizontal = wrapper.get('[data-corridor="a:b"] .hashi-bridge')
    const vertical = wrapper.findAll('[data-corridor="c:d"] .hashi-bridge')

    expect(island.attributes()).toMatchObject({
      x: '21',
      y: '21',
      width: '38',
      height: '38',
      rx: '11',
    })
    expect(horizontal.attributes()).toMatchObject({ x1: '59', y1: '40', x2: '181', y2: '40' })
    expect(vertical.map((line) => line.attributes('x1'))).toEqual(['117', '123'])
    expect(wrapper.get('svg').attributes('viewBox')).toBe('-20 -20 280 280')
  })

  it('exposes corridor and island state without relying on color alone', () => {
    const wrapper = mount(HashiBoard, {
      props: { puzzle, bridgeCounts: { 'a:b': 2 } },
    })

    expect(wrapper.get('[data-corridor-hit="a:b"]').attributes('aria-label')).toContain('2 bridges')
    expect(wrapper.get('[data-island="a"]').classes()).toContain('is-overfilled')
    expect(wrapper.get('[data-island="a"]').attributes('aria-label')).toContain('overfilled')
    expect(wrapper.get('[data-island="a"] .hashi-island-status').text()).toBe('!')
  })

  it('recedes every bridge incident to a satisfied island', () => {
    const wrapper = mount(HashiBoard, {
      props: { puzzle, bridgeCounts: { 'a:b': 1, 'c:d': 1 } },
    })

    expect(wrapper.get('[data-island="a"]').classes()).toContain('is-satisfied')
    expect(wrapper.get('[data-corridor="a:b"] .hashi-bridge').classes()).toContain('is-satisfied')
  })

  it('recedes a bridge when exactly one endpoint is satisfied', () => {
    const oneSatisfiedPuzzle = {
      ...puzzle,
      islands: puzzle.islands.map((island) =>
        island.id === 'b' ? { ...island, clue: 2 } : island,
      ),
    }
    const wrapper = mount(HashiBoard, {
      props: { puzzle: oneSatisfiedPuzzle, bridgeCounts: { 'a:b': 1 } },
    })

    expect(wrapper.get('[data-island="a"]').classes()).toContain('is-satisfied')
    expect(wrapper.get('[data-island="b"]').classes()).not.toContain('is-satisfied')
    expect(wrapper.get('.hashi-bridges .hashi-bridge').classes()).toContain('is-satisfied')
  })
})

describe('HashiControls', () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  })

  beforeAll(async () => {
    await router.push('/')
    await router.isReady()
  })

  const mountControls = (props = {}) =>
    mount(HashiControls, {
      props: {
        category: 'intro',
        historyLength: 0,
        bridgeCounts: {},
        ...props,
      },
      global: { plugins: [router] },
    })

  it('keeps categories in one tab row and marks the current category', async () => {
    const wrapper = mountControls()
    const tabs = wrapper.findAll('[role="tab"]')

    expect(tabs.map((tab) => tab.text())).toEqual(['Intro', 'Daily', 'Weekly', 'Monthly'])
    expect(tabs[0]?.attributes('aria-current')).toBe('page')
    expect(wrapper.get('[role="tablist"]').classes()).toContain('hashi-category-tabs')

    await tabs[1]?.trigger('click')
    expect(wrapper.emitted('select-category')).toEqual([['daily']])
  })

  it('disables undo when history is empty', () => {
    expect(mountControls().get('[data-action="undo"]').attributes('disabled')).toBeDefined()
    expect(
      mountControls({ historyLength: 1 }).get('[data-action="undo"]').attributes('disabled'),
    ).toBeUndefined()
  })

  it('confirms destructive actions only when nonzero bridges exist', async () => {
    const confirm = vi.fn(() => true)
    vi.stubGlobal('confirm', confirm)
    const empty = mountControls()

    await empty.get('[data-action="reset"]').trigger('click')
    await empty.get('[data-action="new-puzzle"]').trigger('click')
    expect(confirm).not.toHaveBeenCalled()
    expect(empty.emitted('reset')).toHaveLength(1)
    expect(empty.emitted('new-puzzle')).toHaveLength(1)

    const active = mountControls({ bridgeCounts: { 'a:b': 1 } })
    await active.get('[data-action="reset"]').trigger('click')
    await active.get('[data-action="new-puzzle"]').trigger('click')
    expect(confirm).toHaveBeenCalledTimes(2)
    expect(active.emitted('reset')).toHaveLength(1)
    expect(active.emitted('new-puzzle')).toHaveLength(1)
  })
})
