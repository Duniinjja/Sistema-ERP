import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DashboardPage } from '../DashboardPage'

describe('DashboardPage', () => {
  it('renderiza KPIs e chama callbacks', () => {
    const onVerFinanceiro = vi.fn()
    const onKpiClick = vi.fn()
    const onShortcut = vi.fn()
    const onGoConfig = vi.fn()
    const onOnboardingClick = vi.fn()
    render(
      <DashboardPage
        kpis={[
          { id: 'receita', title: 'Faturamento do mes', value: 'R$ 1.000', trend: '1', tone: 'success' },
          { id: 'custos', title: 'Custos do mes', value: 'R$ 200', trend: '0', tone: 'danger' },
          { id: 'saldo', title: 'Saldo do mes', value: 'R$ 800', trend: 'saldo', tone: 'neutral' },
          { id: 'fluxo', title: 'Fluxo', value: 'R$ 600', trend: 'fluxo', tone: 'neutral' },
        ]}
        resultado={{ receita: 1000, custos: 200, saldo: 800, pendReceber: 0, pendPagar: 0 }}
        proximosFinanceiro={[]}
        pieData={[{ name: 'Receitas', value: 1200 }]}
        onVerFinanceiro={onVerFinanceiro}
        onKpiClick={onKpiClick}
        onShortcut={onShortcut}
        onboarding={{ steps: [{ id: 'config', label: 'Configurar', done: true, detail: 'Feito' }], percent: 100 }}
        onGoConfig={onGoConfig}
        onOnboardingClick={onOnboardingClick}
        alerts={[]}
        dailyNet={[
          { dia: '01', valor: 100 },
          { dia: '02', valor: -50 },
        ]}
        formatMoney={(value) => `R$${value}`}
      />,
    )

    expect(screen.getByText('Faturamento do mes')).toBeInTheDocument()
    fireEvent.click(screen.getAllByText('Ver detalhes')[0])
    expect(onKpiClick).toHaveBeenCalledWith('receita')
    fireEvent.click(screen.getByText('Ir para Configuracoes'))
    expect(onGoConfig).toHaveBeenCalled()
  })
})
