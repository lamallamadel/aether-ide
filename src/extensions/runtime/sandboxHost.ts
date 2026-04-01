import type { ExtensionModule } from '../types'

type SandboxResponse = { id: string; ok: boolean; error?: string }

const DEFAULT_TIMEOUT = 5000

export class SandboxExtensionHost {
  private worker: Worker | null
  private pending = new Map<string, { resolve: (ok: boolean) => void; reject: (e: Error) => void; timer: number }>()

  constructor() {
    if (typeof Worker === 'undefined') {
      this.worker = null
      return
    }
    this.worker = new Worker(new URL('./extension.worker.ts', import.meta.url), { type: 'module' })
    this.worker.onmessage = (event: MessageEvent<SandboxResponse>) => {
      const res = event.data
      const req = this.pending.get(res.id)
      if (!req) return
      window.clearTimeout(req.timer)
      this.pending.delete(res.id)
      if (res.ok) req.resolve(true)
      else req.reject(new Error(res.error ?? 'Sandbox host error'))
    }
  }

  private send(type: 'activate' | 'deactivate', extensionId: string) {
    if (!this.worker) return Promise.resolve(true)
    const worker = this.worker
    const id = crypto.randomUUID()
    return new Promise<boolean>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`Sandbox request timeout (${type})`))
      }, DEFAULT_TIMEOUT)
      this.pending.set(id, { resolve, reject, timer })
      worker.postMessage({ id, type, payload: { extensionId } })
    })
  }

  activate(module: ExtensionModule) {
    return this.send('activate', module.manifest.id)
  }

  deactivate(module: ExtensionModule) {
    return this.send('deactivate', module.manifest.id)
  }

  dispose() {
    this.worker?.terminate()
  }
}
