import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProdutosPage } from '../ProdutosPage'

describe('ProdutosPage', () => {
  it('tem lista de produtos', () => {
    const setActiveTab = vi.fn()
    render(<ProdutosPage activeTab="produtos" setActiveTab={setActiveTab} />)

    expect(screen.getByText('Produtos')).toBeInTheDocument()
    expect(screen.getByText('Notebook Pro')).toBeInTheDocument()
  })
})
