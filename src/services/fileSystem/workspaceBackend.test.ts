import { afterEach, describe, expect, it } from 'vitest'
import { getDesktopMeta, getWorkspaceShellKind, pickNativeWorkspaceRootPath } from './workspaceBackend'

describe('workspaceBackend', () => {
  afterEach(() => {
    delete window.aetherDesktop
  })

  it('getWorkspaceShellKind retourne browser sans pont', () => {
    expect(getWorkspaceShellKind()).toBe('browser')
  })

  it('getWorkspaceShellKind retourne electron avec pont', () => {
    window.aetherDesktop = {
      kind: 'electron',
      platform: 'win32',
      versions: { electron: '35', chrome: '120' },
      pickWorkspaceRoot: async () => null,
    }
    expect(getWorkspaceShellKind()).toBe('electron')
  })

  it('getDesktopMeta retourne la plateforme en Electron', () => {
    window.aetherDesktop = {
      kind: 'electron',
      platform: 'darwin',
      versions: { electron: '35', chrome: '120' },
      pickWorkspaceRoot: async () => null,
    }
    expect(getDesktopMeta()).toEqual({ platform: 'darwin' })
  })

  it('pickNativeWorkspaceRootPath délègue au pont', async () => {
    window.aetherDesktop = {
      kind: 'electron',
      platform: 'linux',
      versions: { electron: '35', chrome: '120' },
      pickWorkspaceRoot: async () => '/home/user/proj',
    }
    await expect(pickNativeWorkspaceRootPath()).resolves.toBe('/home/user/proj')
  })

  it('pickNativeWorkspaceRootPath retourne null dans le navigateur', async () => {
    await expect(pickNativeWorkspaceRootPath()).resolves.toBeNull()
  })
})
