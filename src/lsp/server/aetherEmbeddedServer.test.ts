import { describe, expect, it } from 'vitest'
import { AetherEmbeddedServer } from './aetherEmbeddedServer'

describe('AetherEmbeddedServer', () => {
  it('extracts symbols and diagnostics from opened document', () => {
    const server = new AetherEmbeddedServer()
    const result = server.didOpen(
      'inmemory://test/main.aether',
      'agent Bot {\n task run\n'
    )

    expect(result.symbols.length).toBeGreaterThan(0)
    expect(result.symbols[0]?.name).toBe('Bot')
    expect(result.diagnostics.length).toBeGreaterThan(0)
  })
})
