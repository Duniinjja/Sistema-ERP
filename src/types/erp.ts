export type OnboardingStep = {
  id: 'config' | 'contatos' | 'produtos' | 'movimentos' | 'financeiro'
  label: string
  done: boolean
  detail: string
}

export type DashboardAlert = { id: string; text: string; tone: 'warn' | 'info' }
export type PieEntry = { name: string; value: number }

export type ProductItem = {
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
  produtoId?: string
}

export type FinanceTab = 'recebimentos' | 'pagamentos' | 'recibos'
export type SalesTab = 'vendas' | 'devolucoes'
export type PurchaseTab = 'compras'
export type ContactTab = 'clientes' | 'fornecedores' | 'transportadoras'
export type ProductTab = 'produtos' | 'servicos' | 'ajuste'

export type PurchaseItem = { produtoId: string; quantidade: number; valor: number }
export type PurchaseRecord = {
  id: string
  fornecedor: string
  nota: string
  data: string
  situacao?: 'Concluida' | 'Rascunho'
  itens: PurchaseItem[]
  total: number
  registro?: PurchaseTab
}

export type SaleItem = { produtoId: string; quantidade: number; valor: number }
export type SaleRecord = {
  id: string
  cliente: string
  vendedor: string
  data: string
  tipo: string
  registro?: SalesTab
  itens: SaleItem[]
  total: number
  situacao?: 'Concluida' | 'Rascunho'
}

export type ContactItem = {
  id: string
  nome: string
  fones?: string
  palavras?: string
  cidade?: string
  tipo: ContactTab
  observacoes?: string
  documentos?: string[]
  camposExtras?: string
}

export type InventoryRecord = {
  id: string
  produtoId: string
  produtoNome: string
  data: string
  contado: number
  registrado: number
  diferenca: number
  observacoes?: string
}

export type ConfigTab = 'geral' | 'plano' | 'caixa' | 'operacoes' | 'formas' | 'usuarios' | 'fiscal' | 'impressao'
export type Page = 'Dashboard' | 'Financeiro' | 'Vendas' | 'Compras' | 'Clientes' | 'Produtos' | 'Relatorios' | 'Configuracoes'
export type Kpi = { id: 'receita' | 'custos' | 'saldo' | 'fluxo'; title: string; value: string; trend: string; tone: 'success' | 'danger' | 'neutral' }
