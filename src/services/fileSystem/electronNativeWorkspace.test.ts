import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nativeLoadWorkspace, nativeReadTextRelative, nativeWriteFileRelative } from './electronNativeWorkspace'

describe('electronNativeWorkspace', () => {
  const original = window.aetherDesktop

  afterEach(() => {
    window.aetherDesktop = original
    vi.restoreAllMocks()
  })

  it('nativeLoadWorkspace appelle loadWorkspace et retourne le résultat', async () => {
    const result = { files: [], rootPath: '/p', workspaceLabel: 'x' }
    window.aetherDesktop = {
      ...original,
      kind: 'electron',
      platform: 'win32',
      versions: { electron: '1', chrome: '1' },
      pickWorkspaceRoot: vi.fn(),
      loadWorkspace: vi.fn().mockResolvedValue(result),
      writeFileRelative: vi.fn(),
      readTextRelative: vi.fn(),
    } as unknown as typeof window.aetherDesktop

    await expect(nativeLoadWorkspace('/p')).resolves.toEqual(result)
    expect(window.aetherDesktop?.loadWorkspace).toHaveBeenCalledWith('/p')
  })

  it('nativeLoadWorkspace lance si API absente', async () => {
    window.aetherDesktop = {
      ...original,
      kind: 'electron',
      platform: 'win32',
      versions: { electron: '1', chrome: '1' },
      pickWorkspaceRoot: vi.fn(),
      loadWorkspace: undefined,
      writeFileRelative: vi.fn(),
      readTextRelative: vi.fn(),
    } as unknown as typeof window.aetherDesktop

    await expect(nativeLoadWorkspace('/p')).rejects.toThrow('Electron workspace API unavailable')
  })

  it('nativeWriteFileRelative appelle writeFileRelative', async () => {
    const writeFileRelative = vi.fn().mockResolvedValue(undefined)
    window.aetherDesktop = {
      ...original,
      kind: 'electron',
      platform: 'win32',
      versions: { electron: '1', chrome: '1' },
      pickWorkspaceRoot: vi.fn(),
      loadWorkspace: vi.fn(),
      writeFileRelative,
      readTextRelative: vi.fn(),
    } as unknown as typeof window.aetherDesktop

    await nativeWriteFileRelative('/r', 'a/b.ts', 'x')
    expect(writeFileRelative).toHaveBeenCalledWith('/r', 'a/b.ts', 'x')
  })

  it('nativeWriteFileRelative lance si API absente', async () => {
    window.aetherDesktop = undefined
    await expect(nativeWriteFileRelative('/r', 'a.ts', 'c')).rejects.toThrow('Electron workspace API unavailable')
  })

  it('nativeReadTextRelative retourne null si readTextRelative absent', async () => {
    window.aetherDesktop = {
      ...original,
      kind: 'electron',
      platform: 'win32',
      versions: { electron: '1', chrome: '1' },
      pickWorkspaceRoot: vi.fn(),
      loadWorkspace: vi.fn(),
      writeFileRelative: vi.fn(),
      readTextRelative: undefined,
    } as unknown as typeof window.aetherDesktop

    await expect(nativeReadTextRelative('/r', 'f')).resolves.toBeNull()
  })

  it('nativeReadTextRelative retourne string ou null selon le type', async () => {
    const readTextRelative = vi.fn().mockResolvedValue('hello')
    window.aetherDesktop = {
      ...original,
      kind: 'electron',
      platform: 'win32',
      versions: { electron: '1', chrome: '1' },
      pickWorkspaceRoot: vi.fn(),
      loadWorkspace: vi.fn(),
      writeFileRelative: vi.fn(),
      readTextRelative,
    } as unknown as typeof window.aetherDesktop

    await expect(nativeReadTextRelative('/r', 'f')).resolves.toBe('hello')

    readTextRelative.mockResolvedValueOnce(123 as unknown as string)
    await expect(nativeReadTextRelative('/r', 'f')).resolves.toBeNull()
  })
})
