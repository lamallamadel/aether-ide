import { describe, expect, it } from 'vitest'
import { ExtensionRegistry } from './registry'
import type { ExtensionModule } from './types'

const moduleA = (id: string): ExtensionModule => ({
  manifest: {
    id,
    name: id,
    version: '0.1.0',
    runtime: 'in-process',
    trusted: true,
    activationEvents: ['onStartup'],
    permissions: ['workspace.read'],
  },
  activate: () => {},
})

describe('ExtensionRegistry', () => {
  it('registers and updates lifecycle state', () => {
    const registry = new ExtensionRegistry()
    registry.register(moduleA('ext.a'))
    registry.setState('ext.a', 'active')
    expect(registry.get('ext.a')?.state).toBe('active')
  })

  it('rejects duplicate registration', () => {
    const registry = new ExtensionRegistry()
    registry.register(moduleA('ext.a'))
    expect(() => registry.register(moduleA('ext.a'))).toThrow()
  })
})
