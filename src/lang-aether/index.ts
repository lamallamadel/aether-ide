/**
 * Aether language support for CodeMirror 6.
 *
 * Provides syntax highlighting, bracket matching, folding,
 * and intelligent completions for the Aether programming language.
 */
import { StreamLanguage, LanguageSupport } from '@codemirror/language'
import { aetherTokenizer } from './tokenizer'
import { aetherHighlighting } from './highlight'
import { aetherCompletions } from './completions'

const aetherStreamLanguage = StreamLanguage.define(aetherTokenizer)

export function aether(): LanguageSupport {
  return new LanguageSupport(aetherStreamLanguage, [aetherHighlighting])
}

export { aetherCompletions, aetherHighlighting }
