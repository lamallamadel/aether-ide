import { describe, expect, it, beforeEach } from 'vitest'
import { AetherEmbeddedServer } from './aetherEmbeddedServer'

describe('AetherEmbeddedServer', () => {
  let server: AetherEmbeddedServer

  beforeEach(() => {
    server = new AetherEmbeddedServer()
    server.initialize()
  })

  describe('symbol extraction', () => {
    it('extracts state struct declarations', () => {
      const result = server.didOpen('test://a.aether', `
state struct SearchState {
    query: String,
    @reducer(sum) results: i32,
}
`)
      const names = result.symbols.map((s) => s.name)
      expect(names).toContain('SearchState')
    })

    it('extracts regular struct declarations', () => {
      const result = server.didOpen('test://b.aether', 'struct Point {\n    x: i32,\n    y: i32\n}')
      expect(result.symbols.find((s) => s.name === 'Point')).toBeDefined()
    })

    it('extracts enum declarations', () => {
      const result = server.didOpen('test://c.aether', 'enum Color {\n    Red,\n    Green\n}')
      expect(result.symbols.find((s) => s.name === 'Color')).toBeDefined()
    })

    it('extracts trait declarations', () => {
      const result = server.didOpen('test://d.aether', 'trait Describable {\n    fn describe(self) -> i32\n}')
      expect(result.symbols.find((s) => s.name === 'Describable')).toBeDefined()
    })

    it('extracts @node fn declarations', () => {
      const result = server.didOpen('test://e.aether', `
@node(tier=LOW)
fn search(mut state: SearchState) -> Transition {
    yield Finish(state)
}
`)
      expect(result.symbols.find((s) => s.name === 'search' && s.kind === 'function')).toBeDefined()
    })

    it('extracts regular fn declarations', () => {
      const result = server.didOpen('test://f.aether', 'fn main() -> i32 {\n    return 0\n}')
      expect(result.symbols.find((s) => s.name === 'main')).toBeDefined()
    })

    it('extracts async fn declarations', () => {
      const result = server.didOpen('test://g.aether', 'async fn fetch_data(url: i32) -> i32 {\n    return url\n}')
      expect(result.symbols.find((s) => s.name === 'fetch_data')).toBeDefined()
    })

    it('extracts extern fn declarations', () => {
      const result = server.didOpen('test://h.aether', 'extern fn aether_log(msg: String) -> i32')
      expect(result.symbols.find((s) => s.name === 'aether_log')).toBeDefined()
    })

    it('extracts pub fn declarations', () => {
      const result = server.didOpen('test://i.aether', 'pub fn helper() -> i32 {\n    return 42\n}')
      expect(result.symbols.find((s) => s.name === 'helper')).toBeDefined()
    })

    it('extracts impl blocks', () => {
      const result = server.didOpen('test://j.aether', 'impl Describable for Point {\n    fn describe(self) -> i32 { return 42 }\n}')
      expect(result.symbols.find((s) => s.name === 'Describable' && s.kind === 'class')).toBeDefined()
    })

    it('extracts package declarations', () => {
      const result = server.didOpen('test://k.aether', 'package aether.example.math')
      expect(result.symbols.find((s) => s.name === 'aether.example.math')).toBeDefined()
    })
  })

  describe('diagnostics', () => {
    it('detects unbalanced braces', () => {
      const result = server.didOpen('test://diag1.aether', 'fn main() {\n    let x = 1\n')
      expect(result.diagnostics.find((d) => d.message.includes('braces'))).toBeDefined()
    })

    it('passes balanced braces', () => {
      const result = server.didOpen('test://diag2.aether', 'fn main() {\n    return 0\n}')
      expect(result.diagnostics.find((d) => d.message.includes('braces'))).toBeUndefined()
    })

    it('detects unbalanced parentheses', () => {
      const result = server.didOpen('test://diag3.aether', 'fn main() -> i32 {\n    return foo(\n}')
      expect(result.diagnostics.find((d) => d.message.includes('parentheses'))).toBeDefined()
    })

    it('detects invalid yield targets', () => {
      const result = server.didOpen('test://diag4.aether', '@node(tier=LOW)\nfn test(mut s: S) -> Transition {\n    yield BadTarget(s)\n}')
      expect(result.diagnostics.find((d) => d.message.includes('yield target'))).toBeDefined()
    })

    it('passes valid yield targets', () => {
      const result = server.didOpen('test://diag5.aether', '@node(tier=LOW)\nfn test(mut s: S) -> Transition {\n    yield Finish(s)\n}')
      expect(result.diagnostics.find((d) => d.message.includes('yield target'))).toBeUndefined()
    })

    it('ignores braces inside strings (no false positive)', () => {
      const result = server.didOpen('test://diag6.aether', 'fn main() {\n    let s = "{ not a brace }"\n    return 0\n}')
      expect(result.diagnostics.find((d) => d.message.includes('braces'))).toBeUndefined()
    })

    it('ignores braces inside comments (no false positive)', () => {
      const result = server.didOpen('test://diag7.aether', 'fn main() {\n    // { comment brace }\n    return 0\n}')
      expect(result.diagnostics.find((d) => d.message.includes('braces'))).toBeUndefined()
    })

    it('ignores yield in strings', () => {
      const result = server.didOpen('test://diag8.aether', 'fn main() {\n    let s = "yield BadThing"\n}')
      expect(result.diagnostics.find((d) => d.message.includes('yield target'))).toBeUndefined()
    })
  })

  describe('completions', () => {
    it('returns completions with Aether keywords', () => {
      server.didOpen('test://comp.aether', 'fn main() {}')
      const items = server.completion('test://comp.aether')
      const labels = items.map((i) => i.label)
      expect(labels).toContain('fn')
      expect(labels).toContain('state struct')
      expect(labels).toContain('yield')
      expect(labels).toContain('spawn')
      expect(labels).toContain('parallel_scope')
      expect(labels).toContain('@node(tier=LOW)')
      expect(labels).toContain('@reducer(sum)')
      expect(labels).toContain('Transition')
    })

    it('returns empty for unknown uri', () => {
      expect(server.completion('test://unknown.aether')).toEqual([])
    })
  })

  describe('hover', () => {
    it('returns description for known keywords', () => {
      server.didOpen('test://hov.aether', 'state struct S {}')
      const result = server.hover('test://hov.aether', 'state')
      expect(result?.contents).toContain('agent state struct')
    })

    it('returns description for agent transitions', () => {
      server.didOpen('test://hov2.aether', 'yield Finish(s)')
      const result = server.hover('test://hov2.aether', 'Finish')
      expect(result?.contents).toContain('completes successfully')
    })

    it('returns generic for unknown tokens', () => {
      server.didOpen('test://hov3.aether', 'let x = 1')
      const result = server.hover('test://hov3.aether', 'x')
      expect(result?.contents).toBe('Aether symbol: x')
    })

    it('returns null for unknown uri', () => {
      expect(server.hover('test://unknown.aether', 'x')).toBeNull()
    })
  })

  describe('didChange', () => {
    it('updates document and re-analyzes', () => {
      server.didOpen('test://change.aether', 'fn old() {}')
      const result1 = server.didChange('test://change.aether', 'fn updated() {}')
      expect(result1.symbols.find((s) => s.name === 'updated')).toBeDefined()
      expect(result1.symbols.find((s) => s.name === 'old')).toBeUndefined()
    })
  })
})
