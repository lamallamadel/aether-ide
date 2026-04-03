import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ExternalHttpLspTransport } from './externalTransport'

describe('ExternalHttpLspTransport', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('request retourne result du JSON-RPC', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: { ok: true } }),
    }) as unknown as typeof fetch

    const t = new ExternalHttpLspTransport('http://localhost:9999/lsp')
    await expect(t.request<{ ok: boolean }>('initialize', {})).resolves.toEqual({ ok: true })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:9999/lsp',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('request lance si HTTP non ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
    }) as unknown as typeof fetch

    const t = new ExternalHttpLspTransport('http://x')
    await expect(t.request('x', {})).rejects.toThrow('External LSP HTTP error: 502')
  })

  it('request lance si payload JSON-RPC contient error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: { message: 'bad' } }),
    }) as unknown as typeof fetch

    const t = new ExternalHttpLspTransport('http://x')
    await expect(t.request('m', {})).rejects.toThrow('bad')
  })

  it('request lance message générique si error sans message', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: {} }),
    }) as unknown as typeof fetch

    const t = new ExternalHttpLspTransport('http://x')
    await expect(t.request('m', {})).rejects.toThrow('External LSP error')
  })
})
