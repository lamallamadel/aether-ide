export type Point = { row: number; column: number }

export type SerializedNode = {
  type: string
  startIndex: number
  endIndex: number
  startPosition: Point
  endPosition: Point
  children?: SerializedNode[]
}

export type SerializedTree = {
  languageId: string
  root: SerializedNode
}

export type SymbolKind = 'function' | 'class' | 'variable' | 'type' | 'import' | 'export' | 'unknown'

export type ExtractedSymbol = {
  kind: SymbolKind
  name: string
  startIndex: number
  endIndex: number
}
