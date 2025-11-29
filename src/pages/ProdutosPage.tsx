import { useMemo, useState } from 'react'
import type { ProductTab, ProductItem } from '../types/erp'
import { useLocalCrud } from '../store'
import { produtosSeed } from '../data/seeds'
import { formatMoney } from '../utils/format'
import { Modal } from '../components/Modal'
import { Toast } from '../components/Toast'
import { usePageMonitor } from '../hooks/usePageMonitor'

export function ProdutosPage({ activeTab, setActiveTab, openNewSignal }: { activeTab: ProductTab; setActiveTab: (t: ProductTab) => void; openNewSignal: number }) {
  usePageMonitor('Produtos')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const { items: produtos } = useLocalCrud<ProductItem>('erp.produtos', produtosSeed)

  const filtered = useMemo(
    () => produtos.filter((produto) => produto.nome.toLowerCase().includes(search.toLowerCase())),
    [produtos, search],
  )

  return (
    <section className="space-y-6">
      <Toast message={toast} onClose={() => setToast(null)} />
      <header className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#0f3047]">Produtos</h2>
          <p className="text-sm text-slate-500">Produtos, serviços e ajustes.</p>
        </div>
        <div className="flex gap-2">
          {(['produtos', 'servicos', 'ajuste'] as ProductTab[]).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1 rounded-full border ${activeTab === tab ? 'bg-amber-100 border-amber-300' : 'border-slate-200'}`}>
              {tab}
            </button>
          ))}
        </div>
      </header>
      <div className="flex gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} className="border px-3 py-2 rounded-md text-sm w-full" placeholder="Procurar produto" />
        <button className="bg-emerald-600 text-white px-3 py-2 rounded-md text-sm font-semibold">Novo</button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="py-3 px-3 text-left">Nome</th>
              <th className="py-3 px-3 text-left">Categoria</th>
              <th className="py-3 px-3 text-right">Preço</th>
              <th className="py-3 px-3 text-right">Estoque</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((produto) => (
              <tr key={produto.id} className="border-t border-slate-100">
                <td className="py-3 px-3">{produto.nome}</td>
                <td className="py-3 px-3">{produto.categoria}</td>
                <td className="py-3 px-3 text-right">{formatMoney(produto.preco)}</td>
                <td className="py-3 px-3 text-right">{produto.estoque}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
