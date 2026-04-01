import { describe, expect, it } from 'vitest'
import { languageIdForFile } from './syntaxClient'

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
