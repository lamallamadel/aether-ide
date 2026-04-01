export type ExternalLspTransport = {
  request: <T>(method: string, params: unknown) => Promise<T>
}

type JsonRpcResponse<T> = { result?: T; error?: { message?: string } }

export class ExternalHttpLspTransport implements ExternalLspTransport {
  private endpoint: string

  constructor(endpoint: string) {
    this.endpoint = endpoint
  }

  async request<T>(method: string, params: unknown): Promise<T> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: crypto.randomUUID(), method, params }),
    })
    if (!response.ok) throw new Error(`External LSP HTTP error: ${response.status}`)
    const payload = (await response.json()) as JsonRpcResponse<T>
    if (payload.error) throw new Error(payload.error.message ?? 'External LSP error')
    return payload.result as T
  }
}
