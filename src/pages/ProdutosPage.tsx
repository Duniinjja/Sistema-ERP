import { useMemo, useState } from 'react'
import type { ProductTab, ProductItem } from '../types/erp'
import { useLocalCrud } from '../store'
import { produtosSeed } from '../data/seeds'
import { formatMoney } from '../utils/format'
import { Modal } from '../components/Modal'
import { Toast } from '../components/Toast'
import { ModuleToolbar } from '../components/ModuleToolbar'
import { usePageMonitor } from '../hooks/usePageMonitor'

export function ProdutosPage({
  activeTab,
  setActiveTab,
}: {
  activeTab: ProductTab
  setActiveTab: (t: ProductTab) => void
}) {
  usePageMonitor('Produtos')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    categoria: '',
    preco: '',
    estoque: '',
    tipo: 'produtos' as ProductTab,
  })
  const { items: produtos, add } = useLocalCrud<ProductItem>('erp.produtos', produtosSeed)

  const filtered = useMemo(
    () => produtos.filter((produto) => produto.nome.toLowerCase().includes(search.toLowerCase())),
    [produtos, search],
  )

  const toolbarActions = [
    { label: 'Novo produto', onClick: () => setModalOpen(true), variant: 'primary' },
    { label: 'Exportar', onClick: () => setToast('Exportação de produtos salva'), variant: 'ghost' },
    { label: 'Importar', onClick: () => setToast('Importação aguardando arquivos'), variant: 'ghost' },
  ]

  const tabButtons = (
    <div className="flex gap-2">
      {(['produtos', 'servicos', 'ajuste'] as ProductTab[]).map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`px-3 py-1 rounded-full border text-sm font-semibold ${activeTab === tab ? 'bg-amber-100 border-amber-300' : 'border-slate-200'}`}
        >
          {tab}
        </button>
      ))}
    </div>
  )

  return (
    <section className="space-y-6">
      <Toast message={toast} onClose={() => setToast(null)} />
      <Modal open={modalOpen} title="Novo produto" onClose={() => setModalOpen(false)}>
        <div className="space-y-3">
          <input
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="Nome"
            value={form.nome}
            onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
          />
          <input
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="Categoria"
            value={form.categoria}
            onChange={(e) => setForm((prev) => ({ ...prev, categoria: e.target.value }))}
          />
          <input
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="Preço"
            value={form.preco}
            onChange={(e) => setForm((prev) => ({ ...prev, preco: e.target.value }))}
          />
          <input
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="Estoque"
            value={form.estoque}
            onChange={(e) => setForm((prev) => ({ ...prev, estoque: e.target.value }))}
          />
          <select
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={form.tipo}
            onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value as ProductTab }))}
          >
            <option value="produtos">Produtos</option>
            <option value="servicos">Serviços</option>
            <option value="ajuste">Ajuste</option>
          </select>
          <button
            className="bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-semibold"
            onClick={() => {
              const preco = Number(form.preco.replace(',', '.'))
              const estoque = Number(form.estoque)
              if (!form.nome || Number.isNaN(preco)) {
                setToast('Informe nome e preço válidos.')
                return
              }
              add({
                id: crypto.randomUUID(),
                nome: form.nome,
                categoria: form.categoria,
                preco,
                estoque: Number.isNaN(estoque) ? 0 : estoque,
                tipo: form.tipo,
                palavras: '',
                documentos: [],
                camposExtras: '',
              })
              setToast('Produto salvo')
              setForm({ nome: '', categoria: '', preco: '', estoque: '', tipo: 'produtos' })
              setModalOpen(false)
            }}
          >
            Salvar produto
          </button>
        </div>
      </Modal>
      <header className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <ModuleToolbar title="Produtos" description="Produtos, serviços e ajustes." actions={toolbarActions} extra={tabButtons} />
      </header>
      <div className="flex gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-2 rounded-md text-sm w-full"
          placeholder="Procurar produto"
        />
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
