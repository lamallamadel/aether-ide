import type { ExtractedSymbol, SerializedTree } from '../../services/syntax/syntaxTypes'

export type AetherLspMode = 'embedded' | 'external' | 'wsl' | 'auto'

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

// ---------------------------------------------------------------------------
// Symbol extraction patterns
// ---------------------------------------------------------------------------

const SYMBOL_PATTERNS: Array<{ pattern: RegExp; kind: ExtractedSymbol['kind'] }> = [
  { pattern: /\bstate\s+struct\s+([A-Za-z_]\w*)/g, kind: 'class' },
  { pattern: /\bstruct\s+([A-Za-z_]\w*)/g, kind: 'class' },
  { pattern: /\benum\s+([A-Za-z_]\w*)/g, kind: 'class' },
  { pattern: /\btrait\s+([A-Za-z_]\w*)/g, kind: 'class' },
  { pattern: /\bimpl\s+([A-Za-z_]\w*)/g, kind: 'class' },
  { pattern: /@node[^)]*\)\s*\n?\s*fn\s+([A-Za-z_]\w*)/g, kind: 'function' },
  { pattern: /\b(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z_]\w*)/g, kind: 'function' },
  { pattern: /\bextern\s+fn\s+([A-Za-z_]\w*)/g, kind: 'function' },
  { pattern: /\bpackage\s+([\w.]+)/g, kind: 'class' },
]

// ---------------------------------------------------------------------------
// Completion items
// ---------------------------------------------------------------------------

const COMPLETION_ITEMS = [
  { label: 'fn', kind: 'keyword' },
  { label: 'state struct', kind: 'keyword' },
  { label: 'struct', kind: 'keyword' },
  { label: 'enum', kind: 'keyword' },
  { label: 'trait', kind: 'keyword' },
  { label: 'impl', kind: 'keyword' },
  { label: 'let', kind: 'keyword' },
  { label: 'mut', kind: 'keyword' },
  { label: 'return', kind: 'keyword' },
  { label: 'yield', kind: 'keyword' },
  { label: 'spawn', kind: 'keyword' },
  { label: 'parallel_scope', kind: 'keyword' },
  { label: 'if', kind: 'keyword' },
  { label: 'else', kind: 'keyword' },
  { label: 'while', kind: 'keyword' },
  { label: 'for', kind: 'keyword' },
  { label: 'match', kind: 'keyword' },
  { label: 'import', kind: 'keyword' },
  { label: 'package', kind: 'keyword' },
  { label: 'pub', kind: 'keyword' },
  { label: 'extern', kind: 'keyword' },
  { label: 'async', kind: 'keyword' },
  { label: 'await', kind: 'keyword' },
  { label: 'try', kind: 'keyword' },
  { label: '@node(tier=LOW)', kind: 'property' },
  { label: '@node(tier=MID)', kind: 'property' },
  { label: '@node(tier=HIGH)', kind: 'property' },
  { label: '@reducer(sum)', kind: 'property' },
  { label: '@reducer(merge_unique)', kind: 'property' },
  { label: 'Transition', kind: 'type' },
  { label: 'i32', kind: 'type' },
  { label: 'String', kind: 'type' },
  { label: 'Vector', kind: 'type' },
  { label: 'Next(Node::)', kind: 'function' },
  { label: 'Finish()', kind: 'function' },
  { label: 'Fault()', kind: 'function' },
]

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

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
    return COMPLETION_ITEMS
  }

  hover(uri: string, token: string) {
    if (!this.docs.has(uri)) return null
    const descriptions: Record<string, string> = {
      'state': 'Declares an agent state struct with @reducer fields',
      'struct': 'Declares a data structure',
      'enum': 'Declares an enumeration type',
      'trait': 'Declares a trait (interface)',
      'impl': 'Implements a trait for a type',
      'fn': 'Declares a function',
      'spawn': 'Spawns a parallel task inside parallel_scope',
      'parallel_scope': 'Structured concurrency block with fan-out/fan-in',
      'yield': 'Produces an agent transition (Next, Finish, Fault, Loop)',
      '@node': 'Marks a function as an agent graph node with a tier level',
      '@reducer': 'Specifies how parallel results are merged into state',
      'Transition': 'Return type for agent node functions',
      'Next': 'Transition to another node: yield Next(Node::target, state)',
      'Finish': 'Agent completes successfully: yield Finish(state)',
      'Fault': 'Agent encounters an error: yield Fault(state)',
      'Loop': 'Repeat the current node: yield Loop(state)',
    }
    const desc = descriptions[token]
    if (desc) return { contents: `**${token}** — ${desc}` }
    return { contents: `Aether symbol: ${token}` }
  }

  /** Strip strings and comments to avoid false positives in structural analysis */
  private stripStringsAndComments(text: string): string {
    return text
      .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length))
      .replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length))
      .replace(/f?"(?:[^"\\]|\\.)*"/g, (m) => ' '.repeat(m.length))
  }

  private analyze(uri: string): LspParseResult {
    const content = this.docs.get(uri) ?? ''
    const symbols: ExtractedSymbol[] = []
    const diagnostics: LspDiagnostic[] = []
    const seen = new Set<string>()

    const code = this.stripStringsAndComments(content)

    for (const { pattern, kind } of SYMBOL_PATTERNS) {
      pattern.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = pattern.exec(code)) !== null) {
        const name = match[1]
        const key = `${kind}:${name}:${match.index}`
        if (seen.has(key)) continue
        seen.add(key)
        symbols.push({
          kind,
          name,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        })
      }
    }

    // --- Diagnostics (run on stripped code to ignore strings/comments) ---

    const open = (code.match(/\{/g) ?? []).length
    const close = (code.match(/\}/g) ?? []).length
    if (open !== close) {
      diagnostics.push({
        message: `Unbalanced braces: ${open} opening vs ${close} closing`,
        severity: 'error',
        line: lineOfOffset(content, content.length),
      })
    }

    const openParen = (code.match(/\(/g) ?? []).length
    const closeParen = (code.match(/\)/g) ?? []).length
    if (openParen !== closeParen) {
      diagnostics.push({
        message: `Unbalanced parentheses: ${openParen} opening vs ${closeParen} closing`,
        severity: 'error',
        line: lineOfOffset(content, content.length),
      })
    }

    // @node without fn (on stripped code)
    const nodeWithoutFn = /@node\s*\([^)]*\)\s*\n?\s*/g
    let nodeMatch: RegExpExecArray | null
    while ((nodeMatch = nodeWithoutFn.exec(code)) !== null) {
      const afterIdx = nodeMatch.index + nodeMatch[0].length
      const rest = code.slice(afterIdx, afterIdx + 10).trimStart()
      if (!rest.startsWith('fn')) {
        diagnostics.push({
          message: '@node annotation must be followed by a fn declaration',
          severity: 'warning',
          line: lineOfOffset(content, nodeMatch.index),
        })
      }
    }

    // yield without Finish/Next/Fault/Loop (on stripped code)
    const yieldPattern = /\byield\s+([A-Za-z_]\w*)/g
    let yieldMatch: RegExpExecArray | null
    while ((yieldMatch = yieldPattern.exec(code)) !== null) {
      const target = yieldMatch[1]
      if (!['Finish', 'Next', 'Fault', 'Loop'].includes(target)) {
        diagnostics.push({
          message: `yield target must be Finish, Next, Fault, or Loop (got '${target}')`,
          severity: 'warning',
          line: lineOfOffset(content, yieldMatch.index),
        })
      }
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
