import { Suspense, lazy, useMemo } from 'react'
import { useFinanceStore } from './financeStore'
import { ReportsPanel } from './components/ReportsPanel'
import { MainLayout } from './layouts/MainLayout'
import { PageStateProvider, usePageState } from './contexts/PageStateContext'
import type { DashboardAlert, FinanceEntry, Kpi, Page, PieEntry } from './types/erp'

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((mod) => ({ default: mod.DashboardPage })))
const FinanceiroPage = lazy(() => import('./pages/FinanceiroPage').then((mod) => ({ default: mod.FinanceiroPage })))
const VendasPage = lazy(() => import('./pages/VendasPage').then((mod) => ({ default: mod.VendasPage })))
const ComprasPage = lazy(() => import('./pages/ComprasPage').then((mod) => ({ default: mod.ComprasPage })))
const ClientesPage = lazy(() => import('./pages/ClientesPage').then((mod) => ({ default: mod.ClientesPage })))
const ProdutosPage = lazy(() => import('./pages/ProdutosPage').then((mod) => ({ default: mod.ProdutosPage })))
const ConfiguracoesPage = lazy(() =>
  import('./pages/ConfiguracoesPage').then((mod) => ({ default: mod.ConfiguracoesPage })),
)

const shortcuts = ['Nova venda', 'Nova compra', 'Novo cliente', 'Novo produto', 'Cadastrar conta']

const formatMoney = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })

function AppContent() {
  const {
    activePage,
    setActivePage,
    financeTab,
    setFinanceTab,
    salesTab,
    setSalesTab,
    contactTab,
    setContactTab,
    productTab,
    setProductTab,
    configTab,
    setConfigTab,
  } = usePageState()

  const { entries, summary } = useFinanceStore()

  const navItems: Page[] = [
    'Dashboard',
    'Financeiro',
    'Vendas',
    'Compras',
    'Clientes',
    'Produtos',
    'Relatorios',
    'Configuracoes',
  ]

  const monthFinance = useMemo(() => {
    const today = new Date()
    const month = today.getMonth()
    const year = today.getFullYear()
    const entriesMonth = entries.filter((entry) => {
      const d = new Date(entry.data)
      return d.getMonth() === month && d.getFullYear() === year
    })
    const sum = (tipo: string) => entriesMonth.filter((entry) => entry.tipo === tipo).reduce((acc, entry) => acc + entry.valor, 0)
    return { receita: sum('recebimento'), custos: sum('pagamento') }
  }, [entries])

  const alerts: DashboardAlert[] = useMemo(() => {
    if (entries.length === 0) return [{ id: 'empty', text: 'Nenhum registro cadastrado', tone: 'info' }]
    return []
  }, [entries])

  const pieData: PieEntry[] = useMemo(() => {
    if (entries.length === 0) return [{ name: 'Sem dados', value: 1 }]
    const grouped = entries.reduce<Record<string, number>>((acc, entry) => {
      const key = entry.tipo
      acc[key] = (acc[key] || 0) + entry.valor
      return acc
    }, {})
    return Object.entries(grouped).map(([name, value]) => ({ name, value }))
  }, [entries])

  const kpis: Kpi[] = useMemo(
    () => [
      { id: 'receita', title: 'Faturamento do mes', value: formatMoney(monthFinance.receita), trend: 'Acompanhe o fluxo', tone: 'success' },
      { id: 'custos', title: 'Custos do mes', value: formatMoney(monthFinance.custos), trend: 'Controle', tone: 'danger' },
      { id: 'saldo', title: 'Saldo do mes', value: formatMoney(monthFinance.receita - monthFinance.custos), trend: 'Mes atual', tone: 'neutral' },
      { id: 'fluxo', title: 'Fluxo prox. 7 dias', value: formatMoney(summary.receberSemana - summary.pagarSemana), trend: 'Análise rápida', tone: 'neutral' },
    ],
    [monthFinance, summary],
  )

  const placeholderNav: string[] = []

  const pageFallback = <div className="p-6 text-sm text-slate-500">Carregando a página...</div>

  return (
    <MainLayout navItems={navItems} placeholderNav={placeholderNav} activePage={activePage} onNavigate={setActivePage}>
      <Suspense fallback={pageFallback}>
        <main className="p-6 space-y-6">
          {activePage === 'Dashboard' && (
            <DashboardPage
              kpis={kpis}
              resultado={{
                receita: monthFinance.receita,
                custos: monthFinance.custos,
                saldo: monthFinance.receita - monthFinance.custos,
                pendReceber: 0,
                pendPagar: 0,
              }}
              proximosFinanceiro={entries}
              pieData={pieData}
              onVerFinanceiro={() => setActivePage('Financeiro')}
              onKpiClick={(id) => {
                setActivePage('Financeiro')
                setFinanceTab(id === 'custos' ? 'pagamentos' : 'recebimentos')
              }}
              onShortcut={(label) => {
                if (label.toLowerCase().includes('venda')) setActivePage('Vendas')
              }}
              onboarding={{ steps: [], percent: 0 }}
              onGoConfig={() => setActivePage('Configuracoes')}
              onOnboardingClick={(id) => setActivePage('Configuracoes')}
              alerts={alerts}
              dailyNet={[]}
              formatMoney={formatMoney}
            />
          )}

          {activePage === 'Financeiro' && (
            <FinanceiroPage
              activeTab={financeTab}
              setActiveTab={setFinanceTab}
              entries={entries}
              addEntry={() => undefined}
              removeEntry={() => undefined}
              updateEntry={() => undefined}
              formatMoney={formatMoney}
            />
          )}
          {activePage === 'Vendas' && <VendasPage activeTab={salesTab} setActiveTab={setSalesTab} onFinanceUpsertSale={() => {}} openNewSignal={0} />}
          {activePage === 'Compras' && (
            <ComprasPage activeTab="compras" onFinanceUpsertPurchase={() => {}} onFinanceRemovePurchases={() => {}} openNewSignal={0} />
          )}
          {activePage === 'Clientes' && <ClientesPage activeTab="clientes" setActiveTab={() => {}} openNewSignal={0} />}
          {activePage === 'Produtos' && <ProdutosPage activeTab={productTab} setActiveTab={setProductTab} openNewSignal={0} />}
          {activePage === 'Configuracoes' && <ConfiguracoesPage activeTab={configTab} setActiveTab={setConfigTab} />}
          {activePage === 'Relatorios' && <ReportsPanel onNavigate={() => {}} />}
        </main>
      </Suspense>
    </MainLayout>
  )
}

export default function App() {
  return (
    <PageStateProvider>
      <AppContent />
    </PageStateProvider>
  )
}
