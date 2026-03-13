import { describe, expect, it } from 'vitest'
import { getTokenColor, highlightCode } from './syntaxHighlighter'

describe('syntaxHighlighter', () => {
  describe('highlightCode', () => {
    it('returns empty array for empty or falsy input', () => {
      expect(highlightCode('')).toEqual([])
    })

    it('tokenizes keywords', () => {
      const tokens = highlightCode('const x = 1')
      expect(tokens.find((t) => t.content === 'const')?.type).toBe('keyword')
      expect(tokens.find((t) => t.content === 'x')?.type).toBe('text')
    })

    it('tokenizes strings with double quotes', () => {
      const tokens = highlightCode('"hello"')
      expect(tokens[0]).toEqual({ type: 'string', content: '"hello"' })
    })

    it('tokenizes strings with single quotes', () => {
      const tokens = highlightCode("'world'")
      expect(tokens[0]).toEqual({ type: 'string', content: "'world'" })
    })

    it('tokenizes template literals', () => {
      const tokens = highlightCode('`foo ${bar}`')
      expect(tokens[0].type).toBe('string')
      expect(tokens[0].content.startsWith('`')).toBe(true)
    })

    it('tokenizes single-line comments', () => {
      const tokens = highlightCode('// comment\nx')
      expect(tokens[0]).toEqual({ type: 'comment', content: '// comment' })
    })

    it('tokenizes numbers', () => {
      const tokens = highlightCode('42 3.14')
      expect(tokens.find((t) => t.content === '42')?.type).toBe('number')
      expect(tokens.find((t) => t.content === '3.14')?.type).toBe('number')
    })

    it('tokenizes components (PascalCase)', () => {
      const tokens = highlightCode('App Component')
      expect(tokens.find((t) => t.content === 'App')?.type).toBe('component')
      expect(tokens.find((t) => t.content === 'Component')?.type).toBe('component')
    })

    it('tokenizes operators', () => {
      const tokens = highlightCode('+ - === ')
      expect(tokens.find((t) => t.content === '+')?.type).toBe('operator')
      expect(tokens.find((t) => t.content === '===')?.type).toBe('operator')
    })

    it('handles unclosed string', () => {
      const tokens = highlightCode('"no end')
      expect(tokens[0].type).toBe('string')
      expect(tokens[0].content).toBe('"no end')
    })

    it('tokenizes mixed code', () => {
      const tokens = highlightCode('export function Foo() { return "hi" }')
      expect(tokens.map((t) => t.type)).toContain('keyword')
      expect(tokens.map((t) => t.type)).toContain('component')
      expect(tokens.map((t) => t.type)).toContain('string')
    })
  })

  describe('getTokenColor', () => {
    it('returns colors for each token type', () => {
      expect(getTokenColor('keyword')).toBe('text-purple-400')
      expect(getTokenColor('string')).toBe('text-yellow-300')
      expect(getTokenColor('comment')).toBe('text-gray-500 italic')
      expect(getTokenColor('component')).toBe('text-cyan-300')
      expect(getTokenColor('number')).toBe('text-orange-300')
      expect(getTokenColor('operator')).toBe('text-pink-400')
    })

    it('returns default for text type', () => {
      expect(getTokenColor('text')).toBe('text-gray-100')
    })
  })
})
