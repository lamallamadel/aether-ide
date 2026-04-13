/**
 * Aether language tokenizer for CodeMirror StreamLanguage.
 *
 * Faithfully mirrors the token set from the official C++ lexer
 * (aether-lang/include/Aether/Frontend/Lexer.h).
 */
import type { StringStream } from '@codemirror/language'

// ---- Token sets (from Lexer.h) -----------------------------------------

const KEYWORDS = new Set([
  'fn', 'let', 'mut', 'return', 'if', 'else', 'while', 'for', 'match',
  'yield', 'spawn', 'parallel_scope', 'import', 'package', 'pub', 'extern',
  'async', 'await', 'try', 'in',
])

const DECLARATION_KEYWORDS = new Set([
  'struct', 'enum', 'state', 'trait', 'impl',
])

const BUILTIN_TYPES = new Set([
  'i32', 'i64', 'f32', 'f64', 'bool', 'String', 'Vector', 'Map', 'Set',
  'Result', 'Transition', 'void',
])

const CONSTANTS = new Set([
  'true', 'false',
])

const AGENT_BUILTINS = new Set([
  'Next', 'Node', 'Finish', 'Fault', 'Loop', 'Ok', 'Err',
])

// ---- State type ---------------------------------------------------------

interface AetherState {
  /** Current context for nested scopes */
  context: 'top' | 'blockComment'
}

function startState(): AetherState {
  return { context: 'top' }
}

function copyState(s: AetherState): AetherState {
  return { context: s.context }
}

// ---- Tokenizer ----------------------------------------------------------

function token(stream: StringStream, state: AetherState): string | null {
  // --- Block comment continuation ---
  if (state.context === 'blockComment') {
    while (!stream.eol()) {
      if (stream.match('*/')) {
        state.context = 'top'
        return 'blockComment'
      }
      stream.next()
    }
    return 'blockComment'
  }

  // --- Whitespace ---
  if (stream.eatSpace()) return null

  // --- Line comment // ---
  if (stream.match('//')) {
    stream.skipToEnd()
    return 'lineComment'
  }

  // --- Block comment /* ---
  if (stream.match('/*')) {
    state.context = 'blockComment'
    while (!stream.eol()) {
      if (stream.match('*/')) {
        state.context = 'top'
        return 'blockComment'
      }
      stream.next()
    }
    return 'blockComment'
  }

  // --- Annotations @node, @reducer ---
  if (stream.eat('@')) {
    stream.match(/[a-zA-Z_][a-zA-Z0-9_]*/)
    return 'meta'
  }

  // --- F-strings f"..." ---
  if (stream.match('f"')) {
    while (!stream.eol()) {
      const ch = stream.next()
      if (ch === '\\') { stream.next(); continue }
      if (ch === '{') {
        // Interpolation: scan until matching }
        let depth = 1
        while (!stream.eol() && depth > 0) {
          const c = stream.next()
          if (c === '{') depth++
          else if (c === '}') depth--
        }
        continue
      }
      if (ch === '"') return 'string'
    }
    return 'string'
  }

  // --- String literals ---
  if (stream.eat('"')) {
    while (!stream.eol()) {
      const ch = stream.next()
      if (ch === '\\') { stream.next(); continue }
      if (ch === '"') return 'string'
    }
    return 'string'
  }

  // --- Numbers ---
  if (stream.match(/^[0-9]+(\.[0-9]+)?/)) {
    return 'number'
  }

  // --- Multi-char operators (longest first) ---
  if (stream.match('->') || stream.match('=>') || stream.match('::') ||
      stream.match('==') || stream.match('!=') || stream.match('<=') ||
      stream.match('>=') || stream.match('&&') || stream.match('||')) {
    return 'operator'
  }

  // --- Single-char operators and punctuation ---
  const ch = stream.peek()
  if (ch && '=+-*/%<>!|&'.includes(ch)) {
    stream.next()
    return 'operator'
  }
  if (ch && '(){}[]'.includes(ch)) {
    stream.next()
    return 'bracket'
  }
  if (ch && ':;,.'.includes(ch)) {
    stream.next()
    return 'punctuation'
  }

  // --- Identifiers / keywords ---
  if (stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*/)) {
    const word = stream.current()

    if (KEYWORDS.has(word)) return 'keyword'
    if (DECLARATION_KEYWORDS.has(word)) return 'keyword definition'
    if (CONSTANTS.has(word)) return 'atom'
    if (BUILTIN_TYPES.has(word)) return 'typeName'
    if (AGENT_BUILTINS.has(word)) return 'typeName'

    // Check if followed by ( → function call
    if (stream.peek() === '(') return 'variableName function'

    return 'variableName'
  }

  // Anything else: advance one char
  stream.next()
  return null
}

export const aetherTokenizer = {
  name: 'aether',
  startState,
  copyState,
  token,
  languageData: {
    commentTokens: { line: '//', block: { open: '/*', close: '*/' } },
    closeBrackets: { brackets: ['(', '[', '{', '"'] },
  },
}
