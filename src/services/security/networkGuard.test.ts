import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { enableZeroEgress } from './networkGuard'

describe('networkGuard', () => {
  let originalFetch: typeof globalThis.fetch
  let disableGuard: () => void

  beforeEach(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = (async () => new Response('ok', { status: 200 })) as typeof fetch
  })

  afterEach(() => {
    if (disableGuard) disableGuard()
    globalThis.fetch = originalFetch
  })

  it('blocks outbound fetch in local mode', async () => {
    disableGuard = enableZeroEgress()
    await expect(fetch('https://example.com')).rejects.toThrow(/Zero-egress/i)
    await expect(fetch(`${window.location.origin}/api/ping`)).resolves.toBeInstanceOf(Response)
  })
})

