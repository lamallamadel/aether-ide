import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditorStore } from '../state/editorStore'
import { SettingsModal } from './SettingsModal'

beforeEach(() => {
  useEditorStore.setState({
    settingsOpen: false,
    editorFontSizePx: 14,
    editorMinimap: true,
    editorWordWrap: false,
    editorTheme: 'Aether',
    editorFontFamily: 'JetBrains Mono',
    ideThemeColor: 'purple',
    aiMode: 'cloud',
  })
})

describe('SettingsModal', () => {
  it('renders null when settingsOpen is false', () => {
    const { container } = render(<SettingsModal />)
    expect(container.firstChild).toBeNull()
  })

  it('renders dialog when settingsOpen is true', () => {
    useEditorStore.setState({ settingsOpen: true })
    render(<SettingsModal />)
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('closes when X button is clicked', async () => {
    const user = userEvent.setup()
    useEditorStore.setState({ settingsOpen: true })
    render(<SettingsModal />)

    const dialog = screen.getByRole('dialog')
    const headerButtons = dialog.querySelectorAll('button')
    const closeBtn = Array.from(headerButtons).find((b) => b.closest('.flex.items-center.justify-between'))
    await user.click(closeBtn ?? headerButtons[0])

    expect(useEditorStore.getState().settingsOpen).toBe(false)
  })

  it('closes when backdrop is clicked', async () => {
    const user = userEvent.setup()
    useEditorStore.setState({ settingsOpen: true })
    render(<SettingsModal />)

    const backdrop = document.querySelector('.fixed.inset-0')
    expect(backdrop).toBeInTheDocument()
    await user.click(backdrop as HTMLElement)

    expect(useEditorStore.getState().settingsOpen).toBe(false)
  })

  it('closes on Escape key', async () => {
    const user = userEvent.setup()
    useEditorStore.setState({ settingsOpen: true })
    render(<SettingsModal />)

    await user.keyboard('{Escape}')

    expect(useEditorStore.getState().settingsOpen).toBe(false)
  })

  it('font size +/- buttons update editorFontSizePx', async () => {
    const user = userEvent.setup()
    useEditorStore.setState({ settingsOpen: true })
    render(<SettingsModal />)

    const minusBtn = screen.getByRole('button', { name: '-' })
    const plusBtn = screen.getByRole('button', { name: '+' })

    await user.click(plusBtn)
    expect(useEditorStore.getState().editorFontSizePx).toBe(15)

    await user.click(plusBtn)
    expect(useEditorStore.getState().editorFontSizePx).toBe(16)

    await user.click(minusBtn)
    expect(useEditorStore.getState().editorFontSizePx).toBe(15)
  })

  it('Minimap toggle updates editorMinimap', async () => {
    const user = userEvent.setup()
    useEditorStore.setState({ settingsOpen: true, editorMinimap: true })
    render(<SettingsModal />)

    const minimapSection = screen.getByText('Minimap').closest('button')!
    await user.click(minimapSection)

    expect(useEditorStore.getState().editorMinimap).toBe(false)
  })

  it('Word Wrap toggle updates editorWordWrap', async () => {
    const user = userEvent.setup()
    useEditorStore.setState({ settingsOpen: true, editorWordWrap: false })
    render(<SettingsModal />)

    const wordWrapSection = screen.getByText('Word Wrap').closest('button')!
    await user.click(wordWrapSection)

    expect(useEditorStore.getState().editorWordWrap).toBe(true)
  })

  it('AI Mode Cloud/Local buttons update aiMode', async () => {
    const user = userEvent.setup()
    useEditorStore.setState({ settingsOpen: true, aiMode: 'cloud' })
    render(<SettingsModal />)

    const localBtn = screen.getByRole('button', { name: /Local/ })
    await user.click(localBtn)
    expect(useEditorStore.getState().aiMode).toBe('local')

    const cloudBtn = screen.getByRole('button', { name: /Cloud/ })
    await user.click(cloudBtn)
    expect(useEditorStore.getState().aiMode).toBe('cloud')
  })

  it('changes editor theme through themed select', async () => {
    const user = userEvent.setup()
    useEditorStore.setState({ settingsOpen: true, editorTheme: 'Aether' })
    render(<SettingsModal />)

    await user.click(screen.getByRole('button', { name: 'Select editor theme' }))
    await user.click(screen.getByRole('option', { name: 'Nord' }))

    expect(useEditorStore.getState().editorTheme).toBe('Nord')
  })

  it('focus trap handles Tab on last element', () => {
    useEditorStore.setState({ settingsOpen: true })
    render(<SettingsModal />)

    const dialog = screen.getByRole('dialog', { name: 'Settings' })
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    expect(first).toBeTruthy()
    expect(last).toBeTruthy()

    const focusSpy = vi.spyOn(first, 'focus')
    last.focus()
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(focusSpy).toHaveBeenCalled()
  })

  it('focus trap handles Shift+Tab on first element', () => {
    useEditorStore.setState({ settingsOpen: true })
    render(<SettingsModal />)

    const dialog = screen.getByRole('dialog', { name: 'Settings' })
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    expect(first).toBeTruthy()
    expect(last).toBeTruthy()

    const focusSpy = vi.spyOn(last, 'focus')
    first.focus()
    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })
    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(focusSpy).toHaveBeenCalled()
  })
})
