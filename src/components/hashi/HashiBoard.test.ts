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

  it('removes button semantics and events in read-only diagrams', async () => {
    const wrapper = mount(HashiBoard, {
      props: { puzzle, bridgeCounts: { 'a:b': 1 }, interactive: false },
    })
    const target = wrapper.get('[data-corridor-hit="a:b"]')

    await target.trigger('click')

    expect(target.attributes('role')).toBeUndefined()
    expect(target.attributes('tabindex')).toBeUndefined()
    expect(wrapper.emitted('cycle')).toBeUndefined()
  })

  it('renders an expanded transparent corridor hit stroke', () => {
    const wrapper = mount(HashiBoard, { props: { puzzle, bridgeCounts: {} } })
    const hit = wrapper.get('[data-corridor-hit="a:b"] .hashi-hit')

    expect(hit.attributes('stroke')).toBe('transparent')
    expect(hit.attributes('stroke-width')).toBe('28')
    expect(hit.attributes('pointer-events')).toBe('stroke')
  })

  it('keeps the wide hit stroke separate from the thin focus indicator', () => {
    const wrapper = mount(HashiBoard, { props: { puzzle, bridgeCounts: {} } })
    const target = wrapper.get('[data-corridor-hit="a:b"]')

    expect(target.get('.hashi-hit').attributes()).toMatchObject({
      stroke: 'transparent',
      'stroke-width': '28',
    })
    expect(target.get('.hashi-focus').attributes()).toMatchObject({
      'aria-hidden': 'true',
      'pointer-events': 'none',
      'stroke-width': '3',
    })
  })

  it('leaves a visible bridge between islands in neighboring cells', () => {
    const adjacentPuzzle: HashiPuzzle = {
      id: 'adjacent',
      category: 'intro',
      width: 2,
      height: 1,
      islands: [
        { id: 'a', x: 0, y: 0, clue: 1 },
        { id: 'b', x: 1, y: 0, clue: 1 },
      ],
    }
    const wrapper = mount(HashiBoard, {
      props: { puzzle: adjacentPuzzle, bridgeCounts: { 'a:b': 1 } },
    })

    expect(wrapper.get('[data-island="a"] rect').attributes('width')).toBe('30')
    expect(wrapper.get('[data-corridor="a:b"] .hashi-bridge').attributes()).toMatchObject({
      x1: '15',
      x2: '25',
    })
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
      x: '25',
      y: '25',
      width: '30',
      height: '30',
      rx: '11',
    })
    expect(horizontal.attributes()).toMatchObject({ x1: '55', y1: '40', x2: '185', y2: '40' })
    expect(vertical.map((line) => line.attributes('x1'))).toEqual(['117', '123'])
    expect(vertical.map((line) => line.attributes('y1'))).toEqual(['135', '135'])
    expect(vertical.map((line) => line.attributes('y2'))).toEqual(['185', '185'])
    expect(wrapper.get('svg').attributes()).toMatchObject({
      viewBox: '-31 -31 302 302',
      width: '302',
      height: '302',
    })
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

  it('highlights an empty hinted corridor without changing its bridge count', () => {
    const wrapper = mount(HashiBoard, {
      props: { puzzle, bridgeCounts: {}, hintCorridorId: 'a:b' },
    })

    const target = wrapper.get('[data-corridor-hit="a:b"]')
    expect(target.classes()).toContain('is-hinted')
    expect(target.attributes('aria-label')).toContain('current hint')
    expect(target.get('.hashi-focus').classes()).toContain('is-hinted')
    expect(wrapper.findAll('[data-corridor="a:b"] .hashi-bridge')).toHaveLength(0)
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
        bridgeCounts: {},
        canRestoreSnapshot: false,
        hintsRemaining: 3,
        hasActiveHint: false,
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

  it('saves positions and enables restore only when the saved position differs', async () => {
    const wrapper = mountControls()
    const save = wrapper.get('[data-action="save-snapshot"]')
    const restore = wrapper.get('[data-action="restore-snapshot"]')

    expect(restore.attributes('disabled')).toBeDefined()
    await save.trigger('click')
    expect(wrapper.emitted('save-snapshot')).toHaveLength(1)

    const restorable = mountControls({ canRestoreSnapshot: true })
    expect(
      restorable.get('[data-action="restore-snapshot"]').attributes('disabled'),
    ).toBeUndefined()
    await restorable.get('[data-action="restore-snapshot"]').trigger('click')
    expect(restorable.emitted('restore-snapshot')).toHaveLength(1)
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

  it('shows three hint hearts and emits a hint request', async () => {
    const wrapper = mountControls({ hintsRemaining: 2 })
    const meter = wrapper.get('[data-hint-hearts]')

    expect(meter.attributes('aria-label')).toBe('2 hints remaining')
    expect(meter.text()).toBe('♥♥♡')
    await wrapper.get('[data-action="hint"]').trigger('click')
    expect(wrapper.emitted('request-hint')).toHaveLength(1)
  })

  it('allows reopening an active hint after all hearts are spent', () => {
    const empty = mountControls({ hintsRemaining: 0 })
    const reopenable = mountControls({ hintsRemaining: 0, hasActiveHint: true })

    expect(empty.get('[data-action="hint"]').attributes('disabled')).toBeDefined()
    expect(reopenable.get('[data-action="hint"]').attributes('disabled')).toBeUndefined()
  })

  it('disables hints while a replacement puzzle is still generating', () => {
    const wrapper = mountControls({ hintUnavailable: true })

    expect(wrapper.get('[data-action="hint"]').attributes('disabled')).toBeDefined()
  })
})
