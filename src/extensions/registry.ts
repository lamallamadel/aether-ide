import type { ExtensionModule, RegisteredExtension } from './types'

export class ExtensionRegistry {
  private extensions = new Map<string, RegisteredExtension>()

  register(module: ExtensionModule) {
    const id = module.manifest.id
    if (this.extensions.has(id)) {
      throw new Error(`Extension already registered: ${id}`)
    }
    this.extensions.set(id, { module, state: 'installed' })
  }

  setState(id: string, next: RegisteredExtension['state'], lastError?: string) {
    const current = this.extensions.get(id)
    if (!current) throw new Error(`Unknown extension: ${id}`)
    this.extensions.set(id, { ...current, state: next, lastError })
  }

  get(id: string) {
    return this.extensions.get(id)
  }

  list() {
    return [...this.extensions.values()]
  }
}
