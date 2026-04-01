import { describe, expect, it } from 'vitest'
import { yamlNativeManifest } from './manifest'

describe('yamlNativeManifest', () => {
  it('declares startup + language activation and yaml contribution', () => {
    expect(yamlNativeManifest.activationEvents).toContain('onStartup')
    expect(yamlNativeManifest.activationEvents).toContain('onLanguage:yaml')
    expect(yamlNativeManifest.contributes?.languages?.[0]?.extensions).toEqual(['.yaml', '.yml'])
  })
})
