import { Parser, Language } from 'web-tree-sitter'
type SyntaxNode = any
import type { ExtractedSymbol, SerializedNode, SerializedTree } from '../services/syntax/syntaxTypes'
import type { WorkerMessage, WorkerResponse } from '../services/workers/worker.types'

import coreWasmUrl from 'web-tree-sitter/tree-sitter.wasm?url'
import jsWasmUrl from 'tree-sitter-javascript/tree-sitter-javascript.wasm?url'
import tsWasmUrl from 'tree-sitter-typescript/tree-sitter-typescript.wasm?url'
import tsxWasmUrl from 'tree-sitter-typescript/tree-sitter-tsx.wasm?url'

type LanguageId = 'javascript' | 'typescript' | 'tsx'

let initialized = false
const languageCache = new Map<LanguageId, Language>()

const init = async () => {
  if (initialized) return
  await Parser.init({
    locateFile: () => coreWasmUrl,
  })
  initialized = true
}

const loadLanguage = async (languageId: LanguageId) => {
  await init()
  const cached = languageCache.get(languageId)
  if (cached) return cached
  const wasm = languageId === 'javascript' ? jsWasmUrl : languageId === 'tsx' ? tsxWasmUrl : tsWasmUrl
  const lang = await Language.load(wasm)
  languageCache.set(languageId, lang)
  return lang
}

const serializeNode = (node: SyntaxNode, maxDepth: number): SerializedNode => {
  const out: SerializedNode = {
    type: node.type,
    startIndex: node.startIndex,
    endIndex: node.endIndex,
    startPosition: node.startPosition,
    endPosition: node.endPosition,
  }
  if (maxDepth <= 0) return out
  const children = node.namedChildren
  if (children.length) out.children = children.map((c: SyntaxNode) => serializeNode(c, maxDepth - 1))
  return out
}

const extractSymbols = (root: SyntaxNode, text: string): ExtractedSymbol[] => {
  const syms: ExtractedSymbol[] = []
  const visit = (node: SyntaxNode) => {
    const t = node.type
    if (t === 'function_declaration' || t === 'method_definition' || t === 'arrow_function') {
      const nameNode = node.childForFieldName('name')
      if (nameNode) {
        syms.push({ kind: 'function', name: text.slice(nameNode.startIndex, nameNode.endIndex), startIndex: node.startIndex, endIndex: node.endIndex })
      }
    } else if (t === 'class_declaration') {
      const nameNode = node.childForFieldName('name')
      if (nameNode) {
        syms.push({ kind: 'class', name: text.slice(nameNode.startIndex, nameNode.endIndex), startIndex: node.startIndex, endIndex: node.endIndex })
      }
    } else if (t === 'import_statement') {
      syms.push({ kind: 'import', name: 'import', startIndex: node.startIndex, endIndex: node.endIndex })
    } else if (t === 'export_statement') {
      syms.push({ kind: 'export', name: 'export', startIndex: node.startIndex, endIndex: node.endIndex })
    }
    for (const c of node.namedChildren) if (c) visit(c)
  }
  visit(root)
  return syms
}

const MAX_CONTENT_LENGTH = 2 * 1024 * 1024 // 2MB
const VALID_LANGUAGE_IDS = new Set<string>(['javascript', 'typescript', 'tsx'])

const post = (id: string, payload: any, error?: string) => {
  const response: WorkerResponse = { id, payload, error }
  self.postMessage(response)
}

function validateParsePayload(payload: unknown): payload is { languageId: string; content: string } {
  if (!payload || typeof payload !== 'object') return false
  const p = payload as Record<string, unknown>
  if (typeof p.languageId !== 'string' || !VALID_LANGUAGE_IDS.has(p.languageId)) return false
  if (typeof p.content !== 'string') return false
  if (p.content.length > MAX_CONTENT_LENGTH) return false
  return true
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = event.data
  try {
    if (type === 'PARSE') {
      if (!validateParsePayload(payload)) {
        post(id, null, 'Invalid PARSE payload: expected { languageId: "javascript"|"typescript"|"tsx", content: string }')
        return
      }
      const { languageId, content } = payload
      const lang = await loadLanguage(languageId as LanguageId)
      const parser = new Parser()
      parser.setLanguage(lang)
      const tree = parser.parse(content)

      if (!tree) {
        post(id, {
          tree: { languageId, root: { type: 'error', startIndex: 0, endIndex: 0, startPosition: { row: 0, column: 0 }, endPosition: { row: 0, column: 0 } } },
          symbols: []
        })
        return
      }

      const serialized: SerializedTree = {
        languageId,
        root: serializeNode(tree.rootNode, 6),
      }
      const symbols = extractSymbols(tree.rootNode, content)
      post(id, { tree: serialized, symbols })
    }
  } catch (e) {
    post(id, null, String(e))
  }
}
