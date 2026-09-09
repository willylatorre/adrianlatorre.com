// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import router from './index'

describe('application routes', () => {
  it('registers the Hashi playground route', () => {
    expect(router.getRoutes()).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: '/hashi', name: 'Hashi' })]),
    )
  })
})
