import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_FILES } from '../domain/fileNode'
import { useEditorStore } from '../state/editorStore'
import { xtermMocks } from '../test/setup'
import { TerminalPanel } from './TerminalPanel'

beforeEach(() => {
  useEditorStore.setState({
    files: INITIAL_FILES,
    terminalPanelOpen: false,
    terminalPanelHeight: 200,
  })
  vi.clearAllMocks()
})

describe('TerminalPanel', () => {
  it('renders null when terminalPanelOpen is false', () => {
    const { container } = render(<TerminalPanel />)
    expect(container.firstChild).toBeNull()
  })

  it('renders header and close button when terminalPanelOpen is true', () => {
    useEditorStore.setState({ terminalPanelOpen: true })
    render(<TerminalPanel />)
    expect(screen.getByText('Terminal')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close terminal' })).toBeInTheDocument()
  })

  it('closes panel when close button is clicked', async () => {
    const user = userEvent.setup()
    useEditorStore.setState({ terminalPanelOpen: true })
    render(<TerminalPanel />)

    await user.click(screen.getByRole('button', { name: 'Close terminal' }))

    expect(useEditorStore.getState().terminalPanelOpen).toBe(false)
  })

  it('unmounts without crashing when open', () => {
    useEditorStore.setState({ terminalPanelOpen: true })
    const { unmount } = render(<TerminalPanel />)
    expect(() => unmount()).not.toThrow()
  })

  it('runs help command when user types help and enter', () => {
    useEditorStore.setState({ terminalPanelOpen: true })
    render(<TerminalPanel />)

    const onDataCallback = xtermMocks.onData.mock.calls[0]?.[0] as ((data: string) => void) | undefined
    expect(onDataCallback).toBeDefined()
    if (!onDataCallback) return

    onDataCallback('h')
    onDataCallback('e')
    onDataCallback('l')
    onDataCallback('p')
    onDataCallback('\r')

    expect(xtermMocks.writeln).toHaveBeenCalledWith(
      expect.stringContaining('Available commands: clear, echo, ls, pwd, help')
    )
  })

  it('runs echo command', () => {
    useEditorStore.setState({ terminalPanelOpen: true })
    render(<TerminalPanel />)

    const onDataCallback = xtermMocks.onData.mock.calls[0]?.[0] as ((data: string) => void) | undefined
    expect(onDataCallback).toBeDefined()
    if (!onDataCallback) return

    for (const c of 'echo hello') onDataCallback(c)
    onDataCallback('\r')

    expect(xtermMocks.writeln).toHaveBeenCalledWith('hello')
  })
})
