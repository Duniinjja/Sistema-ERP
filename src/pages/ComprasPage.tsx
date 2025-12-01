import { useMemo, useState } from 'react'
import { useMonthNavigator } from '../hooks/useMonthNavigator'
import type { PurchaseRecord, PurchaseTab } from '../types/erp'
import { useLocalCrud } from '../store'
import { formatMoney } from '../utils/format'
import { Toast } from '../components/Toast'
import { ModuleToolbar } from '../components/ModuleToolbar'
import { EmptyListRow } from '../components/EmptyListRow'
import { usePageMonitor } from '../hooks/usePageMonitor'

type PurchaseFormState = {
  fornecedor: string
  tipo: 'Compra' | 'Orçamento'
  data: string
  nota: string
  palavras: string
  observacoes: string
  produtoNome: string
  custoUnitario: string
  quantidade: number
  desconto: string
  outrosCustos: string
  custosExternos: string
  ipi: string
  substituicao: string
}

const defaultPurchaseForm: PurchaseFormState = {
  fornecedor: '',
  tipo: 'Compra',
  data: new Date().toISOString().slice(0, 10),
  nota: '',
  palavras: '',
  observacoes: '',
  produtoNome: '',
  custoUnitario: '',
  quantidade: 1,
  desconto: '',
  outrosCustos: '',
  custosExternos: '',
  ipi: '',
  substituicao: '',
}

export function ComprasPage({
  activeTab,
  onFinanceUpsertPurchase,
  onFinanceRemovePurchases,
}: {
  activeTab: PurchaseTab
  onFinanceUpsertPurchase: (p: PurchaseRecord) => void
  onFinanceRemovePurchases: (ids: string[]) => void
}) {
  usePageMonitor('Compras')
  const [purchaseSearch, setPurchaseSearch] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [form, setForm] = useState<PurchaseFormState>(defaultPurchaseForm)
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

  const unitCost = Number(form.custoUnitario || 0)
  const quantityValue = Number(form.quantidade || 0)
  const discountValue = Number(form.desconto) || 0
  const otherCostsValue = Number(form.outrosCustos) || 0
  const externalCostsValue = Number(form.custosExternos) || 0
  const ipiValue = Number(form.ipi) || 0
  const substitutionValue = Number(form.substituicao) || 0
  const itemTotal = Math.max(0, unitCost * quantityValue - discountValue + otherCostsValue)
  const formTotal = itemTotal + externalCostsValue + ipiValue + substitutionValue

  const handleSavePurchase = () => {
    if (!form.fornecedor || !unitCost || !quantityValue) {
      setToast('Informe fornecedor, custo unitário e quantidade.')
      return
    }
    const purchase: PurchaseRecord = {
      id: crypto.randomUUID(),
      fornecedor: form.fornecedor,
      nota: form.nota || 'NF',
      data: form.data,
      situacao: 'Rascunha',
      total: formTotal,
      itens: [
        {
          produtoId: crypto.randomUUID(),
          quantidade: quantityValue,
          valor: unitCost,
        },
      ],
      registro: 'compras',
    }
    add(purchase)
    onFinanceUpsertPurchase(purchase)
    setToast('Compra salva')
    setForm(defaultPurchaseForm)
    setOverlayOpen(false)
  }

  const toolbarActions = [
    { label: 'Novo registro', onClick: () => setOverlayOpen(true), variant: 'primary' },
    { label: 'Exportar', onClick: () => setToast('Exportação de compras pronta'), variant: 'ghost' },
    { label: 'Importar', onClick: () => setToast('Importação de notas pendente'), variant: 'ghost' },
  ]

  return (
    <section className="space-y-6">
      <Toast message={toast} onClose={() => setToast(null)} />
      {overlayOpen && (
        <div className="fixed inset-0 z-40 flex flex-col bg-slate-900/70">
          <div className="absolute inset-0" onClick={() => setOverlayOpen(false)} />
          <div className="relative mx-auto my-8 w-full max-w-[1600px] rounded-[28px] bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 text-white flex items-center justify-between bg-cyan-600">
              <div>
                <h1 className="text-2xl font-semibold">Nova compra</h1>
                <p className="text-xs opacity-90">Nenhum arquivo anexado</p>
              </div>
              <button className="text-2xl font-semibold leading-none" onClick={() => setOverlayOpen(false)}>
                ✕
              </button>
            </div>
            <div className="space-y-7 px-20 py-10 bg-slate-100">
              <div className="mx-auto w-full max-w-[1550px] space-y-7 max-h-[70vh] overflow-y-auto pr-3">
                <div className="rounded-xl bg-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Fornecedor</div>
                <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm"
                    placeholder="Nome do fornecedor"
                    value={form.fornecedor}
                    onChange={(e) => setForm((prev) => ({ ...prev, fornecedor: e.target.value }))}
                  />
                </div>
                <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr]">
                  <div className="space-y-1 rounded-xl bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Dados da compra</p>
                    <select
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      value={form.tipo}
                      onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value as PurchaseFormState['tipo'] }))}
                    >
                      <option value="Compra">Compra</option>
                      <option value="Orçamento">Orçamento</option>
                    </select>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      value={form.data}
                      onChange={(e) => setForm((prev) => ({ ...prev, data: e.target.value }))}
                    />
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm"
                      placeholder="Número da nota"
                      value={form.nota}
                      onChange={(e) => setForm((prev) => ({ ...prev, nota: e.target.value }))}
                    />
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm"
                      placeholder="Palavra-chave"
                      value={form.palavras}
                      onChange={(e) => setForm((prev) => ({ ...prev, palavras: e.target.value }))}
                    />
                    <textarea
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm resize-none"
                      placeholder="Observações gerais"
                      value={form.observacoes}
                      onChange={(e) => setForm((prev) => ({ ...prev, observacoes: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Dados do XML</p>
                    <p className="text-sm text-slate-500">Nenhum XML anexado a este registro</p>
                    <button className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white">Carregar XML</button>
                  </div>
                  <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Valores externos</p>
                    <div className="text-sm text-slate-500 space-y-1">
                      <div>Frete externo: <span className="font-semibold text-slate-700">R$ 0,00</span></div>
                      <div>Subst. Tribut. ICMS: <span className="font-semibold text-slate-700">R$ 0,00</span></div>
                      <div>Outras despesas: <span className="font-semibold text-slate-700">R$ 0,00</span></div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Produtos</p>
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                    <div className="grid grid-cols-[180px_minmax(0,360px)_120px_120px_120px_120px_120px_120px_120px_120px] gap-4 px-8 py-6 items-start">
                      <div className="col-span-3 space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Produto</label>
                        <input
                          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm"
                          placeholder="Nome do produto"
                          value={form.produtoNome}
                          onChange={(e) => setForm((prev) => ({ ...prev, produtoNome: e.target.value }))}
                        />
                      </div>
                      <div className="col-span-1 space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Custo unitário</label>
                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                          <span className="text-slate-600">R$</span>
                          <input
                            type="number"
                            className="flex-1 border-none px-1 py-0 text-sm focus:outline-none"
                            value={form.custoUnitario}
                            onChange={(e) => setForm((prev) => ({ ...prev, custoUnitario: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="col-span-1 space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Quantidade</label>
                        <input
                          type="number"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                          value={form.quantidade}
                          onChange={(e) => setForm((prev) => ({ ...prev, quantidade: Number(e.target.value) || 0 }))}
                        />
                      </div>
                      <div className="col-span-1 space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Desconto</label>
                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                          <span className="text-slate-600">R$</span>
                          <input
                            type="number"
                            className="flex-1 border-none px-1 py-0 text-sm focus:outline-none"
                            value={form.desconto}
                            onChange={(e) => setForm((prev) => ({ ...prev, desconto: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="col-span-1 space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Outros custos</label>
                        <input
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                          value={form.outrosCustos}
                          onChange={(e) => setForm((prev) => ({ ...prev, outrosCustos: e.target.value }))}
                        />
                      </div>
                      <div className="col-span-1 space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Custos externos</label>
                        <input
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                          value={form.custosExternos}
                          onChange={(e) => setForm((prev) => ({ ...prev, custosExternos: e.target.value }))}
                        />
                      </div>
                      <div className="col-span-1 space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">IPI</label>
                        <input
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                          value={form.ipi}
                          onChange={(e) => setForm((prev) => ({ ...prev, ipi: e.target.value }))}
                        />
                      </div>
                      <div className="col-span-1 space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Subst. Tributária</label>
                        <input
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                          value={form.substituicao}
                          onChange={(e) => setForm((prev) => ({ ...prev, substituicao: e.target.value }))}
                        />
                      </div>
                      <div className="col-span-1 flex flex-col">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Total</p>
                        <span className="text-sm font-semibold text-slate-600">{formatMoney(itemTotal)}</span>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button
                          className="text-red-600 hover:text-red-700"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              produtoNome: '',
                              custoUnitario: '',
                              quantidade: 1,
                              desconto: '',
                              outrosCustos: '',
                              custosExternos: '',
                              ipi: '',
                              substituicao: '',
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
              </div>
              <div className="flex items-center justify-between gap-3 px-8 pb-6 pt-2 bg-slate-50">
                <div />
                <div className="flex gap-3">
                  <button className="px-5 py-3 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-100" onClick={() => setOverlayOpen(false)}>
                    Voltar
                  </button>
                  <button className="px-5 py-3 rounded-lg text-sm font-semibold text-white bg-emerald-600" onClick={handleSavePurchase}>
                    Salvar compra
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <header className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <ModuleToolbar title="Compras" description="Compras e notas fiscais com movimentação de estoque." actions={toolbarActions} />
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
            {filtered.length === 0 && <EmptyListRow colSpan={4} />}
          </tbody>
        </table>
      </div>
    </section>
  )
}
