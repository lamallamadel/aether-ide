import {
  history,
  historyKeymap,
  undo,
  redo,
  selectAll,
  defaultKeymap,
  indentWithTab,
} from '@codemirror/commands'
import { highlightSelectionMatches, openSearchPanel, search, searchKeymap } from '@codemirror/search'
import { keymap } from '@codemirror/view'
import { Compartment, EditorState, Facet } from '@codemirror/state'
import { EditorView, drawSelection, highlightActiveLine, highlightSpecialChars, lineNumbers } from '@codemirror/view'
import { showMinimap } from '@replit/codemirror-minimap'
import type { EditorCommand } from '../state/editorStore'
import { useEditorStore } from '../state/editorStore'
import { useShallow } from 'zustand/react/shallow'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { yaml } from '@codemirror/lang-yaml'
import { gutter, GutterMarker } from '@codemirror/view'
import { useEffect, useMemo, useRef } from 'react'
import type { ExtractedSymbol } from '../services/syntax/syntaxTypes'
import type { SerializedNode, SerializedTree } from '../services/syntax/syntaxTypes'

// --- Syntax Highlighting ---
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language'
import { tags } from '@lezer/highlight'

const aetherHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#c084fc' }, // purple-400
  { tag: [tags.name, tags.deleted, tags.character, tags.propertyName, tags.macroName], color: '#d4d4d4' },
  { tag: [tags.function(tags.variableName), tags.labelName], color: '#67e8f9' }, // cyan-300
  { tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)], color: '#fdba74' }, // orange-300
  { tag: [tags.definition(tags.name), tags.separator], color: '#d4d4d4' },
  { tag: [tags.typeName, tags.className, tags.number, tags.changed, tags.annotation, tags.modifier, tags.self, tags.namespace], color: '#fdba74' }, // orange-300
  { tag: [tags.operator, tags.operatorKeyword, tags.url, tags.escape, tags.regexp, tags.link, tags.special(tags.string)], color: '#f472b6' }, // pink-400
  { tag: [tags.meta, tags.comment], color: '#6b7280', fontStyle: 'italic' }, // gray-500
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.link, color: '#6b7280', textDecoration: 'underline' },
  { tag: tags.heading, fontWeight: 'bold', color: '#c084fc' },
  { tag: [tags.atom, tags.bool, tags.special(tags.variableName)], color: '#fdba74' }, // orange-300
  { tag: [tags.processingInstruction, tags.string, tags.inserted], color: '#fde047' }, // yellow-300
  { tag: tags.invalid, color: '#ff0000' },
])

// --- AI Gutter: connected to symbolsByFile + syntaxTrees ---

const aiGutterDataFacet = Facet.define<Record<number, 'warning' | 'suggestion'>, Record<number, 'warning' | 'suggestion'>>({
  combine: (values) => values[0] ?? {},
})

const lineFromOffset = (content: string, offset: number): number =>
  content.slice(0, Math.min(offset, content.length)).split('\n').length

const collectErrorLines = (node: SerializedNode): number[] => {
  const lines: number[] = []
  if (node.type === 'ERROR') lines.push(node.startPosition.row + 1)
  for (const c of node.children ?? []) lines.push(...collectErrorLines(c))
  return lines
}

const EMPTY_SYMBOLS: ExtractedSymbol[] = []

const buildGutterData = (
  content: string,
  symbols: ExtractedSymbol[],
  tree: SerializedTree | undefined
): Record<number, 'warning' | 'suggestion'> => {
  const out: Record<number, 'warning' | 'suggestion'> = {}
  for (const s of symbols) {
    if (['function', 'class', 'import', 'export'].includes(s.kind)) {
      const line = lineFromOffset(content, s.startIndex)
      if (!out[line] || out[line] === 'suggestion') out[line] = 'suggestion'
    }
  }
  if (tree?.root) {
    for (const line of collectErrorLines(tree.root)) {
      out[line] = 'warning'
    }
  }
  return out
}

class AIGutterMarker extends GutterMarker {
  readonly type: 'warning' | 'suggestion'

  constructor(type: 'warning' | 'suggestion') {
    super()
    this.type = type
  }

  toDOM() {
    const span = document.createElement('span')
    span.className = 'flex items-center justify-center w-full h-full cursor-pointer hover:bg-white/10 rounded transition-colors'
    if (this.type === 'warning') {
      span.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgb(234 179 8)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`
    } else {
      span.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgb(168 85 247)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`
    }
    span.onclick = (e) => {
      e.stopPropagation()
      window.dispatchEvent(new CustomEvent('aether-ai-click', { detail: { type: this.type } }))
    }
    return span
  }
}

const aiGutter = gutter({
  class: 'cm-ai-gutter',
  lineMarker(view, line) {
    const data = view.state.facet(aiGutterDataFacet)
    const lineNum = view.state.doc.lineAt(line.from).number
    const marker = data[lineNum]
    return marker ? new AIGutterMarker(marker) : null
  },
  initialSpacer: () => new AIGutterMarker('suggestion'),
})

// --- End AI Gutter ---

function languageForFile(fileId: string | null) {
  if (!fileId) return markdown()
  const lower = fileId.toLowerCase()
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return yaml()
  if (lower.endsWith('.aether')) return markdown()
  if (lower.endsWith('.ts') || lower.endsWith('.tsx') || lower.endsWith('.js') || lower.endsWith('.jsx')) return javascript({ typescript: true })
  if (lower.endsWith('.json')) return json()
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return markdown()
  return markdown()
}

const getThemeConfig = (theme: string) => {
  switch (theme) {
    case 'Sublime':
      return {
        bg: '#272822',
        text: '#F8F8F2',
        gutterBg: '#272822',
        gutterText: '#8F908A',
        selection: '#49483E',
      }
    case 'Monokai':
      return {
        bg: '#272822',
        text: '#F8F8F2',
        gutterBg: '#272822',
        gutterText: '#8F908A',
        selection: '#49483E',
      }
    case 'Nord':
      return {
        bg: '#2E3440',
        text: '#D8DEE9',
        gutterBg: '#2E3440',
        gutterText: '#4C566A',
        selection: '#434C5E',
      }
    case 'Solarized Light':
      return {
        bg: '#fdf6e3',
        text: '#657b83',
        gutterBg: '#fdf6e3',
        gutterText: '#93a1a1',
        selection: '#eee8d5',
      }
    case 'Solarized Dark':
      return {
        bg: '#002b36',
        text: '#839496',
        gutterBg: '#002b36',
        gutterText: '#586e75',
        selection: '#073642',
      }
    case 'Aether':
    default:
      return {
        bg: '#1e1e1e',
        text: '#d4d4d4',
        gutterBg: '#1e1e1e',
        gutterText: '#6b7280',
        selection: 'rgba(147, 51, 234, 0.30)',
      }
  }
}

export function CodeEditor(props: {
  fileId: string | null
  value: string
  onChange: (next: string) => void
  fontSizePx: number
  fontFamily: string
  theme: string
  wordWrap: boolean
  minimap?: boolean
}) {
  const { fileId, value, onChange, fontSizePx, fontFamily, theme, wordWrap, minimap = false } = props
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const lastValueRef = useRef<string>(value)
  const debounceRef = useRef<number | null>(null)
  const languageCompartment = useRef(new Compartment()).current
  const wrapCompartment = useRef(new Compartment()).current
  const themeCompartment = useRef(new Compartment()).current
  const minimapCompartment = useRef(new Compartment()).current
  const aiGutterDataCompartment = useRef(new Compartment()).current

  const symbols = useEditorStore(useShallow((s) => s.symbolsByFile[fileId ?? ''] ?? EMPTY_SYMBOLS))
  const syntaxTree = useEditorStore(useShallow((s) => s.syntaxTrees[fileId ?? '']))

  const gutterData = useMemo(
    () => buildGutterData(value, symbols, syntaxTree),
    [value, symbols, syntaxTree]
  )

  const language = useMemo(() => languageForFile(fileId), [fileId])
  const baseTheme = useMemo(() => {
    const themeConfig = getThemeConfig(theme)
    return EditorView.theme(
      {
        '&': {
          height: '100%',
          backgroundColor: themeConfig.bg,
          color: themeConfig.text,
          fontSize: `${fontSizePx}px`,
          fontFamily: `${fontFamily}, monospace`,
        },
        '.cm-content': { caretColor: '#ffffff' },
        '.cm-gutters': {
          backgroundColor: themeConfig.gutterBg,
          color: themeConfig.gutterText,
          borderRight: '1px solid rgba(255,255,255,0.05)',
        },
        '.cm-ai-gutter': {
          width: '24px',
          backgroundColor: themeConfig.gutterBg,
          borderRight: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        },
        '.cm-activeLineGutter': { backgroundColor: 'rgba(255,255,255,0.04)' },
        '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.03)' },
        '.cm-selectionBackground': { backgroundColor: themeConfig.selection },
        '&.cm-focused .cm-selectionBackground': { backgroundColor: themeConfig.selection },
        '&.cm-focused': { outline: 'none' },
      },
      { dark: true }
    )
  }, [fontSizePx, fontFamily, theme])

  useEffect(() => {
    if (!hostRef.current) return
    if (viewRef.current) return

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightSpecialChars(),
        drawSelection(),
        highlightActiveLine(),
        history(),
        keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap, ...searchKeymap]),
        search(),
        highlightSelectionMatches({ highlightWordAroundCursor: true }),
        aiGutter, // Add the AI Gutter
        EditorView.updateListener.of((u) => {
          if (!u.docChanged) return
          const next = u.state.doc.toString()
          lastValueRef.current = next
          if (debounceRef.current) window.clearTimeout(debounceRef.current)
          debounceRef.current = window.setTimeout(() => onChange(next), 250)
        }),
        themeCompartment.of(baseTheme),
        wrapCompartment.of(wordWrap ? EditorView.lineWrapping : []),
        languageCompartment.of(language ? [language] : []),
        syntaxHighlighting(aetherHighlightStyle),
        minimapCompartment.of(
          minimap
            ? showMinimap.of({
                create: () => ({ dom: document.createElement('div') }),
                displayText: 'blocks',
                showOverlay: 'mouse-over',
              })
            : showMinimap.of(null)
        ),
        aiGutterDataCompartment.of(aiGutterDataFacet.of(gutterData)),
      ],
    })

    const view = new EditorView({ state, parent: hostRef.current })
    viewRef.current = view

    const runner = (cmd: EditorCommand): boolean => {
      try {
        const target = { state: view.state, dispatch: (tr: import('@codemirror/state').Transaction) => view.dispatch(tr) }
        if (cmd === 'undo') return undo(target)
        if (cmd === 'redo') return redo(target)
        if (cmd === 'selectAll') return selectAll(target)
        if (cmd === 'findInFile') return openSearchPanel(view)
        if (cmd === 'copy' || cmd === 'paste' || cmd === 'cut') {
          view.focus()
          const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform)
          const key = cmd === 'copy' ? 'c' : cmd === 'cut' ? 'x' : 'v'
          const ev = new KeyboardEvent('keydown', {
            key,
            ctrlKey: !isMac,
            metaKey: isMac,
            bubbles: true,
          })
          view.dom.dispatchEvent(ev)
          return true
        }
        return false
      } catch {
        return false
      }
    }
    const tid = window.setTimeout(() => useEditorStore.getState().setEditorCommandRunner(runner), 0)

    return () => {
      window.clearTimeout(tid)
      useEditorStore.getState().setEditorCommandRunner(null)
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      view.destroy()
      viewRef.current = null
    }
  }, [baseTheme, language, onChange, wordWrap])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value && lastValueRef.current !== value) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } })
      lastValueRef.current = value
    }
  }, [value])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: languageCompartment.reconfigure(language ? [language] : []),
    })
  }, [language])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({ effects: themeCompartment.reconfigure(baseTheme) })
  }, [baseTheme])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({ effects: wrapCompartment.reconfigure(wordWrap ? EditorView.lineWrapping : []) })
  }, [wordWrap])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: minimapCompartment.reconfigure(
        minimap
          ? showMinimap.of({
              create: () => ({ dom: document.createElement('div') }),
              displayText: 'blocks',
              showOverlay: 'mouse-over',
            })
          : showMinimap.of(null)
      ),
    })
  }, [minimap])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({ effects: aiGutterDataCompartment.reconfigure(aiGutterDataFacet.of(gutterData)) })
  }, [gutterData])

  useEffect(() => {
    const onGotoSymbol = (event: Event) => {
      const custom = event as CustomEvent<{ fileId: string; startIndex: number }>
      const detail = custom.detail
      if (!detail || detail.fileId !== fileId) return
      const view = viewRef.current
      if (!view) return
      const pos = Math.max(0, Math.min(detail.startIndex, view.state.doc.length))
      view.dispatch({
        selection: { anchor: pos },
        scrollIntoView: true,
      })
      view.focus()
    }
    window.addEventListener('aether-goto-symbol', onGotoSymbol as EventListener)
    return () => window.removeEventListener('aether-goto-symbol', onGotoSymbol as EventListener)
  }, [fileId])

  return <div ref={hostRef} data-testid="code-editor" className="h-full w-full overflow-hidden" />
}
