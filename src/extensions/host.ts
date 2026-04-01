import { useEditorStore } from '../state/editorStore'
import { InProcessExtensionHost } from './runtime/inProcessHost'
import { SandboxExtensionHost } from './runtime/sandboxHost'
import { ExtensionRegistry } from './registry'
import type { ExtensionModule } from './types'

export class ExtensionHost {
  private registry = new ExtensionRegistry()
  private inProcess = new InProcessExtensionHost()
  private sandbox = new SandboxExtensionHost()

  register(module: ExtensionModule) {
    this.registry.register(module)
  }

  async activateByEvent(event: 'onStartup' | `onCommand:${string}` | `onLanguage:${string}`) {
    const all = this.registry.list().filter((e) => e.module.manifest.activationEvents.includes(event))
    for (const entry of all) {
      const { module } = entry
      const id = module.manifest.id
      try {
        this.registry.setState(id, 'activating')
        if (module.manifest.runtime === 'sandbox' || !module.manifest.trusted) {
          await this.sandbox.activate(module)
        } else {
          await this.inProcess.activate(module)
        }
        this.registry.setState(id, 'active')
      } catch (error) {
        this.registry.setState(id, 'error', String(error))
      }
    }
  }

  async executeCommand(commandId: string) {
    if (!this.hasPermission('workspace.read')) return false
    const ok = await this.inProcess.executeCommand(commandId, { activeFileId: useEditorStore.getState().activeFileId })
    return ok
  }

  hasPermission(permission: 'workspace.read' | 'workspace.search' | 'network') {
    const active = this.registry.list().filter((r) => r.state === 'active')
    return active.some((r) => r.module.manifest.permissions.includes(permission))
  }

  list() {
    return this.registry.list()
  }
}

export const extensionHost = new ExtensionHost()
