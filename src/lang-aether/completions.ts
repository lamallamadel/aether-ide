/**
 * Aether language completions for CodeMirror.
 * Provides keywords, built-in types, annotations, and code snippets.
 */
import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete'

interface CompletionItem {
  label: string
  type: string
  detail?: string
  info?: string
  boost?: number
  apply?: string
}

const KEYWORD_COMPLETIONS: CompletionItem[] = [
  { label: 'fn', type: 'keyword', detail: 'function', boost: 2, apply: 'fn ' },
  { label: 'let', type: 'keyword', boost: 2, apply: 'let ' },
  { label: 'mut', type: 'keyword', apply: 'mut ' },
  { label: 'return', type: 'keyword', boost: 1 },
  { label: 'if', type: 'keyword', boost: 1 },
  { label: 'else', type: 'keyword' },
  { label: 'while', type: 'keyword', apply: 'while ' },
  { label: 'for', type: 'keyword', apply: 'for ' },
  { label: 'match', type: 'keyword', apply: 'match ' },
  { label: 'yield', type: 'keyword', detail: 'agent transition', boost: 2, apply: 'yield ' },
  { label: 'spawn', type: 'keyword', detail: 'parallel task', boost: 1, apply: 'spawn ' },
  { label: 'parallel_scope', type: 'keyword', detail: 'structured concurrency', boost: 1 },
  { label: 'import', type: 'keyword', apply: 'import ' },
  { label: 'package', type: 'keyword', apply: 'package ' },
  { label: 'pub', type: 'keyword', apply: 'pub ' },
  { label: 'extern', type: 'keyword', detail: 'FFI', apply: 'extern ' },
  { label: 'async', type: 'keyword', apply: 'async ' },
  { label: 'await', type: 'keyword', apply: 'await ' },
  { label: 'try', type: 'keyword' },
  { label: 'struct', type: 'keyword', detail: 'type declaration', boost: 1, apply: 'struct ' },
  { label: 'state', type: 'keyword', detail: 'agent state', boost: 2, apply: 'state ' },
  { label: 'enum', type: 'keyword', detail: 'enumeration', apply: 'enum ' },
  { label: 'trait', type: 'keyword', apply: 'trait ' },
  { label: 'impl', type: 'keyword', apply: 'impl ' },
  { label: 'in', type: 'keyword' },
]

const TYPE_COMPLETIONS: CompletionItem[] = [
  { label: 'i32', type: 'type', detail: '32-bit integer' },
  { label: 'i64', type: 'type', detail: '64-bit integer' },
  { label: 'f32', type: 'type', detail: '32-bit float' },
  { label: 'f64', type: 'type', detail: '64-bit float' },
  { label: 'bool', type: 'type' },
  { label: 'String', type: 'type' },
  { label: 'Vector', type: 'type', detail: 'dynamic array', apply: 'Vector<>' },
  { label: 'Map', type: 'type', detail: 'key-value map', apply: 'Map<>' },
  { label: 'Set', type: 'type', detail: 'unique set', apply: 'Set<>' },
  { label: 'Result', type: 'type', detail: 'Result<T, E>', apply: 'Result<>' },
  { label: 'Transition', type: 'type', detail: 'agent transition' },
  { label: 'void', type: 'type' },
]

const AGENT_COMPLETIONS: CompletionItem[] = [
  { label: 'Next', type: 'constant', detail: 'transition to node', boost: 2, apply: 'Next(Node::' },
  { label: 'Finish', type: 'constant', detail: 'agent completes', boost: 2, apply: 'Finish(' },
  { label: 'Fault', type: 'constant', detail: 'agent error', apply: 'Fault(' },
  { label: 'Loop', type: 'constant', detail: 'repeat current node', apply: 'Loop(' },
  { label: 'Node', type: 'constant', detail: 'node reference', apply: 'Node::' },
  { label: 'Ok', type: 'constant', detail: 'success result', apply: 'Ok(' },
  { label: 'Err', type: 'constant', detail: 'error result', apply: 'Err(' },
  { label: 'true', type: 'constant' },
  { label: 'false', type: 'constant' },
]

const ANNOTATION_COMPLETIONS: CompletionItem[] = [
  { label: '@node', type: 'property', detail: 'agent node annotation', boost: 3, apply: '@node(tier=' },
  { label: '@reducer', type: 'property', detail: 'state reducer', boost: 3, apply: '@reducer(' },
]

const SNIPPET_COMPLETIONS: CompletionItem[] = [
  {
    label: 'state struct',
    type: 'text',
    detail: 'agent state declaration',
    boost: 3,
    apply: 'state struct ${1:Name} {\n    ${2:field}: ${3:i32},\n}\n',
  },
  {
    label: '@node fn',
    type: 'text',
    detail: 'agent node function',
    boost: 3,
    apply: '@node(tier=${1:LOW})\nfn ${2:name}(mut state: ${3:State}) -> Transition {\n    yield Finish(state)\n}\n',
  },
  {
    label: 'parallel_scope block',
    type: 'text',
    detail: 'structured concurrency',
    boost: 2,
    apply: 'parallel_scope {\n    spawn ${1:task}(${2:s}) => ${3:s.field}\n}\n',
  },
  {
    label: 'extern fn',
    type: 'text',
    detail: 'FFI declaration',
    boost: 1,
    apply: 'extern fn ${1:name}(${2:args}) -> ${3:i32}\n',
  },
  {
    label: 'trait block',
    type: 'text',
    detail: 'trait declaration',
    apply: 'trait ${1:Name} {\n    fn ${2:method}(self) -> ${3:i32}\n}\n',
  },
  {
    label: 'impl block',
    type: 'text',
    detail: 'impl block',
    apply: 'impl ${1:Trait} for ${2:Type} {\n    fn ${3:method}(self) -> ${4:i32} {\n        ${5}\n    }\n}\n',
  },
]

const ALL_COMPLETIONS: CompletionItem[] = [
  ...KEYWORD_COMPLETIONS,
  ...TYPE_COMPLETIONS,
  ...AGENT_COMPLETIONS,
  ...ANNOTATION_COMPLETIONS,
  ...SNIPPET_COMPLETIONS,
]

export function aetherCompletions(context: CompletionContext): CompletionResult | null {
  // After @ → annotation completions only
  const atMatch = context.matchBefore(/@\w*/)
  if (atMatch) {
    return {
      from: atMatch.from,
      options: ANNOTATION_COMPLETIONS,
    }
  }

  const word = context.matchBefore(/[\w.@]*/)
  if (!word?.text && !context.explicit) return null
  const from = word?.from ?? context.pos

  return {
    from,
    options: ALL_COMPLETIONS,
  }
}
