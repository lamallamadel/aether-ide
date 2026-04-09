import { useEditorStore } from '../state/editorStore'
import { InProcessExtensionHost } from './runtime/inProcessHost'
import { SandboxExtensionHost } from './runtime/sandboxHost'
import { ExtensionRegistry } from './registry'
import type { ExtensionModule } from './types'

const DISABLED_KEY = 'aether:disabled-extensions'

function loadDisabledSet(): Set<string> {
  try {
    const raw = localStorage.getItem(DISABLED_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function saveDisabledSet(s: Set<string>) {
  try {
    localStorage.setItem(DISABLED_KEY, JSON.stringify([...s]))
  } catch { /* ignore */ }
}

export class ExtensionHost {
  private registry = new ExtensionRegistry()
  private inProcess = new InProcessExtensionHost()
  private sandbox = new SandboxExtensionHost()
  private disabledSet = loadDisabledSet()
  private listeners = new Set<() => void>()
  private _snapshot: ReturnType<ExtensionRegistry['list']> = []

  private notify() {
    this._snapshot = this.registry.list()
    for (const fn of this.listeners) fn()
  }

  onChange(fn: () => void) {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }

  getSnapshot() {
    return this._snapshot
  }

  register(module: ExtensionModule) {
    this.registry.register(module)
    if (this.disabledSet.has(module.manifest.id)) {
      this.registry.setState(module.manifest.id, 'disabled')
    }
    this.notify()
  }

  unregister(id: string) {
    const entry = this.registry.get(id)
    if (entry?.module.deactivate) {
      try { entry.module.deactivate() } catch { /* ignore */ }
    }
    this.registry.unregister(id)
    this.notify()
  }

  has(id: string) {
    return this.registry.has(id)
  }

  async activateByEvent(event: 'onStartup' | `onCommand:${string}` | `onLanguage:${string}`) {
    const all = this.registry.list().filter(
      (e) => e.module.manifest.activationEvents.includes(event) && e.state !== 'disabled'
    )
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
    this.notify()
  }

  async disable(id: string) {
    const entry = this.registry.get(id)
    if (!entry) return
    if (entry.module.deactivate) {
      try { await entry.module.deactivate() } catch { /* ignore */ }
    }
    this.registry.setState(id, 'disabled')
    this.disabledSet.add(id)
    saveDisabledSet(this.disabledSet)
    this.notify()
  }

  async enable(id: string) {
    const entry = this.registry.get(id)
    if (!entry) return
    this.disabledSet.delete(id)
    saveDisabledSet(this.disabledSet)
    try {
      this.registry.setState(id, 'activating')
      if (entry.module.manifest.runtime === 'sandbox' || !entry.module.manifest.trusted) {
        await this.sandbox.activate(entry.module)
      } else {
        await this.inProcess.activate(entry.module)
      }
      this.registry.setState(id, 'active')
    } catch (error) {
      this.registry.setState(id, 'error', String(error))
    }
    this.notify()
  }

  isEnabled(id: string) {
    return !this.disabledSet.has(id)
  }

  getState(id: string) {
    return this.registry.get(id)
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
    return this._snapshot
  }
}

export const extensionHost = new ExtensionHost()
