import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FinanceiroPage } from '../FinanceiroPage'
import type { FinanceEntry } from '../../types/erp'

const entries: FinanceEntry[] = [
  {
    id: '1',
    tipo: 'recebimento',
    descricao: 'Receita',
    contato: 'Cliente',
    conta: 'Caixa',
    data: new Date().toISOString().slice(0, 10),
    situacao: 'Pendente',
    valor: 1200,
  },
]

describe('FinanceiroPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-11-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renderiza lista sem erros', () => {
    const setActiveTab = vi.fn()
    render(
      <FinanceiroPage
        activeTab="recebimentos"
        setActiveTab={setActiveTab}
        entries={entries}
        addEntry={() => undefined}
        removeEntry={() => undefined}
        updateEntry={() => undefined}
        formatMoney={(value) => `R$${value}`}
      />,
    )

    expect(screen.getByText('Receita')).toBeInTheDocument()
    expect(screen.getByText('Caixa')).toBeInTheDocument()
  })
})
