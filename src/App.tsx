import { useEffect, useState } from 'react'
import { Pie, PieChart, ResponsiveContainer, Cell } from 'recharts'
import { useFinanceStore, type FinanceEntry } from './financeStore'
import { useLocalCrud } from './store'

const pieData = [
  { name: 'Eletronicos', value: 45 },
  { name: 'Presentes', value: 30 },
  { name: 'Acessorios', value: 25 },
]

const pieColors = ['#0f3047', '#f5a524', '#2fbf71']

const alerts = [
  { icon: 'i', text: 'Ha 12 produtos abaixo do estoque minimo.', link: 'Detalhar' },
  { icon: '!', text: '3 financeiros a pagar atrasados.', link: 'Detalhar' },
  { icon: 'doc', text: 'Ha avisos em notas com problemas fiscais.', link: 'Detalhar' },
]

const metrics = [
  { label: 'Receita bruta', value: 'R$ 0,00', tone: 'neutral' },
  { label: 'Impostos', value: 'R$ 0,00', tone: 'neutral' },
  { label: 'Receita liquida', value: 'R$ 0,00', tone: 'positive' },
  { label: 'Custos', value: 'R$ 0,00', tone: 'neutral' },
  { label: 'Despesas operacionais', value: 'R$ 0,00', tone: 'neutral' },
  { label: 'Lucro operacional', value: 'R$ 0,00', tone: 'positive' },
  { label: 'Despesas diversas', value: 'R$ 0,00', tone: 'neutral' },
]

const shortcuts = ['Nova venda', 'Nova compra', 'Novo cliente', 'Novo produto', 'Gerar boleto', 'Cadastrar conta']

type FinanceTab = 'recebimentos' | 'pagamentos' | 'recibos'
type SalesTab = 'vendas' | 'devolucoes'
type PurchaseTab = 'compras'
type ContactTab = 'clientes' | 'fornecedores' | 'transportadoras'
type ProductTab = 'produtos' | 'servicos' | 'ajuste'
type ConfigTab = 'geral' | 'plano' | 'caixa' | 'operacoes' | 'formas' | 'usuarios' | 'fiscal' | 'impressao'
type Page = 'Dashboard' | 'Financeiro' | 'Vendas' | 'Compras' | 'Clientes' | 'Produtos' | 'Relatorios' | 'Configuracoes'

type ModalProps = {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-3">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button className="text-slate-500 hover:text-slate-700" onClick={onClose}>
            X
          </button>
        </div>
        <div className="p-4 space-y-3">{children}</div>
      </div>
    </div>
  )
}

type ToastProps = { message: string | null; onClose: () => void }
function Toast({ message, onClose }: ToastProps) {
  if (!message) return null
  return (
    <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-md shadow z-50 flex items-center gap-3">
      <span>{message}</span>
      <button className="text-white/80 hover:text-white" onClick={onClose}>
        Fechar
      </button>
    </div>
  )
}

const formatMoney = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })

const formatMonthLabel = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

const normalizeMoney = (v: number) => {
  if (Number.isNaN(v)) return 0
  return Math.max(0, Math.round((v + Number.EPSILON) * 100) / 100)
}

const normalizeInt = (v: number) => {
  if (Number.isNaN(v)) return 0
  return Math.max(0, Math.round(v))
}

export default function App() {
  const [activePage, setActivePage] = useState<Page>('Dashboard')
  const [financeTab, setFinanceTab] = useState<FinanceTab>('recebimentos')
  const [salesTab, setSalesTab] = useState<SalesTab>('vendas')
  const [purchaseTab, setPurchaseTab] = useState<PurchaseTab>('compras')
  const [contactTab, setContactTab] = useState<ContactTab>('clientes')
  const [productTab, setProductTab] = useState<ProductTab>('produtos')
  const [configTab, setConfigTab] = useState<ConfigTab>('geral')
  const { entries, addEntry, removeEntry, summary } = useFinanceStore()

  // navegacao estilo eGestor: reflete hash da URL para "trocar de pagina"
  useEffect(() => {
    const mapSlugToState = (slug: string, sub: string | undefined): { page: Page; config?: ConfigTab } => {
      const pageMap: Record<string, Page> = {
        dashboard: 'Dashboard',
        financeiro: 'Financeiro',
        vendas: 'Vendas',
        compras: 'Compras',
        clientes: 'Clientes',
        produtos: 'Produtos',
        relatorios: 'Relatorios',
        config: 'Configuracoes',
      }
      const configMap: Record<string, ConfigTab> = {
        geral: 'geral',
        plano: 'plano',
        caixa: 'caixa',
        operacoes: 'operacoes',
        formas: 'formas',
        usuarios: 'usuarios',
        fiscal: 'fiscal',
        impressao: 'impressao',
      }
      const page = pageMap[slug] ?? 'Dashboard'
      const config = sub ? configMap[sub] : undefined
      return { page, config }
    }

    const readHash = () => {
      const hash = window.location.hash.replace('#', '')
      const [slug, sub] = hash.split('/')
      const { page, config } = mapSlugToState(slug, sub)
      setActivePage(page)
      if (config) setConfigTab(config)
    }

    readHash()
    window.addEventListener('hashchange', readHash)
    return () => window.removeEventListener('hashchange', readHash)
  }, [])

  useEffect(() => {
    const slugMap: Record<Page, string> = {
      Dashboard: 'dashboard',
      Financeiro: 'financeiro',
      Vendas: 'vendas',
      Compras: 'compras',
      Clientes: 'clientes',
      Produtos: 'produtos',
      Relatorios: 'relatorios',
      Configuracoes: 'config',
    }
    const configSlug: Record<ConfigTab, string> = {
      geral: 'geral',
      plano: 'plano',
      caixa: 'caixa',
      operacoes: 'operacoes',
      formas: 'formas',
      usuarios: 'usuarios',
      fiscal: 'fiscal',
      impressao: 'impressao',
    }
    const pageSlug = slugMap[activePage]
    const hash =
      activePage === 'Configuracoes' ? `#${pageSlug}/${configSlug[configTab]}` : `#${pageSlug}`
    window.history.replaceState(null, '', hash)
  }, [activePage, configTab])

  const navItems: Page[] = ['Dashboard', 'Financeiro', 'Vendas', 'Compras', 'Clientes', 'Produtos', 'Relatorios', 'Configuracoes']
  const placeholderNav: string[] = []

  const kpis: Kpi[] = [
    { title: 'Contas a receber hoje', value: formatMoney(summary.receberHoje), trend: '+0%', tone: 'success' },
    { title: 'Contas a pagar hoje', value: formatMoney(summary.pagarHoje), trend: '-0%', tone: 'danger' },
    { title: 'A receber na semana', value: formatMoney(summary.receberSemana), trend: '+0%', tone: 'success' },
    { title: 'A pagar na semana', value: formatMoney(summary.pagarSemana), trend: '-0%', tone: 'danger' },
  ]

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="h-16 bg-[#0f3047] text-white flex items-center px-6 gap-4 shadow-md">
        <div className="font-bold tracking-tight text-lg">ERP Nimbus</div>
        <div className="flex-1 max-w-2xl">
          <input
            className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="Buscar em todo o sistema..."
          />
        </div>
        <div className="flex items-center gap-3 text-sm">
          <button className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 transition">Ajuda</button>
          <button className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 transition">Notificacoes</button>
          <div className="w-8 h-8 rounded-full bg-amber-400 text-[#0f3047] font-semibold grid place-content-center">
            EA
          </div>
        </div>
      </header>

      <div className="grid grid-cols-[240px_1fr] min-h-[calc(100vh-4rem)]">
        <aside className="bg-slate-900 text-slate-100 px-4 py-6 space-y-6">
          <div className="text-xs uppercase tracking-wide text-slate-400">Navegacao</div>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item}
                onClick={() => setActivePage(item)}
                className={`w-full text-left px-3 py-2 rounded-md transition border-l-4 ${
                  activePage === item ? 'bg-white/10 border-amber-400' : 'border-transparent hover:bg-white/5'
                }`}
              >
                {item}
              </button>
            ))}
            {placeholderNav.map((item) => (
              <button
                key={item}
                className="w-full text-left px-3 py-2 rounded-md transition border-l-4 border-transparent opacity-60 cursor-not-allowed"
              >
                {item}
              </button>
            ))}
          </nav>
          <div className="bg-white/5 rounded-md p-3 text-sm">
            <div className="font-semibold">Assine agora</div>
            <p className="text-slate-300 text-xs mt-1">Liberte limites de usuarios e modulos.</p>
            <button className="mt-3 w-full bg-amber-400 text-slate-900 font-semibold py-2 rounded-md">
              Ver planos
            </button>
          </div>
        </aside>

        <main className="p-6 space-y-6">
          {activePage === 'Dashboard' && <DashboardPage kpis={kpis} />}
          {activePage === 'Financeiro' && (
            <FinanceiroPage
              activeTab={financeTab}
              setActiveTab={setFinanceTab}
              entries={entries}
              addEntry={addEntry}
              removeEntry={removeEntry}
              formatMoney={formatMoney}
            />
          )}
          {activePage === 'Vendas' && <VendasPage activeTab={salesTab} setActiveTab={setSalesTab} />}
          {activePage === 'Compras' && <ComprasPage activeTab={purchaseTab} setActiveTab={setPurchaseTab} />}
          {activePage === 'Clientes' && <ClientesPage activeTab={contactTab} setActiveTab={setContactTab} />}
          {activePage === 'Produtos' && <ProdutosPage activeTab={productTab} setActiveTab={setProductTab} />}
          {activePage === 'Relatorios' && <RelatoriosPage />}
          {activePage === 'Configuracoes' && <ConfiguracoesPage activeTab={configTab} setActiveTab={setConfigTab} />}
        </main>
      </div>
    </div>
  )
}

type Kpi = { title: string; value: string; trend: string; tone: 'success' | 'danger' | 'neutral' }

function DashboardPage({ kpis }: { kpis: Kpi[] }) {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.title} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>{kpi.title}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  kpi.tone === 'success'
                    ? 'bg-green-50 text-green-700'
                    : kpi.tone === 'danger'
                    ? 'bg-red-50 text-red-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {kpi.trend}
              </span>
            </div>
            <div className="text-2xl font-semibold mt-2">{kpi.value}</div>
            <button className="mt-3 text-sm text-[#0f3047] font-semibold hover:underline">Ver detalhes</button>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8 bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#0f3047]">Onboarding</h2>
              <p className="text-sm text-slate-500">Complete os passos para usar todo o ERP.</p>
            </div>
            <div className="text-sm text-slate-500">40% completo</div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3">
            <div className="h-2 bg-amber-400 rounded-full w-2/5" />
          </div>
          <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
            {['Cadastre sua empresa', 'Configure formas de pagamento', 'Importe clientes', 'Configure NFe'].map(
              (step, i) => (
                <label key={step} className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 accent-amber-500" defaultChecked={i === 0} />
                  <span className="text-slate-700">{step}</span>
                </label>
              )
            )}
          </div>
        </div>

        <div className="xl:col-span-4 bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-[#0f3047]">Vendas por categoria</h2>
            <span className="text-sm text-slate-500">Ultimos 30 dias</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {pieData.map((d, i) => (
              <span
                key={d.name}
                className="px-2 py-1 rounded-full text-xs font-semibold text-slate-700"
                style={{ backgroundColor: `${pieColors[i]}22`, color: pieColors[i] }}
              >
                {d.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8 bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-[#0f3047]">Avisos</h2>
            <div className="flex gap-2">
              {['Todos', 'Pendentes', 'Hoje'].map((f, i) => (
                <button
                  key={f}
                  className={`text-xs px-3 py-1 rounded-full border ${
                    i === 0 ? 'bg-amber-100 border-amber-300 text-[#0f3047]' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.text}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[#0f3047] uppercase">{alert.icon}</span>
                  <span className="text-sm text-slate-700">{alert.text}</span>
                </div>
                <button className="text-sm font-semibold text-[#0f3047] hover:underline">{alert.link}</button>
              </div>
            ))}
          </div>
        </div>

        <div className="xl:col-span-4 bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-[#0f3047]">Resultado consolidado</h2>
            <span className="text-sm text-slate-500">Novembro 2025</span>
          </div>
          <div className="space-y-2">
            {metrics.map((m) => (
              <div key={m.label} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{m.label}</span>
                <span
                  className={`font-semibold ${
                    m.tone === 'positive'
                      ? 'text-green-600'
                      : m.tone === 'negative'
                      ? 'text-red-600'
                      : 'text-slate-700'
                  }`}
                >
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-[#0f3047] mb-3">Atalhos rapidos</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {shortcuts.map((item) => (
              <button
                key={item}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-[#0f3047] font-semibold hover:border-amber-300 hover:bg-amber-50 text-left transition"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-[#0f3047] mb-3">Proximos vencimentos</h2>
          <div className="text-sm text-slate-500">Nenhum vencimento nos proximos 7 dias.</div>
        </div>
      </section>
    </>
  )
}

function FinanceiroPage({
  activeTab,
  setActiveTab,
  entries,
  addEntry,
  removeEntry,
  formatMoney,
}: {
  activeTab: FinanceTab
  setActiveTab: (t: FinanceTab) => void
  entries: FinanceEntry[]
  addEntry: (data: Omit<FinanceEntry, 'id'>) => void
  removeEntry: (id: string) => void
  formatMoney: (n: number) => string
}) {
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list')
  const [financeSearch, setFinanceSearch] = useState('')
  const [financeMonth, setFinanceMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [novo, setNovo] = useState({
    descricao: '',
    contato: '',
    conta: '',
    data: new Date().toISOString().slice(0, 10),
    valor: '',
    situacao: 'Pendente',
    referente: '',
    cpfCnpj: '',
    vias: '1 via',
    quemEmite: 'Empresa',
  })

  useEffect(() => {
    setViewMode('list')
    setFinanceSearch('')
    setFinanceMonth(() => {
      const now = new Date()
      return new Date(now.getFullYear(), now.getMonth(), 1)
    })
  }, [activeTab])

  const headerPalette: Record<FinanceTab, string> = {
    recebimentos: 'bg-green-600 text-white',
    pagamentos: 'bg-red-600 text-white',
    recibos: 'bg-purple-700 text-white',
  }

  const formatMonthLabel = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), 1).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    })

  const buttonPalette: Record<FinanceTab, { bg: string; hover: string }> = {
    recebimentos: { bg: '#16a34a', hover: '#15803d' },
    pagamentos: { bg: '#dc2626', hover: '#b91c1c' },
    recibos: { bg: '#7c3aed', hover: '#6d28d9' },
  }

  const searchTerm = financeSearch.trim().toLowerCase()

  const filtered = entries.filter((e) => {
    const entryDate = new Date(e.data)
    const sameMonth =
      !isNaN(entryDate.getTime()) &&
      entryDate.getMonth() === financeMonth.getMonth() &&
      entryDate.getFullYear() === financeMonth.getFullYear()

    if (!sameMonth) return false

    const matchesTab =
      activeTab === 'recebimentos'
        ? e.tipo === 'recebimento'
        : activeTab === 'pagamentos'
        ? e.tipo === 'pagamento'
        : e.tipo === 'recibo'

    if (!matchesTab) return false
    if (!searchTerm) return true

    const haystack = [e.descricao, e.contato, e.referente, e.conta]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(searchTerm)
  })

  const total = filtered.reduce((acc, e) => acc + e.valor, 0)

  const onSubmit = () => {
    if (!novo.descricao.trim() && activeTab !== 'recibos' && !novo.referente.trim()) return
    const valorNum = parseFloat(novo.valor.replace(',', '.')) || 0
    addEntry({
      tipo: activeTab === 'recebimentos' ? 'recebimento' : activeTab === 'pagamentos' ? 'pagamento' : 'recibo',
      descricao:
        activeTab === 'recibos'
          ? novo.referente || novo.descricao || 'Recibo'
          : novo.descricao,
      contato: novo.contato || '-',
      conta: novo.conta || '-',
      data: novo.data,
      situacao:
        activeTab === 'recebimentos'
          ? (novo.situacao as FinanceEntry['situacao'])
          : activeTab === 'pagamentos'
          ? (novo.situacao as FinanceEntry['situacao'])
          : 'Recebido',
      valor: valorNum,
    })
    setNovo({
      descricao: '',
      contato: '',
      conta: '',
      data: new Date().toISOString().slice(0, 10),
      valor: '',
      situacao: 'Pendente',
      referente: '',
      cpfCnpj: '',
      vias: '1 via',
      quemEmite: 'Empresa',
    })
    setViewMode('list')
  }

  return (
    <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#0f3047]">Financeiro</h2>
          <p className="text-sm text-slate-500">Recebimentos, pagamentos e recibos em tela dedicada.</p>
        </div>
        <div className="flex gap-2">
          {[
            { id: 'recebimentos', label: 'Recebimentos' },
            { id: 'pagamentos', label: 'Pagamentos' },
            { id: 'recibos', label: 'Recibos' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as FinanceTab)}
              className={`px-3 py-1.5 rounded-full border text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-amber-100 border-amber-300 text-[#0f3047]'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
        {viewMode === 'list' ? (
          <>
            <button
              onClick={() => setViewMode('form')}
              style={{ backgroundColor: buttonPalette[activeTab].bg }}
              className="text-white text-sm font-semibold px-4 py-2 rounded-md transition shadow inline-flex items-center gap-2 hover:brightness-90"
            >
              <span>+</span>
              <span>Novo</span>
            </button>
            <button className="border border-slate-200 text-slate-700 text-sm px-3 py-2 rounded-md bg-white hover:bg-slate-50">
              Editar
            </button>
            <button className="border border-slate-200 text-slate-700 text-sm px-3 py-2 rounded-md bg-white hover:bg-slate-50">
              Excluir
            </button>
            <button className="border border-slate-200 text-slate-700 text-sm px-3 py-2 rounded-md bg-white hover:bg-slate-50">
              Exportar
            </button>
            <div className="ml-auto flex items-center gap-2">
              <button
                className="border border-slate-200 text-slate-700 text-sm px-3 py-2 rounded-md bg-white hover:bg-slate-50"
                onClick={() => {
                  const now = new Date()
                  setFinanceMonth(new Date(now.getFullYear(), now.getMonth(), 1))
                }}
              >
                Mes atual
              </button>
              <div className="flex items-center gap-1 text-sm text-slate-700">
                <button
                  className="border border-slate-200 px-2 py-2 rounded-md bg-white hover:bg-slate-50"
                  onClick={() =>
                    setFinanceMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                  }
                >
                  {'<'}
                </button>
                <span className="px-2 capitalize">{formatMonthLabel(financeMonth)}</span>
                <button
                  className="border border-slate-200 px-2 py-2 rounded-md bg-white hover:bg-slate-50"
                  onClick={() =>
                    setFinanceMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                  }
                >
                  {'>'}
                </button>
              </div>
              <input
                value={financeSearch}
                onChange={(e) => setFinanceSearch(e.target.value)}
                className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 w-48"
                placeholder="Buscar..."
              />
              <button className="border border-slate-200 text-slate-700 text-sm px-3 py-2 rounded-md bg-white hover:bg-slate-50">
                Buscar
              </button>
            </div>
          </>
        ) : (
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setViewMode('list')}
              className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-700 bg-white hover:bg-slate-50"
            >
              Voltar
            </button>
            <button
              onClick={onSubmit}
              style={{ backgroundColor: buttonPalette[activeTab].bg }}
              className="text-white px-4 py-2 rounded-md text-sm font-semibold transition shadow-sm border border-transparent"
            >
              Salvar
            </button>
          </div>
        )}
      </div>



      {viewMode === 'form' && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
          <div className={`rounded-md px-3 py-2 text-sm font-semibold ${headerPalette[activeTab]}`}>
            {activeTab === 'recebimentos'
              ? 'Novo recebimento'
              : activeTab === 'pagamentos'
              ? 'Nova despesa/pagamento'
              : 'Novo recibo'}
          </div>

          {activeTab !== 'recibos' ? (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs text-slate-500">Descricao</label>
                  <input
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                    value={novo.descricao}
                    onChange={(e) => setNovo((p) => ({ ...p, descricao: e.target.value }))}
                    placeholder="Ex.: Conta a receber"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-500">Valor</label>
                  <input
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                    value={novo.valor}
                    onChange={(e) => setNovo((p) => ({ ...p, valor: e.target.value }))}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-500">Data de vencimento</label>
                  <input
                    type="date"
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                    value={novo.data}
                    onChange={(e) => setNovo((p) => ({ ...p, data: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-500">
                    {activeTab === 'pagamentos' ? 'Pagar agora?' : 'Receber agora?'}
                  </label>
                  <select
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                    value={novo.situacao}
                    onChange={(e) => setNovo((p) => ({ ...p, situacao: e.target.value }))}
                  >
                    <option>Pendente</option>
                    <option>{activeTab === 'pagamentos' ? 'Pago' : 'Recebido'}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-500">Conta (previsao)</label>
                  <input
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                    value={novo.conta}
                    onChange={(e) => setNovo((p) => ({ ...p, conta: e.target.value }))}
                    placeholder="Caixa interno"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-500">Recebido de / Pago para</label>
                  <input
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                    value={novo.contato}
                    onChange={(e) => setNovo((p) => ({ ...p, contato: e.target.value }))}
                    placeholder="Cliente / Fornecedor"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs text-slate-500">Categoria / Palavras-chave</label>
                  <div className="grid md:grid-cols-2 gap-2">
                    <input
                      className="border border-slate-200 rounded-md px-3 py-2 text-sm"
                      placeholder="Categoria"
                      onChange={(e) => setNovo((p) => ({ ...p, conta: e.target.value }))}
                    />
                    <input
                      className="border border-slate-200 rounded-md px-3 py-2 text-sm"
                      placeholder="Palavras-chave"
                      onChange={(e) => setNovo((p) => ({ ...p, contato: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={onSubmit}
                  className={`${buttonPalette[activeTab]} text-white px-4 py-2 rounded-md text-sm font-semibold transition`}
                >
                  Salvar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-xs text-slate-500">Quem emite o recibo</label>
                  <input
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                    value={novo.quemEmite}
                    onChange={(e) => setNovo((p) => ({ ...p, quemEmite: e.target.value }))}
                    placeholder="Empresa emite recibo"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-500">Vias a imprimir</label>
                  <input
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                    value={novo.vias}
                    onChange={(e) => setNovo((p) => ({ ...p, vias: e.target.value }))}
                    placeholder="Apenas uma via"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-500">Valor</label>
                  <input
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                    value={novo.valor}
                    onChange={(e) => setNovo((p) => ({ ...p, valor: e.target.value }))}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-500">Recebi de</label>
                  <input
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                    value={novo.contato}
                    onChange={(e) => setNovo((p) => ({ ...p, contato: e.target.value }))}
                    placeholder="Nome do pagador"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-500">CPF ou CNPJ</label>
                  <input
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                    value={novo.cpfCnpj}
                    onChange={(e) => setNovo((p) => ({ ...p, cpfCnpj: e.target.value }))}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-500">Data</label>
                  <input
                    type="date"
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                    value={novo.data}
                    onChange={(e) => setNovo((p) => ({ ...p, data: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-3">
                  <label className="text-xs text-slate-500">Referente a</label>
                  <input
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                    value={novo.referente}
                    onChange={(e) => setNovo((p) => ({ ...p, referente: e.target.value, descricao: e.target.value }))}
                    placeholder="Servico, produto ou motivo do recibo"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={onSubmit}
                  className={`${buttonPalette[activeTab]} text-white px-4 py-2 rounded-md text-sm font-semibold transition`}
                >
                  Salvar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {viewMode === 'list' && (
      <div className="overflow-hidden border border-slate-200 rounded-lg">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="py-3 px-3 text-left w-20">Cod</th>
              <th className="py-3 px-3 text-left">Descricao</th>
              <th className="py-3 px-3 text-left">Contato</th>
              <th className="py-3 px-3 text-left w-32">Conta</th>
              <th className="py-3 px-3 text-left w-32">Data</th>
              <th className="py-3 px-3 text-left w-32">Situacao</th>
              <th className="py-3 px-3 text-right w-32">Valor</th>
              <th className="py-3 px-3 text-right w-12"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr className="border-t border-slate-200">
                <td colSpan={8} className="py-4 px-3 text-center text-slate-500">
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              filtered.map((e, idx) => (
                <tr key={e.id} className="border-t border-slate-200">
                  <td className="py-3 px-3 text-slate-600">{idx + 1}</td>
                  <td className="py-3 px-3 text-slate-800">{e.descricao}</td>
                  <td className="py-3 px-3 text-slate-700">{e.contato}</td>
                  <td className="py-3 px-3 text-slate-700">{e.conta}</td>
                  <td className="py-3 px-3 text-slate-700">{e.data}</td>
                  <td className="py-3 px-3 text-slate-700">{e.situacao}</td>
                  <td className="py-3 px-3 text-right text-slate-800">{formatMoney(e.valor)}</td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => removeEntry(e.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))
            )}
            <tr className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-700">
              <td className="py-3 px-3" colSpan={6}>
                TOTAL LISTADO ({filtered.length} itens)
              </td>
              <td className="py-3 px-3 text-right">{formatMoney(total)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
      )}
    </section>
  )
}

function VendasPage({ activeTab, setActiveTab }: { activeTab: SalesTab; setActiveTab: (t: SalesTab) => void }) {
  const [salesSearch, setSalesSearch] = useState('')
  const [salesMonth, setSalesMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [salesSelected, setSalesSelected] = useState<string[]>([])
  const [salesToast, setSalesToast] = useState<string | null>(null)
  const [salesModalOpen, setSalesModalOpen] = useState(false)
  const [salesModalMode, setSalesModalMode] = useState<'new' | 'edit'>('new')
  const salesDefaultForm = {
    cliente: '',
    vendedor: '',
    data: new Date().toISOString().slice(0, 10),
    tipo: 'Venda',
    total: 0,
  }
  const [salesForm, setSalesForm] = useState(salesDefaultForm)
  const [salesEditId, setSalesEditId] = useState<string | null>(null)

  const { items: salesItems, add: addSale, update: updateSale, remove: removeSale } = useLocalCrud('erp.sales', [
    {
      id: 'V001',
      cliente: 'Loja Centro',
      vendedor: 'Carlos',
      data: '2025-11-05',
      tipo: 'Venda',
      total: 1520.5,
      registro: 'vendas' as SalesTab,
    },
    {
      id: 'V002',
      cliente: 'ACME',
      vendedor: 'Ana',
      data: '2025-11-12',
      tipo: 'Venda',
      total: 820.0,
      registro: 'vendas' as SalesTab,
    },
    {
      id: 'D001',
      cliente: 'Cliente Beta',
      vendedor: 'Carlos',
      data: '2025-11-18',
      tipo: 'Devolucao',
      total: 210.0,
      registro: 'devolucoes' as SalesTab,
    },
  ])

  const salesTerm = salesSearch.trim().toLowerCase()

  const filteredSales = salesItems.filter((v) => {
    const d = new Date(v.data)
    const sameMonth =
      !isNaN(d.getTime()) && d.getMonth() === salesMonth.getMonth() && d.getFullYear() === salesMonth.getFullYear()
    if (!sameMonth) return false
    if (v.registro !== activeTab) return false
    if (!salesTerm) return true
    const hay = [v.id, v.cliente, v.vendedor, v.tipo].join(' ').toLowerCase()
    return hay.includes(salesTerm)
  })

  const toggleSales = (id: string) => {
    setSalesSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleSalesAll = () => {
    if (filteredSales.length === 0) return
    const ids = filteredSales.map((v) => v.id)
    const all = ids.every((id) => salesSelected.includes(id))
    setSalesSelected(all ? [] : ids)
  }

  const handleSalesNew = () => {
    setSalesModalMode('new')
    setSalesEditId(null)
    setSalesForm({
      cliente: '',
      vendedor: '',
      data: new Date().toISOString().slice(0, 10),
      tipo: activeTab === 'devolucoes' ? 'Devolucao' : 'Venda',
      total: 0,
    })
    setSalesModalOpen(true)
  }

  const handleSalesEdit = () => {
    if (salesSelected.length !== 1) {
      setSalesToast('Selecione apenas um registro para editar.')
      return
    }
    const current = salesItems.find((s) => s.id === salesSelected[0])
    if (!current) return
    setSalesModalMode('edit')
    setSalesEditId(current.id)
    setSalesForm({
      cliente: current.cliente,
      vendedor: current.vendedor,
      data: current.data,
      tipo: current.tipo,
      total: current.total,
    })
    setSalesModalOpen(true)
  }

  const handleSalesDuplicate = () => {
    if (salesSelected.length === 0) {
      setSalesToast('Selecione ao menos um registro para duplicar.')
      return
    }
    salesSelected.forEach((id) => {
      const current = salesItems.find((s) => s.id === id)
      if (current) {
        addSale({ ...current, id: crypto.randomUUID() })
      }
    })
  }

  const handleSalesDelete = () => {
    if (salesSelected.length === 0) {
      setSalesToast('Selecione ao menos um registro para excluir.')
      return
    }
    removeSale(salesSelected)
    setSalesSelected([])
  }

  const handleSalesExport = () => {
    if (filteredSales.length === 0) {
      setSalesToast('Nada para exportar.')
      return
    }
    const header = ['Cod', 'Cliente', 'Vendedor', 'Data', 'Tipo', 'Total']
    const rows = filteredSales.map((v) => [v.id, v.cliente, v.vendedor, v.data, v.tipo, v.total])
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'vendas.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-4">
      <Toast message={salesToast} onClose={() => setSalesToast(null)} />
      <Modal
        open={salesModalOpen}
        title={salesModalMode === 'new' ? 'Nova venda' : 'Editar venda'}
        onClose={() => setSalesModalOpen(false)}
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Cliente</label>
            <input
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
              value={salesForm.cliente}
              onChange={(e) => setSalesForm((p) => ({ ...p, cliente: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Vendedor</label>
            <input
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
              value={salesForm.vendedor}
              onChange={(e) => setSalesForm((p) => ({ ...p, vendedor: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Data</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                value={salesForm.data}
                onChange={(e) => setSalesForm((p) => ({ ...p, data: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Tipo</label>
              <select
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                value={salesForm.tipo}
                onChange={(e) => setSalesForm((p) => ({ ...p, tipo: e.target.value }))}
              >
                <option value="Venda">Venda</option>
                <option value="Devolucao">Devolucao</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Total</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">R$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                value={salesForm.total}
                onChange={(e) => setSalesForm((p) => ({ ...p, total: parseFloat(e.target.value || '0') }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-700" onClick={() => setSalesModalOpen(false)}>
              Cancelar
            </button>
            <button
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-semibold"
              onClick={() => {
                if (!salesForm.cliente.trim()) {
                  setSalesToast('Cliente obrigatorio')
                  return
                }
                if (!salesForm.data) {
                  setSalesToast('Data obrigatoria')
                  return
                }
                if (Number.isNaN(salesForm.total)) {
                  setSalesToast('Total invalido')
                  return
                }
                const totalNorm = normalizeMoney(salesForm.total)
                if (salesModalMode === 'new') {
                  addSale({ ...salesForm, total: totalNorm, registro: activeTab })
                } else if (salesEditId) {
                  updateSale(salesEditId, { ...salesForm, total: totalNorm })
                }
                setSalesForm(salesDefaultForm)
                setSalesModalOpen(false)
                setSalesToast('Registro salvo')
              }}
            >
              Salvar
            </button>
          </div>
        </div>
      </Modal>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#0f3047]">Vendas</h2>
          <p className="text-sm text-slate-500">Pedidos e devolucoes em uma tela dedicada.</p>
        </div>
        <div className="flex gap-2">
          {[
            { id: 'vendas', label: 'Vendas' },
            { id: 'devolucoes', label: 'Devolucoes' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SalesTab)}
              className={`px-3 py-1.5 rounded-full border text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-amber-100 border-amber-300 text-[#0f3047]'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          <button
            onClick={handleSalesNew}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-3 py-2 rounded-md transition"
          >
            Nova
          </button>
          <button
            onClick={handleSalesEdit}
            className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-600"
          >
            Editar
          </button>
          <button
            onClick={handleSalesDuplicate}
            className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-600"
          >
            Duplicar
          </button>
          <button
            onClick={handleSalesDelete}
            className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-600"
          >
            Excluir
          </button>
          <button
            onClick={handleSalesExport}
            className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-600"
          >
            Exportar
          </button>
        </div>
        <div className="flex gap-2 items-center">
          <button
            className="border border-slate-200 rounded-md px-2 py-1 text-sm text-slate-700 bg-white hover:bg-slate-50"
            onClick={() => {
              const now = new Date()
              setSalesMonth(new Date(now.getFullYear(), now.getMonth(), 1))
            }}
          >
            Mes atual
          </button>
          <div className="flex items-center gap-2 border border-slate-200 rounded-md px-2 py-1 text-sm text-slate-700 bg-white">
            <button onClick={() => setSalesMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>
              {'<'}
            </button>
            <span className="capitalize">{formatMonthLabel(salesMonth)}</span>
            <button onClick={() => setSalesMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>
              {'>'}
            </button>
          </div>
          <input
            value={salesSearch}
            onChange={(e) => setSalesSearch(e.target.value)}
            className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 w-48"
            placeholder="Buscar..."
          />
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-md text-sm font-semibold transition">
            Buscar
          </button>
        </div>
      </div>

      <div className="overflow-hidden border border-slate-200 rounded-lg">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="py-3 px-3 text-left w-10">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-emerald-600"
                  onChange={toggleSalesAll}
                  checked={filteredSales.length > 0 && filteredSales.every((v) => salesSelected.includes(v.id))}
                />
              </th>
              <th className="py-3 px-3 text-left w-20">Cod</th>
              <th className="py-3 px-3 text-left">Cliente</th>
              <th className="py-3 px-3 text-left">Vendedor</th>
              <th className="py-3 px-3 text-left w-32">Data</th>
              <th className="py-3 px-3 text-left w-32">Tipo</th>
              <th className="py-3 px-3 text-right w-32">Total</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.length === 0 ? (
              <tr className="border-t border-slate-200">
                <td colSpan={7} className="py-4 px-3 text-center text-slate-500">
                  {activeTab === 'vendas' && 'Nenhuma venda encontrada. Veja o mes anterior.'}
                  {activeTab === 'devolucoes' && 'Nenhuma devolucao encontrada. Veja o mes anterior.'}
                </td>
              </tr>
            ) : (
              filteredSales.map((v) => (
                <tr key={v.id} className="border-t border-slate-200">
                  <td className="py-3 px-3 text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-emerald-600"
                      checked={salesSelected.includes(v.id)}
                      onChange={() => toggleSales(v.id)}
                    />
                  </td>
                  <td className="py-3 px-3 text-slate-700">{v.id}</td>
                  <td className="py-3 px-3 text-slate-700">{v.cliente}</td>
                  <td className="py-3 px-3 text-slate-700">{v.vendedor}</td>
                  <td className="py-3 px-3 text-slate-700">{v.data}</td>
                  <td className="py-3 px-3 text-slate-700">{v.tipo}</td>
                  <td className="py-3 px-3 text-right text-slate-700">{formatMoney(v.total)}</td>
                </tr>
              ))
            )}
            <tr className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-700">
              <td className="py-3 px-3" colSpan={6}>
                TOTAL LISTADO ({filteredSales.length} itens)
              </td>
              <td className="py-3 px-3 text-right">
                {formatMoney(filteredSales.reduce((acc, v) => acc + v.total, 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ComprasPage({ activeTab, setActiveTab }: { activeTab: PurchaseTab; setActiveTab: (t: PurchaseTab) => void }) {
  const [purchaseSearch, setPurchaseSearch] = useState('')
  const [purchaseMonth, setPurchaseMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [purchaseSelected, setPurchaseSelected] = useState<string[]>([])
  const [purchaseToast, setPurchaseToast] = useState<string | null>(null)
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false)
  const [purchaseModalMode, setPurchaseModalMode] = useState<'new' | 'edit'>('new')
  const purchaseDefaultForm = {
    fornecedor: '',
    nota: '',
    data: new Date().toISOString().slice(0, 10),
    situacao: 'Pendente',
    total: 0,
  }
  const [purchaseForm, setPurchaseForm] = useState(purchaseDefaultForm)
  const [purchaseEditId, setPurchaseEditId] = useState<string | null>(null)

  const { items: compras, add: addCompra, update: updateCompra, remove: removeCompra } = useLocalCrud('erp.compras', [
    {
      id: 'C001',
      fornecedor: 'Fornecedor XPTO',
      nota: 'NF 123',
      data: '2025-11-03',
      situacao: 'Pendente',
      total: 450.0,
    },
    {
      id: 'C002',
      fornecedor: 'Loja do Joao',
      nota: 'NF 124',
      data: '2025-11-14',
      situacao: 'Concluida',
      total: 980.0,
    },
  ])

  const purchaseTerm = purchaseSearch.trim().toLowerCase()

  const filteredPurchases = compras.filter((c) => {
    const d = new Date(c.data)
    const sameMonth =
      !isNaN(d.getTime()) && d.getMonth() === purchaseMonth.getMonth() && d.getFullYear() === purchaseMonth.getFullYear()
    if (!sameMonth) return false
    if (!purchaseTerm) return true
    const hay = [c.id, c.fornecedor, c.nota, c.situacao].join(' ').toLowerCase()
    return hay.includes(purchaseTerm)
  })

  const togglePurchase = (id: string) => {
    setPurchaseSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const togglePurchaseAll = () => {
    if (filteredPurchases.length === 0) return
    const ids = filteredPurchases.map((c) => c.id)
    const all = ids.every((id) => purchaseSelected.includes(id))
    setPurchaseSelected(all ? [] : ids)
  }

  const handlePurchaseNew = () => {
    setPurchaseModalMode('new')
    setPurchaseEditId(null)
    setPurchaseForm({
      fornecedor: '',
      nota: '',
      data: new Date().toISOString().slice(0, 10),
      situacao: 'Pendente',
      total: 0,
    })
    setPurchaseModalOpen(true)
  }

  const handlePurchaseEdit = () => {
    if (purchaseSelected.length !== 1) {
      setPurchaseToast('Selecione apenas um registro para editar.')
      return
    }
    const current = compras.find((c) => c.id === purchaseSelected[0])
    if (!current) return
    setPurchaseModalMode('edit')
    setPurchaseEditId(current.id)
    setPurchaseForm({
      fornecedor: current.fornecedor,
      nota: current.nota,
      data: current.data,
      situacao: current.situacao,
      total: current.total,
    })
    setPurchaseModalOpen(true)
  }

  const handlePurchaseDuplicate = () => {
    if (purchaseSelected.length === 0) {
      setPurchaseToast('Selecione ao menos um registro para duplicar.')
      return
    }
    purchaseSelected.forEach((id) => {
      const current = compras.find((c) => c.id === id)
      if (current) {
        addCompra({ ...current, id: crypto.randomUUID() })
      }
    })
  }

  const handlePurchaseDelete = () => {
    if (purchaseSelected.length === 0) {
      setPurchaseToast('Selecione ao menos um registro para excluir.')
      return
    }
    removeCompra(purchaseSelected)
    setPurchaseSelected([])
  }

  const handlePurchaseExport = () => {
    if (filteredPurchases.length === 0) {
      setPurchaseToast('Nada para exportar.')
      return
    }
    const header = ['Cod', 'Fornecedor', 'Nota', 'Data', 'Situacao', 'Total']
    const rows = filteredPurchases.map((c) => [c.id, c.fornecedor, c.nota, c.data, c.situacao, c.total])
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'compras.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-4">
      <Toast message={purchaseToast} onClose={() => setPurchaseToast(null)} />
      <Modal
        open={purchaseModalOpen}
        title={purchaseModalMode === 'new' ? 'Nova compra' : 'Editar compra'}
        onClose={() => setPurchaseModalOpen(false)}
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Fornecedor</label>
            <input
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
              value={purchaseForm.fornecedor}
              onChange={(e) => setPurchaseForm((p) => ({ ...p, fornecedor: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Nota</label>
              <input
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                value={purchaseForm.nota}
                onChange={(e) => setPurchaseForm((p) => ({ ...p, nota: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Data</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                value={purchaseForm.data}
                onChange={(e) => setPurchaseForm((p) => ({ ...p, data: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Situacao</label>
              <input
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                value={purchaseForm.situacao}
                onChange={(e) => setPurchaseForm((p) => ({ ...p, situacao: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Total</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                  value={purchaseForm.total}
                  onChange={(e) =>
                    setPurchaseForm((p) => ({ ...p, total: parseFloat(e.target.value || '0') }))
                  }
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-700" onClick={() => setPurchaseModalOpen(false)}>
              Cancelar
            </button>
            <button
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-semibold"
              onClick={() => {
                if (!purchaseForm.fornecedor.trim()) {
                  setPurchaseToast('Fornecedor obrigatorio')
                  return
                }
                if (!purchaseForm.data) {
                  setPurchaseToast('Data obrigatoria')
                  return
                }
                if (Number.isNaN(purchaseForm.total)) {
                  setPurchaseToast('Total invalido')
                  return
                }
                const totalNorm = normalizeMoney(purchaseForm.total)
                if (purchaseModalMode === 'new') {
                  addCompra({ ...purchaseForm, total: totalNorm })
                } else if (purchaseEditId) {
                  updateCompra(purchaseEditId, { ...purchaseForm, total: totalNorm })
                }
                setPurchaseForm(purchaseDefaultForm)
                setPurchaseModalOpen(false)
                setPurchaseToast('Registro salvo')
              }}
            >
              Salvar
            </button>
          </div>
        </div>
      </Modal>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#0f3047]">Compras</h2>
          <p className="text-sm text-slate-500">Pedidos de compra em uma tela dedicada.</p>
        </div>
        <div className="flex gap-2">
          {[
            { id: 'compras', label: 'Compras' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as PurchaseTab)}
              className={`px-3 py-1.5 rounded-full border text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-amber-100 border-amber-300 text-[#0f3047]'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          <button
            onClick={handlePurchaseNew}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-3 py-2 rounded-md transition"
          >
            Nova
          </button>
          <button
            onClick={handlePurchaseEdit}
            className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-600"
          >
            Editar
          </button>
          <button
            onClick={handlePurchaseDuplicate}
            className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-600"
          >
            Duplicar
          </button>
          <button
            onClick={handlePurchaseDelete}
            className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-600"
          >
            Excluir
          </button>
          <button
            onClick={handlePurchaseExport}
            className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-600"
          >
            Exportar
          </button>
        </div>
        <div className="flex gap-2 items-center">
          <button
            className="border border-slate-200 rounded-md px-2 py-1 text-sm text-slate-700 bg-white hover:bg-slate-50"
            onClick={() => {
              const now = new Date()
              setPurchaseMonth(new Date(now.getFullYear(), now.getMonth(), 1))
            }}
          >
            Mes atual
          </button>
          <div className="flex items-center gap-2 border border-slate-200 rounded-md px-2 py-1 text-sm text-slate-700 bg-white">
            <button onClick={() => setPurchaseMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>
              {'<'}
            </button>
            <span className="capitalize">{formatMonthLabel(purchaseMonth)}</span>
            <button onClick={() => setPurchaseMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>
              {'>'}
            </button>
          </div>
          <input
            value={purchaseSearch}
            onChange={(e) => setPurchaseSearch(e.target.value)}
            className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 w-48"
            placeholder="Buscar..."
          />
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-md text-sm font-semibold transition">
            Buscar
          </button>
        </div>
      </div>

      <div className="overflow-hidden border border-slate-200 rounded-lg">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="py-3 px-3 text-left w-10">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-emerald-600"
                  onChange={togglePurchaseAll}
                  checked={filteredPurchases.length > 0 && filteredPurchases.every((c) => purchaseSelected.includes(c.id))}
                />
              </th>
              <th className="py-3 px-3 text-left w-20">Cod</th>
              <th className="py-3 px-3 text-left">Fornecedor</th>
              <th className="py-3 px-3 text-left">Nota</th>
              <th className="py-3 px-3 text-left w-32">Data</th>
              <th className="py-3 px-3 text-left w-32">Situacao</th>
              <th className="py-3 px-3 text-right w-32">Total</th>
            </tr>
          </thead>
          <tbody>
            {filteredPurchases.length === 0 ? (
              <tr className="border-t border-slate-200">
                <td colSpan={7} className="py-4 px-3 text-center text-slate-500">
                  Nenhuma compra encontrada. Veja o mes anterior.
                </td>
              </tr>
            ) : (
              filteredPurchases.map((c) => (
                <tr key={c.id} className="border-t border-slate-200">
                  <td className="py-3 px-3 text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-emerald-600"
                      checked={purchaseSelected.includes(c.id)}
                      onChange={() => togglePurchase(c.id)}
                    />
                  </td>
                  <td className="py-3 px-3 text-slate-700">{c.id}</td>
                  <td className="py-3 px-3 text-slate-700">{c.fornecedor}</td>
                  <td className="py-3 px-3 text-slate-700">{c.nota}</td>
                  <td className="py-3 px-3 text-slate-700">{c.data}</td>
                  <td className="py-3 px-3 text-slate-700">{c.situacao}</td>
                  <td className="py-3 px-3 text-right text-slate-700">{formatMoney(c.total)}</td>
                </tr>
              ))
            )}
            <tr className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-700">
              <td className="py-3 px-3" colSpan={6}>
                TOTAL LISTADO ({filteredPurchases.length} itens)
              </td>
              <td className="py-3 px-3 text-right">
                {formatMoney(filteredPurchases.reduce((acc, c) => acc + c.total, 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ClientesPage({ activeTab, setActiveTab }: { activeTab: ContactTab; setActiveTab: (t: ContactTab) => void }) {
  const [contactSearch, setContactSearch] = useState('')
  const [contactToast, setContactToast] = useState<string | null>(null)
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [contactModalMode, setContactModalMode] = useState<'new' | 'edit'>('new')
  const contactDefaultForm = {
    nome: '',
    fones: '',
    palavras: '',
    cidade: '',
  }
  const [contactForm, setContactForm] = useState(contactDefaultForm)
  const [contactEditId, setContactEditId] = useState<string | null>(null)

  const [contactSelected, setContactSelected] = useState<string[]>([])

  const { items: contatos, add: addContato, update: updateContato, remove: removeContato } = useLocalCrud(
    'erp.contatos',
    [
      { id: 'C001', nome: 'Cliente ACME', fones: '(11) 9999-0000', palavras: 'vip', cidade: 'SP/SP', tipo: 'clientes' },
      { id: 'C002', nome: 'Cliente Beta', fones: '(21) 9888-1111', palavras: 'atacado', cidade: 'RJ/RJ', tipo: 'clientes' },
      { id: 'F001', nome: 'Fornecedor XPTO', fones: '(31) 9777-2222', palavras: 'eletronicos', cidade: 'BH/MG', tipo: 'fornecedores' },
      { id: 'T001', nome: 'Transp Sul', fones: '(41) 9666-3333', palavras: 'rodoviario', cidade: 'CTBA/PR', tipo: 'transportadoras' },
    ],
  )

  const contactTerm = contactSearch.trim().toLowerCase()
  const list = contatos.filter((c) => {
    if (c.tipo !== activeTab) return false
    if (!contactTerm) return true
    const hay = [c.id, c.nome, c.fones, c.palavras, c.cidade].join(' ').toLowerCase()
    return hay.includes(contactTerm)
  })

  const toggleContato = (id: string) => {
    setContactSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleContatoAll = () => {
    if (list.length === 0) return
    const ids = list.map((c) => c.id)
    const all = ids.every((id) => contactSelected.includes(id))
    setContactSelected(all ? [] : ids)
  }

  const handleContatoNew = () => {
    setContactModalMode('new')
    setContactEditId(null)
    setContactForm({ nome: '', fones: '', palavras: '', cidade: '' })
    setContactModalOpen(true)
  }

  const handleContatoEdit = () => {
    if (contactSelected.length !== 1) {
      setContactToast('Selecione apenas um registro para editar.')
      return
    }
    const current = contatos.find((c) => c.id === contactSelected[0])
    if (!current) return
    setContactModalMode('edit')
    setContactEditId(current.id)
    setContactForm({
      nome: current.nome,
      fones: current.fones,
      palavras: current.palavras,
      cidade: current.cidade,
    })
    setContactModalOpen(true)
  }

  const handleContatoDuplicate = () => {
    if (contactSelected.length === 0) {
      setContactToast('Selecione ao menos um registro para duplicar.')
      return
    }
    contactSelected.forEach((id) => {
      const current = contatos.find((c) => c.id === id)
      if (current) {
        addContato({ ...current, id: crypto.randomUUID() })
      }
    })
  }

  const handleContatoDelete = () => {
    if (contactSelected.length === 0) {
      setContactToast('Selecione ao menos um registro para excluir.')
      return
    }
    removeContato(contactSelected)
    setContactSelected([])
  }

  const handleContatoExport = () => {
    if (list.length === 0) {
      alert('Nada para exportar.')
      return
    }
    const header = ['Cod', 'Nome', 'Fones', 'Palavras', 'Cidade']
    const rows = list.map((c) => [c.id, c.nome, c.fones, c.palavras, c.cidade])
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contatos.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-4">
      <Toast message={contactToast} onClose={() => setContactToast(null)} />
      <Modal
        open={contactModalOpen}
        title={contactModalMode === 'new' ? 'Novo contato' : 'Editar contato'}
        onClose={() => setContactModalOpen(false)}
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Nome</label>
            <input
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
              value={contactForm.nome}
              onChange={(e) => setContactForm((p) => ({ ...p, nome: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Fones</label>
            <input
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
              value={contactForm.fones}
              onChange={(e) => setContactForm((p) => ({ ...p, fones: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Palavras-chave</label>
            <input
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
              value={contactForm.palavras}
              onChange={(e) => setContactForm((p) => ({ ...p, palavras: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Cidade/UF</label>
            <input
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
              value={contactForm.cidade}
              onChange={(e) => setContactForm((p) => ({ ...p, cidade: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-700" onClick={() => setContactModalOpen(false)}>
              Cancelar
            </button>
            <button
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-semibold"
              onClick={() => {
                if (!contactForm.nome.trim()) {
                  setContactToast('Nome obrigatorio')
                  return
                }
                if (contactModalMode === 'new') {
                  addContato({ ...contactForm, tipo: activeTab })
                } else if (contactEditId) {
                  updateContato(contactEditId, contactForm)
                }
                setContactForm(contactDefaultForm)
                setContactModalOpen(false)
                setContactToast('Registro salvo')
              }}
            >
              Salvar
            </button>
          </div>
        </div>
      </Modal>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#0f3047]">Contatos</h2>
          <p className="text-sm text-slate-500">Clientes, fornecedores e transportadoras.</p>
        </div>
        <div className="flex gap-2">
          {[
            { id: 'clientes', label: 'Clientes' },
            { id: 'fornecedores', label: 'Fornecedores' },
            { id: 'transportadoras', label: 'Transportadoras' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ContactTab)}
              className={`px-3 py-1.5 rounded-full border text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-amber-100 border-amber-300 text-[#0f3047]'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          <button
            onClick={handleContatoNew}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-3 py-2 rounded-md transition"
          >
            Novo
          </button>
          <button
            onClick={handleContatoEdit}
            className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-600"
          >
            Editar
          </button>
          <button
            onClick={handleContatoDuplicate}
            className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-600"
          >
            Duplicar
          </button>
          <button
            onClick={handleContatoDelete}
            className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-600"
          >
            Excluir
          </button>
          <button
            onClick={handleContatoExport}
            className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-600"
          >
            Exportar
          </button>
        </div>
        <div className="flex gap-2 items-center">
          <input
            value={contactSearch}
            onChange={(e) => setContactSearch(e.target.value)}
            className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 w-64"
            placeholder={`Buscar ${activeTab}`}
          />
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-md text-sm font-semibold transition">
            Buscar
          </button>
        </div>
      </div>

      <div className="overflow-hidden border border-slate-200 rounded-lg">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="py-3 px-3 text-left w-10">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-emerald-600"
                  onChange={toggleContatoAll}
                  checked={list.length > 0 && list.every((c) => contactSelected.includes(c.id))}
                />
              </th>
              <th className="py-3 px-3 text-left w-20">Cod</th>
              <th className="py-3 px-3 text-left">Nome</th>
              <th className="py-3 px-3 text-left">Fones</th>
              <th className="py-3 px-3 text-left">Palavras-chave</th>
              <th className="py-3 px-3 text-left w-32">Cidade/UF</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr className="border-t border-slate-200">
                <td colSpan={6} className="py-4 px-3 text-center text-slate-500">
                  {activeTab === 'clientes' && 'Nenhum cliente encontrado.'}
                  {activeTab === 'fornecedores' && 'Nenhum fornecedor encontrado.'}
                  {activeTab === 'transportadoras' && 'Nenhuma transportadora encontrada.'}
                </td>
              </tr>
            ) : (
              list.map((c) => (
                <tr key={c.id} className="border-t border-slate-200">
                  <td className="py-3 px-3 text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-emerald-600"
                      checked={contactSelected.includes(c.id)}
                      onChange={() => toggleContato(c.id)}
                    />
                  </td>
                  <td className="py-3 px-3 text-slate-700">{c.id}</td>
                  <td className="py-3 px-3 text-slate-700">{c.nome}</td>
                  <td className="py-3 px-3 text-slate-700">{c.fones}</td>
                  <td className="py-3 px-3 text-slate-700">{c.palavras}</td>
                  <td className="py-3 px-3 text-slate-700">{c.cidade}</td>
                </tr>
              ))
            )}
            <tr className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-700">
              <td className="py-3 px-3" colSpan={5}>
                TOTAL LISTADO ({list.length} itens)
              </td>
              <td className="py-3 px-3 text-right">-</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ProdutosPage({ activeTab, setActiveTab }: { activeTab: ProductTab; setActiveTab: (t: ProductTab) => void }) {
  const [productSearch, setProductSearch] = useState('')
  const [productSelected, setProductSelected] = useState<string[]>([])
  const [productToast, setProductToast] = useState<string | null>(null)
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [productModalMode, setProductModalMode] = useState<'new' | 'edit'>('new')
  const productDefaultForm = {
    nome: '',
    categoria: '',
    preco: 0,
    estoque: 0,
    palavras: '',
    contato: '',
    observacoes: '',
    data: new Date().toISOString().slice(0, 10),
  }
  const [productForm, setProductForm] = useState(productDefaultForm)
  const [productEditId, setProductEditId] = useState<string | null>(null)

  const { items: produtos, add: addProduto, update: updateProduto, remove: removeProduto } = useLocalCrud('erp.produtos', [
    { id: 'P001', nome: 'Notebook Pro', categoria: 'Eletronicos', preco: 5200, estoque: 8, palavras: 'notebook', tipo: 'produtos' },
    { id: 'P002', nome: 'Mouse', categoria: 'Acessorios', preco: 80, estoque: 120, palavras: 'periferico', tipo: 'produtos' },
    { id: 'S001', nome: 'Instalacao', categoria: '', preco: 150, estoque: 0, palavras: 'setup', tipo: 'servicos' },
    { id: 'S002', nome: 'Manutencao', categoria: '', preco: 200, estoque: 0, palavras: 'suporte', tipo: 'servicos' },
    {
      id: 'A001',
      nome: 'Ajuste inventario',
      categoria: '',
      preco: 0,
      estoque: 0,
      palavras: 'inventario',
      tipo: 'ajuste',
      contato: 'Equipe estoque',
      observacoes: 'Ajuste trimestral',
      data: '2025-11-10',
    },
  ])

  const prodTerm = productSearch.trim().toLowerCase()
  const filteredProdutos = produtos.filter((p) => {
    if (p.tipo !== 'produtos') return false
    if (!prodTerm) return true
    const hay = [p.id, p.nome, p.categoria, p.palavras].join(' ').toLowerCase()
    return hay.includes(prodTerm)
  })

  const filteredServicos = produtos.filter((s) => {
    if (s.tipo !== 'servicos') return false
    if (!prodTerm) return true
    const hay = [s.id, s.nome, s.palavras].join(' ').toLowerCase()
    return hay.includes(prodTerm)
  })

  const filteredAjustes = produtos.filter((a) => {
    if (a.tipo !== 'ajuste') return false
    if (!prodTerm) return true
    const hay = [a.id, a.nome || '', a.contato || '', a.palavras || '', a.observacoes || '', a.data || '']
      .join(' ')
      .toLowerCase()
    return hay.includes(prodTerm)
  })

  const toggleProduto = (id: string) => {
    setProductSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleProdutoAll = (ids: string[]) => {
    if (ids.length === 0) return
    const all = ids.every((id) => productSelected.includes(id))
    setProductSelected(all ? [] : ids)
  }

  const handleProdutoNew = () => {
    setProductModalMode('new')
    setProductEditId(null)
    setProductForm({
      nome: '',
      categoria: '',
      preco: 0,
      estoque: 0,
      palavras: '',
      contato: '',
      observacoes: '',
      data: new Date().toISOString().slice(0, 10),
    })
    setProductModalOpen(true)
  }

  const handleProdutoEdit = () => {
    if (productSelected.length !== 1) {
      setProductToast('Selecione apenas um registro para editar.')
      return
    }
    const current = produtos.find((p) => p.id === productSelected[0])
    if (!current) return
    setProductModalMode('edit')
    setProductEditId(current.id)
    setProductForm({
      nome: current.nome,
      categoria: current.categoria,
      preco: current.preco,
      estoque: current.estoque,
      palavras: current.palavras || '',
      contato: current.contato || '',
      observacoes: current.observacoes || '',
      data: current.data || new Date().toISOString().slice(0, 10),
    })
    setProductModalOpen(true)
  }

  const handleProdutoDuplicate = () => {
    if (productSelected.length === 0) {
      setProductToast('Selecione ao menos um registro para duplicar.')
      return
    }
    productSelected.forEach((id) => {
      const current = produtos.find((p) => p.id === id)
      if (current) {
        addProduto({ ...current, id: crypto.randomUUID() })
      }
    })
  }

  const handleProdutoDelete = () => {
    if (productSelected.length === 0) {
      setProductToast('Selecione ao menos um registro para excluir.')
      return
    }
    removeProduto(productSelected)
    setProductSelected([])
  }

  const handleProdutoExport = (items: typeof produtos) => {
    if (items.length === 0) {
      setProductToast('Nada para exportar.')
      return
    }
    const header = ['Cod', 'Nome', 'Categoria', 'Preco', 'Estoque', 'Palavras']
    const rows = items.map((p) => [p.id, p.nome, p.categoria || '-', p.preco, p.estoque, p.palavras || ''])
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `produtos_${activeTab}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-4">
      <Toast message={productToast} onClose={() => setProductToast(null)} />
      <Modal
        open={productModalOpen}
        title={productModalMode === 'new' ? 'Novo registro' : 'Editar registro'}
        onClose={() => setProductModalOpen(false)}
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Nome</label>
            <input
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
              value={productForm.nome}
              onChange={(e) => setProductForm((p) => ({ ...p, nome: e.target.value }))}
            />
          </div>
          {activeTab === 'produtos' && (
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Categoria</label>
              <input
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                value={productForm.categoria}
                onChange={(e) => setProductForm((p) => ({ ...p, categoria: e.target.value }))}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Preco</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                  value={productForm.preco}
                  onChange={(e) => setProductForm((p) => ({ ...p, preco: parseFloat(e.target.value || '0') }))}
                />
              </div>
            </div>
            {activeTab === 'produtos' && (
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Estoque</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                  value={productForm.estoque}
                  onChange={(e) => setProductForm((p) => ({ ...p, estoque: parseFloat(e.target.value || '0') }))}
                />
              </div>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Palavras-chave</label>
            <input
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
              value={productForm.palavras}
              onChange={(e) => setProductForm((p) => ({ ...p, palavras: e.target.value }))}
            />
          </div>
          {activeTab === 'ajuste' && (
            <>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Contato</label>
                <input
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                  value={productForm.contato}
                  onChange={(e) => setProductForm((p) => ({ ...p, contato: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Observacoes</label>
                <input
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                  value={productForm.observacoes}
                  onChange={(e) => setProductForm((p) => ({ ...p, observacoes: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Data</label>
                <input
                  type="date"
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                  value={productForm.data}
                  onChange={(e) => setProductForm((p) => ({ ...p, data: e.target.value }))}
                />
              </div>
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-700" onClick={() => setProductModalOpen(false)}>
              Cancelar
            </button>
            <button
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-semibold"
              onClick={() => {
                if (!productForm.nome.trim()) {
                  setProductToast('Nome obrigatorio')
                  return
                }
                if (Number.isNaN(productForm.preco)) {
                  setProductToast('Preco invalido')
                  return
                }
                if (activeTab === 'produtos' && Number.isNaN(productForm.estoque)) {
                  setProductToast('Estoque invalido')
                  return
                }
                const precoNorm = normalizeMoney(productForm.preco)
                const estoqueNorm = activeTab === 'produtos' ? normalizeInt(productForm.estoque) : productForm.estoque
                if (productModalMode === 'new') {
                  addProduto({ ...productForm, preco: precoNorm, estoque: estoqueNorm, tipo: activeTab })
                } else if (productEditId) {
                  updateProduto(productEditId, { ...productForm, preco: precoNorm, estoque: estoqueNorm })
                }
                setProductForm(productDefaultForm)
                setProductModalOpen(false)
                setProductToast('Registro salvo')
              }}
            >
              Salvar
            </button>
          </div>
        </div>
      </Modal>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#0f3047]">Produtos e servicos</h2>
          <p className="text-sm text-slate-500">Cadastro de produtos, servicos e ajustes de estoque.</p>
        </div>
        <div className="flex gap-2">
          {[
            { id: 'produtos', label: 'Produtos' },
            { id: 'servicos', label: 'Servicos' },
            { id: 'ajuste', label: 'Ajuste de estoque' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ProductTab)}
              className={`px-3 py-1.5 rounded-full border text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-amber-100 border-amber-300 text-[#0f3047]'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          <button
            onClick={handleProdutoNew}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-3 py-2 rounded-md transition"
          >
            Novo
          </button>
          <button
            onClick={handleProdutoEdit}
            className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-600"
          >
            Editar
          </button>
          <button
            onClick={handleProdutoDuplicate}
            className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-600"
          >
            Duplicar
          </button>
          <button
            onClick={handleProdutoDelete}
            className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-600"
          >
            Excluir
          </button>
          <button
            onClick={() =>
              handleProdutoExport(
                activeTab === 'produtos' ? filteredProdutos : activeTab === 'servicos' ? filteredServicos : filteredAjustes,
              )
            }
            className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-600"
          >
            Exportar
          </button>
        </div>
        <div className="flex gap-2 items-center">
          <input
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 w-64"
            placeholder={`Buscar ${activeTab}`}
          />
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-md text-sm font-semibold transition">
            Buscar
          </button>
        </div>
      </div>

      {activeTab === 'produtos' && (
        <ProdutosTable
          items={filteredProdutos}
          selected={productSelected}
          onToggle={toggleProduto}
          onToggleAll={() => toggleProdutoAll(filteredProdutos.map((p) => p.id))}
        />
      )}
      {activeTab === 'servicos' && (
        <ServicosTable
          items={filteredServicos}
          selected={productSelected}
          onToggle={toggleProduto}
          onToggleAll={() => toggleProdutoAll(filteredServicos.map((p) => p.id))}
        />
      )}
      {activeTab === 'ajuste' && (
        <AjusteTable
          items={filteredAjustes}
          selected={productSelected}
          onToggle={toggleProduto}
          onToggleAll={() => toggleProdutoAll(filteredAjustes.map((p) => p.id))}
        />
      )}
    </section>
  )
}

function ProdutosTable({
  items,
  selected,
  onToggle,
  onToggleAll,
}: {
  items: { id: string; nome: string; categoria: string; preco: number; estoque: number }[]
  selected: string[]
  onToggle: (id: string) => void
  onToggleAll: () => void
}) {
  return (
    <div className="overflow-hidden border border-slate-200 rounded-lg">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="py-3 px-3 text-left w-10">
              <input
                type="checkbox"
                className="h-4 w-4 accent-emerald-600"
                onChange={onToggleAll}
                checked={items.length > 0 && items.every((p) => selected.includes(p.id))}
              />
            </th>
            <th className="py-3 px-3 text-left w-20">Cod</th>
            <th className="py-3 px-3 text-left">Produto</th>
            <th className="py-3 px-3 text-left">Categoria</th>
            <th className="py-3 px-3 text-left w-32">Preco venda</th>
            <th className="py-3 px-3 text-left w-32">Estoque</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr className="border-t border-slate-200">
              <td colSpan={6} className="py-4 px-3 text-center text-slate-500">
                Nenhum produto encontrado.
              </td>
            </tr>
          ) : (
            items.map((p) => (
              <tr key={p.id} className="border-t border-slate-200">
                <td className="py-3 px-3 text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-emerald-600"
                    checked={selected.includes(p.id)}
                    onChange={() => onToggle(p.id)}
                  />
                </td>
                <td className="py-3 px-3 text-slate-700">{p.id}</td>
                <td className="py-3 px-3 text-slate-700">{p.nome}</td>
                <td className="py-3 px-3 text-slate-700">{p.categoria}</td>
                <td className="py-3 px-3 text-slate-700">{formatMoney(p.preco)}</td>
                <td className="py-3 px-3 text-slate-700">{p.estoque}</td>
              </tr>
            ))
          )}
          <tr className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-700">
            <td className="py-3 px-3" colSpan={4}>
              TOTAL LISTADO ({items.length} itens)
            </td>
            <td className="py-3 px-3 text-right">-</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function ServicosTable({
  items,
  selected,
  onToggle,
  onToggleAll,
}: {
  items: { id: string; nome: string; palavras: string; preco: number }[]
  selected: string[]
  onToggle: (id: string) => void
  onToggleAll: () => void
}) {
  return (
    <div className="overflow-hidden border border-slate-200 rounded-lg">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="py-3 px-3 text-left w-10">
              <input
                type="checkbox"
                className="h-4 w-4 accent-emerald-600"
                onChange={onToggleAll}
                checked={items.length > 0 && items.every((s) => selected.includes(s.id))}
              />
            </th>
            <th className="py-3 px-3 text-left w-20">Cod</th>
            <th className="py-3 px-3 text-left">Servico</th>
            <th className="py-3 px-3 text-left">Palavras-chave</th>
            <th className="py-3 px-3 text-left w-32">Preco venda</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr className="border-t border-slate-200">
              <td colSpan={5} className="py-4 px-3 text-center text-slate-500">
                Nenhum servico encontrado.
              </td>
            </tr>
          ) : (
            items.map((s) => (
              <tr key={s.id} className="border-t border-slate-200">
                <td className="py-3 px-3 text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-emerald-600"
                    checked={selected.includes(s.id)}
                    onChange={() => onToggle(s.id)}
                  />
                </td>
                <td className="py-3 px-3 text-slate-700">{s.id}</td>
                <td className="py-3 px-3 text-slate-700">{s.nome}</td>
                <td className="py-3 px-3 text-slate-700">{s.palavras}</td>
                <td className="py-3 px-3 text-slate-700">{formatMoney(s.preco)}</td>
              </tr>
            ))
          )}
          <tr className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-700">
            <td className="py-3 px-3" colSpan={3}>
              TOTAL LISTADO ({items.length} itens)
            </td>
            <td className="py-3 px-3 text-right">-</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function AjusteTable({
  items,
  selected,
  onToggle,
  onToggleAll,
}: {
  items: { id: string; motivo: string; contato: string; palavras: string; observacoes: string; data: string }[]
  selected: string[]
  onToggle: (id: string) => void
  onToggleAll: () => void
}) {
  return (
    <div className="overflow-hidden border border-slate-200 rounded-lg">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="py-3 px-3 text-left w-10">
              <input
                type="checkbox"
                className="h-4 w-4 accent-emerald-600"
                onChange={onToggleAll}
                checked={items.length > 0 && items.every((a) => selected.includes(a.id))}
              />
            </th>
            <th className="py-3 px-3 text-left w-20">Cod</th>
            <th className="py-3 px-3 text-left">Motivo</th>
            <th className="py-3 px-3 text-left">Contato</th>
            <th className="py-3 px-3 text-left">Palavras-chave</th>
            <th className="py-3 px-3 text-left">Observacoes</th>
            <th className="py-3 px-3 text-left w-32">Data</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr className="border-t border-slate-200">
              <td colSpan={7} className="py-4 px-3 text-center text-slate-500">
                Nenhum ajuste encontrado. Veja o mes anterior.
              </td>
            </tr>
          ) : (
            items.map((a) => (
              <tr key={a.id} className="border-t border-slate-200">
                <td className="py-3 px-3 text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-emerald-600"
                    checked={selected.includes(a.id)}
                    onChange={() => onToggle(a.id)}
                  />
                </td>
                <td className="py-3 px-3 text-slate-700">{a.id}</td>
                <td className="py-3 px-3 text-slate-700">{a.motivo}</td>
                <td className="py-3 px-3 text-slate-700">{a.contato}</td>
                <td className="py-3 px-3 text-slate-700">{a.palavras}</td>
                <td className="py-3 px-3 text-slate-700">{a.observacoes}</td>
                <td className="py-3 px-3 text-slate-700">{a.data}</td>
              </tr>
            ))
          )}
          <tr className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-700">
            <td className="py-3 px-3" colSpan={5}>
              TOTAL LISTADO ({items.length} itens)
            </td>
            <td className="py-3 px-3 text-right">-</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function ConfiguracoesPage({ activeTab, setActiveTab }: { activeTab: ConfigTab; setActiveTab: (t: ConfigTab) => void }) {
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'geral', label: 'Geral' },
          { id: 'plano', label: 'Plano de contas' },
          { id: 'caixa', label: 'Contas caixa' },
          { id: 'operacoes', label: 'Operacoes' },
          { id: 'formas', label: 'Formas pgto' },
          { id: 'usuarios', label: 'Usuarios' },
          { id: 'fiscal', label: 'Dados fiscais' },
          { id: 'impressao', label: 'Impressao' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ConfigTab)}
            className={`px-3 py-2 rounded-md text-sm font-semibold border transition ${
              activeTab === tab.id
                ? 'bg-amber-100 border-amber-300 text-[#0f3047]'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'geral' && <ConfigGeral />}
      {activeTab === 'fiscal' && <ConfigFiscal />}
      {activeTab === 'impressao' && <ConfigImpressao />}
      {activeTab === 'plano' && <ConfigPlano />}
      {activeTab === 'operacoes' && <ConfigOperacoes />}
      {activeTab === 'formas' && <ConfigFormasPgto />}
      {activeTab === 'usuarios' && <ConfigUsuarios />}
      {activeTab === 'caixa' && <ConfigCaixa />}
    </section>
  )
}

function ConfigGeral() {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-4">
      <h2 className="text-lg font-semibold text-[#0f3047]">Dados gerais da empresa</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2 md:col-span-1">
            <label className="text-xs text-slate-500">CNPJ / CPF</label>
            <input className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" placeholder="00.000.000/0000-00" />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="text-xs text-slate-500">Autopreencher</label>
            <input className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" placeholder="-" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-500">Razao Social / Nome</label>
            <input className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500">Nome Fantasia</label>
            <input className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 md:col-span-2">
          <div>
            <label className="text-xs text-slate-500">Inscricao Estadual</label>
            <input className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500">Inscricao Municipal</label>
            <input className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500">CNAE principal</label>
            <input className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:col-span-2">
          <div>
            <label className="text-xs text-slate-500">Telefones</label>
            <input className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" placeholder="(11) 99999-9999" />
          </div>
          <div>
            <label className="text-xs text-slate-500">E-mails</label>
            <input className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" placeholder="email@empresa.com" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 md:col-span-2">
          <div>
            <label className="text-xs text-slate-500">CEP</label>
            <input className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" placeholder="00000-000" />
          </div>
          <div>
            <label className="text-xs text-slate-500">Estado</label>
            <input className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" placeholder="UF" />
          </div>
          <div>
            <label className="text-xs text-slate-500">Cidade</label>
            <input className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" placeholder="Selecione" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:col-span-2">
          <div>
            <label className="text-xs text-slate-500">Endereco</label>
            <input className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" placeholder="Rua, avenida, etc" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-slate-500">Numero</label>
              <input className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500">Complemento</label>
              <input className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500">Bairro</label>
              <input className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="bg-[#0f3047] text-white px-4 py-2 rounded-md text-sm font-semibold">Salvar</button>
      </div>
    </div>
  )
}

function ConfigFiscal() {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-6">
      <h2 className="text-lg font-semibold text-[#0f3047]">Dados fiscais</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-slate-500">Principal atividade</label>
          <input className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" placeholder="Comercio" />
        </div>
        <div>
          <label className="text-xs text-slate-500">Cod. Regime Tributario Servicos</label>
          <input className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" placeholder="Selecione" />
        </div>
        <div>
          <label className="text-xs text-slate-500">Cod. do Regime Tributario Produtos</label>
          <input className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" placeholder="Simples Nacional" />
        </div>
        <div>
          <label className="text-xs text-slate-500">Aliquota do Simples Nacional</label>
          <div className="flex gap-2">
            <input className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" placeholder="%" />
            <input className="w-24 border border-slate-200 rounded-md px-3 py-2 text-sm" placeholder="4,00" />
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <button className="bg-[#0f3047] text-white px-4 py-2 rounded-md text-sm font-semibold">Salvar</button>
      </div>
    </div>
  )
}

function ConfigImpressao() {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-6">
      <h2 className="text-lg font-semibold text-[#0f3047]">Dados para impressao</h2>
      <div className="grid gap-4">
        <div>
          <label className="text-xs text-slate-500">Logomarca</label>
          <div className="flex items-center gap-3">
            <button className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-600">Enviar logomarca</button>
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" className="h-4 w-4 accent-amber-500" />
              Mostrar prefixos e sufixos (R$ e %) em relatorios
            </label>
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500">Cabecalho</label>
          <textarea className="w-full min-h-[120px] border border-slate-200 rounded-md px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="flex justify-end">
        <button className="bg-[#0f3047] text-white px-4 py-2 rounded-md text-sm font-semibold">Salvar</button>
      </div>
    </div>
  )
}

function ConfigCaixa() {
  const contas = [{ nome: 'Caixa interno', saldo: 'R$ 0,00', codigo: '(codigo interno 1)' }]
  const [caixaSelected, setCaixaSelected] = useState<string[]>([])
  const [caixaToast, setCaixaToast] = useState<string | null>(null)

  const toggleCaixa = (nome: string) => {
    setCaixaSelected((prev) => (prev.includes(nome) ? prev.filter((x) => x !== nome) : [...prev, nome]))
  }

  const toggleCaixaAll = () => {
    if (contas.length === 0) return
    const all = contas.every((c) => caixaSelected.includes(c.nome))
    setCaixaSelected(all ? [] : contas.map((c) => c.nome))
  }

  const exportCaixa = () => {
    if (contas.length === 0) {
      setCaixaToast('Nada para exportar.')
      return
    }
    const header = ['Nome', 'Codigo', 'Saldo']
    const rows = contas.map((c) => [c.nome, c.codigo, c.saldo])
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contas_caixa.csv'
    a.click()
    URL.revokeObjectURL(url)
    setCaixaToast('Exportado com sucesso')
  }
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-4">
      <Toast message={caixaToast} onClose={() => setCaixaToast(null)} />
      <div>
        <h2 className="text-lg font-semibold text-[#0f3047]">Contas caixa</h2>
        <p className="text-sm text-slate-600">Configure as suas contas.</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={toggleCaixaAll}
          className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-700 bg-white hover:bg-slate-50"
        >
          {caixaSelected.length === contas.length ? 'Limpar selecao' : 'Selecionar todos'}
        </button>
        <button
          onClick={exportCaixa}
          className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-700 bg-white hover:bg-slate-50"
        >
          Exportar
        </button>
      </div>

      <div className="overflow-hidden border border-slate-200 rounded-lg">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="py-3 px-3 text-left w-10">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-emerald-600"
                  onChange={toggleCaixaAll}
                  checked={contas.length > 0 && contas.every((c) => caixaSelected.includes(c.nome))}
                />
              </th>
              <th className="py-3 px-3 text-left">Nome da conta</th>
              <th className="py-3 px-3 text-left w-32">Saldo inicial</th>
            </tr>
          </thead>
          <tbody>
            {contas.map((c) => (
              <tr key={c.nome} className="border-t border-slate-200">
                <td className="py-3 px-3 flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-emerald-600"
                    checked={caixaSelected.includes(c.nome)}
                    onChange={() => toggleCaixa(c.nome)}
                  />
                  <span className="text-xs text-slate-500">Mover</span>
                  <span className="text-xs text-slate-500">Excluir</span>
                  <span className="font-semibold text-slate-800">{c.nome}</span>
                  <span className="text-xs text-slate-500">{c.codigo}</span>
                </td>
                <td className="py-3 px-3 text-slate-700">{c.saldo}</td>
              </tr>
            ))}
            <tr className="border-t border-slate-200">
              <td className="py-3 px-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#0f3047] font-semibold">+</span>
                  <input
                    className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm"
                    placeholder="Adicionar novo"
                  />
                </div>
              </td>
              <td className="py-3 px-3">
                <input className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" placeholder="R$ 0,00" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" className="h-4 w-4 accent-amber-500" />
        Mostrar saldo total das contas caixa na tela do financeiro
      </label>
    </div>
  )
}

function ConfigOperacoes() {
  const vendasOptions = [
    'Ativar modo leitor de codigo de barras',
    'Mostrar preco custo nas informacoes do produto na venda',
    'Enviar observacoes dos itens da venda para o financeiro',
    'Habilitar lancamento de gastos na venda',
    'Adicionar grupos de produtos quando buscado por hashtag (#)',
    'Mostrar nome fantasia na listagem das vendas',
    'Iniciar nova venda na secao carrinho',
    'Responder para com e-mail do vendedor',
    'Nao permitir salvar vendas com data diferente da atual',
    'Ordenar alfabeticamente os produtos na venda',
    'Sempre atualizar descricao do financeiro ao salvar a venda',
    'Mostrar indicador de boletos na listagem das vendas',
  ]

  const comprasOptions = [
    'Bloquear preco de custo em entradas via XML',
    'Bloquear entrada de XML duplicado',
    'Permitir adicionar Produto final e Produto em processo na compras',
    'Mostrar campo de observacoes em cada produto da compra',
    'Usar margem de contribuicao por dentro no preco de venda',
    'Ativar modo leitor de codigo de barras nas compras',
    'Mostrar data de entrega',
    'Habilitar lancamento de gastos nas compras',
  ]

  const fiscalOptions = [
    'Bloquear edicao de vendas com NF-e ou NFC-e autorizadas',
    'Bloquear mais de uma NF-e/NFC-e por venda',
    'Enviar para NF-e as observacoes dos produtos vendidos',
    'Enviar para NF-e as informacoes de pagamento',
    'Ativar NFC-e',
    'Enviar nome do vendedor para NFC-e',
  ]

  return (
    <div className="space-y-6">
      <SectionCard
        title="Vendas"
        description="Configure os dados das suas vendas."
        actions={<button className="bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-semibold">Salvar</button>}
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="text-xs text-slate-500">Desconto maximo nas vendas (%)</label>
            <input className="border border-slate-200 rounded-md px-3 py-2 text-sm" placeholder="0,00" />
            <label className="text-xs text-slate-500">Mais utilizado nas vendas</label>
            <input className="border border-slate-200 rounded-md px-3 py-2 text-sm" placeholder="Produtos" />
            <label className="text-xs text-slate-500">Informacao junto ao produto na venda</label>
            <input className="border border-slate-200 rounded-md px-3 py-2 text-sm" />
            <label className="text-xs text-slate-500">Plano de contas padrao para vendas</label>
            <input className="border border-slate-200 rounded-md px-3 py-2 text-sm" placeholder="Venda de produtos/servicos" />
            <label className="text-xs text-slate-500">Plano de contas padrao para devolucoes</label>
            <input className="border border-slate-200 rounded-md px-3 py-2 text-sm" placeholder="Devolucoes de vendas" />
          </div>
          <div className="space-y-3">
            <label className="text-xs text-slate-500">Nome do modulo de vendas</label>
            <input className="border border-slate-200 rounded-md px-3 py-2 text-sm" placeholder="Venda" />
            <label className="text-xs text-slate-500">Iniciar nova venda como</label>
            <input className="border border-slate-200 rounded-md px-3 py-2 text-sm" placeholder="Venda" />
            <label className="text-xs text-slate-500">Informacao junto ao cliente na venda</label>
            <input className="border border-slate-200 rounded-md px-3 py-2 text-sm" />
            <label className="text-xs text-slate-500">Forma de pagamento padrao para vendas</label>
            <input className="border border-slate-200 rounded-md px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {vendasOptions.map((opt) => (
            <label key={opt} className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" className="h-4 w-4 accent-amber-500" />
              {opt}
            </label>
          ))}
          <div className="md:col-span-2">
            <label className="text-xs text-slate-500">Texto padrao para Observacoes gerais</label>
            <textarea className="w-full min-h-[80px] border border-slate-200 rounded-md px-3 py-2 text-sm" />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Compras"
        description="Configure os dados das suas compras."
        actions={<button className="bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-semibold">Salvar</button>}
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="text-xs text-slate-500">Iniciar nova compra como</label>
            <input className="border border-slate-200 rounded-md px-3 py-2 text-sm" placeholder="Compra" />
            <label className="text-xs text-slate-500">Margem para produtos sem margem de contribuicao</label>
            <input className="border border-slate-200 rounded-md px-3 py-2 text-sm" placeholder="0,00" />
            <label className="text-xs text-slate-500">Categoria do plano de contas padrao para compras</label>
            <input className="border border-slate-200 rounded-md px-3 py-2 text-sm" placeholder="Compras (estoque)" />
            <label className="text-xs text-slate-500">Informacao junto ao produto na compra</label>
            <input className="border border-slate-200 rounded-md px-3 py-2 text-sm" />
          </div>
          <div className="space-y-3">
            <label className="text-xs text-slate-500">Preco de venda padrao em novas compras</label>
            <input className="border border-slate-200 rounded-md px-3 py-2 text-sm" placeholder="Preco sugerido" />
            <label className="text-xs text-slate-500">Texto padrao para Observacoes gerais (compras)</label>
            <textarea className="w-full min-h-[80px] border border-slate-200 rounded-md px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {comprasOptions.map((opt) => (
            <label key={opt} className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" className="h-4 w-4 accent-amber-500" />
              {opt}
            </label>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Fiscal"
        description="Configure os dados das suas notas."
        actions={<button className="bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-semibold">Salvar</button>}
      >
        <div className="grid md:grid-cols-2 gap-4">
          {fiscalOptions.map((opt) => (
            <label key={opt} className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" className="h-4 w-4 accent-amber-500" />
              {opt}
            </label>
          ))}
          <div className="md:col-span-2 grid md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs text-slate-500">Enviar para a NF-e/NFC-e o conteudo do campo</label>
              <input className="border border-slate-200 rounded-md px-3 py-2 text-sm" />
              <label className="text-xs text-slate-500">Transportadora padrao entrega domicilio</label>
              <input className="border border-slate-200 rounded-md px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-500">Informacoes adicionais padrao da NFC-e</label>
              <textarea className="w-full min-h-[80px] border border-slate-200 rounded-md px-3 py-2 text-sm" />
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

function ConfigFormasPgto() {
  const formas = [
    { nome: 'Dinheiro', destino: 'Caixa interno', prazo: 'D+0', formaNf: 'Dinheiro', custo: 'Sem custo' },
    { nome: 'Cheque', destino: 'Selecionar...', prazo: 'D+0', formaNf: 'Cheque', custo: 'Sem custo' },
    { nome: 'Boleto', destino: 'Selecionar...', prazo: 'D+0', formaNf: 'Outros', custo: 'Sem custo' },
    { nome: 'Cartao credito', destino: 'Selecionar...', prazo: 'D+0', formaNf: 'Cartao de Credito', custo: 'Sem custo' },
    { nome: 'Cartao debito', destino: 'Selecionar...', prazo: 'D+0', formaNf: 'Cartao de Debito', custo: 'Sem custo' },
  ]
  const [formaSelected, setFormaSelected] = useState<string[]>([])
  const [formaToast, setFormaToast] = useState<string | null>(null)
  const [formaSearch, setFormaSearch] = useState('')

  const filteredFormas = formas.filter((f) => {
    const term = formaSearch.trim().toLowerCase()
    if (!term) return true
    return [f.nome, f.destino, f.formaNf].join(' ').toLowerCase().includes(term)
  })

  const toggleForma = (nome: string) => {
    setFormaSelected((prev) => (prev.includes(nome) ? prev.filter((x) => x !== nome) : [...prev, nome]))
  }

  const toggleFormaAll = () => {
    if (filteredFormas.length === 0) return
    const ids = filteredFormas.map((f) => f.nome)
    const all = ids.every((id) => formaSelected.includes(id))
    setFormaSelected(all ? [] : ids)
  }

  const exportFormas = () => {
    if (filteredFormas.length === 0) {
      setFormaToast('Nada para exportar.')
      return
    }
    const header = ['Nome', 'Destino', 'Prazo', 'Forma NF', 'Custo']
    const rows = filteredFormas.map((f) => [f.nome, f.destino, f.prazo, f.formaNf, f.custo])
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'formas_pagamento.csv'
    a.click()
    URL.revokeObjectURL(url)
    setFormaToast('Exportado com sucesso')
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-4">
      <Toast message={formaToast} onClose={() => setFormaToast(null)} />
      <div>
        <h2 className="text-lg font-semibold text-[#0f3047]">Formas de pagamento</h2>
        <p className="text-sm text-slate-600">Configure as formas de pagamento.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            onClick={toggleFormaAll}
            className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-700 bg-white hover:bg-slate-50"
          >
            {filteredFormas.length > 0 && formaSelected.length === filteredFormas.length ? 'Limpar selecao' : 'Selecionar todos'}
          </button>
          <button
            onClick={exportFormas}
            className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-700 bg-white hover:bg-slate-50"
          >
            Exportar
          </button>
        </div>
        <div className="flex-1 min-w-[200px]">
          <input
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
            placeholder="Buscar forma"
            value={formaSearch}
            onChange={(e) => setFormaSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-hidden border border-slate-200 rounded-lg">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="py-3 px-3 text-left w-10">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-emerald-600"
                  onChange={toggleFormaAll}
                  checked={filteredFormas.length > 0 && filteredFormas.every((f) => formaSelected.includes(f.nome))}
                />
              </th>
              <th className="py-3 px-3 text-left">Nome da forma</th>
              <th className="py-3 px-3 text-left">Destino padrao</th>
              <th className="py-3 px-3 text-left w-24">Prazo de credito</th>
              <th className="py-3 px-3 text-left w-40">Forma pgto na NF-e/NFC-e</th>
              <th className="py-3 px-3 text-left w-24">Custo</th>
            </tr>
          </thead>
          <tbody>
            {filteredFormas.map((f) => (
              <tr key={f.nome} className="border-t border-slate-200">
                <td className="py-3 px-3 flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-emerald-600"
                    checked={formaSelected.includes(f.nome)}
                    onChange={() => toggleForma(f.nome)}
                  />
                  <span className="text-xs text-slate-500">Mover</span>
                  <span className="text-xs text-slate-500">Excluir</span>
                </td>
                <td className="py-3 px-3 text-slate-700">{f.destino}</td>
                <td className="py-3 px-3 text-slate-700">{f.prazo}</td>
                <td className="py-3 px-3 text-slate-700">{f.formaNf}</td>
                <td className="py-3 px-3 text-slate-700">{f.custo}</td>
              </tr>
            ))}
            <tr className="border-t border-slate-200">
              <td className="py-3 px-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#0f3047] font-semibold">+</span>
                  <input className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm" placeholder="Adicionar novo" />
                </div>
              </td>
              <td className="py-3 px-3">
                <input className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" placeholder="Selecionar..." />
              </td>
              <td className="py-3 px-3">
                <input className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" placeholder="D+0" />
              </td>
              <td className="py-3 px-3">
                <input className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" placeholder="Outros" />
              </td>
              <td className="py-3 px-3">
                <input className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" placeholder="Sem custo" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ConfigUsuarios() {
  const { items: usuarios, add, update, remove } = useLocalCrud('erp.usuarios', [
    {
      id: crypto.randomUUID(),
      nome: 'Erick Alves',
      email: 'erick.nascimento12@hotmail.com',
      login: 'erick',
      palavra: '',
      permissao: 'Acesso completo',
      acesso: 'Sim',
    },
  ])
  const [userSearch, setUserSearch] = useState('')
  const [userSelected, setUserSelected] = useState<string[]>([])
  const [userToast, setUserToast] = useState<string | null>(null)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [userModalMode, setUserModalMode] = useState<'new' | 'edit'>('new')
  const [userEditId, setUserEditId] = useState<string | null>(null)
  const [userForm, setUserForm] = useState({
    nome: '',
    email: '',
    login: '',
    palavra: '',
    permissao: 'Acesso completo',
    acesso: 'Sim',
  })

  const filteredUsers = usuarios.filter((u) => {
    const term = userSearch.trim().toLowerCase()
    if (!term) return true
    const hay = [u.nome, u.email, u.login, u.permissao].join(' ').toLowerCase()
    return hay.includes(term)
  })

  const toggleUser = (id: string) => {
    setUserSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleUserAll = () => {
    if (filteredUsers.length === 0) return
    const ids = filteredUsers.map((u) => u.id)
    const all = ids.every((id) => userSelected.includes(id))
    setUserSelected(all ? [] : ids)
  }

  const handleUserNew = () => {
    setUserModalMode('new')
    setUserEditId(null)
    setUserForm({ nome: '', email: '', login: '', palavra: '', permissao: 'Acesso completo', acesso: 'Sim' })
    setUserModalOpen(true)
  }

  const handleUserEdit = () => {
    if (userSelected.length !== 1) {
      setUserToast('Selecione apenas um registro para editar.')
      return
    }
    const current = usuarios.find((u) => u.id === userSelected[0])
    if (!current) return
    setUserModalMode('edit')
    setUserEditId(current.id)
    setUserForm({
      nome: current.nome,
      email: current.email,
      login: current.login,
      palavra: current.palavra || '',
      permissao: current.permissao || 'Acesso completo',
      acesso: current.acesso || 'Sim',
    })
    setUserModalOpen(true)
  }

  const handleUserDuplicate = () => {
    if (userSelected.length === 0) {
      setUserToast('Selecione ao menos um registro para duplicar.')
      return
    }
    userSelected.forEach((id) => {
      const current = usuarios.find((u) => u.id === id)
      if (current) {
        add({ ...current, id: crypto.randomUUID(), login: `${current.login}_copia` })
      }
    })
  }

  const handleUserDelete = () => {
    if (userSelected.length === 0) {
      setUserToast('Selecione ao menos um registro para excluir.')
      return
    }
    remove(userSelected)
    setUserSelected([])
  }

  const handleUserExport = () => {
    if (filteredUsers.length === 0) {
      setUserToast('Nada para exportar.')
      return
    }
    const header = ['Cod', 'Nome', 'E-mail', 'Login', 'Palavras', 'Permissao', 'Acesso']
    const rows = filteredUsers.map((u, idx) => [idx + 1, u.nome, u.email, u.login, u.palavra || '-', u.permissao, u.acesso])
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'usuarios.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <Toast message={userToast} onClose={() => setUserToast(null)} />
      <Modal
        open={userModalOpen}
        title={userModalMode === 'new' ? 'Novo usuario' : 'Editar usuario'}
        onClose={() => setUserModalOpen(false)}
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Nome</label>
            <input
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
              value={userForm.nome}
              onChange={(e) => setUserForm((p) => ({ ...p, nome: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">E-mail</label>
            <input
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
              value={userForm.email}
              onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Login</label>
            <input
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
              value={userForm.login}
              onChange={(e) => setUserForm((p) => ({ ...p, login: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Palavras-chave</label>
            <input
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
              value={userForm.palavra}
              onChange={(e) => setUserForm((p) => ({ ...p, palavra: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Permissao</label>
              <input
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                value={userForm.permissao}
                onChange={(e) => setUserForm((p) => ({ ...p, permissao: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Acesso?</label>
              <select
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                value={userForm.acesso}
                onChange={(e) => setUserForm((p) => ({ ...p, acesso: e.target.value }))}
              >
                <option value="Sim">Sim</option>
                <option value="Nao">Nao</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-700" onClick={() => setUserModalOpen(false)}>
              Cancelar
            </button>
            <button
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-semibold"
              onClick={() => {
                if (!userForm.nome.trim()) {
                  setUserToast('Nome obrigatorio')
                  return
                }
                if (!userForm.email.trim()) {
                  setUserToast('E-mail obrigatorio')
                  return
                }
                if (!userForm.login.trim()) {
                  setUserToast('Login obrigatorio')
                  return
                }
                if (userModalMode === 'new') {
                  add(userForm)
                } else if (userEditId) {
                  update(userEditId, userForm)
                }
                setUserModalOpen(false)
                setUserToast('Registro salvo')
              }}
            >
              Salvar
            </button>
          </div>
        </div>
      </Modal>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleUserNew}
              className="bg-amber-500 text-white px-3 py-2 rounded-md text-sm font-semibold"
            >
              Novo
            </button>
            <button
              onClick={handleUserEdit}
              className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-700"
            >
              Editar
            </button>
            <button
              onClick={handleUserDuplicate}
              className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-700"
            >
              Duplicar
            </button>
            <button
              onClick={handleUserDelete}
              className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-700"
            >
              Excluir
            </button>
            <button
              onClick={handleUserExport}
              className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-700"
            >
              Exportar
            </button>
          </div>
          <div className="flex-1 min-w-[240px]">
            <input
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
              placeholder="Buscar usuarios"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-hidden border border-slate-200 rounded-lg">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="py-3 px-3 text-left w-10">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-amber-500"
                    onChange={toggleUserAll}
                    checked={filteredUsers.length > 0 && filteredUsers.every((u) => userSelected.includes(u.id))}
                  />
                </th>
                <th className="py-3 px-3 text-left w-12">Cod</th>
                <th className="py-3 px-3 text-left">Nome</th>
                <th className="py-3 px-3 text-left">E-mail</th>
                <th className="py-3 px-3 text-left">Login</th>
                <th className="py-3 px-3 text-left">Palavras-chave</th>
                <th className="py-3 px-3 text-left">Permissao</th>
                <th className="py-3 px-3 text-left w-16">Acesso?</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u, idx) => (
                <tr key={u.id} className="border-t border-slate-200">
                  <td className="py-3 px-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-amber-500"
                      checked={userSelected.includes(u.id)}
                      onChange={() => toggleUser(u.id)}
                    />
                  </td>
                  <td className="py-3 px-3 text-slate-700">{idx + 1}</td>
                  <td className="py-3 px-3 text-slate-700">{u.nome}</td>
                  <td className="py-3 px-3 text-slate-700">{u.email}</td>
                  <td className="py-3 px-3 text-slate-700">{u.login}</td>
                  <td className="py-3 px-3 text-slate-700">{u.palavra || '-'}</td>
                  <td className="py-3 px-3 text-slate-700">{u.permissao}</td>
                  <td className="py-3 px-3 text-slate-700">{u.acesso}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-700">
                <td className="py-3 px-3" colSpan={7}>
                  TOTAL LISTADO ({filteredUsers.length} itens)
                </td>
                <td className="py-3 px-3 text-left">{filteredUsers.length > 0 ? '...' : '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
function SectionCard({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#0f3047]">{title}</h2>
          {description && <p className="text-sm text-slate-600">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  )
}
function ConfigPlano() {
  type PlanoTab = 'receitas' | 'despesas' | 'dre'
  const [planoTab, setPlanoTab] = useState<PlanoTab>('receitas')

  const receitas = [
    { title: 'Rendimentos financeiros', group: 'Receitas diversas' },
    { title: 'Outras receitas', group: 'Receitas diversas' },
    { title: 'Venda de produtos/servicos', group: 'Receitas de vendas' },
  ]

  const despesas = [
    { title: 'Comissoes', group: 'Despesas de vendas' },
    { title: 'Embalagens', group: 'Despesas de vendas' },
    { title: 'Fretes', group: 'Despesas de vendas' },
    { title: 'Outras despesas', group: 'Despesas de vendas' },
    { title: 'Devolucoes de vendas', group: 'Deducoes' },
    { title: 'Tarifas bancarias', group: 'Despesas diversas' },
    { title: 'Juros e multas', group: 'Despesas diversas' },
    { title: 'Outras despesas', group: 'Despesas diversas' },
    { title: 'Automovel', group: 'Investimentos' },
    { title: 'Computador', group: 'Investimentos' },
    { title: 'Moveis', group: 'Investimentos' },
    { title: 'Outros investimentos', group: 'Investimentos' },
    { title: 'Compras (estoque)', group: 'Compras (estoque)' },
    { title: 'Frete fora da nota', group: 'Compras (estoque)' },
    { title: 'ICMS ST fora da nota', group: 'Compras (estoque)' },
    { title: 'Despesas fora da nota', group: 'Compras (estoque)' },
  ]

  const dre = [
    { title: 'Receitas brutas', group: 'DRE' },
    { title: 'Deducoes', group: 'DRE' },
    { title: 'Receita liquida', group: 'DRE' },
    { title: 'Custos', group: 'DRE' },
    { title: 'Despesas operacionais', group: 'DRE' },
    { title: 'Lucro operacional', group: 'DRE' },
  ]

  const grouped = (items: { title: string; group: string }[]) => {
    const map = new Map<string, string[]>()
    items.forEach((i) => {
      if (!map.has(i.group)) map.set(i.group, [])
      map.get(i.group)!.push(i.title)
    })
    return Array.from(map.entries()).map(([group, rows]) => ({ group, rows }))
  }

  const renderList = (items: { title: string; group: string }[]) => (
    <div className="space-y-6">
      {grouped(items).map((section) => (
        <div key={section.group} className="space-y-2">
          <div className="text-sm font-semibold text-[#0f3047] flex items-center gap-2">
            <span>{section.group}</span>
            <span className="text-xs text-slate-500">Grupo do DRE</span>
          </div>
          <div className="space-y-2">
            {section.rows.map((row) => (
              <div
                key={row}
                className="flex items-center gap-3 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700"
              >
                <span className="text-xs text-slate-500">Mover</span>
                <span className="text-xs text-slate-500">Excluir</span>
                <span>{row}</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#0f3047] font-semibold">+</span>
              <input
                className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm"
                placeholder="Adicionar novo"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-4">
      <div className="flex items-center gap-2">
        {[
          { id: 'receitas', label: 'Configurar receitas' },
          { id: 'despesas', label: 'Configurar despesas' },
          { id: 'dre', label: 'Configurar DRE' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setPlanoTab(tab.id as PlanoTab)}
            className={`px-3 py-2 rounded-md text-sm font-semibold border transition ${
              planoTab === tab.id
                ? 'bg-amber-100 border-amber-300 text-[#0f3047]'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
        <div className="text-sm text-slate-600">Configure o plano de contas.</div>
        {planoTab === 'receitas' && renderList(receitas)}
        {planoTab === 'despesas' && renderList(despesas)}
        {planoTab === 'dre' && renderList(dre)}
      </div>
    </div>
  )
}
function RelatoriosPage() {
  const [reportSearch, setReportSearch] = useState('')
  const [reportSelected, setReportSelected] = useState<string[]>([])
  const [reportToast, setReportToast] = useState<string | null>(null)
  const reportGroups = [
    {
      title: 'Financeiro',
      tone: 'bg-green-100 border-green-300 text-green-900',
      items: [
        'Extrato financeiro',
        'Fluxo de caixa periodico',
        'Fluxo financeiro',
        'DRE',
        'Fluxo futuro',
        'Lancamentos cancelados',
        'Financeiro por vendedor',
        'Financeiro por formas pgto',
        'Comissoes por financeiro',
        'Conciliacao bancaria',
        'Boletos',
        'Recebimentos por cliente',
      ],
    },
    {
      title: 'Vendas',
      tone: 'bg-teal-100 border-teal-300 text-teal-900',
      items: [
        'Vendas detalhadas',
        'Detalhes dos produtos vendidos',
        'Comissoes de vendas',
        'ABC de produtos vendidos',
        'ABC de vendas por cliente',
        'ABC de vendas por vendedor',
        'Vendas por tipo de documento',
        'Vendas por categoria/NCM',
        'Resumo de vendas',
      ],
    },
    {
      title: 'Compras',
      tone: 'bg-sky-100 border-sky-300 text-sky-900',
      items: [
        'Compras detalhadas',
        'Sugestao de compra',
        'Detalhes dos produtos comprados',
        'ABC de produtos comprados',
      ],
    },
    {
      title: 'Produtos',
      tone: 'bg-emerald-100 border-emerald-300 text-emerald-900',
      items: [
        'Estoque minimo',
        'Estoque em data especifica',
        'Historico por produto',
        'Movimentacao de um produto',
        'Produtos por fornecedor',
        'Produtos sem vendas',
        'Ajuste de estoque',
        'Movimentacao de estoque',
      ],
    },
    {
      title: 'Contatos',
      tone: 'bg-blue-100 border-blue-300 text-blue-900',
      items: [
        'Historico de um contato',
        'Personalizado de contatos',
        'Comemoracoes do mes',
        'Inatividade de clientes',
        'Contatos duplicados',
      ],
    },
  ]

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    reportGroups.reduce((acc, g) => ({ ...acc, [g.title]: true }), {} as Record<string, boolean>)
  )

  const flatReports = reportGroups.flatMap((group) =>
    group.items.map((item) => ({
      id: `${group.title}-${item}`,
      nome: item,
      grupo: group.title,
    })),
  )

  const filteredReports = flatReports.filter((r) => {
    const term = reportSearch.trim().toLowerCase()
    if (!term) return true
    return [r.nome, r.grupo].join(' ').toLowerCase().includes(term)
  })

  const toggleReport = (id: string) => {
    setReportSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleReportAll = () => {
    if (filteredReports.length === 0) return
    const ids = filteredReports.map((r) => r.id)
    const all = ids.every((id) => reportSelected.includes(id))
    setReportSelected(all ? [] : ids)
  }

  const handleReportExport = () => {
    if (filteredReports.length === 0) {
      setReportToast('Nada para exportar.')
      return
    }
    const header = ['Grupo', 'Relatorio']
    const rows = filteredReports.map((r) => [r.grupo, r.nome])
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'relatorios.csv'
    a.click()
    URL.revokeObjectURL(url)
    setReportToast('Exportado com sucesso')
  }

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }))
  }

  return (
    <section className="space-y-4">
      <Toast message={reportToast} onClose={() => setReportToast(null)} />
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <input
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700"
            placeholder="Buscar relatorio"
            value={reportSearch}
            onChange={(e) => setReportSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleReportAll}
            className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 bg-white hover:bg-slate-50"
          >
            {filteredReports.length > 0 && reportSelected.length === filteredReports.length ? 'Limpar selecao' : 'Selecionar todos'}
          </button>
          <button
            onClick={handleReportExport}
            className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 bg-white hover:bg-slate-50"
          >
            Exportar
          </button>
        </div>
        <span className="text-sm text-slate-500">Escolha uma categoria para ver os relatorios disponiveis.</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {reportGroups.map((group) => (
          <div key={group.title} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <button
              onClick={() => toggleGroup(group.title)}
              className={`w-full flex items-center justify-between px-4 py-3 border-b font-semibold text-left ${group.tone}`}
            >
              <span>{group.title}</span>
              <span className="text-sm">{openGroups[group.title] ? '-' : '+'}</span>
            </button>
            {openGroups[group.title] && (
              <ul className="divide-y divide-slate-100">
                {group.items.map((item) => (
                  <li key={item} className="px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-emerald-600"
                        checked={reportSelected.includes(`${group.title}-${item}`)}
                        onChange={() => toggleReport(`${group.title}-${item}`)}
                      />
                      <span>{item}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
