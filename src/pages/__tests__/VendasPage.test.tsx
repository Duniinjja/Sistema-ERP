import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { VendasPage } from '../VendasPage'

describe('VendasPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-11-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('lista vendas seed', () => {
    const setActiveTab = vi.fn()
    render(<VendasPage activeTab="vendas" setActiveTab={setActiveTab} onFinanceUpsertSale={() => {}} />)

    expect(screen.getByText('Loja Centro')).toBeInTheDocument()
  })
})
