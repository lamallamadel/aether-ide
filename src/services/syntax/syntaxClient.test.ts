import { describe, expect, it } from 'vitest'
import { languageIdForFile, type ParseResult } from './syntaxClient'

describe('languageIdForFile', () => {
  it('returns aether for .aether and extensionless files', () => {
    expect(languageIdForFile('workflow.aether')).toBe('aether')
    expect(languageIdForFile('README')).toBe('aether')
  })

  it('returns yaml for .yaml and .yml files', () => {
    expect(languageIdForFile('docker-compose.yaml')).toBe('yaml')
    expect(languageIdForFile('pipeline.yml')).toBe('yaml')
  })
})

describe('ParseResult type', () => {
  it('includes diagnostics array', () => {
    const result: ParseResult = {
      tree: null,
      symbols: [],
      diagnostics: [{ message: 'test error', severity: 'error', line: 1 }],
    }
    expect(result.diagnostics).toHaveLength(1)
    expect(result.diagnostics[0].severity).toBe('error')
  })
})
