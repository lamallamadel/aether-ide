import { describe, expect, it, vi } from 'vitest'
import { AetherLspClient } from './aetherLspClient'

describe('AetherLspClient', () => {
  it('mode external : délègue au transport', async () => {
    const request = vi.fn().mockResolvedValue({ capabilities: {} })
    const client = new AetherLspClient('external', { request })
    await expect(client.initialize()).resolves.toEqual({ capabilities: {} })
    expect(request).toHaveBeenCalledWith('initialize', {})
    await client.didOpen('file:///x.ts', 'const x = 1')
    expect(request).toHaveBeenCalledWith('textDocument/didOpen', { uri: 'file:///x.ts', content: 'const x = 1' })
  })

  it('mode embedded sans Worker : send échoue', async () => {
    const client = new AetherLspClient('embedded')
    await expect(client.initialize()).rejects.toThrow(/Embedded LSP worker is unavailable/)
  })

  it('setMode bascule vers external', async () => {
    const request = vi.fn().mockResolvedValue([])
    const client = new AetherLspClient('embedded')
    client.setMode('external', { request })
    await expect(client.completion('file:///a.ts')).resolves.toEqual([])
    expect(request).toHaveBeenCalledWith('textDocument/completion', { uri: 'file:///a.ts' })
  })

  it('mode auto : fallback embedded si external échoue', async () => {
    const request = vi.fn().mockRejectedValue(new Error('network'))
    const client = new AetherLspClient('auto', { request })
    await expect(client.hover('file:///a.ts', 'foo')).rejects.toThrow(/Embedded LSP worker is unavailable/)
  })
})
