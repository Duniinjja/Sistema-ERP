import { useCallback, useEffect, useState } from 'react'
import { useMonthNavigator } from '../hooks/useMonthNavigator'
import type { PurchaseItem, PurchaseRecord, PurchaseTab } from '../types/erp'
import { useLocalCrud } from '../store'
import { produtosSeed } from '../data/seeds'
import { formatMoney } from '../utils/format'
import { Modal } from '../components/Modal'
import { Toast } from '../components/Toast'
import { usePageMonitor } from '../hooks/usePageMonitor'

export function ComprasPage({
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
  usePageMonitor('Compras')
  const [purchaseSearch, setPurchaseSearch] = useState('')
  const [purchaseSelected, setPurchaseSelected] = useState<string[]>([])
  const { items: compras, add } = useLocalCrud<PurchaseRecord>('erp.compras', [
    {
      id: 'C001',
      fornecedor: 'Fornec Uno',
      nota: 'NF123',
      data: '2025-11-03',
      situacao: 'Concluida',
      total: 350.5,
      itens: [{ produtoId: 'P001', quantidade: 2, valor: 150 }],
      registro: 'compras',
    },
  ])
  const { month: purchaseMonth, goNextMonth, goPrevMonth, resetMonth, label: purchaseMonthLabel } = useMonthNavigator()

  const filtered = compras.filter((compra) => {
    const d = new Date(compra.data)
    if (d.getMonth() !== purchaseMonth.getMonth() || d.getFullYear() !== purchaseMonth.getFullYear()) return false
    if (!purchaseSearch) return true
    return [compra.fornecedor, compra.nota].some((field) => field.toLowerCase().includes(purchaseSearch.toLowerCase()))
  })

  return (
    <section className="space-y-6">
      <Toast message={null} onClose={() => {}} />
      <header className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#0f3047]">Compras</h2>
            <p className="text-sm text-slate-500">Compras e notas fiscais com movimentação de estoque.</p>
          </div>
          <button className="bg-emerald-600 text-white px-3 py-2 rounded-md text-sm font-semibold" onClick={() => {}}>
            Novo
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <button onClick={resetMonth} className="border px-3 py-2 text-sm rounded-md">
            Mês atual
          </button>
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <button onClick={goPrevMonth} className="border rounded-md px-2 py-1">
              {'<'}
            </button>
            <span className="capitalize">{purchaseMonthLabel}</span>
            <button onClick={goNextMonth} className="border rounded-md px-2 py-1">
              {'>'}
            </button>
          </div>
          <input
            value={purchaseSearch}
            onChange={(e) => setPurchaseSearch(e.target.value)}
            placeholder="Buscar fornecedor ou nota"
            className="border px-3 py-2 rounded-md text-sm text-slate-700"
          />
        </div>
      </header>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="py-3 px-3 text-left">Fornecedor</th>
              <th className="py-3 px-3 text-left">Nota</th>
              <th className="py-3 px-3 text-left">Data</th>
              <th className="py-3 px-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((compra) => (
              <tr key={compra.id} className="border-t border-slate-100">
                <td className="py-3 px-3">{compra.fornecedor}</td>
                <td className="py-3 px-3">{compra.nota}</td>
                <td className="py-3 px-3">{compra.data}</td>
                <td className="py-3 px-3 text-right">{formatMoney(compra.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
