export type ExtensionPermission = 'workspace.read' | 'workspace.search' | 'network'

export type ActivationEvent = 'onStartup' | `onCommand:${string}` | `onLanguage:${string}`

export type ExtensionLifecycleState = 'installed' | 'activating' | 'active' | 'error'

export type ExtensionRuntime = 'in-process' | 'sandbox'

export type ExtensionManifest = {
  id: string
  version: string
  name: string
  runtime: ExtensionRuntime
  trusted: boolean
  activationEvents: ActivationEvent[]
  permissions: ExtensionPermission[]
  contributes?: {
    commands?: Array<{ id: string; title: string }>
    languages?: Array<{ id: string; extensions: string[] }>
  }
}

export type ExtensionCommandContext = {
  activeFileId: string | null
}

export type ExtensionApi = {
  registerCommand: (id: string, handler: (ctx: ExtensionCommandContext) => void | Promise<void>) => void
}

export type ExtensionModule = {
  manifest: ExtensionManifest
  activate: (api: ExtensionApi) => void | Promise<void>
  deactivate?: () => void | Promise<void>
}

export type RegisteredExtension = {
  module: ExtensionModule
  state: ExtensionLifecycleState
  lastError?: string
}
