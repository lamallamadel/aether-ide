import { describe, expect, it } from 'vitest'
import { languageIdForFile } from './syntaxClient'

describe('languageIdForFile', () => {
  it('returns aether for .aether and extensionless files', () => {
    expect(languageIdForFile('workflow.aether')).toBe('aether')
    expect(languageIdForFile('README')).toBe('aether')
  })
})
