import { describe, expect, it } from 'vitest'
import { YamlEmbeddedServer } from './yamlEmbeddedServer'

describe('YamlEmbeddedServer', () => {
  it('extracts yaml keys and reports diagnostics', () => {
    const server = new YamlEmbeddedServer()
    const result = server.didOpen(
      'inmemory://test/app.yaml',
      'version: 1\nservices:\n\tapi: true\n- orphan'
    )

    expect(result.symbols.some((s) => s.name === 'version')).toBe(true)
    expect(result.diagnostics.length).toBeGreaterThan(0)
  })
})
