import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { VendasPage } from '../VendasPage'

describe('VendasPage', () => {
  it('lista vendas seed', () => {
    const setActiveTab = vi.fn()
    render(
      <VendasPage activeTab="vendas" setActiveTab={setActiveTab} onFinanceUpsertSale={() => {}} openNewSignal={0} />,
    )

    expect(screen.getByText('Loja Centro')).toBeInTheDocument()
  })
})
