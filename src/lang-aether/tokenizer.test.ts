import { describe, expect, it } from 'vitest'
import { aetherTokenizer } from './tokenizer'

describe('aetherTokenizer', () => {
  it('has correct name and language data', () => {
    expect(aetherTokenizer.name).toBe('aether')
    expect(aetherTokenizer.languageData.commentTokens).toEqual({
      line: '//',
      block: { open: '/*', close: '*/' },
    })
  })

  it('startState returns top context', () => {
    const state = aetherTokenizer.startState()
    expect(state.context).toBe('top')
  })

  it('copyState creates independent copy', () => {
    const state = aetherTokenizer.startState()
    const copy = aetherTokenizer.copyState(state)
    expect(copy.context).toBe('top')
    copy.context = 'blockComment'
    expect(state.context).toBe('top')
  })

  it('token function exists', () => {
    expect(typeof aetherTokenizer.token).toBe('function')
  })

  it('closeBrackets is configured', () => {
    expect(aetherTokenizer.languageData.closeBrackets).toBeDefined()
    expect(aetherTokenizer.languageData.closeBrackets.brackets).toContain('{')
  })
})
