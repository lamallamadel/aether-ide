import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import { CompletionContext } from '@codemirror/autocomplete'
import { aetherCompletions } from './completions'

function makeContext(doc: string, pos?: number): CompletionContext {
  const state = EditorState.create({ doc })
  return new CompletionContext(state, pos ?? doc.length, false)
}

function makeExplicitContext(doc: string, pos?: number): CompletionContext {
  const state = EditorState.create({ doc })
  return new CompletionContext(state, pos ?? doc.length, true)
}

describe('aetherCompletions', () => {
  it('returns null for empty non-explicit context', () => {
    const ctx = makeContext('')
    const result = aetherCompletions(ctx)
    expect(result).toBeNull()
  })

  it('returns completions for explicit trigger', () => {
    const ctx = makeExplicitContext('')
    const result = aetherCompletions(ctx)
    expect(result).not.toBeNull()
    expect(result!.options.length).toBeGreaterThan(20)
  })

  it('includes Aether keywords', () => {
    const ctx = makeExplicitContext('f')
    const result = aetherCompletions(ctx)
    expect(result).not.toBeNull()
    const labels = result!.options.map((o) => o.label)
    expect(labels).toContain('fn')
    expect(labels).toContain('for')
  })

  it('includes agent builtins', () => {
    const ctx = makeExplicitContext('N')
    const result = aetherCompletions(ctx)
    expect(result).not.toBeNull()
    const labels = result!.options.map((o) => o.label)
    expect(labels).toContain('Next')
    expect(labels).toContain('Finish')
    expect(labels).toContain('Fault')
  })

  it('includes type completions', () => {
    const ctx = makeExplicitContext('i')
    const result = aetherCompletions(ctx)
    expect(result).not.toBeNull()
    const labels = result!.options.map((o) => o.label)
    expect(labels).toContain('i32')
    expect(labels).toContain('i64')
  })

  it('includes annotations after @', () => {
    const ctx = makeExplicitContext('@n')
    const result = aetherCompletions(ctx)
    expect(result).not.toBeNull()
    const labels = result!.options.map((o) => o.label)
    expect(labels).toContain('@node')
    expect(labels).toContain('@reducer')
  })

  it('includes snippets', () => {
    const ctx = makeExplicitContext('state')
    const result = aetherCompletions(ctx)
    expect(result).not.toBeNull()
    const labels = result!.options.map((o) => o.label)
    expect(labels).toContain('state struct')
    expect(labels).toContain('state')
  })
})
