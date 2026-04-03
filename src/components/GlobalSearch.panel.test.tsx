import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_FILES } from '../domain/fileNode'
import { graphragQuery } from '../services/graphrag/graphrag'
import { workerBridge } from '../services/workers/WorkerBridge'
import { useEditorStore } from '../state/editorStore'
import { GlobalSearch } from './GlobalSearch'

vi.mock('../services/graphrag/graphrag', () => ({
  graphragQuery: vi.fn(),
}))

beforeEach(() => {
  useEditorStore.setState({
    files: INITIAL_FILES,
    openFiles: ['App.tsx', 'main.tsx'],
    globalSearchOpen: true,
    perf: { longTaskCount: 0, longTaskMaxMs: 16, slowFrameCount: 0, slowFrameMaxMs: 0 },
    aiHealth: 'full',
  })
  vi.mocked(workerBridge.postRequest).mockImplementation((type: string) => {
    if (type === 'INDEX_SEARCH') {
      return Promise.resolve({
        results: [
          {
            fileId: 'App.tsx',
            startLine: 3,
            endLine: 5,
            score: 0.92,
            snippet: 'Welcome to Aether Code',
          },
        ],
      })
    }
    return Promise.reject(new Error(`unexpected ${type}`))
  })
  vi.mocked(graphragQuery).mockResolvedValue([
    { score: 0.85, chunk: { fileId: 'readme.md', text: 'Aether Code intro' } },
  ])
})

describe('GlobalSearch (panneau)', () => {
  it('mode contenu : affiche les résultats après debounce', async () => {
    const user = userEvent.setup()
    render(<GlobalSearch />)
    await user.type(screen.getByPlaceholderText(/Search in file contents/), 'Aether')
    await waitFor(
      () => {
        expect(vi.mocked(workerBridge.postRequest)).toHaveBeenCalledWith(
          'INDEX_SEARCH',
          expect.objectContaining({ query: 'Aether' })
        )
        expect(screen.getByRole('button', { name: /App\.tsx/ })).toBeInTheDocument()
      },
      { timeout: 4000 }
    )
  })

  it('mode filename : trouve des fichiers sans worker', async () => {
    const user = userEvent.setup()
    render(<GlobalSearch />)
    await user.click(screen.getByRole('button', { name: 'Search mode' }))
    await user.click(screen.getByRole('option', { name: 'Filename' }))
    await user.type(screen.getByPlaceholderText(/Search file names/), 'readme')
    await waitFor(() => {
      expect(screen.getByText('README.md')).toBeInTheDocument()
    }, { timeout: 4000 })
  })

  it('mode knowledge : utilise graphragQuery', async () => {
    const user = userEvent.setup()
    render(<GlobalSearch />)
    await user.click(screen.getByRole('button', { name: 'Search mode' }))
    await user.click(screen.getByRole('option', { name: 'Knowledge' }))
    await user.type(screen.getByPlaceholderText(/Search knowledge/), 'codebase')
    await waitFor(() => {
      expect(graphragQuery).toHaveBeenCalled()
    }, { timeout: 4000 })
    await waitFor(() => {
      expect(screen.getByText(/Aether Code intro/)).toBeInTheDocument()
    }, { timeout: 4000 })
  })

  it('Escape ferme le panneau', async () => {
    const user = userEvent.setup()
    render(<GlobalSearch />)
    await user.keyboard('{Escape}')
    expect(useEditorStore.getState().globalSearchOpen).toBe(false)
  })

  it('affiche le bandeau dégradé en knowledge + aiHealth degraded', async () => {
    useEditorStore.setState({ aiHealth: 'degraded' })
    const user = userEvent.setup()
    render(<GlobalSearch />)
    await user.click(screen.getByRole('button', { name: 'Search mode' }))
    await user.click(screen.getByRole('option', { name: 'Knowledge' }))
    expect(screen.getByText(/Keyword Mode/)).toBeInTheDocument()
  })
})
