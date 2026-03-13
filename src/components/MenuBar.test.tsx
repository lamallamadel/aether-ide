import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_FILES } from '../domain/fileNode'
import { useEditorStore } from '../state/editorStore'
import { MenuBar } from './MenuBar'

vi.mock('../services/fileSystem/fileSystemAccess', () => ({
  isSupported: vi.fn(() => false),
  pickDirectory: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('./CodeEditor', () => ({
  CodeEditor: () => null,
}))

beforeEach(() => {
  useEditorStore.setState({
    files: INITIAL_FILES,
    activeFileId: 'App.tsx',
    openFiles: ['App.tsx'],
    terminalPanelOpen: false,
    commandPaletteOpen: false,
    globalSearchOpen: false,
    settingsOpen: false,
    missionControlOpen: false,
    sidebarVisible: true,
    aiPanelVisible: false,
  })
})

describe('MenuBar', () => {
  it('renders Terminal menu button', () => {
    render(<MenuBar />)
    expect(screen.getByRole('button', { name: 'Terminal' })).toBeInTheDocument()
  })

  it('Terminal menu contains New Terminal action', async () => {
    const user = userEvent.setup()
    render(<MenuBar />)

    await user.click(screen.getByRole('button', { name: 'Terminal' }))
    expect(screen.getByRole('menuitem', { name: 'New Terminal' })).toBeInTheDocument()
  })

  it('New Terminal toggles terminalPanelOpen', async () => {
    const user = userEvent.setup()
    render(<MenuBar />)

    expect(useEditorStore.getState().terminalPanelOpen).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Terminal' }))
    await user.click(screen.getByRole('menuitem', { name: 'New Terminal' }))

    expect(useEditorStore.getState().terminalPanelOpen).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Terminal' }))
    await user.click(screen.getByRole('menuitem', { name: 'New Terminal' }))

    expect(useEditorStore.getState().terminalPanelOpen).toBe(false)
  })

  it('View menu contains Open Settings', async () => {
    const user = userEvent.setup()
    render(<MenuBar />)

    await user.click(screen.getByRole('button', { name: 'View' }))
    expect(screen.getByRole('menuitem', { name: 'Open Settings' })).toBeInTheDocument()
  })

  it('View menu contains Global Search', async () => {
    const user = userEvent.setup()
    render(<MenuBar />)

    await user.click(screen.getByRole('button', { name: 'View' }))
    expect(screen.getByRole('menuitem', { name: 'Global Search' })).toBeInTheDocument()
  })
})
