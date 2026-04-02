/** Pont preload Electron (voir `electron/preload.mjs`). */
export interface AetherDesktopBridge {
  kind: 'electron'
  platform: string
  versions: { electron: string; chrome: string }
  pickWorkspaceRoot: () => Promise<string | null>
}

declare global {
  interface Window {
    aetherDesktop?: AetherDesktopBridge
  }
}

export {}
