import { describe, expect, it } from 'vitest'
import { assessProposedChange } from './riskEngine'

describe('riskEngine', () => {
  it('returns trivial for identical content', () => {
    const code = 'const x = 1'
    expect(assessProposedChange(code, code)).toEqual({ level: 'trivial', reasons: [] })
  })

  it('returns trivial for minor safe change', () => {
    const original = 'const x = 1'
    const proposed = 'const x = 2'
    expect(assessProposedChange(original, proposed)).toEqual({ level: 'trivial', reasons: [] })
  })

  it('returns high when adding fetch', () => {
    const original = 'function foo() {}'
    const proposed = 'function foo() { fetch("https://api.com") }'
    const report = assessProposedChange(original, proposed)
    expect(report.level).toBe('high')
    expect(report.reasons).toContain('Introduces or increases network calls')
  })

  it('returns high when adding eval', () => {
    const original = 'const x = 1'
    const proposed = 'const x = eval("1+1")'
    const report = assessProposedChange(original, proposed)
    expect(report.level).toBe('high')
    expect(report.reasons).toContain('Adds eval usage')
  })

  it('returns high when adding secret-like identifiers', () => {
    const original = 'const x = 1'
    const proposed = 'const api_key = "sk-123"'
    const report = assessProposedChange(original, proposed)
    expect(report.level).toBe('high')
    expect(report.reasons).toContain('Adds secret-like identifiers')
  })

  it('returns review for large diff', () => {
    const original = 'x'
    const proposed = 'x\n'.repeat(150)
    const report = assessProposedChange(original, proposed)
    expect(report.level).toBe('review')
    expect(report.reasons).toContain('Large diff footprint')
  })

  it('returns review when touching config', () => {
    const original = 'console.log(1)'
    const proposed = '// vite.config.ts\nconsole.log(1)'
    const report = assessProposedChange(original, proposed)
    expect(report.level).toBe('review')
    expect(report.reasons).toContain('Touches configuration patterns')
  })
})
