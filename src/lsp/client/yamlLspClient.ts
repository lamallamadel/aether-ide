import type { ExtractedSymbol, SerializedTree } from '../../services/syntax/syntaxTypes'
import type { ExternalLspTransport } from './externalTransport'
import type { YamlDiagnostic, YamlLspMode } from '../server/yamlEmbeddedServer'

type LspWorkerRequest =
  | { id: string; method: 'initialize'; params?: Record<string, never> }
  | { id: string; method: 'textDocument/didOpen'; params: { uri: string; content: string } }
  | { id: string; method: 'textDocument/didChange'; params: { uri: string; content: string } }
  | { id: string; method: 'textDocument/completion'; params: { uri: string } }
  | { id: string; method: 'textDocument/hover'; params: { uri: string; token: string } }

type LspWorkerResponse<T = unknown> = { id: string; result?: T; error?: string }

type YamlLspParseResult = {
  tree: SerializedTree
  symbols: ExtractedSymbol[]
  diagnostics: YamlDiagnostic[]
}

const DEFAULT_TIMEOUT = 5000

export class YamlLspClient {
  private worker: Worker | null = null
  private pending = new Map<string, { resolve: (data: unknown) => void; reject: (e: Error) => void; timer: number }>()
  private mode: YamlLspMode
  private external?: ExternalLspTransport

  constructor(mode: YamlLspMode = 'embedded', external?: ExternalLspTransport) {
    this.mode = mode
    this.external = external
    if (typeof Worker === 'undefined') return
    this.worker = new Worker(new URL('../server/yamlLsp.worker.ts', import.meta.url), { type: 'module' })
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

  setMode(mode: YamlLspMode, external?: ExternalLspTransport) {
    this.mode = mode
    this.external = external
  }

  private sendEmbedded<T>(method: LspWorkerRequest['method'], params?: LspWorkerRequest['params']) {
    if (!this.worker) return Promise.reject(new Error('Embedded YAML LSP worker is unavailable'))
    const worker = this.worker
    const id = crypto.randomUUID()
    return new Promise<T>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`Embedded YAML LSP timeout for ${method}`))
      }, DEFAULT_TIMEOUT)
      this.pending.set(id, { resolve: resolve as (data: unknown) => void, reject, timer })
      worker.postMessage({ id, method, params } as LspWorkerRequest)
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
    return this.send<YamlLspParseResult>('textDocument/didOpen', { uri, content })
  }

  didChange(uri: string, content: string) {
    return this.send<YamlLspParseResult>('textDocument/didChange', { uri, content })
  }
}

export const yamlLspClient = new YamlLspClient('embedded')
