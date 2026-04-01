import { describe, expect, it } from 'vitest'
import { resolveEnvironment, type RuntimeEnvironment, type WorkspaceEnvironment } from './environment'

describe('resolveEnvironment', () => {
  const runtime: RuntimeEnvironment = {
    mode: 'development',
    aiMode: 'cloud',
    lspMode: 'embedded',
    externalLspEndpoint: '',
  }

  it('keeps runtime values when no workspace overrides', () => {
    const resolved = resolveEnvironment(runtime, null)
    expect(resolved.aiMode).toBe('cloud')
    expect(resolved.lspMode).toBe('embedded')
    expect(resolved.sourceByField.aiMode).toBe('runtime')
  })

  it('workspace overrides runtime values', () => {
    const workspace: WorkspaceEnvironment = {
      workspaceId: 'my-ws',
      overrides: { aiMode: 'local', lspMode: 'auto', externalLspEndpoint: 'http://localhost:4444/lsp' },
    }
    const resolved = resolveEnvironment(runtime, workspace)
    expect(resolved.aiMode).toBe('local')
    expect(resolved.lspMode).toBe('auto')
    expect(resolved.externalLspEndpoint).toBe('http://localhost:4444/lsp')
    expect(resolved.sourceByField.aiMode).toBe('workspace')
  })
})
