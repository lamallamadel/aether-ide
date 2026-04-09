import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_FILES } from '../domain/fileNode'
import { useEditorStore } from '../state/editorStore'
import { useRunStore } from '../run/runStore'
import { EditorArea } from './EditorArea'

vi.mock('./CodeEditor', () => ({
  CodeEditor: ({ paneId }: { paneId?: string }) => <div data-testid={`code-editor-${paneId ?? 'primary'}`} />,
}))

afterEach(() => {
  vi.restoreAllMocks()
})

beforeEach(() => {
  useEditorStore.setState({
    files: INITIAL_FILES,
    activeFileId: 'src/App.tsx',
    openFiles: ['src/App.tsx'],
    getFileContent: () => '// code',
    editorSplit: 'none',
    activeEditorPane: 'primary',
    editorSplitRatio: 0.5,
    terminalDock: 'workspace',
    terminalPanelOpen: false,
    terminalPanelHeight: 120,
    aiQuickFixContext: null,
    worktreeChanges: {},
  })
})

describe('EditorArea', () => {
  it('affiche le fil d’Ariane et la barre de position avec un fichier ouvert', () => {
    render(<EditorArea />)
    expect(screen.getByLabelText('Chemin du fichier')).toBeInTheDocument()
    expect(screen.getByText('App.tsx')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: /Line 1, column 1/ })).toBeInTheDocument()
    expect(screen.getByTestId('code-editor-primary')).toBeInTheDocument()
  })

  it('affiche deux volets et un séparateur en split colonnes', () => {
    useEditorStore.setState({ editorSplit: 'columns' })
    render(<EditorArea />)
    expect(screen.getByTestId('code-editor-primary')).toBeInTheDocument()
    expect(screen.getByTestId('code-editor-secondary')).toBeInTheDocument()
    const verticalSep = document.querySelector('[role="separator"][aria-orientation="vertical"]')
    expect(verticalSep).toBeTruthy()
  })

  it('affiche le split horizontal avec séparateur row-resize', () => {
    useEditorStore.setState({ editorSplit: 'rows' })
    const { container } = render(<EditorArea />)
    const sep = container.querySelector('[aria-orientation="horizontal"]')
    expect(sep).toBeTruthy()
    expect(screen.getByTestId('code-editor-secondary')).toBeInTheDocument()
  })

  it('met à jour editorSplitRatio au drag du séparateur colonnes', () => {
    useEditorStore.setState({ editorSplit: 'columns', editorSplitRatio: 0.5 })
    const { container } = render(<EditorArea />)
    const sep = container.querySelector('[aria-orientation="vertical"]') as HTMLElement
    const pane = sep?.parentElement as HTMLElement
    vi.spyOn(pane, 'getBoundingClientRect').mockReturnValue({
      width: 200,
      height: 400,
      top: 0,
      left: 0,
      right: 200,
      bottom: 400,
      x: 0,
      y: 0,
      toJSON: () => '',
    })
    fireEvent.mouseDown(sep, { clientX: 100, clientY: 0 })
    fireEvent.mouseMove(window, { clientX: 150, clientY: 0 })
    fireEvent.mouseUp(window)
    expect(useEditorStore.getState().editorSplitRatio).toBeGreaterThan(0.5)
  })

  it('embarque RunPanel quand dock éditeur et panneau ouvert', () => {
    useEditorStore.setState({
      terminalDock: 'editor',
      terminalPanelOpen: true,
    })
    useRunStore.setState({ bottomPanelOpen: true, bottomTabs: [{ id: 'tab-terminal', kind: 'terminal', label: 'Terminal', terminalSessionId: 0 }], activeBottomTabId: 'tab-terminal' })
    render(<EditorArea />)
    const dock = screen.getByText(/Terminal/).closest('.border-t')
    expect(dock).toBeTruthy()
    expect(dock && within(dock as HTMLElement).getByText(/Terminal/)).toBeInTheDocument()
  })

  it('affiche l’état vide sans fichier actif', () => {
    useEditorStore.setState({ activeFileId: null, openFiles: [] })
    render(<EditorArea />)
    expect(screen.getByText(/Ctrl\+K/)).toBeInTheDocument()
  })
})
