// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import router from './index'

describe('application routes', () => {
  it('registers the Hashi playground route', () => {
    expect(router.getRoutes()).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: '/hashi', name: 'Hashi' })]),
    )
  })

  it('marks Hashi for the dashboard panel’s wide layout', () => {
    expect(router.resolve('/hashi').meta).toMatchObject({ widePanel: true })
  })
})
