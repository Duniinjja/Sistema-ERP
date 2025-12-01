import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ComprasPage } from '../ComprasPage'

describe('ComprasPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-11-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renderiza compras seed', () => {
    render(<ComprasPage activeTab="compras" onFinanceUpsertPurchase={() => {}} onFinanceRemovePurchases={() => {}} />)

    expect(screen.getByText('Fornec Uno')).toBeInTheDocument()
    expect(screen.getByText('NF123')).toBeInTheDocument()
  })
})
