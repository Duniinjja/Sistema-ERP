import { useCallback, useEffect, useState } from 'react'
import type { SaleRecord, SalesTab, SaleItem } from '../types/erp'
import { useLocalCrud } from '../store'
import { formatMoney } from '../utils/format'
import { useMonthNavigator } from '../hooks/useMonthNavigator'
import { Modal } from '../components/Modal'
import { Toast } from '../components/Toast'
import { usePageMonitor } from '../hooks/usePageMonitor'

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
  openNewSignal,
}: {
  activeTab: SalesTab
  setActiveTab: (t: SalesTab) => void
  onFinanceUpsertSale: (sale: SaleRecord) => void
  openNewSignal: number
}) {
  usePageMonitor('Vendas')
  const [salesSearch, setSalesSearch] = useState('')
  const [salesModalOpen, setSalesModalOpen] = useState(false)
  const [salesForm, setSalesForm] = useState<Omit<SaleRecord, 'id'>>({
    cliente: '',
    vendedor: '',
    data: new Date().toISOString().slice(0, 10),
    tipo: 'Venda',
    itens: [{ produtoId: '', quantidade: 1, valor: 0 }],
    total: 0,
  })
  const [toast, setToast] = useState<string | null>(null)
  const [salesItems, setSalesItems] = useState<SaleRecord[]>([])
  const { items: stored, add, update } = useLocalCrud<SaleRecord>('erp.sales', defaultSales)
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

  return (
    <section className="space-y-6">
      <Toast message={toast} onClose={() => setToast(null)} />
      <Modal open={salesModalOpen} title="Nova venda" onClose={() => setSalesModalOpen(false)}>
        <div className="space-y-3">
          <input
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="Cliente"
            value={salesForm.cliente}
            onChange={(e) => setSalesForm((p) => ({ ...p, cliente: e.target.value }))}
          />
          <input
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="Vendedor"
            value={salesForm.vendedor}
            onChange={(e) => setSalesForm((p) => ({ ...p, vendedor: e.target.value }))}
          />
          <button
            className="bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-semibold"
            onClick={() => {
              add({ ...salesForm, id: crypto.randomUUID(), registro: 'vendas' })
              setToast('Venda salva')
              setSalesModalOpen(false)
            }}
          >
            Salvar
          </button>
        </div>
      </Modal>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#0f3047]">Vendas</h2>
            <p className="text-sm text-slate-500">Fluxo de receitas e devoluções.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('vendas')} className={`px-3 py-1.5 rounded-full border ${activeTab === 'vendas' ? 'bg-amber-100 border-amber-300' : 'border-slate-200'}`}>
              Vendas
            </button>
            <button onClick={() => setActiveTab('devolucoes')} className={`px-3 py-1.5 rounded-full border ${activeTab === 'devolucoes' ? 'bg-amber-100 border-amber-300' : 'border-slate-200'}`}>
              Devoluções
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          <button onClick={resetMonth} className="border px-3 py-2 text-sm rounded-md">Mês atual</button>
          <div className="flex items-center gap-2 text-sm">
            <button onClick={goPrevMonth} className="border rounded-md px-2 py-1">{'<'}</button>
            <span className="capitalize">{salesMonthLabel}</span>
            <button onClick={goNextMonth} className="border rounded-md px-2 py-1">{'>'}</button>
          </div>
          <input
            className="border px-3 py-2 rounded-md text-sm text-slate-700"
            placeholder="Buscar ..."
            value={salesSearch}
            onChange={(e) => setSalesSearch(e.target.value)}
          />
          <button onClick={() => setSalesModalOpen(true)} className="bg-emerald-600 text-white px-3 py-2 rounded-md text-sm font-semibold">
            Novo
          </button>
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
          </tbody>
        </table>
      </div>
    </section>
  )
}
