import { YamlEmbeddedServer } from './yamlEmbeddedServer'

type Request =
  | { id: string; method: 'initialize'; params?: Record<string, never> }
  | { id: string; method: 'textDocument/didOpen'; params: { uri: string; content: string } }
  | { id: string; method: 'textDocument/didChange'; params: { uri: string; content: string } }
  | { id: string; method: 'textDocument/completion'; params: { uri: string } }
  | { id: string; method: 'textDocument/hover'; params: { uri: string; token: string } }

type Response = { id: string; result?: unknown; error?: string }

const server = new YamlEmbeddedServer()

self.onmessage = (event: MessageEvent<Request>) => {
  const req = event.data
  try {
    let result: unknown
    switch (req.method) {
      case 'initialize':
        result = server.initialize()
        break
      case 'textDocument/didOpen':
        result = server.didOpen(req.params.uri, req.params.content)
        break
      case 'textDocument/didChange':
        result = server.didChange(req.params.uri, req.params.content)
        break
      case 'textDocument/completion':
        result = server.completion(req.params.uri)
        break
      case 'textDocument/hover':
        result = server.hover(req.params.uri, req.params.token)
        break
      default:
        throw new Error(`Unknown method ${(req as { method: string }).method}`)
    }
    const res: Response = { id: req.id, result }
    self.postMessage(res)
  } catch (error) {
    const res: Response = { id: req.id, error: String(error) }
    self.postMessage(res)
  }
}
