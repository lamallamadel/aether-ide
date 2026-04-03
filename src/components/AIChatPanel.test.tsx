import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_FILES } from '../domain/fileNode'
import { graphragQuery } from '../services/graphrag/graphrag'
import { useEditorStore } from '../state/editorStore'
import { AIChatPanel } from './AIChatPanel'

vi.mock('../services/graphrag/graphrag', () => ({
  graphragQuery: vi.fn(),
}))

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  useEditorStore.setState({
    files: INITIAL_FILES,
    aiPanelVisible: true,
    aiHealth: 'ok',
  })
  vi.mocked(graphragQuery).mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

function getSendButton() {
  const buttons = screen.getAllByRole('button')
  return buttons[buttons.length - 1]
}

describe('AIChatPanel', () => {
  it('rend null quand le panneau IA est fermé', () => {
    useEditorStore.setState({ aiPanelVisible: false })
    const { container } = render(<AIChatPanel />)
    expect(container.firstChild).toBeNull()
  })

  it('répond aux salutations sans appeler graphrag', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<AIChatPanel />)
    await user.type(screen.getByPlaceholderText(/Ask AI about/), 'hello')
    await user.click(getSendButton())
    await vi.advanceTimersByTimeAsync(700)
    await waitFor(() => {
      expect(graphragQuery).not.toHaveBeenCalled()
    })
    expect(screen.getByText(/ready to help you navigate/)).toBeInTheDocument()
  })

  it('affiche les résultats graphrag quand la requête renvoie des extraits', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    vi.mocked(graphragQuery).mockResolvedValueOnce([
      {
        score: 0.9,
        chunk: { fileId: 'App.tsx', text: 'snippet body text' },
      },
    ])
    render(<AIChatPanel />)
    await user.type(screen.getByPlaceholderText(/Ask AI about/), 'find component')
    await user.click(getSendButton())
    await vi.advanceTimersByTimeAsync(700)
    await waitFor(() => {
      expect(screen.getByText(/relevant snippets/)).toBeInTheDocument()
    })
    expect(screen.getByText(/App\.tsx/)).toBeInTheDocument()
  })

  it('affiche un message quand aucun résultat', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    vi.mocked(graphragQuery).mockResolvedValueOnce([])
    render(<AIChatPanel />)
    await user.type(screen.getByPlaceholderText(/Ask AI about/), 'xyzunknown')
    await user.click(getSendButton())
    await vi.advanceTimersByTimeAsync(700)
    await waitFor(() => {
      expect(screen.getByText(/couldn't find any specific code/)).toBeInTheDocument()
    })
  })

  it('affiche une erreur si graphrag échoue', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    vi.mocked(graphragQuery).mockRejectedValueOnce(new Error('boom'))
    render(<AIChatPanel />)
    await user.type(screen.getByPlaceholderText(/Ask AI about/), 'query')
    await user.click(getSendButton())
    await vi.advanceTimersByTimeAsync(700)
    await waitFor(() => {
      expect(screen.getByText(/Error querying Aether Intelligence/)).toBeInTheDocument()
    })
  })

  it('affiche la bannière degraded', () => {
    useEditorStore.setState({ aiHealth: 'degraded' })
    render(<AIChatPanel />)
    expect(screen.getByText(/Reduced Intelligence/)).toBeInTheDocument()
  })

  it('affiche la bannière offline', () => {
    useEditorStore.setState({ aiHealth: 'offline' })
    render(<AIChatPanel />)
    expect(screen.getByText(/AI Offline/)).toBeInTheDocument()
  })
})
