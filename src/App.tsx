import { Suspense, lazy, useMemo } from 'react'
import { useFinanceStore } from './financeStore'
import { ReportsPanel } from './components/ReportsPanel'
import { MainLayout } from './layouts/MainLayout'
import { PageStateProvider, usePageState } from './contexts/PageStateContext'
import { formatMoney } from './utils/format'
import type { DashboardAlert, FinanceEntry, Kpi, OnboardingStep, Page, PieEntry } from './types/erp'

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

  const { entries, summary, addEntry, removeEntry, updateEntry } = useFinanceStore()

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

  const dailyNet = useMemo(() => {
    const windowSize = 7
    const ledger = new Map<string, number>()
    entries.forEach((entry) => {
      const key = entry.data.slice(0, 10)
      const delta = entry.tipo === 'recebimento' ? entry.valor : -entry.valor
      ledger.set(key, (ledger.get(key) ?? 0) + delta)
    })
    const formatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
    const today = new Date()
    const range: { dia: string; valor: number }[] = []
    for (let offset = windowSize - 1; offset >= 0; offset -= 1) {
      const cursor = new Date(today)
      cursor.setDate(today.getDate() - offset)
      cursor.setHours(0, 0, 0, 0)
      const key = cursor.toISOString().slice(0, 10)
      const value = ledger.get(key) ?? 0
      range.push({ dia: formatter.format(cursor), valor: Math.round((value + Number.EPSILON) * 100) / 100 })
    }
    return range
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

  const onboarding = useMemo(() => {
    const hasContact = entries.some((entry) => entry.contato.trim().length > 0)
    const referencesProducts = entries.some((entry) => Boolean(entry.referente))
    const steps: OnboardingStep[] = [
      {
        id: 'config',
        label: 'Configurar empresa',
        done: true,
        detail: 'Preencha dados, plano e fiscal para começar.',
      },
      {
        id: 'contatos',
        label: 'Cadastrar contatos',
        done: hasContact,
        detail: 'Adicione clientes, fornecedores e transportadoras.',
      },
      {
        id: 'produtos',
        label: 'Produtos e serviços',
        done: referencesProducts,
        detail: 'Defina preços, categorias e estoques mínimos.',
      },
      {
        id: 'movimentos',
        label: 'Registrar movimentações',
        done: entries.length >= 4,
        detail: 'Cadastre vendas, compras e ajustes periódicos.',
      },
      {
        id: 'financeiro',
        label: 'Organizar o financeiro',
        done: summary.receberSemana >= summary.pagarSemana,
        detail: 'Concilie recebimentos e pagamentos para equilibrar o caixa.',
      },
    ]

    const doneCount = steps.filter((step) => step.done).length
    return { steps, percent: Math.round((doneCount / steps.length) * 100) }
  }, [entries, summary])

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
              const normalized = label.toLowerCase()
              if (normalized.includes('venda')) {
                setActivePage('Vendas')
                setSalesTab('vendas')
              } else if (normalized.includes('compra')) {
                setActivePage('Compras')
              } else if (normalized.includes('cliente')) {
                setActivePage('Clientes')
                setContactTab('clientes')
              } else if (normalized.includes('produto')) {
                setActivePage('Produtos')
                setProductTab('produtos')
              } else if (normalized.includes('conta')) {
                setActivePage('Financeiro')
                setFinanceTab('recebimentos')
              }
            }}
            onboarding={onboarding}
            onGoConfig={() => setActivePage('Configuracoes')}
            onOnboardingClick={(id) => setActivePage('Configuracoes')}
            alerts={alerts}
            dailyNet={dailyNet}
            formatMoney={formatMoney}
          />
          )}

          {activePage === 'Financeiro' && (
            <FinanceiroPage
              activeTab={financeTab}
              setActiveTab={setFinanceTab}
              entries={entries}
              addEntry={addEntry}
              formatMoney={formatMoney}
            />
          )}
          {activePage === 'Vendas' && <VendasPage activeTab={salesTab} setActiveTab={setSalesTab} onFinanceUpsertSale={() => {}} />}
          {activePage === 'Compras' && (
            <ComprasPage activeTab="compras" onFinanceUpsertPurchase={() => {}} />
          )}
          {activePage === 'Clientes' && <ClientesPage activeTab={contactTab} setActiveTab={setContactTab} />}
          {activePage === 'Produtos' && <ProdutosPage activeTab={productTab} setActiveTab={setProductTab} />}
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
