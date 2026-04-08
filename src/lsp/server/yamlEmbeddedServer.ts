import type { ExtractedSymbol, SerializedTree } from '../../services/syntax/syntaxTypes'

export type YamlLspMode = 'embedded' | 'external' | 'wsl' | 'auto'

export type YamlDiagnostic = {
  message: string
  severity: 'error' | 'warning'
  line: number
}

export type YamlParseResult = {
  tree: SerializedTree
  symbols: ExtractedSymbol[]
  diagnostics: YamlDiagnostic[]
}

export class YamlEmbeddedServer {
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
    return [{ label: 'version', kind: 'property' }, { label: 'services', kind: 'property' }, { label: 'metadata', kind: 'property' }]
  }

  hover(uri: string, token: string) {
    if (!this.docs.has(uri)) return null
    return { contents: `YAML key: ${token}` }
  }

  private analyze(uri: string): YamlParseResult {
    const content = this.docs.get(uri) ?? ''
    const symbols: ExtractedSymbol[] = []
    const diagnostics: YamlDiagnostic[] = []

    const keyPattern = /^([A-Za-z_][A-Za-z0-9_-]*):/gm
    let match: RegExpExecArray | null
    while ((match = keyPattern.exec(content)) !== null) {
      symbols.push({
        kind: 'class',
        name: match[1],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      })
    }

    const lines = content.split('\n')
    lines.forEach((line, index) => {
      if (line.includes('\t')) {
        diagnostics.push({ message: 'YAML forbids tab indentation; use spaces.', severity: 'warning', line: index + 1 })
      }
      if (line.trim().startsWith('-') && !line.includes(':')) {
        diagnostics.push({ message: 'List item without key/value may be incomplete.', severity: 'warning', line: index + 1 })
      }
    })

    const tree: SerializedTree = {
      languageId: 'yaml',
      root: {
        type: 'document',
        startIndex: 0,
        endIndex: content.length,
        startPosition: { row: 0, column: 0 },
        endPosition: { row: Math.max(lines.length - 1, 0), column: 0 },
      },
    }

    return { tree, symbols, diagnostics }
  }
}
