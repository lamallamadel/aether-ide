import type { ExtractedSymbol, SerializedTree } from '../../services/syntax/syntaxTypes'

export type AetherLspMode = 'embedded' | 'external' | 'auto'

export type LspDiagnostic = {
  message: string
  severity: 'error' | 'warning'
  line: number
}

export type LspParseResult = {
  tree: SerializedTree
  symbols: ExtractedSymbol[]
  diagnostics: LspDiagnostic[]
}

const lineOfOffset = (text: string, offset: number) => text.slice(0, Math.max(0, offset)).split('\n').length

export class AetherEmbeddedServer {
  private docs = new Map<string, string>()

  initialize() {
    return { capabilities: { completionProvider: true, hoverProvider: true, diagnosticsProvider: true } }
  }

  didOpen(uri: string, content: string) {
    this.docs.set(uri, content)
    return this.analyze(uri)
  }

  didChange(uri: string, content: string) {
    this.docs.set(uri, content)
    return this.analyze(uri)
  }

  completion(uri: string) {
    if (!this.docs.has(uri)) return []
    return [
      { label: 'agent', kind: 'keyword' },
      { label: 'workflow', kind: 'keyword' },
      { label: 'mission', kind: 'keyword' },
    ]
  }

  hover(uri: string, token: string) {
    if (!this.docs.has(uri)) return null
    return { contents: `Aether symbol: ${token}` }
  }

  private analyze(uri: string): LspParseResult {
    const content = this.docs.get(uri) ?? ''
    const symbols: ExtractedSymbol[] = []
    const diagnostics: LspDiagnostic[] = []

    const symbolPattern = /\b(agent|workflow|mission|task)\s+([A-Za-z_][A-Za-z0-9_]*)/g
    let match: RegExpExecArray | null
    while ((match = symbolPattern.exec(content)) !== null) {
      const kind = match[1] === 'agent' ? 'class' : 'function'
      symbols.push({
        kind,
        name: match[2],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      })
    }

    const open = (content.match(/\{/g) ?? []).length
    const close = (content.match(/\}/g) ?? []).length
    if (open !== close) {
      diagnostics.push({
        message: 'Unbalanced braces',
        severity: 'warning',
        line: lineOfOffset(content, content.length),
      })
    }

    const tree: SerializedTree = {
      languageId: 'aether',
      root: {
        type: 'document',
        startIndex: 0,
        endIndex: content.length,
        startPosition: { row: 0, column: 0 },
        endPosition: { row: Math.max(content.split('\n').length - 1, 0), column: 0 },
      },
    }

    return { tree, symbols, diagnostics }
  }
}
