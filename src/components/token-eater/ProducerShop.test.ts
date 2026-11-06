// @vitest-environment jsdom

import { shallowMount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ProducerShop from './ProducerShop.vue'
import { PRODUCERS, type ProducerId } from '../../features/token-eater/content'

function mountShop(mode: 'producers' | 'upgrades') {
  return shallowMount(ProducerShop, {
    props: {
      mode,
      tokensMicro: 0n,
      producers: Object.fromEntries(PRODUCERS.map(({ id }) => [id, 0])) as Record<
        ProducerId,
        number
      >,
      upgrades: [],
      clickUpgrades: [],
      ratePerProducer: new Map(),
    },
  })
}

describe('ProducerShop modes', () => {
  it('can render upgrades independently of the producer list', () => {
    const wrapper = mountShop('upgrades')

    expect(wrapper.find('[data-upgrade="batching"]').exists()).toBe(true)
    expect(wrapper.find('[data-click-upgrade="spoon"]').exists()).toBe(true)
    expect(wrapper.find('[data-producer]').exists()).toBe(false)
  })

  it('can render producers independently of the upgrade lists', () => {
    const wrapper = mountShop('producers')

    expect(wrapper.find('[data-producer="autocomplete"]').exists()).toBe(true)
    expect(wrapper.find('[data-upgrade]').exists()).toBe(false)
    expect(wrapper.find('[data-click-upgrade]').exists()).toBe(false)
  })
})
