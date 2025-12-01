import { useEffect, useMemo, useState } from 'react'
import type { ProductTab, ProductItem } from '../types/erp'
import { useLocalCrud } from '../store'
import { produtosSeed } from '../data/seeds'
import { formatMoney } from '../utils/format'
import { Toast } from '../components/Toast'
import { ModuleToolbar } from '../components/ModuleToolbar'
import { usePageMonitor } from '../hooks/usePageMonitor'
import { EmptyListRow } from '../components/EmptyListRow'

type ProductFormState = {
  tipo: ProductTab
  nome: string
  codigo: string
  categoria: string
  palavras: string
  arquivar: boolean
  precoCusto: string
  precoVenda: string
  margem: string
  controlaEstoque: boolean
  estoqueAtual: string
  estoqueMinimo: string
  notas: string
  origem: string
  ean: string
  pesoLiquido: string
  pesoBruto: string
  ncm: string
  unidade: string
  excecaoIpi: string
  codigoCest: string
  unidadeTributaria: string
  ignorarTributos: string
  informacoes: string
}

const defaultProductForm: ProductFormState = {
  tipo: 'produtos',
  nome: '',
  codigo: '',
  categoria: '',
  palavras: '',
  arquivar: false,
  precoCusto: '',
  precoVenda: '',
  margem: '',
  controlaEstoque: true,
  estoqueAtual: '',
  estoqueMinimo: '',
  notas: '',
  origem: '',
  ean: '',
  pesoLiquido: '',
  pesoBruto: '',
  ncm: '',
  unidade: '',
  excecaoIpi: '',
  codigoCest: '',
  unidadeTributaria: '',
  ignorarTributos: '',
  informacoes: '',
}

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
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [tab, setTab] = useState<'dados' | 'fiscais' | 'fotos'>('dados')
  const [form, setForm] = useState<ProductFormState>(defaultProductForm)
  const [serviceTouched, setServiceTouched] = useState(false)
  const { items: produtos, add } = useLocalCrud<ProductItem>('erp.produtos', produtosSeed)

  const filtered = useMemo(
    () => produtos.filter((produto) => produto.nome.toLowerCase().includes(search.toLowerCase())),
    [produtos, search],
  )

  const entityLabel = activeTab === 'servicos' ? 'serviço' : 'produto'
  const isService = activeTab === 'servicos'
  const isAdjustment = activeTab === 'ajuste'

  const [adjustFilter, setAdjustFilter] = useState('')
  const [adjustValues, setAdjustValues] = useState<Record<string, string>>({})

  useEffect(() => {
    if (overlayOpen && isAdjustment) {
      const defaults: Record<string, string> = {}
      produtos.forEach((produto) => {
        defaults[produto.id] = produto.estoque.toString()
      })
      setAdjustValues(defaults)
      setAdjustFilter('')
    }
  }, [overlayOpen, isAdjustment, produtos])

  useEffect(() => {
    setTab('dados')
    setServiceTouched(false)
  }, [activeTab])

  const handleSave = () => {
    if (!form.nome) {
      setToast(`Informe o nome do ${entityLabel}.`)
      if (activeTab === 'servicos') {
        setServiceTouched(true)
      }
      return
    }
    add({
      id: crypto.randomUUID(),
      nome: form.nome,
      categoria: form.categoria,
      preco: Number(form.precoVenda.replace(',', '.')) || 0,
      estoque: Number(form.estoqueAtual) || 0,
      tipo: form.tipo,
      palavras: form.palavras,
      documentos: [],
      camposExtras: form.notas,
    })
    setToast('Produto salvo')
    setForm(defaultProductForm)
    setTab('dados')
    setServiceTouched(false)
    setOverlayOpen(false)
  }
  const handleAdjustmentNextStep = () => {
    setToast('Ajuste salvo')
    setOverlayOpen(false)
  }
  const overlayHeaderClass = isService ? 'bg-purple-600' : isAdjustment ? 'bg-sky-600' : 'bg-emerald-600'
  const filteredAdjustProducts = produtos.filter((produto) => {
    const query = adjustFilter.toLowerCase()
    return (
      produto.nome.toLowerCase().includes(query) ||
      produto.categoria.toLowerCase().includes(query) ||
      produto.palavras?.toLowerCase().includes(query) ||
      produto.tipo.includes(query)
    )
  })

  const toolbarActions = [
    {
      label: 'Novo produto',
      onClick: () => {
        setOverlayOpen(true)
        setTab('dados')
        setServiceTouched(false)
      },
      variant: 'primary',
      tone: activeTab === 'servicos' ? 'purple' : activeTab === 'ajuste' ? 'dark' : undefined,
    },
    { label: 'Exportar', onClick: () => setToast('Exportação de produtos salva'), variant: 'ghost' },
    { label: 'Importar', onClick: () => setToast('Importação aguardando arquivos'), variant: 'ghost' },
  ]

  const tabButtons = (
    <div className="flex gap-2">
      {(['produtos', 'servicos', 'ajuste'] as ProductTab[]).map((tabId) => (
        <button
          key={tabId}
          onClick={() => setActiveTab(tabId)}
          className={`px-3 py-1 rounded-full border text-sm font-semibold ${
            activeTab === tabId ? 'bg-amber-100 border-amber-300' : 'border-slate-200'
          }`}
        >
          {tabId}
        </button>
      ))}
    </div>
  )
  const headerTabs = isService
    ? (['dados', 'fiscais'] as const)
    : isAdjustment
    ? (['dados'] as const)
    : (['dados', 'fiscais', 'fotos'] as const)
  const overlayTitle = isAdjustment ? 'Novo ajuste de estoque' : isService ? 'Novo serviço' : 'Novo produto'
  const overlaySubtitle = isAdjustment
    ? 'Para criar o ajuste, informe a quantidade que deverá permanecer em estoque em cada produto.'
    : 'Nenhum arquivo anexado'
  const overlayPrimaryLabel = isAdjustment ? 'Próximo passo' : isService ? 'Salvar serviço' : 'Salvar produto'
  const overlayPrimaryAction = isAdjustment ? () => handleAdjustmentNextStep() : handleSave
  const overlayPrimaryClass = isAdjustment
    ? 'bg-sky-600 hover:bg-sky-500'
    : isService
    ? 'bg-purple-600 hover:bg-purple-500'
    : 'bg-emerald-600 hover:bg-emerald-500'

  return (
    <section className="space-y-6">
      <Toast message={toast} onClose={() => setToast(null)} />
      {overlayOpen && (
        <div className="fixed inset-0 z-40 flex flex-col bg-slate-900/70">
          <div className="absolute inset-0" onClick={() => setOverlayOpen(false)} />
          <div className="relative mx-auto my-8 w-full max-w-[1300px] rounded-[28px] bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className={`px-6 py-4 text-white flex items-center justify-between ${overlayHeaderClass}`}>
              <div>
                <h1 className="text-2xl font-semibold">{overlayTitle}</h1>
                <p className="text-xs opacity-90">{overlaySubtitle}</p>
              </div>
              <button className="text-2xl font-semibold leading-none" onClick={() => setOverlayOpen(false)}>
                ✕
              </button>
            </div>
            <div className="flex border-b border-slate-200 bg-slate-100 text-xs font-semibold uppercase tracking-[0.3em]">
              {headerTabs.map((tabId) => (
                <button
                  key={tabId}
                  className={`flex-1 px-4 py-3 text-center ${
                    tab === tabId
                      ? `bg-white shadow-inner ${isService ? 'text-purple-600' : isAdjustment ? 'text-sky-600' : 'text-emerald-600'}`
                      : 'hover:bg-slate-50'
                  }`}
                  onClick={() => setTab(tabId as typeof tab)}
                >
                  {tabId === 'dados'
                    ? isAdjustment
                      ? 'Dados do ajuste'
                      : isService
                      ? 'Dados do serviço'
                      : 'Dados do produto'
                    : tabId === 'fiscais'
                    ? 'Dados fiscais'
                    : 'Fotos / integração'}
                </button>
              ))}
            </div>
            <div className="px-10 py-8 space-y-6 bg-slate-100">
              {isAdjustment ? (
                <div className="space-y-6">
                  <p className="text-sm text-slate-600">{overlaySubtitle}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Buscar</span>
                    <input
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm"
                      placeholder="Digite para filtrar"
                      value={adjustFilter}
                      onChange={(e) => setAdjustFilter(e.target.value)}
                    />
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm border-collapse">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-[0.3em]">
                          <tr>
                            <th className="px-4 py-3 text-left">Cód</th>
                            <th className="px-4 py-3 text-left">Nome</th>
                            <th className="px-4 py-3 text-left">Categoria</th>
                            <th className="px-4 py-3 text-left">Un</th>
                            <th className="px-4 py-3 text-left">Palavras-chave</th>
                            <th className="px-4 py-3 text-right">Estoque atual</th>
                            <th className="px-4 py-3 text-right">Novo estoque</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAdjustProducts.map((produto, index) => (
                            <tr key={produto.id} className="border-t border-slate-100">
                              <td className="px-4 py-3 text-left">{index + 1}</td>
                              <td className="px-4 py-3 text-left">{produto.nome}</td>
                              <td className="px-4 py-3 text-left">{produto.categoria || '-'}</td>
                              <td className="px-4 py-3 text-left">UN</td>
                              <td className="px-4 py-3 text-left">{produto.palavras || '-'}</td>
                              <td className="px-4 py-3 text-right text-rose-600 font-semibold">{produto.estoque}</td>
                              <td className="px-4 py-3 text-right">
                                <input
                                  type="number"
                                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm"
                                  value={adjustValues[produto.id] ?? ''}
                                  onChange={(e) =>
                                    setAdjustValues((prev) => ({ ...prev, [produto.id]: e.target.value }))
                                  }
                                />
                              </td>
                            </tr>
                          ))}
                          {filteredAdjustProducts.length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-6 text-center text-slate-500">
                                Nenhum item encontrado
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {tab === 'dados' && (
                    <>
                      {activeTab === 'servicos' ? (
                        <div className="space-y-4 rounded-xl bg-white p-5 border border-slate-200 shadow-sm">
                          <div className="space-y-1">
                            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Nome</label>
                            <input
                              className={`w-full rounded-lg px-3 py-2 text-sm ${
                                serviceTouched && !form.nome ? 'border border-rose-500 bg-white' : 'border border-slate-200 bg-white'
                              }`}
                              placeholder="Nome do serviço"
                              value={form.nome}
                              onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
                              onBlur={() => setServiceTouched(true)}
                            />
                          </div>
                          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                            <div className="space-y-1">
                              <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Preço de venda</label>
                              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                                <span className="text-slate-600">$</span>
                                <input
                                  type="number"
                                  className="flex-1 border-none px-1 py-0 text-sm focus:outline-none"
                                  placeholder="0,00"
                                  value={form.precoVenda}
                                  onChange={(e) => setForm((prev) => ({ ...prev, precoVenda: e.target.value }))}
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Palavras-chave</label>
                              <input
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                placeholder="Palavras-chave"
                                value={form.palavras}
                                onChange={(e) => setForm((prev) => ({ ...prev, palavras: e.target.value }))}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Observações internas</label>
                            <textarea
                              rows={3}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm resize-none"
                              placeholder="Anotações sobre o serviço"
                              value={form.notas}
                              onChange={(e) => setForm((prev) => ({ ...prev, notas: e.target.value }))}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 rounded-xl bg-white p-5 border border-slate-200 shadow-sm">
                          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                            <input
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                              placeholder="Nome"
                              value={form.nome}
                              onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
                            />
                            <input
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                              placeholder="Código próprio"
                              value={form.codigo}
                              onChange={(e) => setForm((prev) => ({ ...prev, codigo: e.target.value }))}
                            />
                          </div>
                          <div className="grid gap-4 lg:grid-cols-4">
                            <input
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                              placeholder="Categoria"
                              value={form.categoria}
                              onChange={(e) => setForm((prev) => ({ ...prev, categoria: e.target.value }))}
                            />
                            <input
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                              placeholder="Palavras-chave"
                              value={form.palavras}
                              onChange={(e) => setForm((prev) => ({ ...prev, palavras: e.target.value }))}
                            />
                            <div className="flex items-center gap-2">
                              <span>Arquivar</span>
                              <button
                                className={`px-3 py-1 rounded border ${form.arquivar ? 'bg-slate-800 text-white' : 'bg-white'}`}
                                onClick={() => setForm((prev) => ({ ...prev, arquivar: !prev.arquivar }))}
                              >
                                {form.arquivar ? 'Sim' : 'Não'}
                              </button>
                            </div>
                            <input
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                              placeholder="Notas internas"
                              value={form.notas}
                              onChange={(e) => setForm((prev) => ({ ...prev, notas: e.target.value }))}
                            />
                          </div>
                          <div className="grid gap-4 lg:grid-cols-3">
                            <input
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                              placeholder="Preço de custo"
                              value={form.precoCusto}
                              onChange={(e) => setForm((prev) => ({ ...prev, precoCusto: e.target.value }))}
                            />
                            <input
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                              placeholder="Preço de venda"
                              value={form.precoVenda}
                              onChange={(e) => setForm((prev) => ({ ...prev, precoVenda: e.target.value }))}
                            />
                            <input
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                              placeholder="Margem (%)"
                              value={form.margem}
                              onChange={(e) => setForm((prev) => ({ ...prev, margem: e.target.value }))}
                            />
                          </div>
                          <div className="grid gap-4 lg:grid-cols-3">
                            <div className="flex items-center gap-2">
                              <span>Controlar estoque</span>
                              <button
                                className={`px-3 py-1 rounded border ${form.controlaEstoque ? 'bg-slate-800 text-white' : 'bg-white'}`}
                                onClick={() => setForm((prev) => ({ ...prev, controlaEstoque: !prev.controlaEstoque }))}
                              >
                                {form.controlaEstoque ? 'Sim' : 'Não'}
                              </button>
                            </div>
                            <input
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                              placeholder="Estoque atual"
                              value={form.estoqueAtual}
                              onChange={(e) => setForm((prev) => ({ ...prev, estoqueAtual: e.target.value }))}
                            />
                            <input
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                              placeholder="Estoque mínimo"
                              value={form.estoqueMinimo}
                              onChange={(e) => setForm((prev) => ({ ...prev, estoqueMinimo: e.target.value }))}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {tab === 'fiscais' && (
                    <div className="space-y-4 rounded-xl bg-white p-5 border border-slate-200 shadow-sm">
                      {activeTab === 'servicos' ? (
                        <>
                          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
                            <div className="space-y-1">
                              <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Item lista serviço</label>
                              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                                <input
                                  className="flex-1 border-none px-1 py-0 text-sm focus:outline-none"
                                  placeholder="Buscar item"
                                  value={form.origem}
                                  onChange={(e) => setForm((prev) => ({ ...prev, origem: e.target.value }))}
                                />
                                <button className="rounded bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Buscar</button>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs uppercase tracking-[0.3em] text-slate-500">CNAE</label>
                              <input
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                placeholder="CNAE"
                                value={form.ncm}
                                onChange={(e) => setForm((prev) => ({ ...prev, ncm: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Código de tributação municipal</label>
                              <input
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                placeholder="Código municipal"
                                value={form.codigoCest}
                                onChange={(e) => setForm((prev) => ({ ...prev, codigoCest: e.target.value }))}
                              />
                            </div>
                          </div>
                          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600">
                            Grupo tributário vinculado <button className="text-sky-600 underline">Alterar</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="grid gap-4 lg:grid-cols-3">
                            <select
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                              value={form.origem}
                              onChange={(e) => setForm((prev) => ({ ...prev, origem: e.target.value }))}
                            >
                              <option value="">Origem</option>
                              <option value="nacional">Nacional</option>
                              <option value="importado">Importado</option>
                            </select>
                            <input
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                              placeholder="Referência EAN/GTIN"
                              value={form.ean}
                              onChange={(e) => setForm((prev) => ({ ...prev, ean: e.target.value }))}
                            />
                            <input
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                              placeholder="Peso líquido"
                              value={form.pesoLiquido}
                              onChange={(e) => setForm((prev) => ({ ...prev, pesoLiquido: e.target.value }))}
                            />
                          </div>
                          <div className="grid gap-4 lg:grid-cols-3">
                            <input
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                              placeholder="Peso bruto"
                              value={form.pesoBruto}
                              onChange={(e) => setForm((prev) => ({ ...prev, pesoBruto: e.target.value }))}
                            />
                            <input
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                              placeholder="NCM"
                              value={form.ncm}
                              onChange={(e) => setForm((prev) => ({ ...prev, ncm: e.target.value }))}
                            />
                            <input
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                              placeholder="Unidade comercial"
                              value={form.unidade}
                              onChange={(e) => setForm((prev) => ({ ...prev, unidade: e.target.value }))}
                            />
                          </div>
                          <div className="grid gap-4 lg:grid-cols-3">
                            <input
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                              placeholder="Exceção tabela IPI"
                              value={form.excecaoIpi}
                              onChange={(e) => setForm((prev) => ({ ...prev, excecaoIpi: e.target.value }))}
                            />
                            <input
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                              placeholder="Código CEST"
                              value={form.codigoCest}
                              onChange={(e) => setForm((prev) => ({ ...prev, codigoCest: e.target.value }))}
                            />
                            <input
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                              placeholder="Unidade tributada diferente"
                              value={form.unidadeTributaria}
                              onChange={(e) => setForm((prev) => ({ ...prev, unidadeTributaria: e.target.value }))}
                            />
                          </div>
                          <select
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                            value={form.ignorarTributos}
                            onChange={(e) => setForm((prev) => ({ ...prev, ignorarTributos: e.target.value }))}
                          >
                            <option value="">Ignorar tributos</option>
                            <option value="nao">Não ignorar</option>
                          </select>
                          <textarea
                            rows={3}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm resize-none"
                            placeholder="Informações adicionais para NFe"
                            value={form.informacoes}
                            onChange={(e) => setForm((prev) => ({ ...prev, informacoes: e.target.value }))}
                          />
                        </>
                      )}
                    </div>
                  )}
                  {tab === 'fotos' && (
                    <div className="rounded-xl bg-white p-5 border border-slate-200 shadow-sm space-y-3">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Fotos do produto</p>
                      <div className="flex gap-3">
                        <button className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold">Enviar foto</button>
                        <button className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold">Selecionar foto padrão</button>
                        <button className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-600">Excluir</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 px-8 pb-6 pt-2 bg-slate-50">
              <div />
              <div className="flex gap-3">
                <button
                  className="px-5 py-3 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                  onClick={() => setOverlayOpen(false)}
                >
                  Voltar
                </button>
                <button
                  className={`px-5 py-3 rounded-lg text-sm font-semibold text-white ${overlayPrimaryClass}`}
                  onClick={overlayPrimaryAction}
                >
                  {overlayPrimaryLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <header className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <ModuleToolbar
          title="Produtos"
          description="Produtos, serviços e ajustes com controle rápido."
          actions={toolbarActions}
          extra={
            <div className="flex flex-wrap items-center gap-3">
              {tabButtons}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produto"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 focus:border-slate-400 focus:outline-none"
              />
            </div>
          }
        />
      </header>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] tracking-[0.2em]">
              <tr>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Categoria</th>
                <th className="px-4 py-3 text-right">Estoque</th>
                <th className="px-4 py-3 text-right">Preço</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((produto) => (
                <tr key={produto.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{produto.nome}</td>
                  <td className="px-4 py-3 capitalize">{produto.tipo}</td>
                  <td className="px-4 py-3">{produto.categoria || '—'}</td>
                  <td className="px-4 py-3 text-right">{produto.estoque}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatMoney(produto.preco)}</td>
                </tr>
              ))}
              {filtered.length === 0 && <EmptyListRow colSpan={5} />}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
