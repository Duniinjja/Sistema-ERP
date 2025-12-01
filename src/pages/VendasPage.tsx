import { useEffect, useState } from 'react'
import type { SaleRecord, SalesTab } from '../types/erp'
import { useLocalCrud } from '../store'
import { formatMoney } from '../utils/format'
import { useMonthNavigator } from '../hooks/useMonthNavigator'
import { Toast } from '../components/Toast'
import { ModuleToolbar } from '../components/ModuleToolbar'
import { EmptyListRow } from '../components/EmptyListRow'
import { usePageMonitor } from '../hooks/usePageMonitor'

type SaleFormState = {
  cliente: string
  tipoVenda: 'Venda' | 'Orçamento'
  data: string
  consumidorFinal: boolean
  palavras: string
  produtoServico: 'Produto' | 'Serviço'
  itemDescricao: string
  preco: string
  quantidade: number
  desconto: string
  observacoes: string
  itemObservacoes: string
}

const productOptions = ['Produto', 'Serviço'] as const
const saleTypeOptions: SaleFormState['tipoVenda'][] = ['Venda', 'Orçamento']

const defaultSales: SaleRecord[] = [
  {
    id: 'V001',
    cliente: 'Loja Centro',
    vendedor: 'Carlos',
    data: '2025-11-05',
    tipo: 'Venda',
    total: 1520.5,
    registro: 'vendas',
    situacao: 'Concluida',
    itens: [{ produtoId: 'P001', quantidade: 1, valor: 1520.5 }],
  },
]

export function VendasPage({
  activeTab,
  setActiveTab,
  onFinanceUpsertSale,
}: {
  activeTab: SalesTab
  setActiveTab: (t: SalesTab) => void
  onFinanceUpsertSale: (sale: SaleRecord) => void
}) {
  usePageMonitor('Vendas')
  const [salesSearch, setSalesSearch] = useState('')
  const [salesOverlayOpen, setSalesOverlayOpen] = useState(false)
  const [salesForm, setSalesForm] = useState<SaleFormState>({
    cliente: '',
    tipoVenda: 'Venda',
    data: new Date().toISOString().slice(0, 10),
    consumidorFinal: true,
    palavras: '',
    produtoServico: 'Produto',
    itemDescricao: '',
    preco: '',
    quantidade: 1,
    desconto: '',
    observacoes: '',
    itemObservacoes: '',
  })
  const [toast, setToast] = useState<string | null>(null)
  const [salesItems, setSalesItems] = useState<SaleRecord[]>([])
  const { items: stored, add } = useLocalCrud<SaleRecord>('erp.sales', defaultSales)
  const { month: salesMonth, goNextMonth, goPrevMonth, resetMonth, label: salesMonthLabel } = useMonthNavigator()

  useEffect(() => {
    setSalesItems(stored)
  }, [stored])

  const filtered = salesItems.filter((sale) => {
    const d = new Date(sale.data)
    if (d.getMonth() !== salesMonth.getMonth() || d.getFullYear() !== salesMonth.getFullYear()) return false
    if (sale.registro !== activeTab) return false
    return sale.cliente.toLowerCase().includes(salesSearch.toLowerCase())
  })

  const priceValue = Number(salesForm.preco.toString().replace(',', '.')) || 0
  const quantityValue = Number(salesForm.quantidade) || 0
  const discountValue = Number(salesForm.desconto.toString().replace(',', '.')) || 0
  const itemTotal = Math.max(0, priceValue * quantityValue - discountValue)
  const formTotal = itemTotal

  const toolbarActions = [
    {
      label: 'Novo registro',
      onClick: () => setSalesOverlayOpen(true),
      variant: 'primary',
      tone: activeTab === 'devolucoes' ? 'info' : undefined,
    },
    { label: 'Exportar', onClick: () => setToast('Exportação enviada'), variant: 'ghost' },
    { label: 'Importar', onClick: () => setToast('Importação em breve'), variant: 'ghost' },
  ]

  const handleSaveSale = () => {
    if (!salesForm.cliente) {
      setToast('Informe o cliente.')
      return
    }
    if (!priceValue) {
      setToast('Informe o preço do item.')
      return
    }
    const sale: SaleRecord = {
      id: crypto.randomUUID(),
      cliente: salesForm.cliente,
      vendedor: 'Carlos',
      data: salesForm.data,
      tipo: salesForm.tipoVenda,
      registro: 'vendas',
      situacao: 'Concluida',
      total: formTotal,
      itens: [
        {
          produtoId: crypto.randomUUID(),
          quantidade: quantityValue,
          valor: priceValue,
        },
      ],
    }
    add(sale)
    onFinanceUpsertSale(sale)
    setToast('Venda salva')
    setSalesOverlayOpen(false)
    setSalesForm({
      cliente: '',
      tipoVenda: 'Venda',
      data: new Date().toISOString().slice(0, 10),
      consumidorFinal: true,
      palavras: '',
      produtoServico: 'Produto',
      itemDescricao: '',
      preco: '',
      quantidade: 1,
      desconto: '',
      observacoes: '',
      itemObservacoes: '',
    })
  }

  const tabButtons = (
    <div className="flex gap-2">
      <button
        onClick={() => setActiveTab('vendas')}
        className={`px-3 py-1.5 rounded-full border text-sm font-semibold ${activeTab === 'vendas' ? 'bg-amber-100 border-amber-300' : 'border-slate-200'}`}
      >
        Vendas
      </button>
      <button
        onClick={() => setActiveTab('devolucoes')}
        className={`px-3 py-1.5 rounded-full border text-sm font-semibold ${activeTab === 'devolucoes' ? 'bg-amber-100 border-amber-300' : 'border-slate-200'}`}
      >
        Devoluções
      </button>
    </div>
  )

  return (
    <section className="space-y-6">
      <Toast message={toast} onClose={() => setToast(null)} />
      {salesOverlayOpen && (
        <div className="fixed inset-0 z-40 flex flex-col bg-slate-900/70">
          <div className="absolute inset-0" onClick={() => setSalesOverlayOpen(false)} />
          <div className="relative mx-auto my-10 w-full max-w-[920px] rounded-[28px] bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 text-white flex items-center justify-between bg-emerald-600">
              <div>
                <h1 className="text-2xl font-semibold">Nova Venda</h1>
                <p className="text-xs opacity-90">Nenhum arquivo anexado</p>
              </div>
              <button className="text-2xl font-semibold leading-none" onClick={() => setSalesOverlayOpen(false)}>
                ✕
              </button>
            </div>
            <div className="grid gap-6 px-10 py-7 bg-slate-100">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-widest text-slate-500">Nome do cliente</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm"
                    placeholder="Cliente"
                    value={salesForm.cliente}
                    onChange={(e) => setSalesForm((prev) => ({ ...prev, cliente: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-widest text-slate-500">Venda ou orçamento?</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm appearance-none"
                    value={salesForm.tipoVenda}
                    onChange={(e) => setSalesForm((prev) => ({ ...prev, tipoVenda: e.target.value as SaleFormState['tipoVenda'] }))}
                  >
                    {saleTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-widest text-slate-500">Data</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={salesForm.data}
                    onChange={(e) => setSalesForm((prev) => ({ ...prev, data: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3 items-end">
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-widest text-slate-500">Consumidor final?</label>
                  <button
                    className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold ${
                      salesForm.consumidorFinal ? 'bg-sky-600 text-white border-sky-600' : 'border-slate-300 text-slate-600 bg-white'
                    }`}
                    onClick={() => setSalesForm((prev) => ({ ...prev, consumidorFinal: !prev.consumidorFinal }))}
                  >
                    {salesForm.consumidorFinal ? 'Sim' : 'Não'}
                  </button>
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-widest text-slate-500">Palavra-chave</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm"
                    placeholder="Palavra-chave"
                    value={salesForm.palavras}
                    onChange={(e) => setSalesForm((prev) => ({ ...prev, palavras: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Carrinho</p>
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <span>Produto ou serviço</span>
                    <span>Preço de venda</span>
                    <span>Quantidade</span>
                    <span>Desconto</span>
                    <span>Total</span>
                    <span />
                  </div>
                  <div className="grid grid-cols-12 gap-3 px-4 py-4 items-end">
                    <div className="col-span-5 space-y-1">
                      <div className="flex items-center gap-2">
                        <select
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm appearance-none"
                          value={salesForm.produtoServico}
                          onChange={(e) => setSalesForm((prev) => ({ ...prev, produtoServico: e.target.value as SaleFormState['produtoServico'] }))}
                        >
                          {productOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <input
                          className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm"
                          placeholder="Adicionar item"
                          value={salesForm.itemDescricao}
                          onChange={(e) => setSalesForm((prev) => ({ ...prev, itemDescricao: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Preço</label>
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <span className="text-slate-600">$</span>
                        <input
                          type="number"
                          className="flex-1 border-none px-1 py-0 text-sm focus:outline-none"
                          value={salesForm.preco}
                          onChange={(e) => setSalesForm((prev) => ({ ...prev, preco: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Quantidade</label>
                      <input
                        type="number"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={salesForm.quantidade}
                        onChange={(e) => setSalesForm((prev) => ({ ...prev, quantidade: Number(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="col-span-1">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Desconto</p>
                      <span className="text-sm text-slate-500">{formatMoney(discountValue)}</span>
                    </div>
                    <div className="col-span-1">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Total</p>
                      <span className="text-sm font-semibold text-slate-600">{formatMoney(itemTotal)}</span>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        className="text-red-600 hover:text-red-700"
                        onClick={() =>
                          setSalesForm((prev) => ({
                            ...prev,
                            itemDescricao: '',
                            preco: '',
                            quantidade: 1,
                            desconto: '',
                            itemObservacoes: '',
                          }))
                        }
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 pb-3 pt-1 border-t border-slate-200 text-sm font-semibold text-slate-600">
                    <span>Total</span>
                    <span>{formatMoney(formTotal)}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-widest text-slate-500">Observações gerais</label>
                <textarea
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm resize-none"
                  rows={3}
                  placeholder="Observações gerais"
                  value={salesForm.observacoes}
                  onChange={(e) => setSalesForm((prev) => ({ ...prev, observacoes: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 px-8 pb-6 pt-2 bg-slate-50">
              <button className="px-5 py-3 rounded-lg text-sm font-semibold text-white bg-emerald-500">Troco (F9)</button>
              <div className="flex gap-3">
                <button className="px-5 py-3 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-100" onClick={() => setSalesOverlayOpen(false)}>
                  Voltar
                </button>
                <button className="px-5 py-3 rounded-lg text-sm font-semibold text-white bg-emerald-600" onClick={handleSaveSale}>
                  Salvar venda
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <ModuleToolbar
          title="Vendas"
          description="Fluxo de receitas e devoluções."
          actions={toolbarActions}
          extra={tabButtons}
        />
        <div className="flex flex-wrap gap-3 mt-4">
          <button onClick={resetMonth} className="border px-3 py-2 text-sm rounded-md">
            Mês atual
          </button>
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <button onClick={goPrevMonth} className="border rounded-md px-2 py-1">
              {'<'}
            </button>
            <span className="capitalize">{salesMonthLabel}</span>
            <button onClick={goNextMonth} className="border rounded-md px-2 py-1">
              {'>'}
            </button>
          </div>
          <input
            className="border px-3 py-2 rounded-md text-sm text-slate-700"
            placeholder="Buscar ..."
            value={salesSearch}
            onChange={(e) => setSalesSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="py-3 px-3 text-left">Cliente</th>
              <th className="py-3 px-3 text-left">Vendedor</th>
              <th className="py-3 px-3 text-left">Tipo</th>
              <th className="py-3 px-3 text-left">Data</th>
              <th className="py-3 px-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((sale) => (
              <tr key={sale.id} className="border-t border-slate-100">
                <td className="py-3 px-3">{sale.cliente}</td>
                <td className="py-3 px-3">{sale.vendedor}</td>
                <td className="py-3 px-3">{sale.tipo}</td>
                <td className="py-3 px-3">{sale.data}</td>
                <td className="py-3 px-3 text-right text-slate-800">{formatMoney(sale.total)}</td>
              </tr>
            ))}
            {filtered.length === 0 && <EmptyListRow colSpan={5} />}
          </tbody>
        </table>
      </div>
    </section>
  )
}
