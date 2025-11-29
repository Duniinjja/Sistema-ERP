import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ComprasPage } from '../ComprasPage'

describe('ComprasPage', () => {
  it('renderiza compras seed', () => {
    render(
      <ComprasPage activeTab="compras" onFinanceUpsertPurchase={() => {}} onFinanceRemovePurchases={() => {}} openNewSignal={0} />,
    )

    expect(screen.getByText('Fornec Uno')).toBeInTheDocument()
    expect(screen.getByText('NF123')).toBeInTheDocument()
  })
})
