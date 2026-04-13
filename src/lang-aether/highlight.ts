/**
 * Aether highlight style — maps stream-language token names
 * to CodeMirror @lezer/highlight tags for the theme system.
 */
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

export const aetherHighlightStyle = HighlightStyle.define([
  // Keywords: fn, let, if, else, return, yield, spawn, parallel_scope, ...
  { tag: tags.keyword, color: '#c084fc' },           // purple-400
  // Declaration keywords: struct, enum, state, trait, impl
  { tag: tags.definitionKeyword, color: '#c084fc', fontWeight: 'bold' },
  // Types: i32, String, Vector, Transition, ...
  { tag: tags.typeName, color: '#fdba74' },           // orange-300
  // Annotations: @node, @reducer
  { tag: tags.meta, color: '#fbbf24' },               // amber-400
  // Function calls and definitions
  { tag: tags.function(tags.variableName), color: '#67e8f9' }, // cyan-300
  // Variables
  { tag: tags.variableName, color: '#d4d4d4' },       // neutral-300
  // Constants: true, false
  { tag: tags.atom, color: '#fb923c' },               // orange-400
  // Numbers
  { tag: tags.number, color: '#a5f3fc' },             // cyan-200
  // Strings and f-strings
  { tag: tags.string, color: '#86efac' },             // green-300
  // Operators: ->, =>, ::, ==, !=, &&, ||, ...
  { tag: tags.operator, color: '#f472b6' },           // pink-400
  // Comments
  { tag: tags.lineComment, color: '#6b7280', fontStyle: 'italic' },  // gray-500
  { tag: tags.blockComment, color: '#6b7280', fontStyle: 'italic' },
  // Brackets
  { tag: tags.bracket, color: '#a1a1aa' },            // zinc-400
  // Punctuation
  { tag: tags.punctuation, color: '#a1a1aa' },
])

export const aetherHighlighting = syntaxHighlighting(aetherHighlightStyle)
