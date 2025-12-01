import { useState } from 'react'
import { useMonthNavigator } from '../hooks/useMonthNavigator'
import { Toast } from '../components/Toast'
import { ModuleToolbar } from '../components/ModuleToolbar'
import { EmptyListRow } from '../components/EmptyListRow'
import type { FinanceEntry, FinanceTab } from '../types/erp'
import { usePageMonitor } from '../hooks/usePageMonitor'

const emptyForm = () => ({
  descricao: '',
  contato: '',
  conta: '',
  valor: '',
  vencimento: new Date().toISOString().slice(0, 10),
  creditDate: '',
  categoria: '',
  palavras: '',
  receberAgora: false,
  observacao: '',
  emitente: 'Empresa emite recibo',
  vias: 'Apenas uma via',
  cpfCnpj: '',
  referente: '',
  reciboDate: new Date().toISOString().slice(0, 10),
})

const categoryOptionsByTab: Record<FinanceTab, string[]> = {
  recebimentos: ['Serviços', 'Produtos', 'Recorrentes'],
  pagamentos: ['Fornecedores', 'Despesas fixas', 'Tributos'],
  recibos: ['Serviços', 'Produtos', 'Recorrentes'],
}

const receiptEmitters = ['Empresa emite recibo', 'Cliente emite recibo', 'Outro emissor']
const receiptVias = ['Apenas uma via', 'Duas vias', 'Três vias']

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
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendente' | 'quitado'>('todos')
  const [toast, setToast] = useState<string | null>(null)
  const [cadastroPage, setCadastroPage] = useState(false)
  const [formData, setFormData] = useState(emptyForm())
  const [editing, setEditing] = useState<FinanceEntry | null>(null)
  const { month, goNextMonth, goPrevMonth, resetMonth, label } = useMonthNavigator()

  const filtered = entries.filter((entry) => {
    const date = new Date(entry.data)
    if (date.getMonth() !== month.getMonth() || date.getFullYear() !== month.getFullYear()) return false
    const matchesTab =
      activeTab === 'recebimentos'
        ? entry.tipo === 'recebimento'
        : activeTab === 'pagamentos'
        ? entry.tipo === 'pagamento'
        : entry.tipo === 'recibo'
    if (!matchesTab) return false
    if (statusFilter === 'pendente' && entry.situacao === 'Pago') return false
    if (statusFilter === 'quitado' && entry.situacao !== 'Pago' && entry.situacao !== 'Recebido') return false
    return search ? entry.descricao.toLowerCase().includes(search.toLowerCase()) : true
  })

  const tone: 'success' | 'danger' | 'purple' =
    activeTab === 'pagamentos' ? 'danger' : activeTab === 'recibos' ? 'purple' : 'success'

const prepareFormForEdit = (entry: FinanceEntry) => {
  setEditing(entry)
  setFormData({
    ...formData,
    descricao: entry.descricao,
    contato: entry.contato,
    conta: entry.conta,
    valor: entry.valor.toString(),
    vencimento: entry.data,
    categoria: entry.categoria ?? '',
    palavras: entry.palavras ?? '',
    observacao: entry.observacao ?? '',
    emitente: entry.emitente ?? 'Empresa emite recibo',
    vias: entry.vias ?? 'Apenas uma via',
    cpfCnpj: entry.cpfCnpj ?? '',
    referente: entry.referente ?? '',
    reciboDate: entry.reciboDate ?? new Date().toISOString().slice(0, 10),
  })
  setCadastroPage(true)
}

  const handleSaveEntry = () => {
    const valor = Number(formData.valor?.toString().replace(',', '.'))
    if (!formData.descricao || Number.isNaN(valor)) {
      setToast('Informe descrição e valor válidos.')
      return
    }
    const tipo: FinanceEntry['tipo'] =
      activeTab === 'recebimentos' ? 'recebimento' : activeTab === 'pagamentos' ? 'pagamento' : 'recibo'
    const dataValue =
      activeTab === 'recibos' && formData.reciboDate ? formData.reciboDate : new Date().toISOString().slice(0, 10)

    const basePayload = {
      descricao: formData.descricao,
      contato: formData.contato || 'Cliente',
      conta: formData.conta || 'Caixa',
      valor,
      tipo,
      categoria: formData.categoria || undefined,
      palavras: formData.palavras || undefined,
      observacao: formData.observacao || undefined,
      emitente: formData.emitente,
      vias: formData.vias,
      cpfCnpj: formData.cpfCnpj,
      referente: formData.referente,
      reciboDate: formData.reciboDate,
      data: dataValue,
    }

    if (editing) {
      updateEntry(editing.id, basePayload)
      setToast('Lançamento atualizado')
    } else {
      addEntry({
        ...basePayload,
        situacao: 'Pendente',
      })
      setToast('Lançamento criado')
    }
    setEditing(null)
    setFormData(emptyForm())
    setCadastroPage(false)
  }

  const toolbarActions = [
    { label: 'Novo lançamento', onClick: () => setCadastroPage(true), variant: 'primary', tone },
    { label: 'Exportar', onClick: () => setToast('Financeiro exportado'), variant: 'ghost' },
    { label: 'Importar', onClick: () => setToast('Importação em breve'), variant: 'ghost' },
  ]

  const sharedInputs = (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-xs uppercase tracking-widest text-slate-500">Descrição</label>
        <input
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"
          placeholder="Digite a descrição do lançamento"
          value={formData.descricao}
          onChange={(e) => setFormData((prev) => ({ ...prev, descricao: e.target.value }))}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-widest text-slate-500">Valor</label>
          <input
            type="number"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"
            value={formData.valor}
            onChange={(e) => setFormData((prev) => ({ ...prev, valor: Number(e.target.value) || 0 }))}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-widest text-slate-500">
            {activeTab === 'pagamentos' ? 'Pagar agora' : 'Receber agora'}
          </label>
          <button
            type="button"
            className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold ${formData.receberAgora ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300 text-slate-600 bg-white'}`}
            onClick={() => setFormData((prev) => ({ ...prev, receberAgora: !prev.receberAgora }))}
          >
            {formData.receberAgora ? 'Sim' : 'Não'}
          </button>
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-widest text-slate-500">Data de vencimento</label>
          <input
            type="date"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"
            value={formData.vencimento}
            onChange={(e) => setFormData((prev) => ({ ...prev, vencimento: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-widest text-slate-500">Data de crédito (previsão)</label>
          <input
            type="date"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"
            value={formData.creditDate}
            onChange={(e) => setFormData((prev) => ({ ...prev, creditDate: e.target.value }))}
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-widest text-slate-500">{tone === 'danger' ? 'Pago a' : 'Recebido de'}</label>
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"
            value={formData.contato}
            onChange={(e) => setFormData((prev) => ({ ...prev, contato: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-widest text-slate-500">Categoria</label>
          <div>
            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm appearance-none"
              value={formData.categoria}
              onChange={(e) => setFormData((prev) => ({ ...prev, categoria: e.target.value }))}
            >
              <option value="">{activeTab === 'pagamentos' ? 'Selecione a categoria de pagamento' : 'Selecione a categoria'}</option>
              {categoryOptionsByTab[activeTab].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400">
              {activeTab === 'pagamentos'
                ? 'Fila de categorias de pagamento será sincronizada com a lista oficial em breve.'
                : 'Categorias serão vinculadas em breve.'}
            </p>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-widest text-slate-500">Palavras-chave</label>
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"
            value={formData.palavras}
            onChange={(e) => setFormData((prev) => ({ ...prev, palavras: e.target.value }))}
          />
        </div>
      </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-widest text-slate-500">Observação</label>
            <textarea
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm resize-none"
              rows={3}
              maxLength={300}
              placeholder="Adicione uma observação sobre o lançamento"
              value={formData.observacao}
              onChange={(e) => setFormData((prev) => ({ ...prev, observacao: e.target.value }))}
            />
            <p className="text-[10px] text-slate-400">Máx. 300 caracteres.</p>
          </div>
    </div>
  )

  const receiptFields = (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-widest text-slate-500">Quem emite o recibo</label>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm appearance-none"
            value={formData.emitente}
            onChange={(e) => setFormData((prev) => ({ ...prev, emitente: e.target.value }))}
          >
            {receiptEmitters.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-widest text-slate-500">Vias a imprimir</label>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm appearance-none"
            value={formData.vias}
            onChange={(e) => setFormData((prev) => ({ ...prev, vias: e.target.value }))}
          >
            {receiptVias.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-widest text-slate-500">Recebi de</label>
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"
            value={formData.contato}
            onChange={(e) => setFormData((prev) => ({ ...prev, contato: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-widest text-slate-500">CPF ou CNPJ</label>
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"
            value={formData.cpfCnpj}
            onChange={(e) => setFormData((prev) => ({ ...prev, cpfCnpj: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-widest text-slate-500">O valor de</label>
          <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2">
            <span className="text-slate-600">$</span>
            <input
              type="number"
              className="flex-1 border-none px-1 py-0 text-sm focus:outline-none"
              value={formData.valor}
              onChange={(e) => setFormData((prev) => ({ ...prev, valor: Number(e.target.value) || 0 }))}
            />
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-widest text-slate-500">Na data</label>
          <input
            type="date"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            value={formData.reciboDate}
            onChange={(e) => setFormData((prev) => ({ ...prev, reciboDate: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-widest text-slate-500">Referente a</label>
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"
            value={formData.referente}
            onChange={(e) => setFormData((prev) => ({ ...prev, referente: e.target.value }))}
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs uppercase tracking-widest text-slate-500">Observação</label>
        <textarea
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm resize-none"
          rows={3}
          maxLength={300}
          placeholder="Adicione uma observação sobre o lançamento"
          value={formData.observacao}
          onChange={(e) => setFormData((prev) => ({ ...prev, observacao: e.target.value }))}
        />
        <p className="text-[10px] text-slate-400">Máx. 300 caracteres.</p>
      </div>
    </div>
  )

  return (
    <section className="space-y-6">
      <Toast message={toast} onClose={() => setToast(null)} />
      {cadastroPage && (
        <div className="fixed inset-0 z-40 flex flex-col bg-slate-900/70">
          <div className="absolute inset-0" onClick={() => setCadastroPage(false)} />
          <div className="relative mx-auto my-10 w-full max-w-[900px] rounded-[28px] bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div
              className={`px-6 py-4 text-white flex items-center justify-between ${
                tone === 'danger' ? 'bg-rose-600' : tone === 'purple' ? 'bg-purple-700' : 'bg-emerald-600'
              }`}
            >
              <div>
                <h1 className="text-2xl font-semibold">
                  {activeTab === 'recibos' ? 'Recibo' : tone === 'danger' ? 'Conta a pagar' : 'Conta a receber'}
                </h1>
                <p className="text-xs opacity-90">Nenhum arquivo anexado</p>
              </div>
              <button className="text-2xl font-semibold leading-none" onClick={() => setCadastroPage(false)}>
                ✕
              </button>
            </div>
            <div className="grid gap-6 px-10 py-8 bg-slate-100">
              {activeTab === 'recibos' ? receiptFields : sharedInputs}
            </div>
            <div className="flex justify-end gap-3 px-8 pb-6 pt-2 bg-slate-50">
              <button className="px-5 py-3 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-100" onClick={() => setCadastroPage(false)}>
                Voltar
              </button>
              <button className="px-5 py-3 rounded-lg text-sm font-semibold text-white" onClick={handleSaveEntry} style={{ backgroundColor: tone === 'danger' ? '#dc2626' : tone === 'purple' ? '#7c3aed' : '#15803d' }}>
                {activeTab === 'recibos' ? 'Salvar recibo' : tone === 'danger' ? 'Salvar pagamento' : 'Salvar recebimento'}
              </button>
            </div>
          </div>
        </div>
      )}
      <header className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <ModuleToolbar title="Financeiro" description="Recebimentos, pagamentos e recibos em um só lugar." actions={toolbarActions} extra={<div className="flex gap-2">{(['recebimentos', 'pagamentos', 'recibos'] as FinanceTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-full border text-sm font-semibold ${activeTab === tab ? 'bg-amber-100 border-amber-300 text-[#0f3047]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {tab}
          </button>
        ))}</div>} />
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <button onClick={resetMonth} className="border px-3 py-2 text-sm rounded-md bg-white hover:bg-slate-50 text-slate-700">
            Mês atual
          </button>
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <button onClick={goPrevMonth} className="border rounded-md px-2 py-1">
              {'<'}
            </button>
            <span className="capitalize">{label}</span>
            <button onClick={goNextMonth} className="border rounded-md px-2 py-1">
              {'>'}
            </button>
          </div>
          <input
            className="border px-3 py-2 rounded-md text-sm text-slate-700"
            placeholder="Buscar descrição"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
              <th className="py-3 px-3 text-center">Ações</th>
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
                <td className="py-3 px-3 text-center text-sm space-x-3">
                  <button
                    className="text-slate-500 hover:text-slate-900"
                    onClick={() => {
                      setEditing(entry)
                      setFormData({
                        ...formData,
                        descricao: entry.descricao,
                        contato: entry.contato,
                        conta: entry.conta,
                        valor: entry.valor.toString(),
                      })
                      setCadastroPage(true)
                    }}
                  >
                    Editar
                  </button>
                  <button
                    className="text-rose-500 hover:text-rose-700"
                    onClick={() => {
                      if (!confirm('Deseja remover este lançamento?')) return
                      removeEntry(entry.id)
                      setToast('Lançamento removido')
                    }}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <EmptyListRow colSpan={8} />}
          </tbody>
        </table>
      </div>
    </section>
  )
}
