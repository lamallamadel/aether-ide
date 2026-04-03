import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { INITIAL_FILES } from '../domain/fileNode'
import { useEditorStore } from '../state/editorStore'
import { ActivityBar } from './ActivityBar'

beforeEach(() => {
  useEditorStore.setState({
    files: INITIAL_FILES,
    sidebarVisible: true,
    commandPaletteOpen: false,
    terminalPanelOpen: false,
    settingsOpen: false,
  })
})

describe('ActivityBar', () => {
  it('Toggle Sidebar appelle le store', async () => {
    const user = userEvent.setup()
    render(<ActivityBar />)
    expect(useEditorStore.getState().sidebarVisible).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Toggle Sidebar' }))
    expect(useEditorStore.getState().sidebarVisible).toBe(false)
  })

  it('Open Command Palette ouvre la palette', async () => {
    const user = userEvent.setup()
    render(<ActivityBar />)
    await user.click(screen.getByRole('button', { name: 'Open Command Palette' }))
    expect(useEditorStore.getState().commandPaletteOpen).toBe(true)
  })

  it('Toggle Terminal bascule le panneau terminal', async () => {
    const user = userEvent.setup()
    render(<ActivityBar />)
    await user.click(screen.getByRole('button', { name: 'Toggle Terminal' }))
    expect(useEditorStore.getState().terminalPanelOpen).toBe(true)
  })

  it('Open Settings ouvre les paramètres', async () => {
    const user = userEvent.setup()
    render(<ActivityBar />)
    await user.click(screen.getByRole('button', { name: 'Open Settings' }))
    expect(useEditorStore.getState().settingsOpen).toBe(true)
  })
})
