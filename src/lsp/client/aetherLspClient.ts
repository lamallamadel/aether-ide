import type { ExtractedSymbol, SerializedTree } from '../../services/syntax/syntaxTypes'
import type { ExternalLspTransport } from './externalTransport'
import type { AetherLspMode, LspDiagnostic } from '../server/aetherEmbeddedServer'

type LspWorkerRequest =
  | { id: string; method: 'initialize'; params?: Record<string, never> }
  | { id: string; method: 'textDocument/didOpen'; params: { uri: string; content: string } }
  | { id: string; method: 'textDocument/didChange'; params: { uri: string; content: string } }
  | { id: string; method: 'textDocument/completion'; params: { uri: string } }
  | { id: string; method: 'textDocument/hover'; params: { uri: string; token: string } }

type LspWorkerResponse<T = unknown> = { id: string; result?: T; error?: string }

type LspParseResult = {
  tree: SerializedTree
  symbols: ExtractedSymbol[]
  diagnostics: LspDiagnostic[]
}

const DEFAULT_TIMEOUT = 5000

export class AetherLspClient {
  private worker: Worker | null = null
  private pending = new Map<string, { resolve: (data: unknown) => void; reject: (e: Error) => void; timer: number }>()
  private mode: AetherLspMode
  private external?: ExternalLspTransport

  constructor(mode: AetherLspMode = 'embedded', external?: ExternalLspTransport) {
    this.mode = mode
    this.external = external
    if (typeof Worker === 'undefined') return
    this.worker = new Worker(new URL('../server/aetherLsp.worker.ts', import.meta.url), { type: 'module' })
    this.worker.onmessage = (event: MessageEvent<LspWorkerResponse>) => {
      const { id, result, error } = event.data
      const req = this.pending.get(id)
      if (!req) return
      window.clearTimeout(req.timer)
      this.pending.delete(id)
      if (error) req.reject(new Error(error))
      else req.resolve(result)
    }
  }

  setMode(mode: AetherLspMode, external?: ExternalLspTransport) {
    this.mode = mode
    this.external = external
  }

  private sendEmbedded<T>(method: LspWorkerRequest['method'], params?: LspWorkerRequest['params']) {
    if (!this.worker) {
      return Promise.reject(new Error('Embedded LSP worker is unavailable'))
    }
    const id = crypto.randomUUID()
    return new Promise<T>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`Embedded LSP timeout for ${method}`))
      }, DEFAULT_TIMEOUT)
      this.pending.set(id, { resolve: resolve as (data: unknown) => void, reject, timer })
      this.worker?.postMessage({ id, method, params } as LspWorkerRequest)
    })
  }

  private async send<T>(method: string, params: unknown): Promise<T> {
    if (this.mode === 'external' && this.external) return this.external.request<T>(method, params)
    if (this.mode === 'auto' && this.external) {
      try {
        return await this.external.request<T>(method, params)
      } catch {
        return this.sendEmbedded<T>(method as LspWorkerRequest['method'], params as LspWorkerRequest['params'])
      }
    }
    return this.sendEmbedded<T>(method as LspWorkerRequest['method'], params as LspWorkerRequest['params'])
  }

  initialize() {
    return this.send<Record<string, unknown>>('initialize', {})
  }

  didOpen(uri: string, content: string) {
    return this.send<LspParseResult>('textDocument/didOpen', { uri, content })
  }

  didChange(uri: string, content: string) {
    return this.send<LspParseResult>('textDocument/didChange', { uri, content })
  }

  completion(uri: string) {
    return this.send<Array<{ label: string; kind: string }>>('textDocument/completion', { uri })
  }

  hover(uri: string, token: string) {
    return this.send<{ contents: string } | null>('textDocument/hover', { uri, token })
  }
}

export const aetherLspClient = new AetherLspClient('embedded')
