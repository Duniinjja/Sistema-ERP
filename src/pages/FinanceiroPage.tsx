import { useState } from 'react'
import { useMonthNavigator } from '../hooks/useMonthNavigator'
import type { FinanceEntry, FinanceTab } from '../types/erp'
import { formatMoney } from '../utils/format'
import { useLocalCrud } from '../store'
import { usePageMonitor } from '../hooks/usePageMonitor'

const headerPalette: Record<FinanceTab, string> = {
  recebimentos: 'bg-green-600 text-white',
  pagamentos: 'bg-red-600 text-white',
  recibos: 'bg-purple-700 text-white',
}

export function FinanceiroPage({
  activeTab,
  setActiveTab,
  entries,
  addEntry,
  removeEntry,
  updateEntry,
  formatMoney: formatMoneyProp,
}: {
  activeTab: FinanceTab
  setActiveTab: (t: FinanceTab) => void
  entries: FinanceEntry[]
  addEntry: (data: Omit<FinanceEntry, 'id'>) => void
  removeEntry: (id: string) => void
  updateEntry: (id: string, data: Partial<FinanceEntry>) => void
  formatMoney: (n: number) => string
}) {
  usePageMonitor('Financeiro')
  const [financeSearch, setFinanceSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendente' | 'quitado'>('todos')
  const { month: financeMonth, goNextMonth, goPrevMonth, resetMonth, label: financeMonthLabel } = useMonthNavigator()

  const filtered = entries.filter((entry) => {
    const date = new Date(entry.data)
    if (date.getMonth() !== financeMonth.getMonth() || date.getFullYear() !== financeMonth.getFullYear()) return false
    const matchesTab =
      activeTab === 'recebimentos'
        ? entry.tipo === 'recebimento'
        : activeTab === 'pagamentos'
        ? entry.tipo === 'pagamento'
        : entry.tipo === 'recibo'
    if (!matchesTab) return false
    if (statusFilter === 'pendente' && entry.situacao === 'Pago') return false
    if (statusFilter === 'quitado' && entry.situacao !== 'Pago' && entry.situacao !== 'Recebido') return false
    if (!financeSearch) return true
    return entry.descricao.toLowerCase().includes(financeSearch.toLowerCase())
  })

  return (
    <section className="space-y-6">
      <header className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#0f3047]">Financeiro</h2>
            <p className="text-sm text-slate-500">Recebimentos, pagamentos e recibos em um só lugar.</p>
          </div>
          <div className="flex gap-2">
            {(['recebimentos', 'pagamentos', 'recibos'] as FinanceTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-full border text-sm font-semibold ${
                  activeTab === tab ? 'bg-amber-100 border-amber-300 text-[#0f3047]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <button onClick={resetMonth} className="border px-3 py-2 text-sm rounded-md bg-white hover:bg-slate-50 text-slate-700">
            Mês atual
          </button>
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <button onClick={goPrevMonth} className="border rounded-md px-2 py-1">
              {'<'}
            </button>
            <span className="capitalize">{financeMonthLabel}</span>
            <button onClick={goNextMonth} className="border rounded-md px-2 py-1">
              {'>'}
            </button>
          </div>
          <input
            className="border px-3 py-2 rounded-md text-sm text-slate-700"
            placeholder="Buscar descrição"
            value={financeSearch}
            onChange={(e) => setFinanceSearch(e.target.value)}
          />
          <select className="border px-3 py-2 rounded-md text-sm text-slate-700" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
            <option value="todos">Todos</option>
            <option value="pendente">Pendentes</option>
            <option value="quitado">Quitados</option>
          </select>
        </div>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="py-3 px-3 text-left w-12">Cod</th>
              <th className="py-3 px-3 text-left">Descrição</th>
              <th className="py-3 px-3 text-left">Contato</th>
              <th className="py-3 px-3 text-left">Conta</th>
              <th className="py-3 px-3 text-left">Data</th>
              <th className="py-3 px-3 text-left">Situação</th>
              <th className="py-3 px-3 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => (
              <tr key={entry.id} className="border-t border-slate-100">
                <td className="py-3 px-3 text-slate-600">{entry.id}</td>
                <td className="py-3 px-3 text-slate-800">{entry.descricao}</td>
                <td className="py-3 px-3 text-slate-700">{entry.contato}</td>
                <td className="py-3 px-3 text-slate-700">{entry.conta}</td>
                <td className="py-3 px-3 text-slate-700">{entry.data}</td>
                <td className="py-3 px-3 text-slate-700">{entry.situacao}</td>
                <td className="py-3 px-3 text-right text-slate-800">{formatMoneyProp(entry.valor)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-500">
                  Nenhum lançamento encontrado para este mês.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
