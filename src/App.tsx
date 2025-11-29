import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pie, PieChart, ResponsiveContainer, Cell, LineChart, Line, XAxis, Tooltip } from 'recharts'
import { useFinanceStore, type FinanceEntry } from './financeStore'
import { useLocalCrud } from './store'
import { ReportsPanel } from './components/ReportsPanel'

const pieColors = ['#0f3047', '#f5a524', '#2fbf71']

const shortcuts = ['Nova venda', 'Nova compra', 'Novo cliente', 'Novo produto', 'Cadastrar conta']

type OnboardingStep = { id: 'config' | 'contatos' | 'produtos' | 'movimentos' | 'financeiro'; label: string; done: boolean; detail: string }
type DashboardAlert = { id: string; text: string; tone: 'warn' | 'info' }
type PieEntry = { name: string; value: number }

type ProductItem = {
  id: string
  nome: string
  categoria: string
  preco: number
  estoque: number
  estoqueMinimo?: number
  palavras?: string
  tipo: 'produtos' | 'servicos' | 'ajuste'
  contato?: string
  observacoes?: string
  data?: string
  documentos?: string[]
  camposExtras?: string
  movimento?: { data: string; tipo: 'ajuste' | 'venda' | 'compra'; quantidade: number }[]
  produtoId?: string // usado em ajustes
}

const produtosSeed: ProductItem[] = [
  { id: 'P001', nome: 'Notebook Pro', categoria: 'Eletronicos', preco: 5200, estoque: 8, estoqueMinimo: 2, palavras: 'notebook', tipo: 'produtos', documentos: [], camposExtras: '' },
  { id: 'P002', nome: 'Mouse', categoria: 'Acessorios', preco: 80, estoque: 120, estoqueMinimo: 20, palavras: 'periferico', tipo: 'produtos', documentos: [], camposExtras: '' },
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
]

type FinanceTab = 'recebimentos' | 'pagamentos' | 'recibos'
type SalesTab = 'vendas' | 'devolucoes'
type PurchaseTab = 'compras'
type ContactTab = 'clientes' | 'fornecedores' | 'transportadoras'
type ProductTab = 'produtos' | 'servicos' | 'ajuste'
type PurchaseItem = { produtoId: string; quantidade: number; valor: number }

type PurchaseRecord = {
  id: string
  fornecedor: string
  nota: string
  data: string
  situacao?: 'Pendente' | 'Concluida' | 'Rascunho'
  itens: PurchaseItem[]
  total: number
  registro?: PurchaseTab
}

type SaleItem = { produtoId: string; quantidade: number; valor: number }

type SaleRecord = {
  id: string
  cliente: string
  vendedor: string
  data: string
  tipo: string
  registro?: SalesTab
  itens: SaleItem[]
  total: number
  situacao?: 'Pendente' | 'Concluida' | 'Rascunho'
}

type SaleForm = {
  cliente: string
  vendedor: string
  data: string
  tipo: string
  itens: SaleItem[]
  total: number
  situacao: SaleRecord['situacao']
}

type PurchaseForm = {
  fornecedor: string
  nota: string
  data: string
  situacao: PurchaseRecord['situacao']
  itens: PurchaseItem[]
  total: number
}

const sampleSales: SaleRecord[] = [
  {
    id: 'V001',
    cliente: 'Loja Centro',
    vendedor: 'Carlos',
    data: '2025-11-05',
    tipo: 'Venda',
    registro: 'vendas',
    total: 1520.5,
    itens: [{ produtoId: 'P001', quantidade: 1, valor: 1520.5 }],
  },
  {
    id: 'V002',
    cliente: 'ACME',
    vendedor: 'Ana',
    data: '2025-11-12',
    tipo: 'Venda',
    registro: 'vendas',
    total: 820.0,
    itens: [{ produtoId: 'P002', quantidade: 2, valor: 410 }],
  },
  {
    id: 'D001',
    cliente: 'Cliente Beta',
    vendedor: 'Carlos',
    data: '2025-11-18',
    tipo: 'Devolucao',
    registro: 'devolucoes',
    total: 210.0,
    itens: [{ produtoId: 'P002', quantidade: 1, valor: 210 }],
  },
]

const samplePurchases: PurchaseRecord[] = [
  {
    id: 'C001',
    fornecedor: 'Fornecedor XPTO',
    nota: 'NF 123',
    data: '2025-11-03',
    situacao: 'Pendente',
    registro: 'compras',
    total: 450.0,
    itens: [{ produtoId: 'P001', quantidade: 1, valor: 450 }],
  },
  {
    id: 'C002',
    fornecedor: 'Loja do Joao',
    nota: 'NF 124',
    data: '2025-11-14',
    situacao: 'Concluida',
    registro: 'compras',
    total: 980.0,
    itens: [{ produtoId: 'P002', quantidade: 2, valor: 410 }],
  },
]

type InventoryRecord = {
  id: string
  produtoId: string
  produtoNome: string
  data: string
  contado: number
  registrado: number
  diferenca: number
  observacoes?: string
}
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
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="bg-slate-900 text-white rounded-lg shadow-xl px-5 py-3 flex items-center space-x-4">
        <span>{message}</span>
        <button className="text-white/80 hover:text-white" onClick={onClose}>
          Fechar
        </button>
      </div>
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
  const purchaseTab: PurchaseTab = 'compras'
  const [contactTab, setContactTab] = useState<ContactTab>('clientes')
  const [productTab, setProductTab] = useState<ProductTab>('produtos')
  const [configTab, setConfigTab] = useState<ConfigTab>('geral')
  const [shortcutNewSale, setShortcutNewSale] = useState(0)
  const [shortcutNewPurchase, setShortcutNewPurchase] = useState(0)
  const [shortcutNewContact, setShortcutNewContact] = useState(0)
  const [shortcutNewProduct, setShortcutNewProduct] = useState(0)
  const { entries, addEntry, removeEntry, updateEntry, summary } = useFinanceStore()
  const financeRefSale = (id: string) => `sale:${id}`
  const financeRefPurchase = (id: string) => `purchase:${id}`
  const upsertFinanceFromSale = (sale: SaleRecord) => {
    const ref = financeRefSale(sale.id)
    const existing = entries.find((e) => e.referente === ref)
    const payload: Omit<FinanceEntry, 'id'> = {
      tipo: 'recebimento',
      descricao: `Venda ${sale.id}`,
      contato: sale.cliente,
      conta: 'Caixa interno',
      data: sale.data,
      situacao: 'Pendente',
      valor: sale.total,
      referente: ref,
    }
    if (existing) {
      updateEntry(existing.id, payload)
    } else {
      addEntry(payload)
    }
  }
  const upsertFinanceFromPurchase = (purchase: PurchaseRecord) => {
    const ref = financeRefPurchase(purchase.id)
    const existing = entries.find((e) => e.referente === ref)
    const payload: Omit<FinanceEntry, 'id'> = {
      tipo: 'pagamento',
      descricao: `Compra ${purchase.id}`,
      contato: purchase.fornecedor,
      conta: 'Caixa interno',
      data: purchase.data,
      situacao: 'Pendente',
      valor: purchase.total,
      referente: ref,
    }
    if (existing) {
      updateEntry(existing.id, payload)
    } else {
      addEntry(payload)
    }
  }

  const handleReportNavigation = useCallback(
    (group: string, name: string) => {
      const lower = name.toLowerCase()
      if (lower.includes('venda')) {
        setActivePage('Vendas')
        setSalesTab('vendas')
        setShortcutNewSale((n) => n + 1)
        return
      }
      if (lower.includes('compra')) {
        setActivePage('Compras')
        setShortcutNewPurchase((n) => n + 1)
        return
      }
      if (lower.includes('financeiro')) {
        setActivePage('Financeiro')
        setFinanceTab('recebimentos')
        return
      }
      if (group === 'Produtos') {
        setActivePage('Produtos')
        setProductTab('produtos')
        return
      }
      if (group === 'Contatos') {
        setActivePage('Clientes')
      }
    },
    [setActivePage, setFinanceTab, setProductTab, setSalesTab, setShortcutNewSale, setShortcutNewPurchase],
  )

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
    const ensureSeed = (key: string, data: unknown) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(data))
      }
    }
    ensureSeed('erp.contatos', sampleContacts)
    ensureSeed('erp.produtos', produtosSeed)
    ensureSeed('erp.sales', sampleSales)
    ensureSeed('erp.compras', samplePurchases)
    ensureSeed('erp.config.geral', { empresa: 'ERP Wolkan', cnpj: '12.345.678/0001-90' })
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

  const readCount = (key: string) => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed.length
      }
    } catch {
      return 0
    }
    return 0
  }

  const monthFinance = useMemo(() => {
    const today = new Date()
    const month = today.getMonth()
    const year = today.getFullYear()
    const entriesMonth = entries.filter((e) => {
      const d = new Date(e.data)
      return !Number.isNaN(d.getTime()) && d.getMonth() === month && d.getFullYear() === year
    })
    const sum = (tipo: FinanceEntry['tipo']) => entriesMonth.filter((e) => e.tipo === tipo).reduce((acc, e) => acc + e.valor, 0)
    const pend = (tipo: FinanceEntry['tipo']) =>
      entriesMonth.filter((e) => e.tipo === tipo && e.situacao === 'Pendente').length
    return {
      receita: sum('recebimento'),
      custos: sum('pagamento'),
      pendReceber: pend('recebimento'),
      pendPagar: pend('pagamento'),
    }
  }, [entries])

  const kpis: Kpi[] = [
    {
      title: 'Faturamento do mes',
      value: formatMoney(monthFinance.receita),
      trend: `${monthFinance.pendReceber} pendentes`,
      tone: 'success',
      id: 'receita',
    },
    {
      title: 'Custos do mes',
      value: formatMoney(monthFinance.custos),
      trend: `${monthFinance.pendPagar} pendentes`,
      tone: 'danger',
      id: 'custos',
    },
    {
      title: 'Saldo do mes',
      value: formatMoney(monthFinance.receita - monthFinance.custos),
      trend: 'Mes atual',
      tone: monthFinance.receita - monthFinance.custos >= 0 ? 'success' : 'danger',
      id: 'saldo',
    },
    {
      title: 'Fluxo prox. 7 dias',
      value: formatMoney(summary.receberSemana - summary.pagarSemana),
      trend: `${formatMoney(summary.receberSemana)} in / ${formatMoney(summary.pagarSemana)} out`,
      tone: 'neutral',
      id: 'fluxo',
    },
  ]

  const proximosFinanceiro = useMemo(() => {
    const today = new Date()
    const limit = new Date()
    limit.setDate(today.getDate() + 7)
    return entries
      .filter((e) => {
        const d = new Date(e.data)
        return !Number.isNaN(d.getTime()) && d >= today && d <= limit
      })
      .sort((a, b) => a.data.localeCompare(b.data))
  }, [entries])

  const dailyNet = useMemo(() => {
    const today = new Date()
    const month = today.getMonth()
    const year = today.getFullYear()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const base = Array.from({ length: daysInMonth }, (_, idx) => ({
      dia: String(idx + 1).padStart(2, '0'),
      valor: 0,
    }))
    const monthEntries = entries.filter((e) => {
      const d = new Date(e.data)
      return !Number.isNaN(d.getTime()) && d.getMonth() === month && d.getFullYear() === year
    })
    monthEntries.forEach((e) => {
      const d = new Date(e.data)
      const dayIdx = d.getDate() - 1
      const delta = e.tipo === 'recebimento' ? e.valor : e.tipo === 'pagamento' ? -e.valor : 0
      base[dayIdx].valor += delta
    })
    return base
  }, [entries])

  const onboarding = useMemo(() => {
    const clientes = readCount('erp.contatos')
    const produtosCount = readCount('erp.produtos')
    const vendasCount = readCount('erp.sales')
    const comprasCount = readCount('erp.compras')
    const financeiros = entries.length
    const configGeral = Boolean(localStorage.getItem('erp.config.geral'))
    const steps: OnboardingStep[] = [
      {
        id: 'config',
        label: 'Configurar dados da empresa',
        done: configGeral,
        detail: configGeral ? 'Cadastro da empresa preenchido' : 'Falta preencher Configuracoes > Geral',
      },
      {
        id: 'contatos',
        label: 'Cadastrar clientes/fornecedores',
        done: clientes > 0,
        detail: clientes > 0 ? `${clientes} contatos cadastrados` : 'Falta cadastrar contatos',
      },
      {
        id: 'produtos',
        label: 'Cadastrar produtos/servicos',
        done: produtosCount > 0,
        detail: produtosCount > 0 ? `${produtosCount} itens no catalogo` : 'Falta cadastrar produtos/servicos',
      },
      {
        id: 'movimentos',
        label: 'Registrar vendas ou compras',
        done: vendasCount + comprasCount > 0,
        detail:
          vendasCount + comprasCount > 0
            ? `${vendasCount} vendas, ${comprasCount} compras`
            : 'Falta registrar uma venda ou compra',
      },
      {
        id: 'financeiro',
        label: 'Lancar financeiro',
        done: financeiros > 0,
        detail: financeiros > 0 ? `${financeiros} lancamentos` : 'Falta lancar recebimentos/pagamentos',
      },
    ]
    const percent = (steps.filter((s) => s.done).length / steps.length) * 100
    return { steps, percent }
  }, [entries])

  const alerts: DashboardAlert[] = useMemo(() => {
    const list: DashboardAlert[] = []
    const pendReceber = entries.filter((e) => e.tipo === 'recebimento' && e.situacao !== 'Recebido').length
    const pendPagar = entries.filter((e) => e.tipo === 'pagamento' && e.situacao !== 'Pago').length
    if (pendReceber > 0) list.push({ id: 'receber', text: `${pendReceber} recebimentos pendentes`, tone: 'warn' })
    if (pendPagar > 0) list.push({ id: 'pagar', text: `${pendPagar} pagamentos pendentes`, tone: 'warn' })
    if (entries.length === 0) {
      list.push({ id: 'finance-zero', text: 'Nenhum lancamento financeiro registrado', tone: 'info' })
    }
    return list
  }, [entries])

  const loadArray = <T,>(key: string, fallback: T[]) => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed as T[]
      }
    } catch {
      return fallback
    }
    return fallback
  }

  const pieDataDynamic: PieEntry[] = useMemo(() => {
    const today = new Date()
    const month = today.getMonth()
    const year = today.getFullYear()
    const vendasStorage = loadArray<SaleRecord>('erp.sales', [])
    const produtosStorage = loadArray<ProductItem>('erp.produtos', produtosSeed)

    const vendasMes = vendasStorage.filter((v) => {
      const d = new Date(v.data)
      return !Number.isNaN(d.getTime()) && d.getMonth() === month && d.getFullYear() === year && (v.registro || 'vendas') === 'vendas'
    })

    const map = new Map<string, number>()
    vendasMes.forEach((v) => {
      v.itens.forEach((item) => {
        const prod = produtosStorage.find((p) => p.id === item.produtoId)
        const cat = prod?.categoria || 'Outros'
        const valor = item.quantidade * item.valor
        map.set(cat, (map.get(cat) || 0) + valor)
      })
    })

    const entriesPie = Array.from(map.entries()).map(([name, value]) => ({ name, value }))
    return entriesPie.length > 0 ? entriesPie : [{ name: 'Sem vendas no mes', value: 1 }]
  }, [])

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="h-16 bg-[#0f3047] text-white flex items-center px-6 gap-4 shadow-md">
        <div className="font-bold tracking-tight text-lg">ERP Wolkan</div>
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
        </aside>

        <main className="p-6 space-y-6">
          {activePage === 'Dashboard' && (
            <DashboardPage
              kpis={kpis}
              resultado={{
                receita: monthFinance.receita,
                custos: monthFinance.custos,
                saldo: monthFinance.receita - monthFinance.custos,
                pendReceber: monthFinance.pendReceber,
                pendPagar: monthFinance.pendPagar,
              }}
              proximosFinanceiro={proximosFinanceiro}
              pieData={pieDataDynamic}
              onVerFinanceiro={() => {
                setActivePage('Financeiro')
                setFinanceTab('recebimentos')
              }}
              onKpiClick={(id) => {
                setActivePage('Financeiro')
                if (id === 'custos') {
                  setFinanceTab('pagamentos')
                } else {
                  setFinanceTab('recebimentos')
                }
              }}
              onShortcut={(label) => {
                const lower = label.toLowerCase()
                if (lower.includes('venda')) {
                  setActivePage('Vendas')
                  setSalesTab('vendas')
                  setShortcutNewSale((n) => n + 1)
                } else if (lower.includes('compra')) {
                  setActivePage('Compras')
                  setShortcutNewPurchase((n) => n + 1)
                } else if (lower.includes('cliente')) {
                  setActivePage('Clientes')
                  setContactTab('clientes')
                  setShortcutNewContact((n) => n + 1)
                } else if (lower.includes('produto')) {
                  setActivePage('Produtos')
                  setProductTab('produtos')
                  setShortcutNewProduct((n) => n + 1)
                } else if (lower.includes('conta')) {
                  setActivePage('Configuracoes')
                  setConfigTab('caixa')
                }
              }}
              onboarding={onboarding}
              onGoConfig={() => {
                setActivePage('Configuracoes')
                setConfigTab('geral')
              }}
              onOnboardingClick={(id) => {
                if (id === 'config') {
                  setActivePage('Configuracoes')
                  setConfigTab('geral')
                } else if (id === 'contatos') {
                  setActivePage('Clientes')
                } else if (id === 'produtos') {
                  setActivePage('Produtos')
                  setProductTab('produtos')
                } else if (id === 'movimentos') {
                  setActivePage('Vendas')
                } else if (id === 'financeiro') {
                  setActivePage('Financeiro')
                  setFinanceTab('recebimentos')
                }
              }}
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
              removeEntry={removeEntry}
              updateEntry={updateEntry}
              formatMoney={formatMoney}
            />
          )}
          {activePage === 'Vendas' && (
            <VendasPage
              activeTab={salesTab}
              setActiveTab={setSalesTab}
              onFinanceUpsertSale={upsertFinanceFromSale}
              openNewSignal={shortcutNewSale}
            />
          )}
          {activePage === 'Compras' && (
            <ComprasPage
              activeTab={purchaseTab}
              onFinanceUpsertPurchase={upsertFinanceFromPurchase}
              onFinanceRemovePurchases={(ids) => {
                ids.forEach((id) => {
                  const ref = financeRefPurchase(id)
                  const entry = entries.find((e) => e.referente === ref)
                  if (entry) removeEntry(entry.id)
                })
              }}
              openNewSignal={shortcutNewPurchase}
            />
          )}
          {activePage === 'Clientes' && (
            <ClientesPage activeTab={contactTab} setActiveTab={setContactTab} openNewSignal={shortcutNewContact} />
          )}
          {activePage === 'Produtos' && (
            <ProdutosPage activeTab={productTab} setActiveTab={setProductTab} openNewSignal={shortcutNewProduct} />
          )}
          {activePage === 'Relatorios' && <ReportsPanel onNavigate={handleReportNavigation} />}
          {activePage === 'Configuracoes' && <ConfiguracoesPage activeTab={configTab} setActiveTab={setConfigTab} />}
        </main>
      </div>
    </div>
  )
}

type Kpi = { id: 'receita' | 'custos' | 'saldo' | 'fluxo'; title: string; value: string; trend: string; tone: 'success' | 'danger' | 'neutral' }

type DashboardProps = {
  kpis: Kpi[]
  resultado: { receita: number; custos: number; saldo: number; pendReceber: number; pendPagar: number }
  proximosFinanceiro: FinanceEntry[]
  pieData: PieEntry[]
  onVerFinanceiro: () => void
  onKpiClick: (id: Kpi['id']) => void
  onShortcut: (label: string) => void
  onboarding: { steps: OnboardingStep[]; percent: number }
  onGoConfig: () => void
  onOnboardingClick: (id: OnboardingStep['id']) => void
  alerts: DashboardAlert[]
  dailyNet: { dia: string; valor: number }[]
  formatMoney: (n: number) => string
}

function DashboardPage({
  kpis,
  resultado,
  proximosFinanceiro,
  pieData,
  onVerFinanceiro,
  onKpiClick,
  onShortcut,
  onboarding,
  onGoConfig,
  onOnboardingClick,
  alerts,
  dailyNet,
  formatMoney,
}: DashboardProps) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
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
            <button
              className="mt-3 text-sm text-[#0f3047] font-semibold hover:underline"
              onClick={() => onKpiClick(kpi.id)}
            >
              Ver detalhes
            </button>
          </div>
        ))}
      </section>

      {onboarding.percent < 100 && (
        <section className="grid gap-4 xl:grid-cols-12">
          <div className="xl:col-span-8 bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#0f3047]">Onboarding</h2>
                <p className="text-sm text-slate-500">Complete os passos para usar todo o ERP.</p>
              </div>
            <div className="text-sm text-slate-500">{Math.round(onboarding.percent)}% completo</div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3">
            <div
              className="h-2 bg-amber-400 rounded-full transition-all"
              style={{ width: `${onboarding.percent}%` }}
            />
          </div>

            <div className="mt-4 grid md:grid-cols-2 gap-3 text-sm">
              {onboarding.steps.map((step) => (
                <div
                  key={step.label}
                  className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 ${
                  step.done ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-slate-800 font-semibold">{step.label}</span>
                  <span className="text-slate-500 text-xs">{step.detail}</span>
                </div>
                <div className="flex items-center">
                  {step.done ? (
                    <span className="text-xs font-semibold text-green-700 px-3 py-1 rounded-full bg-green-50 border border-green-200">
                      Concluido
                    </span>
                  ) : (
                    <button
                      className="text-xs font-semibold text-amber-700 px-3 py-1 rounded-full border border-amber-200 bg-amber-50 hover:bg-amber-100 transition"
                      onClick={() => onOnboardingClick(step.id)}
                    >
                      Pendente
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col md:flex-row md:items-start md:justify-end gap-3 text-sm">
            <button
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0f3047] hover:underline md:self-start"
              onClick={onGoConfig}
            >
              Ir para Configuracoes
            </button>
          </div>
          </div>

          <div className="xl:col-span-4 bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-[#0f3047]">Vendas por categoria</h2>
              <span className="text-sm text-slate-500">Mes atual</span>
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
                style={{ backgroundColor: `${pieColors[i % pieColors.length]}22`, color: pieColors[i % pieColors.length] }}
              >
                {d.name}
              </span>
            ))}
          </div>
          </div>
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8 bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-[#0f3047]">Avisos</h2>
            <span className="text-xs text-slate-500">{alerts.length === 0 ? 'Tudo certo' : `${alerts.length} pendente(s)`}</span>
          </div>
          <div className="space-y-3">
            {alerts.length === 0 && (
              <div className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                Nenhum aviso no momento.
              </div>
            )}
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                  alert.tone === 'warn'
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <span className="text-sm">{alert.text}</span>
                <button
                  className="text-xs font-semibold text-[#0f3047] hover:underline"
                  onClick={onVerFinanceiro}
                  title="Ir para o Financeiro"
                >
                  Ver finance
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="xl:col-span-4 bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-[#0f3047]">Resultado do mes</h2>
            <span className="text-xs text-slate-500">Mes atual</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Receita bruta</span>
              <span className="font-semibold text-green-700">{formatMoney(resultado.receita)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Custos</span>
              <span className="font-semibold text-red-700">- {formatMoney(resultado.custos)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Saldo</span>
              <span className={`font-semibold ${resultado.saldo >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatMoney(resultado.saldo)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Pend. receber</span>
              <span className="font-semibold text-amber-700">{resultado.pendReceber}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Pend. pagar</span>
              <span className="font-semibold text-amber-700">{resultado.pendPagar}</span>
            </div>
            <button
              className="mt-2 w-full text-sm font-semibold text-[#0f3047] hover:underline text-left"
              onClick={onVerFinanceiro}
            >
              Ver Financeiro
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 xl:col-span-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-[#0f3047]">Fluxo diario</h2>
            <span className="text-xs text-slate-500">Mes atual</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={dailyNet}>
                <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => formatMoney(v)} />
                <Line type="monotone" dataKey="valor" stroke="#0f3047" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 xl:col-span-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-[#0f3047]">Proximos 7 dias</h2>
            <span className="text-xs text-slate-500">
              {proximosFinanceiro.length === 0 ? 'Sem vencimentos' : `${proximosFinanceiro.length} itens`}
            </span>
          </div>
          <div className="space-y-2 text-sm">
            {proximosFinanceiro.length === 0 && (
              <div className="text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                Nenhum vencimento nos proximos 7 dias.
              </div>
            )}
            {proximosFinanceiro.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2 bg-slate-50"
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-800">{p.descricao}</span>
                  <span className="text-xs text-slate-500">
                    {p.data} · {p.tipo === 'recebimento' ? 'Receber' : 'Pagar'}
                  </span>
                </div>
                <span className={p.tipo === 'recebimento' ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
                  {formatMoney(p.valor)}
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
                onClick={() => onShortcut(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-[#0f3047] mb-3">Proximos vencimentos</h2>
          <div className="text-sm text-slate-600">
            {proximosFinanceiro.length === 0 ? 'Nenhum vencimento nos proximos 7 dias.' : ''}
          </div>
          <div className="space-y-2 mt-2 text-sm">
            {proximosFinanceiro.slice(0, 3).map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <span className="text-slate-700">
                  {p.descricao} · {p.data}
                </span>
                <span className={p.tipo === 'recebimento' ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
                  {formatMoney(p.valor)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function FinanceiroPage({
  activeTab,
  setActiveTab,
  entries,
  addEntry,
  removeEntry,
  updateEntry,
  formatMoney,
}: {
  activeTab: FinanceTab
  setActiveTab: (t: FinanceTab) => void
  entries: FinanceEntry[]
  addEntry: (data: Omit<FinanceEntry, 'id'>) => void
  removeEntry: (id: string) => void
  updateEntry: (id: string, data: Omit<FinanceEntry, 'id'>) => void
  formatMoney: (n: number) => string
}) {
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list')
  const [editId, setEditId] = useState<string | null>(null)
  const [financeSearch, setFinanceSearch] = useState('')
  const [financeMonth, setFinanceMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendente' | 'quitado'>('todos')
  const [dataInicial, setDataInicial] = useState('')
  const [dataFinal, setDataFinal] = useState('')
  const [contaFilter, setContaFilter] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
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
    conciliado: false,
    comprovante: '',
  })

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

    if (contaFilter && e.conta.toLowerCase().indexOf(contaFilter.toLowerCase()) === -1) return false
    if (categoriaFilter && e.referente && e.referente.toLowerCase().indexOf(categoriaFilter.toLowerCase()) === -1) return false

    if (dataInicial) {
      const ini = new Date(dataInicial)
      if (!isNaN(ini.getTime()) && entryDate < ini) return false
    }
    if (dataFinal) {
      const fim = new Date(dataFinal)
      if (!isNaN(fim.getTime()) && entryDate > fim) return false
    }

    const matchesTab =
      activeTab === 'recebimentos'
        ? e.tipo === 'recebimento'
        : activeTab === 'pagamentos'
        ? e.tipo === 'pagamento'
        : e.tipo === 'recibo'

    if (!matchesTab) return false
    if (statusFilter !== 'todos') {
      const quitado = e.situacao === 'Recebido' || e.situacao === 'Pago'
      if (statusFilter === 'pendente' && quitado) return false
      if (statusFilter === 'quitado' && !quitado) return false
    }
    if (!searchTerm) return true

    const haystack = [e.descricao, e.contato, e.referente, e.conta]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(searchTerm)
  })

  const total = filtered.reduce((acc, e) => acc + e.valor, 0)
  const allSelected = filtered.length > 0 && filtered.every((e) => selectedIds.includes(e.id))

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleSelectAll = () => {
    if (filtered.length === 0) return
    const ids = filtered.map((e) => e.id)
    const all = ids.every((id) => selectedIds.includes(id))
    setSelectedIds(all ? [] : ids)
  }

  const handleEdit = () => {
    if (selectedIds.length !== 1) {
      alert('Selecione apenas um registro para editar.')
      return
    }
    const current = entries.find((e) => e.id === selectedIds[0])
    if (!current) return
    setEditId(current.id)
    setNovo({
      descricao: current.descricao,
      contato: current.contato,
      conta: current.conta,
      data: current.data,
      valor: String(current.valor).replace('.', ','),
      situacao: (current.situacao as SaleForm['situacao']) ?? 'Concluida',
      referente: current.referente || '',
      cpfCnpj: '',
      vias: '1 via',
      quemEmite: 'Empresa',
      conciliado: current.conciliado || false,
      comprovante: current.comprovante || '',
    })
    setViewMode('form')
  }

  const markQuitado = () => {
    if (selectedIds.length === 0 || activeTab === 'recibos') return
    const situacao = activeTab === 'pagamentos' ? 'Pago' : 'Recebido'
    selectedIds.forEach((id) => {
      const current = entries.find((e) => e.id === id)
      if (!current) return
      updateEntry(id, { ...current, situacao })
    })
    setSelectedIds([])
  }

  const reabrir = () => {
    if (selectedIds.length === 0 || activeTab === 'recibos') return
    selectedIds.forEach((id) => {
      const current = entries.find((e) => e.id === id)
      if (!current) return
      updateEntry(id, { ...current, situacao: 'Pendente', conciliado: false })
    })
    setSelectedIds([])
  }

  const exportCsv = () => {
    if (filtered.length === 0) {
      alert('Nada para exportar.')
      return
    }
    const header = ['Descricao', 'Contato', 'Conta', 'Data', 'Situacao', 'Valor']
    const rows = filtered.map((e) => [
      e.descricao,
      e.contato,
      e.conta,
      e.data,
      e.situacao,
      e.valor.toString().replace('.', ','),
    ])
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `financeiro-${activeTab}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const removeSelected = () => {
    if (selectedIds.length === 0) return
    selectedIds.forEach((id) => removeEntry(id))
    setSelectedIds([])
  }

  const conciliar = () => {
    if (selectedIds.length === 0 || activeTab === 'recibos') return
    const situacao = activeTab === 'pagamentos' ? 'Pago' : 'Recebido'
    selectedIds.forEach((id) => {
      const current = entries.find((e) => e.id === id)
      if (!current) return
      updateEntry(id, { ...current, situacao, conciliado: true })
    })
    setSelectedIds([])
  }

  const exportPdf = () => {
    if (filtered.length === 0) {
      alert('Nada para exportar.')
      return
    }
    const win = window.open('', '_blank')
    if (!win) return
    const rows = filtered
      .map(
        (e, idx) =>
          `<tr><td>${idx + 1}</td><td>${e.descricao}</td><td>${e.contato}</td><td>${e.conta}</td><td>${e.data}</td><td>${e.situacao}</td><td style="text-align:right">${formatMoney(
            e.valor,
          )}</td></tr>`,
      )
      .join('')
    const html = `
      <html><head><title>Financeiro - ${activeTab}</title>
      <style>
      body{font-family:Arial, sans-serif; padding:16px;}
      table{width:100%; border-collapse:collapse;}
      th,td{border:1px solid #ccc; padding:6px; font-size:12px;}
      th{background:#f5f5f5;}
      </style></head>
      <body>
      <h3>Financeiro - ${activeTab}</h3>
      <table>
        <thead><tr><th>#</th><th>Descricao</th><th>Contato</th><th>Conta</th><th>Data</th><th>Situacao</th><th>Valor</th></tr></thead>
        <tbody>${rows}<tr><td colspan="6" style="text-align:right;font-weight:bold">Total</td><td style="text-align:right;font-weight:bold">${formatMoney(
          total,
        )}</td></tr></tbody>
      </table>
      </body></html>`
    win.document.write(html)
    win.document.close()
    win.focus()
    win.print()
  }

  const onSubmit = () => {
    if (!novo.descricao.trim() && activeTab !== 'recibos' && !novo.referente.trim()) return
    const valorNum = parseFloat(novo.valor.replace(',', '.')) || 0
    const payload: Omit<FinanceEntry, 'id'> = {
      tipo: activeTab === 'recebimentos' ? 'recebimento' : activeTab === 'pagamentos' ? 'pagamento' : 'recibo',
      descricao: activeTab === 'recibos' ? novo.referente || novo.descricao || 'Recibo' : novo.descricao,
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
      conciliado: novo.conciliado,
      comprovante: novo.comprovante,
    }
    if (editId) {
      updateEntry(editId, payload)
    } else {
      addEntry(payload)
    }
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
      conciliado: false,
      comprovante: '',
    })
    setEditId(null)
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
              onClick={() => {
                setEditId(null)
                setViewMode('form')
              }}
              style={{ backgroundColor: buttonPalette[activeTab].bg }}
              className="text-white text-sm font-semibold px-4 py-2 rounded-md transition shadow inline-flex items-center gap-2 hover:brightness-90"
            >
              <span>+</span>
              <span>Novo</span>
            </button>
            <button
              onClick={handleEdit}
              className="border border-slate-200 text-slate-700 text-sm px-3 py-2 rounded-md bg-white hover:bg-slate-50"
            >
              Editar
            </button>
            <button
              onClick={removeSelected}
              className="border border-slate-200 text-slate-700 text-sm px-3 py-2 rounded-md bg-white hover:bg-slate-50"
            >
              Excluir
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={markQuitado}
                disabled={selectedIds.length === 0 || activeTab === 'recibos'}
                className={`text-sm px-3 py-2 rounded-md border ${
                  selectedIds.length === 0 || activeTab === 'recibos'
                    ? 'bg-slate-100 text-slate-400 border-slate-200'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Marcar como {activeTab === 'pagamentos' ? 'Pago' : 'Recebido'}
              </button>
              <button
                onClick={reabrir}
                disabled={selectedIds.length === 0 || activeTab === 'recibos'}
                className={`text-sm px-3 py-2 rounded-md border ${
                  selectedIds.length === 0 || activeTab === 'recibos'
                    ? 'bg-slate-100 text-slate-400 border-slate-200'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Reabrir (pendente)
              </button>
              <button
                onClick={conciliar}
                disabled={selectedIds.length === 0 || activeTab === 'recibos'}
                className={`text-sm px-3 py-2 rounded-md border ${
                  selectedIds.length === 0 || activeTab === 'recibos'
                    ? 'bg-slate-100 text-slate-400 border-slate-200'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Conciliar
              </button>
            </div>
            <button
              onClick={exportCsv}
              className="border border-slate-200 text-slate-700 text-sm px-3 py-2 rounded-md bg-white hover:bg-slate-50"
            >
              Exportar CSV
            </button>
            <button
              onClick={exportPdf}
              className="border border-slate-200 text-slate-700 text-sm px-3 py-2 rounded-md bg-white hover:bg-slate-50"
            >
              Exportar PDF
            </button>
            <div className="ml-auto flex items-center gap-2">
              <input
                value={contaFilter}
                onChange={(e) => setContaFilter(e.target.value)}
                className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 w-32"
                placeholder="Conta"
              />
              <input
                value={categoriaFilter}
                onChange={(e) => setCategoriaFilter(e.target.value)}
                className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 w-32"
                placeholder="Categoria/ref."
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700"
              >
                <option value="todos">Todos</option>
                <option value="pendente">Pendentes</option>
                <option value="quitado">Recebidos/Pagos</option>
              </select>
              <input
                type="date"
                value={dataInicial}
                onChange={(e) => setDataInicial(e.target.value)}
                className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700"
                title="Data inicial"
              />
              <input
                type="date"
                value={dataFinal}
                onChange={(e) => setDataFinal(e.target.value)}
                className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700"
                title="Data final"
              />
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
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs text-slate-500">Comprovante (nome ou link)</label>
              <input
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                value={novo.comprovante}
                onChange={(e) => setNovo((p) => ({ ...p, comprovante: e.target.value }))}
                placeholder="Ex.: boleto.pdf ou URL"
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
              <th className="py-3 px-3 text-left w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 accent-amber-500"
                />
              </th>
              <th className="py-3 px-3 text-left w-20">Cod</th>
              <th className="py-3 px-3 text-left">Descricao</th>
              <th className="py-3 px-3 text-left">Contato</th>
              <th className="py-3 px-3 text-left w-32">Conta</th>
              <th className="py-3 px-3 text-left w-32">Data</th>
              <th className="py-3 px-3 text-left w-32">Situacao</th>
              <th className="py-3 px-3 text-right w-32">Valor</th>
              <th className="py-3 px-3 text-left w-24">Comprovante</th>
              <th className="py-3 px-3 text-right w-12"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr className="border-t border-slate-200">
                <td colSpan={9} className="py-4 px-3 text-center text-slate-500">
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              filtered.map((e, idx) => (
                <tr key={e.id} className="border-t border-slate-200">
                  <td className="py-3 px-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(e.id)}
                      onChange={() => toggleSelect(e.id)}
                      className="h-4 w-4 accent-amber-500"
                    />
                  </td>
                  <td className="py-3 px-3 text-slate-600">{idx + 1}</td>
                  <td className="py-3 px-3 text-slate-800">{e.descricao}</td>
                  <td className="py-3 px-3 text-slate-700">{e.contato}</td>
                  <td className="py-3 px-3 text-slate-700">{e.conta}</td>
                  <td className="py-3 px-3 text-slate-700">{e.data}</td>
                  <td className="py-3 px-3 text-slate-700">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        e.situacao === 'Pendente' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {e.situacao}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-slate-800">{formatMoney(e.valor)}</td>
                  <td className="py-3 px-3 text-slate-700 text-xs truncate max-w-[160px]">
                    {e.comprovante ? (
                      <a className="text-blue-700 hover:underline" href={e.comprovante} target="_blank" rel="noreferrer">
                        {e.comprovante}
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
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
            {filtered.length > 0 && (
              <tr className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-700">
                <td className="py-3 px-3" colSpan={7}>
                  TOTAL LISTADO ({filtered.length} itens)
                </td>
                <td className="py-3 px-3 text-right">{formatMoney(total)}</td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
    </section>
  )
}

function VendasPage({
  activeTab,
  setActiveTab,
  onFinanceUpsertSale,
  openNewSignal,
}: {
  activeTab: SalesTab
  setActiveTab: (t: SalesTab) => void
  onFinanceUpsertSale: (sale: SaleRecord) => void
  openNewSignal: number
}) {
  const [salesSearch, setSalesSearch] = useState('')
  const [salesMonth, setSalesMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [salesSelected, setSalesSelected] = useState<string[]>([])
  const [salesToast, setSalesToast] = useState<string | null>(null)
  const [salesModalOpen, setSalesModalOpen] = useState(false)
  const [salesModalMode, setSalesModalMode] = useState<'new' | 'edit'>('new')
  const buildSalesDefaultForm = useCallback((): SaleForm => ({
    cliente: '',
    vendedor: '',
    data: new Date().toISOString().slice(0, 10),
    tipo: activeTab === 'devolucoes' ? 'Devolucao' : 'Venda',
    itens: [{ produtoId: '', quantidade: 1, valor: 0 }],
    total: 0,
    situacao: 'Concluida' as SaleForm['situacao'],
  }), [activeTab])

  const [salesForm, setSalesForm] = useState<SaleForm>(buildSalesDefaultForm)
  const { items: salesItems, add: addSale, update: updateSale, remove: removeSale } = useLocalCrud<SaleRecord>('erp.sales', [
    {
      id: 'V001',
      cliente: 'Loja Centro',
      vendedor: 'Carlos',
      data: '2025-11-05',
      tipo: 'Venda',
      total: 1520.5,
      registro: 'vendas' as SalesTab,
      situacao: 'Concluida',
      itens: [{ produtoId: 'P001', quantidade: 1, valor: 1520.5 }],
    },
    {
      id: 'V002',
      cliente: 'ACME',
      vendedor: 'Ana',
      data: '2025-11-12',
      tipo: 'Venda',
      total: 820.0,
      registro: 'vendas' as SalesTab,
      situacao: 'Concluida',
      itens: [{ produtoId: 'P002', quantidade: 2, valor: 410 }],
    },
    {
      id: 'D001',
      cliente: 'Cliente Beta',
      vendedor: 'Carlos',
      data: '2025-11-18',
      tipo: 'Devolucao',
      total: 210.0,
      registro: 'devolucoes' as SalesTab,
      situacao: 'Concluida',
      itens: [{ produtoId: 'P002', quantidade: 1, valor: 210 }],
    },
  ])

  const { items: produtosStock, setItems: setProdutosStock } = useLocalCrud<ProductItem>('erp.produtos', produtosSeed)

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

  const buildStockDelta = (itens: SaleItem[], registro: SalesTab) => {
    const delta: Record<string, number> = {}
    itens.forEach((item) => {
      const mult = registro === 'devolucoes' ? 1 : -1
      delta[item.produtoId] = (delta[item.produtoId] || 0) + mult * (item.quantidade || 0)
    })
    return delta
  }

  const canApplyStock = (delta: Record<string, number>) => {
    return Object.entries(delta).every(([id, change]) => {
      const prod = produtosStock.find((p) => p.id === id)
      if (!prod || prod.tipo !== 'produtos') return true
      const novoEstoque = (prod.estoque || 0) + change
      return novoEstoque >= 0
    })
  }

  const applyStock = (delta: Record<string, number>) => {
    setProdutosStock((prev) =>
      prev.map((p) => {
        const diff = delta[p.id] || 0
        if (diff === 0) return p
        return { ...p, estoque: (p.estoque || 0) + diff }
      }),
    )
  }

  const toggleSales = (id: string) => {
    setSalesSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleSalesAll = () => {
    if (filteredSales.length === 0) return
    const ids = filteredSales.map((v) => v.id)
    const all = ids.every((id) => salesSelected.includes(id))
    setSalesSelected(all ? [] : ids)
  }

  const handleSalesNew = useCallback(() => {
    setSalesModalMode('new')
    setSalesEditId(null)
    setSalesForm(buildSalesDefaultForm())
    setSalesModalOpen(true)
  }, [buildSalesDefaultForm])

  const salesNewRef = useRef(0)
  useEffect(() => {
    if (openNewSignal > salesNewRef.current) {
      salesNewRef.current = openNewSignal
      setTimeout(() => handleSalesNew(), 0)
    }
  }, [openNewSignal, handleSalesNew])

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
      itens:
        current.itens?.map((i: SaleItem) => ({
          produtoId: i.produtoId || '',
          quantidade: i.quantidade || 1,
          valor: i.valor || 0,
        })) || [{ produtoId: '', quantidade: 1, valor: 0 }],
      total: current.total,
    situacao: (current.situacao as SaleRecord['situacao']) ?? 'Concluida'
    })
    setSalesModalOpen(true)
  }

  const handleSalesDuplicate = () => {
    if (salesSelected.length === 0) {
      setSalesToast('Selecione ao menos um registro para duplicar.')
      return
    }
    const deltas: Record<string, number>[] = []
    const payloads: SaleRecord[] = []
    salesSelected.forEach((id) => {
      const current = salesItems.find((s) => s.id === id)
      if (current) {
        deltas.push(buildStockDelta(current.itens || [], current.registro || activeTab))
        payloads.push({ ...current, id: crypto.randomUUID() })
      }
    })
    const totalDelta = deltas.reduce((acc, d) => {
      Object.entries(d).forEach(([k, v]) => {
        acc[k] = (acc[k] || 0) + v
      })
      return acc
    }, {} as Record<string, number>)
    if (!canApplyStock(totalDelta)) {
      setSalesToast('Estoque insuficiente para duplicar um dos registros.')
      return
    }
    applyStock(totalDelta)
    payloads.forEach((p) => {
      addSale(p)
      onFinanceUpsertSale(p)
    })
  }

  const handleSalesDelete = () => {
    if (salesSelected.length === 0) {
      setSalesToast('Selecione ao menos um registro para excluir.')
      return
    }
    const restoreDelta = salesItems
      .filter((s) => salesSelected.includes(s.id))
      .map((s) => {
        const d = buildStockDelta(s.itens || [], s.registro || activeTab)
        const invert: Record<string, number> = {}
        Object.entries(d).forEach(([k, v]) => {
          invert[k] = -(v || 0)
        })
        return invert
      })
      .reduce((acc, d) => {
        Object.entries(d).forEach(([k, v]) => {
          acc[k] = (acc[k] || 0) + v
        })
        return acc
      }, {} as Record<string, number>)
    applyStock(restoreDelta)
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

  const handleSalesPrint = () => {
    if (salesSelected.length === 0) {
      setSalesToast('Selecione ao menos um registro para imprimir.')
      return
    }
    const registros = salesItems.filter((v) => salesSelected.includes(v.id))
    if (registros.length === 0) return
    const rows = registros
      .map(
        (v) =>
          `<h4 style="margin:4px 0;">Venda ${v.id}</h4>
          <div style="font-size:12px;margin-bottom:4px;">Cliente: ${v.cliente || '-'} | Vendedor: ${v.vendedor || '-'} | Data: ${
            v.data
          } | Tipo: ${v.tipo}</div>
          <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px;">
            <thead><tr><th style="border:1px solid #ccc;padding:4px;">Produto</th><th style="border:1px solid #ccc;padding:4px;">Qtd</th><th style="border:1px solid #ccc;padding:4px;">Valor</th><th style="border:1px solid #ccc;padding:4px;">Subtotal</th></tr></thead>
            <tbody>
            ${
              v.itens
                ?.map((i) => {
                  const prod = produtosStock.find((p) => p.id === i.produtoId)
                  const nome = prod?.nome || i.produtoId || '-'
                  const subtotal = (i.quantidade || 0) * (i.valor || 0)
                  return `<tr><td style="border:1px solid #ccc;padding:4px;">${nome}</td><td style="border:1px solid #ccc;padding:4px;">${
                    i.quantidade || 0
                  }</td><td style="border:1px solid #ccc;padding:4px;">${formatMoney(i.valor || 0)}</td><td style="border:1px solid #ccc;padding:4px;">${formatMoney(
                    subtotal,
                  )}</td></tr>`
                })
                .join('') || ''
            }
            <tr><td colspan="3" style="text-align:right;border:1px solid #ccc;padding:4px;font-weight:bold;">Total</td><td style="border:1px solid #ccc;padding:4px;font-weight:bold;">${formatMoney(
              v.total,
            )}</td></tr>
            </tbody>
          </table>`,
      )
      .join('<hr/>')
    const html = `<html><head><title>Comprovante de venda</title></head><body style="font-family:Arial,sans-serif;padding:16px;">${rows}</body></html>`
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    w.print()
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
          <div className="text-xs text-slate-500 font-semibold">Dados da venda</div>
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
          <div className="grid md:grid-cols-3 gap-3">
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
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Situacao</label>
              <select
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                value={salesForm.situacao || 'Concluida'}
                onChange={(e) => setSalesForm((p) => ({ ...p, situacao: e.target.value as 'Concluida' | 'Rascunho' }))}
              >
                <option value="Concluida">Concluida</option>
                <option value="Rascunho">Rascunho</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-700">Itens</h4>
              <button
                className="text-xs text-emerald-600 font-semibold"
                onClick={() =>
                  setSalesForm((p) => ({
                    ...p,
                    itens: [...(p.itens || []), { produtoId: '', quantidade: 1, valor: 0 }],
                  }))
                }
              >
                + Adicionar item
              </button>
            </div>
            <div className="space-y-3">
              {(salesForm.itens || []).map((item, idx) => (
                <div key={idx} className="grid grid-cols-6 gap-2 items-end border border-slate-200 rounded-md p-2">
                  <div className="col-span-3 space-y-1">
                    <label className="text-xs text-slate-500">Produto</label>
                    <input
                      className="w-full border border-slate-200 rounded-md px-2 py-1 text-sm"
                      value={item.produtoId}
                      onChange={(e) =>
                        setSalesForm((p) => {
                          const itens = [...(p.itens || [])]
                          itens[idx] = { ...itens[idx], produtoId: e.target.value }
                          return { ...p, itens }
                        })
                      }
                      placeholder="Cod ou nome"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Qtd</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full border border-slate-200 rounded-md px-2 py-1 text-sm"
                      value={item.quantidade}
                      onChange={(e) =>
                        setSalesForm((p) => {
                          const itens = [...(p.itens || [])]
                          itens[idx] = { ...itens[idx], quantidade: parseInt(e.target.value || '0') }
                          return { ...p, itens }
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Valor unitario</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full border border-slate-200 rounded-md px-2 py-1 text-sm"
                      value={item.valor}
                      onChange={(e) =>
                        setSalesForm((p) => {
                          const itens = [...(p.itens || [])]
                          itens[idx] = { ...itens[idx], valor: parseFloat(e.target.value || '0') }
                          return { ...p, itens }
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-xs text-slate-500 block">Subtotal</span>
                    <span className="text-sm font-semibold text-slate-700">
                      {formatMoney((item.quantidade || 0) * (item.valor || 0))}
                    </span>
                  </div>
                  <div className="col-span-6 flex justify-end">
                    <button
                      className="text-xs text-red-600 hover:underline"
                      onClick={() =>
                        setSalesForm((p) => ({
                          ...p,
                          itens: (p.itens || []).filter((_, i) => i !== idx),
                        }))
                      }
                      disabled={(salesForm.itens || []).length === 1}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-sm font-semibold text-slate-700">
              <span>Total:</span>
              <span>{formatMoney((salesForm.itens || []).reduce((acc, item) => acc + (item.quantidade || 0) * (item.valor || 0), 0))}</span>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-700" onClick={() => setSalesModalOpen(false)}>
              Cancelar
            </button>
            <button
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-semibold"
              onClick={() => {
                const itensLimpos =
                  salesForm.itens
                    ?.map((i) => ({
                      produtoId: i.produtoId || '',
                      quantidade: Math.max(0, Number(i.quantidade) || 0),
                      valor: Math.max(0, Number(i.valor) || 0),
                    }))
                    .filter((i) => i.produtoId && i.quantidade > 0) || []
                if (!salesForm.cliente.trim()) {
                  setSalesToast('Cliente obrigatorio')
                  return
                }
                if (!salesForm.data) {
                  setSalesToast('Data obrigatoria')
                  return
                }
                if (itensLimpos.length === 0) {
                  setSalesToast('Adicione ao menos 1 item')
                  return
                }
                const totalNorm = normalizeMoney(
                  itensLimpos.reduce((acc, item) => acc + item.quantidade * item.valor, 0),
                )
                const payload: SaleRecord = {
                  ...salesForm,
                  itens: itensLimpos,
                  total: totalNorm,
                  registro: activeTab,
                  id: salesEditId || crypto.randomUUID(),
                }
                const delta = buildStockDelta(itensLimpos, activeTab)
                if (!canApplyStock(delta)) {
                  setSalesToast('Estoque insuficiente para um dos itens.')
                  return
                }
                applyStock(delta)
                if (salesModalMode === 'new') {
                  addSale(payload)
                } else if (salesEditId) {
                  updateSale(salesEditId, payload)
                }
                onFinanceUpsertSale(payload)
                setSalesForm(buildSalesDefaultForm())
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
            Exportar CSV
          </button>
          <button
            onClick={handleSalesPrint}
            className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-600"
          >
            Imprimir
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
            <button
              className="border border-slate-200 rounded-md px-2 py-1 text-sm text-slate-700 bg-white hover:bg-slate-50"
              onClick={() => {
                if (salesSelected.length === 0) {
                  setSalesToast('Selecione ao menos uma venda para reabrir.')
                  return
                }
                salesSelected.forEach((id) => {
                  const current = salesItems.find((v) => v.id === id)
                  if (!current) return
                  updateSale(id, { ...current, situacao: 'Rascunho' })
                })
                setSalesToast('Venda(s) reabertas como rascunho.')
              }}
            >
              Reabrir (rascunho)
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
              <th className="py-3 px-3 text-left w-28">Situacao</th>
              <th className="py-3 px-3 text-right w-32">Total</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.length === 0 ? (
              <tr className="border-t border-slate-200">
                <td colSpan={8} className="py-4 px-3 text-center text-slate-500">
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
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        v.situacao === 'Concluida'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {v.situacao || 'Concluida'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-slate-700">{formatMoney(v.total)}</td>
                </tr>
              ))
            )}
            <tr className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-700">
              <td className="py-3 px-3" colSpan={7}>
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

function ComprasPage({
  activeTab,
  onFinanceUpsertPurchase,
  onFinanceRemovePurchases,
  openNewSignal,
}: {
  activeTab: PurchaseTab
  onFinanceUpsertPurchase: (p: PurchaseRecord) => void
  onFinanceRemovePurchases: (ids: string[]) => void
  openNewSignal: number
}) {
  const [purchaseSearch, setPurchaseSearch] = useState('')
  const [purchaseMonth, setPurchaseMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [purchaseSelected, setPurchaseSelected] = useState<string[]>([])
  const [purchaseToast, setPurchaseToast] = useState<string | null>(null)
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false)
  const [purchaseModalMode, setPurchaseModalMode] = useState<'new' | 'edit'>('new')
  const buildPurchaseDefaultForm = useCallback(
    (): PurchaseForm => ({
      fornecedor: '',
      nota: '',
      data: new Date().toISOString().slice(0, 10),
      situacao: 'Concluida' as PurchaseForm['situacao'],
      itens: [{ produtoId: '', quantidade: 1, valor: 0 }],
      total: 0,
    }),
    [],
  )

  const [purchaseForm, setPurchaseForm] = useState<PurchaseForm>(buildPurchaseDefaultForm)

  const [purchaseEditId, setPurchaseEditId] = useState<string | null>(null)

  const { items: compras, add: addCompra, update: updateCompra, remove: removeCompra } = useLocalCrud<PurchaseRecord>('erp.compras', [
    {
      id: 'C001',
      fornecedor: 'Fornec Uno',
      nota: 'NF123',
      data: '2025-11-03',
      situacao: 'Concluida',
      total: 350.5,
      itens: [{ produtoId: 'P002', quantidade: 5, valor: 70 }],
      registro: 'compras' as PurchaseTab,
    },
  ])
  const { items: produtosStock, setItems: setProdutosStock } = useLocalCrud<ProductItem>('erp.produtos', produtosSeed)

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

  const buildStockDelta = (itens: PurchaseItem[]) => {
    const delta: Record<string, number> = {}
    itens.forEach((item) => {
      delta[item.produtoId] = (delta[item.produtoId] || 0) + (item.quantidade || 0)
    })
    return delta
  }

  const canApplyStock = (delta: Record<string, number>) => {
    return Object.entries(delta).every(([id, change]) => {
      const prod = produtosStock.find((p) => p.id === id)
      if (!prod || prod.tipo !== 'produtos') return true
      const novoEstoque = (prod.estoque || 0) + change
      return novoEstoque >= 0
    })
  }

  const applyStock = (delta: Record<string, number>) => {
    setProdutosStock((prev) =>
      prev.map((p) => {
        const diff = delta[p.id] || 0
        if (diff === 0) return p
        return { ...p, estoque: (p.estoque || 0) + diff }
      }),
    )
  }

  const togglePurchase = (id: string) => {
    setPurchaseSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const togglePurchaseAll = () => {
    if (filteredPurchases.length === 0) return
    const ids = filteredPurchases.map((c) => c.id)
    const all = ids.every((id) => purchaseSelected.includes(id))
    setPurchaseSelected(all ? [] : ids)
  }

  const handlePurchaseNew = useCallback(() => {
    setPurchaseModalMode('new')
    setPurchaseEditId(null)
    setPurchaseForm(buildPurchaseDefaultForm())
    setPurchaseModalOpen(true)
  }, [buildPurchaseDefaultForm])

  const purchaseNewRef = useRef(0)
  useEffect(() => {
    if (openNewSignal > purchaseNewRef.current) {
      purchaseNewRef.current = openNewSignal
      setTimeout(() => handlePurchaseNew(), 0)
    }
  }, [openNewSignal, handlePurchaseNew])

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
     situacao: ((current.situacao as PurchaseForm['situacao']) ?? 'Concluida') as PurchaseForm['situacao'],

      itens:
        current.itens?.map((i: PurchaseItem) => ({
          produtoId: i.produtoId || '',
          quantidade: i.quantidade || 1,
          valor: i.valor || 0,
        })) || [{ produtoId: '', quantidade: 1, valor: 0 }],
      total: current.total,
    })
    setPurchaseModalOpen(true)
  }

  const handlePurchaseDuplicate = () => {
    if (purchaseSelected.length === 0) {
      setPurchaseToast('Selecione ao menos um registro para duplicar.')
      return
    }
    const payloads: PurchaseRecord[] = []
    purchaseSelected.forEach((id) => {
      const current = compras.find((c) => c.id === id)
      if (current) {
        payloads.push({ ...current, id: crypto.randomUUID() })
      }
    })
    const totalDelta = payloads
      .map((p) => buildStockDelta(p.itens || []))
      .reduce((acc, d) => {
        Object.entries(d).forEach(([k, v]) => {
          acc[k] = (acc[k] || 0) + v
        })
        return acc
      }, {} as Record<string, number>)
    applyStock(totalDelta)
    payloads.forEach((p) => addCompra(p))
  }

  const handlePurchaseDelete = () => {
    if (purchaseSelected.length === 0) {
      setPurchaseToast('Selecione ao menos um registro para excluir.')
      return
    }
    const deltaRestore = compras
      .filter((c) => purchaseSelected.includes(c.id))
      .map((c) => {
        const d = buildStockDelta(c.itens || [])
        const invert: Record<string, number> = {}
        Object.entries(d).forEach(([k, v]) => {
          invert[k] = -(v || 0)
        })
        return invert
      })
      .reduce((acc, d) => {
        Object.entries(d).forEach(([k, v]) => {
          acc[k] = (acc[k] || 0) + v
        })
        return acc
      }, {} as Record<string, number>)
    if (!canApplyStock(deltaRestore)) {
      setPurchaseToast('Estoque insuficiente para remover um dos registros.')
      return
    }
    applyStock(deltaRestore)
    removeCompra(purchaseSelected)
    onFinanceRemovePurchases(purchaseSelected)
    setPurchaseSelected([])
  }

  const handlePurchaseExport = () => {
    if (filteredPurchases.length === 0) {
      setPurchaseToast('Nada para exportar.')
      return
    }
    const header = ['Cod', 'Fornecedor', 'Nota', 'Data', 'Situacao', 'Total']
    const rows = filteredPurchases.map((c) => [
      c.id,
      c.fornecedor,
      c.nota,
      c.data,
      c.situacao || 'Concluida',
      formatMoney(c.total || 0),
    ])
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'compras.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePurchasePrint = () => {
    if (purchaseSelected.length === 0) {
      setPurchaseToast('Selecione ao menos um registro para imprimir.')
      return
    }
    const registros = compras.filter((c) => purchaseSelected.includes(c.id))
    if (registros.length === 0) return
    const rows = registros
      .map(
        (c) =>
          `<h4 style="margin:4px 0;">Compra ${c.id}</h4>
          <div style="font-size:12px;margin-bottom:4px;">Fornecedor: ${c.fornecedor || '-'} | Nota: ${c.nota || '-'} | Data: ${
            c.data
          } | Situacao: ${c.situacao || 'Concluida'}</div>
          <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px;">
            <thead><tr><th style="border:1px solid #ccc;padding:4px;">Produto</th><th style="border:1px solid #ccc;padding:4px;">Qtd</th><th style="border:1px solid #ccc;padding:4px;">Valor</th><th style="border:1px solid #ccc;padding:4px;">Subtotal</th></tr></thead>
            <tbody>
            ${
              (c.itens || [])
                .map((i) => {
                  const prod = produtosStock.find((p) => p.id === i.produtoId)
                  const nome = prod?.nome || i.produtoId || '-'
                  const subtotal = (i.quantidade || 0) * (i.valor || 0)
                  return `<tr><td style="border:1px solid #ccc;padding:4px;">${nome}</td><td style="border:1px solid #ccc;padding:4px;">${
                    i.quantidade || 0
                  }</td><td style="border:1px solid #ccc;padding:4px;">${formatMoney(i.valor || 0)}</td><td style="border:1px solid #ccc;padding:4px;">${formatMoney(
                    subtotal,
                  )}</td></tr>`
                })
                .join('') || ''
            }
            <tr><td colspan="3" style="text-align:right;border:1px solid #ccc;padding:4px;font-weight:bold">Total</td><td style="border:1px solid #ccc;padding:4px;font-weight:bold;">${formatMoney(
              c.total,
            )}</td></tr>
            </tbody>
          </table>`,
      )
      .join('<hr/>')
    const html = `<html><head><title>Comprovante de compra</title></head><body style="font-family:Arial,sans-serif;padding:16px;">${rows}</body></html>`
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    w.print()
  }

  const computeTotal = (itens: PurchaseItem[]) =>
    (itens || []).reduce((acc, item) => acc + (Number(item.quantidade) || 0) * (Number(item.valor) || 0), 0)

  return (
    <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-4">
      <Toast message={purchaseToast} onClose={() => setPurchaseToast(null)} />
      <Modal
        open={purchaseModalOpen}
        title={purchaseModalMode === 'new' ? 'Nova compra' : 'Editar compra'}
        onClose={() => setPurchaseModalOpen(false)}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Fornecedor</label>
              <input
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                value={purchaseForm.fornecedor}
                onChange={(e) => setPurchaseForm((p) => ({ ...p, fornecedor: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Nota</label>
              <input
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                value={purchaseForm.nota}
                onChange={(e) => setPurchaseForm((p) => ({ ...p, nota: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Data</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                value={purchaseForm.data}
                onChange={(e) => setPurchaseForm((p) => ({ ...p, data: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Situacao</label>
              <select
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                value={purchaseForm.situacao}
                onChange={(e) => setPurchaseForm((p) => ({ ...p, situacao: e.target.value as 'Concluida' | 'Rascunho' }))}
              >
                <option value="Concluida">Concluida</option>
                <option value="Rascunho">Rascunho</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-700">Itens</h4>
              <button
                className="text-xs text-emerald-600 font-semibold"
                onClick={() =>
                  setPurchaseForm((p) => ({
                    ...p,
                    itens: [...(p.itens || []), { produtoId: '', quantidade: 1, valor: 0 }],
                  }))
                }
              >
                + Adicionar item
              </button>
            </div>
            <div className="space-y-3">
              {(purchaseForm.itens || []).map((item, idx) => (
                <div key={idx} className="grid grid-cols-6 gap-2 items-end border border-slate-200 rounded-md p-2">
                  <div className="col-span-3 space-y-1">
                    <label className="text-xs text-slate-500">Produto</label>
                    <input
                      className="w-full border border-slate-200 rounded-md px-2 py-1 text-sm"
                      value={item.produtoId}
                      onChange={(e) =>
                        setPurchaseForm((p) => {
                          const itens = [...(p.itens || [])]
                          itens[idx] = { ...itens[idx], produtoId: e.target.value }
                          return { ...p, itens }
                        })
                      }
                      placeholder="Cod ou nome"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Qtd</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full border border-slate-200 rounded-md px-2 py-1 text-sm"
                      value={item.quantidade}
                      onChange={(e) =>
                        setPurchaseForm((p) => {
                          const itens = [...(p.itens || [])]
                          itens[idx] = { ...itens[idx], quantidade: parseInt(e.target.value || '0') }
                          return { ...p, itens }
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Valor unitario</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full border border-slate-200 rounded-md px-2 py-1 text-sm"
                      value={item.valor}
                      onChange={(e) =>
                        setPurchaseForm((p) => {
                          const itens = [...(p.itens || [])]
                          itens[idx] = { ...itens[idx], valor: parseFloat(e.target.value || '0') }
                          return { ...p, itens }
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-xs text-slate-500 block">Subtotal</span>
                    <span className="text-sm font-semibold text-slate-700">
                      {formatMoney((item.quantidade || 0) * (item.valor || 0))}
                    </span>
                  </div>
                  <div className="col-span-6 flex justify-end">
                    <button
                      className="text-xs text-red-600 hover:underline"
                      onClick={() =>
                        setPurchaseForm((p) => ({
                          ...p,
                          itens: (p.itens || []).filter((_, i) => i !== idx),
                        }))
                      }
                      disabled={(purchaseForm.itens || []).length === 1}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-sm font-semibold text-slate-700">
              <span>Total:</span>
              <span>{formatMoney(computeTotal(purchaseForm.itens || []))}</span>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-700" onClick={() => setPurchaseModalOpen(false)}>
              Cancelar
            </button>
            <button
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-semibold"
              onClick={() => {
                const itensLimpos =
                  purchaseForm.itens
                    ?.map((i) => ({
                      produtoId: i.produtoId || '',
                      quantidade: Math.max(0, Number(i.quantidade) || 0),
                      valor: Math.max(0, Number(i.valor) || 0),
                    }))
                    .filter((i) => i.produtoId && i.quantidade > 0) || []
                if (!purchaseForm.fornecedor.trim()) {
                  setPurchaseToast('Fornecedor obrigatorio')
                  return
                }
                if (!purchaseForm.data) {
                  setPurchaseToast('Data obrigatoria')
                  return
                }
                if (itensLimpos.length === 0) {
                  setPurchaseToast('Adicione ao menos 1 item')
                  return
                }
                const totalNorm = normalizeMoney(computeTotal(itensLimpos))
                const payload: PurchaseRecord = {
                  ...purchaseForm,
                  itens: itensLimpos,
                  total: totalNorm,
                  registro: activeTab,
                  id: purchaseEditId || crypto.randomUUID(),
                }
                const delta = buildStockDelta(itensLimpos)
                if (!canApplyStock(delta)) {
                  setPurchaseToast('Estoque insuficiente para essa compra.')
                  return
                }
                applyStock(delta)
                if (purchaseModalMode === 'new') {
                  addCompra(payload)
                } else if (purchaseEditId) {
                  updateCompra(purchaseEditId, payload)
                }
                onFinanceUpsertPurchase(payload)
                setPurchaseForm(buildPurchaseDefaultForm())
                setPurchaseModalOpen(false)
                setPurchaseSelected([])
              }}
            >
              Salvar
            </button>
          </div>
        </div>
      </Modal>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#0f3047]">Compras</h2>
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
            Exportar CSV
          </button>
          <button
            onClick={handlePurchasePrint}
            className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-600"
          >
            Imprimir
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
        <button
          className={`px-3 py-1.5 rounded-full border text-sm font-semibold transition ${
            activeTab === 'compras' ? 'bg-amber-100 border-amber-300 text-[#0f3047]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Compras
        </button>
        <div className="flex items-center gap-1 text-sm text-slate-700 ml-auto">
          <button onClick={() => setPurchaseMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>{'<'}</button>
          <span className="px-2 capitalize">{formatMonthLabel(purchaseMonth)}</span>
          <button onClick={() => setPurchaseMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>{'>'}</button>
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
              <th className="py-3 px-3 text-left">Itens</th>
              <th className="py-3 px-3 text-left w-32">Data</th>
              <th className="py-3 px-3 text-left w-32">Situacao</th>
              <th className="py-3 px-3 text-right w-32">Total</th>
            </tr>
          </thead>
          <tbody>
            {filteredPurchases.length === 0 ? (
              <tr className="border-t border-slate-200">
                <td colSpan={8} className="py-4 px-3 text-center text-slate-500">
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
                  <td className="py-3 px-3 text-slate-700">
                    <div className="space-y-0.5">
                      {(c.itens || []).map((i: PurchaseItem, idx: number) => (
                        <div key={idx} className="text-xs text-slate-600">
                          {(produtosStock.find((p) => p.id === i.produtoId)?.nome || 'Item')} - {i.quantidade || 0} x {formatMoney(i.valor || 0)}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-700">{c.data}</td>
                  <td className="py-3 px-3 text-slate-700">{c.situacao}</td>
                  <td className="py-3 px-3 text-right text-slate-700">{formatMoney(c.total || 0)}</td>
                </tr>
              ))
            )}
            <tr className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-700">
              <td className="py-3 px-3" colSpan={7}>
                TOTAL LISTADO ({filteredPurchases.length} itens)
              </td>
              <td className="py-3 px-3 text-right">
                {formatMoney(filteredPurchases.reduce((acc, c) => acc + (c.total || 0), 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ClientesPage({
  activeTab,
  setActiveTab,
  openNewSignal,
}: {
  activeTab: ContactTab
  setActiveTab: (t: ContactTab) => void
  openNewSignal: number
}) {
  const [contactSearch, setContactSearch] = useState('')
  const [contactToast, setContactToast] = useState<string | null>(null)
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [contactModalMode, setContactModalMode] = useState<'new' | 'edit'>('new')
  const contactDefaultForm = {
    nome: '',
    fones: '',
    palavras: '',
    cidade: '',
    observacoes: '',
    documentos: [] as string[],
    camposExtras: '',
  }
  const [contactForm, setContactForm] = useState(contactDefaultForm)
  const [contactEditId, setContactEditId] = useState<string | null>(null)

  const [contactSelected, setContactSelected] = useState<string[]>([])

  const { items: contatos, add: addContato, update: updateContato, remove: removeContato } = useLocalCrud<ContactItem>(
    'erp.contatos',
    [
      {
        id: 'C001',
        nome: 'Cliente ACME',
        fones: '(11) 9999-0000',
        palavras: 'vip',
        cidade: 'SP/SP',
        tipo: 'clientes',
        observacoes: '',
        documentos: [],
        camposExtras: '',
      },
      {
        id: 'C002',
        nome: 'Cliente Beta',
        fones: '(21) 9888-1111',
        palavras: 'atacado',
        cidade: 'RJ/RJ',
        tipo: 'clientes',
        observacoes: '',
        documentos: [],
        camposExtras: '',
      },
      {
        id: 'F001',
        nome: 'Fornecedor XPTO',
        fones: '(31) 9777-2222',
        palavras: 'eletronicos',
        cidade: 'BH/MG',
        tipo: 'fornecedores',
        observacoes: '',
        documentos: [],
        camposExtras: '',
      },
      {
        id: 'T001',
        nome: 'Transp Sul',
        fones: '(41) 9666-3333',
        palavras: 'rodoviario',
        cidade: 'CTBA/PR',
        tipo: 'transportadoras',
        observacoes: '',
        documentos: [],
        camposExtras: '',
      },
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

  const handleContatoNew = useCallback(() => {
    setContactModalMode('new')
    setContactEditId(null)
    setContactForm({ nome: '', fones: '', palavras: '', cidade: '', observacoes: '', documentos: [], camposExtras: '' })
    setContactModalOpen(true)
  }, [])

  const contactNewRef = useRef(0)
  useEffect(() => {
    if (openNewSignal > contactNewRef.current) {
      contactNewRef.current = openNewSignal
      setTimeout(() => handleContatoNew(), 0)
    }
  }, [openNewSignal, handleContatoNew])

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
      nome: current.nome || '',
      fones: current.fones || '',
      palavras: current.palavras || '',
      cidade: current.cidade || '',
      observacoes: current.observacoes || '',
      documentos: current.documentos || [],
      camposExtras: current.camposExtras || '',
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
            <label className="text-xs text-slate-500">Observacoes</label>
            <textarea
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
              value={contactForm.observacoes}
              onChange={(e) => setContactForm((p) => ({ ...p, observacoes: e.target.value }))}
              rows={2}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Campos customizados</label>
            <textarea
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
              value={contactForm.camposExtras}
              onChange={(e) => setContactForm((p) => ({ ...p, camposExtras: e.target.value }))}
              placeholder="Ex.: CPF=000; IE=123"
              rows={2}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Documentos (nomes separados por virgula)</label>
            <input
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
              value={contactForm.documentos?.join(', ') || ''}
              onChange={(e) =>
                setContactForm((p) => ({
                  ...p,
                  documentos: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
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
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = '.csv'
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = (ev) => {
                  const text = String(ev.target?.result || '')
                  const lines = text.split(/\r?\n/).filter(Boolean)
                  const novos: ContactItem[] = []
                  lines.forEach((line) => {
                    const [id, nome, fones, palavras, cidade] = line.split(';').map((s) => s.replace(/"/g, '').trim())
                    if (!nome) return
                    novos.push({
                      id: id || crypto.randomUUID(),
                      nome,
                      fones: fones || '',
                      palavras: palavras || '',
                      cidade: cidade || '',
                      tipo: activeTab,
                    })
                  })
                  if (novos.length > 0) {
                    novos.forEach((n) => addContato(n))
                    setContactToast(`${novos.length} registro(s) importados`)
                  } else {
                    setContactToast('Nenhum registro valido no CSV.')
                  }
                }
                reader.readAsText(file, 'utf-8')
              }
              input.click()
            }}
            className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-600"
          >
            Importar CSV
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
          <th className="py-3 px-3 text-left w-24">Docs</th>
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
            <td className="py-3 px-3 text-slate-700 text-xs">{(c as { documentos?: string[] }).documentos?.length || 0} doc(s)</td>
          </tr>
        ))
      )}
          <tr className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-700">
            <td className="py-3 px-3" colSpan={6}>
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

function ProdutosPage({
  activeTab,
  setActiveTab,
  openNewSignal,
}: {
  activeTab: ProductTab
  setActiveTab: (t: ProductTab) => void
  openNewSignal: number
}) {
  const [productSearch, setProductSearch] = useState('')
  const [productSelected, setProductSelected] = useState<string[]>([])
  const [productToast, setProductToast] = useState<string | null>(null)
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [productModalMode, setProductModalMode] = useState<'new' | 'edit'>('new')
  const [movementModalOpen, setMovementModalOpen] = useState(false)
  const [movementProduct, setMovementProduct] = useState<ProductItem | null>(null)
  const [movementData, setMovementData] = useState<
    { data: string; tipo: string; quantidade: number; origem: string; contato?: string }[]
  >([])
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false)
  const [inventoryProduct, setInventoryProduct] = useState<ProductItem | null>(null)
  const [inventoryCount, setInventoryCount] = useState(0)
  const [inventoryObs, setInventoryObs] = useState('')
  const buildProductDefaultForm = useCallback(
    () => ({
      nome: '',
      categoria: '',
      preco: 0,
      estoque: 0,
      estoqueMinimo: 0,
      palavras: '',
      contato: '',
      observacoes: '',
      data: new Date().toISOString().slice(0, 10),
      documentos: [] as string[],
      camposExtras: '',
      produtoId: '',
      quantidade: 0,
      movimento: [] as ProductItem['movimento'],
    }),
    [],
  )
  const [productForm, setProductForm] = useState(buildProductDefaultForm)
  const [productEditId, setProductEditId] = useState<string | null>(null)

  const { items: produtos, add: addProduto, update: updateProduto, remove: removeProduto, setItems: setProdutos } = useLocalCrud(
    'erp.produtos',
    produtosSeed,
  )
  const { items: inventoryRecords, add: addInventoryRecord } = useLocalCrud<InventoryRecord>('erp.inventory', [])

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

  const movimentosRecentes = useMemo(() => {
    const trintaDiasAtras = new Date()
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30)
    const parseStorage = <T,>(key: string): T[] => {
      try {
        const raw = localStorage.getItem(key)
        if (raw) {
          const arr = JSON.parse(raw)
          if (Array.isArray(arr)) return arr as T[]
        }
      } catch {
        //
      }
      return []
    }
    const vendas = parseStorage<SaleRecord>('erp.sales')
    const comprasMov = parseStorage<PurchaseRecord>('erp.compras')
    const mapa = new Set<string>()
    vendas.forEach((v) => v.itens?.forEach((i) => mapa.add(i.produtoId)))
    comprasMov.forEach((c) => c.itens?.forEach((i) => mapa.add(i.produtoId)))
    return mapa
  }, [])
  const alertasEstoque = useMemo(() => {
    const baixo = filteredProdutos.filter((p) => (p.estoqueMinimo || 0) > 0 && p.estoque <= (p.estoqueMinimo || 0))
    const semMov = filteredProdutos.filter((p) => !movimentosRecentes.has(p.id))
    return { baixo, semMov }
  }, [filteredProdutos, movimentosRecentes])

  const abrirMovimentacao = (produto: ProductItem) => {
    const parse = <T,>(key: string): T[] => {
      try {
        const raw = localStorage.getItem(key)
        if (raw) {
          const arr = JSON.parse(raw)
          if (Array.isArray(arr)) return arr as T[]
        }
      } catch {
        return []
      }
      return []
    }
    const vendas = parse<SaleRecord>('erp.sales')
    const comprasMov = parse<PurchaseRecord>('erp.compras')
    const movimentos: { data: string; tipo: string; quantidade: number; origem: string; contato?: string }[] = []

    vendas.forEach((v) => {
      v.itens?.forEach((i) => {
        if (i.produtoId === produto.id) {
          const mult = v.registro === 'devolucoes' ? 1 : -1
          movimentos.push({
            data: v.data,
            tipo: v.registro === 'devolucoes' ? 'Devolucao' : 'Venda',
            quantidade: mult * (i.quantidade || 0),
            origem: v.id,
            contato: v.cliente,
          })
        }
      })
    })
    comprasMov.forEach((c) => {
      c.itens?.forEach((i) => {
        if (i.produtoId === produto.id) {
          movimentos.push({
            data: c.data,
            tipo: 'Compra',
            quantidade: i.quantidade || 0,
            origem: c.id,
            contato: c.fornecedor,
          })
        }
      })
    })
    ;(produto.movimento || []).forEach((m) => {
      movimentos.push({
        data: m.data,
        tipo: m.tipo === 'ajuste' ? 'Ajuste' : m.tipo,
        quantidade: m.quantidade,
        origem: 'ajuste',
      })
    })
    const ordenado = movimentos.sort((a, b) => a.data.localeCompare(b.data))
    setMovementProduct(produto)
    setMovementData(ordenado)
    setMovementModalOpen(true)
  }

  const openInventoryModal = (produto?: ProductItem) => {
    const target =
      produto || (productSelected.length === 1 ? produtos.find((p) => p.id === productSelected[0]) : null)
    if (!target) {
      setProductToast('Selecione um produto para registrar o inventario.')
      return
    }
    setInventoryProduct(target)
    setInventoryCount(target.estoque || 0)
    setInventoryObs('')
    setInventoryModalOpen(true)
  }

  const handleInventorySave = () => {
    if (!inventoryProduct) return
    const registrado = inventoryProduct.estoque || 0
    const diferenca = inventoryCount - registrado
    updateProduto(inventoryProduct.id, { ...inventoryProduct, estoque: inventoryCount })
    addInventoryRecord({
      id: crypto.randomUUID(),
      produtoId: inventoryProduct.id,
      produtoNome: inventoryProduct.nome,
      data: new Date().toISOString().slice(0, 10),
      contado: inventoryCount,
      registrado,
      diferenca,
      observacoes: inventoryObs.trim() || undefined,
    })
    setInventoryModalOpen(false)
    setProductToast('Inventario registrado e estoque atualizado.')
  }

  const exportMovements = () => {
    if (!movementProduct || movementData.length === 0) {
      setProductToast('Nada para exportar.')
      return
    }
    const header = ['Data', 'Tipo', 'Quantidade', 'Origem', 'Contato']
    const rows = movementData.map((m) => [m.data, m.tipo, m.quantidade, m.origem, m.contato || '-'])
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `movimentacao_${movementProduct.id}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleOpenMovement = () => {
    if (productSelected.length !== 1) {
      setProductToast('Selecione um unico produto para ver a movimentacao.')
      return
    }
    const prod = produtos.find((p) => p.id === productSelected[0])
    if (!prod) {
      setProductToast('Produto nao encontrado.')
      return
    }
    abrirMovimentacao(prod)
  }

  const toggleProduto = (id: string) => {
    setProductSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleProdutoAll = (ids: string[]) => {
    if (ids.length === 0) return
    const all = ids.every((id) => productSelected.includes(id))
    setProductSelected(all ? [] : ids)
  }

  const handleProdutoNew = useCallback(() => {
    setProductModalMode('new')
    setProductEditId(null)
    setProductForm(buildProductDefaultForm())
    setProductModalOpen(true)
  }, [buildProductDefaultForm])

  const productNewRef = useRef(0)
  useEffect(() => {
    if (openNewSignal > productNewRef.current) {
      productNewRef.current = openNewSignal
      setTimeout(() => handleProdutoNew(), 0)
    }
  }, [openNewSignal, handleProdutoNew])

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
      estoqueMinimo: current.estoqueMinimo || 0,
      palavras: current.palavras || '',
      contato: current.contato || '',
      observacoes: current.observacoes || '',
      data: current.data || new Date().toISOString().slice(0, 10),
      documentos: current.documentos || [],
      camposExtras: current.camposExtras || '',
      produtoId: current.id,
      quantidade: 0,
      movimento: current.movimento || [],
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
          {activeTab === 'produtos' && (
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Estoque minimo</label>
              <input
                type="number"
                min="0"
                step="1"
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                value={productForm.estoqueMinimo || 0}
                onChange={(e) => setProductForm((p) => ({ ...p, estoqueMinimo: parseFloat(e.target.value || '0') }))}
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Observacoes</label>
            <textarea
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
              value={productForm.observacoes}
              onChange={(e) => setProductForm((p) => ({ ...p, observacoes: e.target.value }))}
              rows={2}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Campos customizados (texto livre)</label>
            <textarea
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
              value={productForm.camposExtras}
              onChange={(e) => setProductForm((p) => ({ ...p, camposExtras: e.target.value }))}
              placeholder="Ex.: Cor=Azul; Fabricante=ABC"
              rows={2}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Anexar documentos (nomes)</label>
            <input
              type="text"
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
              value={productForm.documentos?.join(', ') || ''}
              onChange={(e) =>
                setProductForm((p) => ({
                  ...p,
                  documentos: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
              placeholder="separe por virgula, ex.: nota.pdf, foto.png"
            />
          </div>
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
                <label className="text-xs text-slate-500">Produto</label>
                <select
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                  value={productForm.produtoId || ''}
                  onChange={(e) => setProductForm((p) => ({ ...p, produtoId: e.target.value }))}
                >
                  <option value="">Selecione</option>
                  {produtos
                    .filter((p) => p.tipo === 'produtos')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} ({p.id})
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Quantidade (+ entrada, - saida)</label>
                <input
                  type="number"
                  step="1"
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                  value={productForm.quantidade ?? 0}
                  onChange={(e) => setProductForm((p) => ({ ...p, quantidade: parseFloat(e.target.value || '0') }))}
                />
              </div>
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
          {activeTab !== 'ajuste' && (
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Anexar documentos (nomes)</label>
              <input
                type="text"
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                value={productForm.documentos?.join(', ') || ''}
                onChange={(e) =>
                  setProductForm((p) => ({
                    ...p,
                    documentos: e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  }))
                }
                placeholder="separe por virgula, ex.: nota.pdf, foto.png"
              />
            </div>
          )}
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
                if (activeTab === 'ajuste') {
                  if (!productForm.produtoId) {
                    setProductToast('Selecione um produto para ajustar.')
                    return
                  }
                  const delta = productForm.quantidade || 0
                  setProdutos((prev) =>
                    prev.map((p) =>
                      p.id === productForm.produtoId
                        ? {
                            ...p,
                            estoque: (p.estoque || 0) + delta,
                            movimento: [
                              ...(p.movimento || []),
                              { data: productForm.data, tipo: 'ajuste', quantidade: delta },
                            ],
                          }
                        : p,
                    ),
                  )
                  addProduto({
                    id: crypto.randomUUID(),
                    nome: productForm.nome || 'Ajuste de estoque',
                    categoria: productForm.categoria || '',
                    preco: 0,
                    estoque: delta,
                    tipo: 'ajuste',
                    contato: productForm.contato,
                    observacoes: productForm.observacoes,
                    data: productForm.data,
                    palavras: productForm.palavras,
                    documentos: productForm.documentos,
                    camposExtras: productForm.camposExtras,
                    movimento: [{ data: productForm.data, tipo: 'ajuste', quantidade: delta }],
                  })
                } else if (productModalMode === 'new') {
                  addProduto({ ...productForm, preco: precoNorm, estoque: estoqueNorm, tipo: activeTab })
                } else if (productEditId) {
                  updateProduto(productEditId, { ...productForm, preco: precoNorm, estoque: estoqueNorm })
                }
                setProductForm(buildProductDefaultForm())
                setProductModalOpen(false)
                setProductToast('Registro salvo')
              }}
            >
              Salvar
            </button>
          </div>
        </div>
      </Modal>
      <Modal
        open={movementModalOpen}
        title={`Movimentacao - ${movementProduct ? `${movementProduct.id} · ${movementProduct.nome}` : ''}`}
        onClose={() => setMovementModalOpen(false)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-slate-600">
            {movementProduct
              ? `Entradas/saidas deste produto (vendas, compras e ajustes).`
              : 'Selecione um produto para ver a movimentacao.'}
          </div>
          <button
            onClick={exportMovements}
            className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-600 hover:bg-slate-50"
          >
            Exportar CSV
          </button>
        </div>
        <div className="overflow-hidden border border-slate-200 rounded-lg">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="py-2 px-3 text-left w-28">Data</th>
                <th className="py-2 px-3 text-left">Tipo</th>
                <th className="py-2 px-3 text-left">Origem</th>
                <th className="py-2 px-3 text-right w-20">Qtd</th>
                <th className="py-2 px-3 text-left">Contato</th>
              </tr>
            </thead>
            <tbody>
              {movementData.length === 0 ? (
                <tr className="border-t border-slate-200">
                  <td className="py-3 px-3 text-center text-slate-500" colSpan={5}>
                    Nenhuma movimentacao encontrada.
                  </td>
                </tr>
              ) : (
                movementData.map((m, idx) => (
                  <tr key={`${m.origem}-${idx}`} className="border-t border-slate-200">
                    <td className="py-2 px-3 text-slate-700">{m.data}</td>
                    <td className="py-2 px-3 text-slate-700">{m.tipo}</td>
                    <td className="py-2 px-3 text-slate-700">{m.origem}</td>
                    <td className="py-2 px-3 text-right text-slate-700">{m.quantidade}</td>
                    <td className="py-2 px-3 text-slate-700">{m.contato || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Modal>
      <Modal
        open={inventoryModalOpen}
        title={inventoryProduct ? `Inventário · ${inventoryProduct.id}` : 'Inventário'}
        onClose={() => setInventoryModalOpen(false)}
      >
        <div className="space-y-4">
          <div className="text-sm text-slate-600">
            Registre a contagem manual e corrija o estoque automaticamente. A diferença será registrada.
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Produto</label>
              <div className="px-3 py-2 rounded-md border border-slate-200 bg-slate-50 text-slate-800">
                {inventoryProduct ? `${inventoryProduct.id} · ${inventoryProduct.nome}` : 'Selecione um produto'}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Data</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                value={new Date().toISOString().slice(0, 10)}
                readOnly
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Estoque registrado</label>
              <div className="px-3 py-2 rounded-md border border-slate-200 bg-slate-50 text-slate-800">
                {inventoryProduct ? inventoryProduct.estoque : '-'}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Contagem real</label>
              <input
                type="number"
                min="0"
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                value={inventoryCount}
                onChange={(e) => {
                  const value = parseInt(e.target.value || '0')
                  setInventoryCount(Number.isNaN(value) ? 0 : value)
                }}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Observacoes sobre a contagem</label>
            <textarea
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
              rows={3}
              value={inventoryObs}
              onChange={(e) => setInventoryObs(e.target.value)}
            />
          </div>
          <div className="text-sm text-slate-600">
            Diferenca:{' '}
            <span className="font-semibold text-slate-800">
              {inventoryProduct ? inventoryCount - (inventoryProduct.estoque || 0) : 0}
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <button className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-700" onClick={() => setInventoryModalOpen(false)}>
              Cancelar
            </button>
            <button
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-semibold"
              onClick={handleInventorySave}
            >
              Registrar inventário
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
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = '.csv'
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = (ev) => {
                  const text = String(ev.target?.result || '')
                  const lines = text.split(/\r?\n/).filter(Boolean)
                  const novos: ProductItem[] = []
                  lines.forEach((line) => {
                    const [id, nome, categoria, preco, estoque] = line.split(';').map((s) => s.replace(/"/g, '').trim())
                    if (!nome) return
                    novos.push({
                      id: id || crypto.randomUUID(),
                      nome,
                      categoria: categoria || '',
                      preco: Number(preco) || 0,
                      estoque: Number(estoque) || 0,
                      tipo: 'produtos',
                    })
                  })
                  if (novos.length > 0) {
                    novos.forEach((n) => addProduto(n))
                    setProductToast(`${novos.length} produto(s) importados`)
                  } else {
                    setProductToast('Nenhum produto valido no CSV.')
                  }
                }
                reader.readAsText(file, 'utf-8')
              }
              input.click()
            }}
            className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-600"
          >
            Importar CSV
          </button>
          <button
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = '.csv'
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = (ev) => {
                  const text = String(ev.target?.result || '')
                  const lines = text.split(/\r?\n/).filter(Boolean)
                  const novos: ProductItem[] = []
                  lines.forEach((line) => {
                    const [id, nome, categoria, preco, estoque] = line.split(';').map((s) => s.replace(/"/g, '').trim())
                    if (!nome) return
                    novos.push({
                      id: id || crypto.randomUUID(),
                      nome,
                      categoria: categoria || '',
                      preco: Number(preco) || 0,
                      estoque: Number(estoque) || 0,
                      tipo: 'produtos',
                    })
                  })
                  if (novos.length > 0) {
                    novos.forEach((n) => addProduto(n))
                    setProductToast(`${novos.length} produto(s) importados`)
                  } else {
                    setProductToast('Nenhum produto valido no CSV.')
                  }
                }
                reader.readAsText(file, 'utf-8')
              }
              input.click()
            }}
            className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-600"
          >
            Importar CSV
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
          <button
            onClick={handleOpenMovement}
            className="border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-600"
          >
            Movimentacao
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

      {alertasEstoque.baixo.length > 0 && (
        <div className="border border-amber-200 bg-amber-50 text-amber-900 px-3 py-2 rounded-md text-sm">
          {alertasEstoque.baixo.length} produto(s) abaixo do estoque minimo.
          <div className="flex flex-wrap gap-2 mt-1">
            {alertasEstoque.baixo.slice(0, 6).map((p) => (
              <div key={p.id} className="flex gap-1">
                <button
                  onClick={() => {
                    setActiveTab('produtos')
                    setProductSearch(p.id)
                    setProductSelected([p.id])
                  }}
                  className="px-2 py-1 bg-white/70 hover:bg-white text-amber-900 border border-amber-200 rounded-md text-xs font-semibold transition"
                >
                  {p.id} - {p.nome}
                </button>
                <button
                  onClick={() => openInventoryModal(p)}
                  className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-200 rounded-md text-xs font-semibold transition"
                >
                  Inventário
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {alertasEstoque.semMov.length > 0 && (
        <div className="border border-slate-200 bg-slate-50 text-slate-700 px-3 py-2 rounded-md text-sm">
          {alertasEstoque.semMov.length} produto(s) sem movimento nos ultimos 30 dias.
        </div>
      )}
      <div className="border border-slate-200 bg-white/80 px-3 py-2 rounded-md text-sm shadow-sm">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-700">Inventário</span>
          <button
            onClick={() => openInventoryModal()}
            className="text-xs font-semibold text-emerald-600 hover:underline"
          >
            Registrar contagem
          </button>
        </div>
        <div className="mt-2 text-slate-600 text-xs">
          Últimas {Math.min(inventoryRecords.length, 3)} contagens:
        </div>
        <ul className="mt-2 space-y-1 text-xs text-slate-700">
          {inventoryRecords.length === 0 ? (
            <li className="text-slate-500">Sem registros recentes.</li>
          ) : (
            inventoryRecords.slice(-3).reverse().map((rec) => (
              <li key={rec.id} className="flex items-center justify-between border-b border-slate-100 pb-1">
                <div>
                  <strong>{rec.produtoId}</strong> · {rec.produtoNome}
                  <div className="text-[11px] text-slate-500">
                    {rec.data} · registrou {rec.registrado} · contou {rec.contado}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    rec.diferenca === 0 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {rec.diferenca > 0 ? `+${rec.diferenca}` : rec.diferenca.toString()}
                </span>
              </li>
            ))
          )}
        </ul>
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
  items: ProductItem[]
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
            <th className="py-3 px-3 text-left w-32">Docs</th>
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
                <td className="py-3 px-3 text-slate-700">
                  {p.estoque}
                  {p.estoqueMinimo !== undefined && p.estoqueMinimo > 0 && p.estoque <= p.estoqueMinimo && (
                    <span className="ml-2 text-xs text-amber-700 font-semibold">(baixo)</span>
                  )}
                </td>
                <td className="py-3 px-3 text-slate-700 text-xs">{p.documentos?.length || 0} doc(s)</td>
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
  items: ProductItem[]
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
  items: ProductItem[]
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
            <th className="py-3 px-3 text-left">Item</th>
            <th className="py-3 px-3 text-left">Contato</th>
            <th className="py-3 px-3 text-left">Observacoes</th>
            <th className="py-3 px-3 text-left w-28">Data</th>
            <th className="py-3 px-3 text-right w-24">Estoque</th>
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
                <td className="py-3 px-3 text-slate-700">{a.nome || 'Ajuste'}</td>
                <td className="py-3 px-3 text-slate-700">{a.contato || '-'}</td>
                <td className="py-3 px-3 text-slate-700 text-xs">{a.observacoes || '-'}</td>
                <td className="py-3 px-3 text-slate-700">{a.data || '-'}</td>
                <td className="py-3 px-3 text-right text-slate-700">{a.estoque ?? '-'}</td>
              </tr>
            ))
          )}
          <tr className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-700">
            <td className="py-3 px-3" colSpan={7}>
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


