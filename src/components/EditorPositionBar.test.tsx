import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EditorPositionBar } from './EditorPositionBar'

describe('EditorPositionBar', () => {
  it('affiche ligne et colonne', () => {
    render(<EditorPositionBar metrics={{ line: 3, column: 12, selectionLength: 0 }} />)
    expect(screen.getByRole('status', { name: /Line 3, column 12/ })).toBeInTheDocument()
    expect(screen.getByText(/Ln 3, Col 12/)).toBeInTheDocument()
  })

  it('affiche la longueur de sélection quand > 0', () => {
    render(<EditorPositionBar metrics={{ line: 1, column: 1, selectionLength: 5 }} />)
    expect(screen.getByText('5 selected')).toBeInTheDocument()
  })
})
