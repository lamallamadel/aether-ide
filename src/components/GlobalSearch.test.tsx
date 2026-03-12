import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_FILES } from '../domain/fileNode'
import { useEditorStore } from '../state/editorStore'
import App from '../App'

vi.mock('../services/workers/WorkerBridge', () => ({
  workerBridge: {
    postRequest: vi.fn((type: string) => {
      if (type === 'INDEX_BUILD') return Promise.resolve({ docCount: 5 })
      if (type === 'INDEX_SEARCH') {
        return Promise.resolve({
          results: [
            { fileId: 'App.tsx', startLine: 5, endLine: 7, score: 0.95, snippet: 'Welcome to Aether Code' },
          ],
        })
      }
      return Promise.reject(new Error(`Unknown type: ${type}`))
    }),
  },
}))

beforeEach(() => {
  useEditorStore.setState({
    files: INITIAL_FILES,
    activeFileId: 'App.tsx',
    openFiles: ['App.tsx', 'main.tsx'],
    sidebarVisible: true,
    aiPanelVisible: true,
    commandPaletteOpen: false,
    globalSearchOpen: false,
    settingsOpen: false,
    missionControlOpen: false,
    aiMode: 'cloud',
    perf: { longTaskCount: 0, longTaskMaxMs: 0, slowFrameCount: 0, slowFrameMaxMs: 0 },
    worktreeChanges: {},
    editorFontSizePx: 14,
    editorWordWrap: false,
    editorMinimap: true,
    _untitledCounter: 1,
    syntaxTrees: {},
    symbolsByFile: {},
  })
})

describe('GlobalSearch', () => {
  it(
    'ouvre Global Search depuis la palette et retourne des résultats',
    async () => {
    const user = userEvent.setup()
    render(<App />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
    const paletteInput = await screen.findByPlaceholderText('Type a command or file name...')
    await user.type(paletteInput, 'Global Search')
    await user.click(await screen.findByText('Global Search'))

    const dialog = await screen.findByRole('dialog', { name: 'Global Search' })
    const searchInput = within(dialog).getByPlaceholderText('Search in file contents…')
    await user.type(searchInput, 'Welcome')

    // Le snippet est rendu avec HighlightMatch : "Welcome" (span) + " to Aether Code" (texte)
    // "to Aether Code" est dans un seul nœud texte, plus fiable que le texte fragmenté
    await expect(
      within(dialog).findByText(/to Aether Code/i, {}, { timeout: 5000 })
    ).resolves.toBeInTheDocument()
    const resultRow = within(dialog).getAllByRole('button').find((b) => b.className.includes('search-result-item'))
    expect(resultRow).toBeTruthy()
    expect(within(dialog).queryAllByRole('combobox')).toHaveLength(0)

    const modeButton = within(dialog).getByRole('button', { name: 'Search mode' })
    const scopeButton = within(dialog).getByRole('button', { name: 'Search scope' })
    expect(modeButton.className).toContain('search-select')
    expect(scopeButton.className).toContain('search-select')

    await user.click(modeButton)
    expect(within(dialog).getByRole('listbox', { name: 'Search mode' })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('option', { name: 'Filename' }))
    expect(modeButton.textContent).toContain('Filename')

    await user.click(modeButton)
    await user.click(within(dialog).getByRole('option', { name: 'Knowledge' }))
    expect(modeButton.textContent).toContain('Knowledge')

    const firstChip = within(dialog).getByRole('button', { name: '.ts' })
    expect(firstChip.className).toContain('search-chip')
    },
    60000
  )
})
