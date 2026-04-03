import { describe, expect, it, vi } from 'vitest'
import { YamlLspClient } from './yamlLspClient'

describe('YamlLspClient', () => {
  it('mode external : délègue au transport', async () => {
    const request = vi.fn().mockResolvedValue({ tree: null, symbols: [], diagnostics: [] })
    const client = new YamlLspClient('external', { request })
    await expect(client.didOpen('file:///x.yaml', 'a: 1')).resolves.toMatchObject({ diagnostics: [] })
    expect(request).toHaveBeenCalledWith('textDocument/didOpen', { uri: 'file:///x.yaml', content: 'a: 1' })
  })

  it('mode embedded sans Worker : send échoue', async () => {
    const client = new YamlLspClient('embedded')
    await expect(client.initialize()).rejects.toThrow(/Embedded YAML LSP worker is unavailable/)
  })

  it('mode auto : fallback embedded si external échoue', async () => {
    const request = vi.fn().mockRejectedValue(new Error('down'))
    const client = new YamlLspClient('auto', { request })
    await expect(client.didChange('file:///a.yaml', 'k: v')).rejects.toThrow(/Embedded YAML LSP worker is unavailable/)
  })
})
