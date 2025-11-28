import { useEffect, useState } from 'react'

type ReportGroup = {
  title: string
  tone: string
  items: string[]
}

const reportGroups: ReportGroup[] = [
  {
    title: 'Financeiro',
    tone: 'bg-green-100 border-green-300 text-green-900',
    items: [
      'Extrato financeiro',
      'Fluxo de caixa periodico',
      'Fluxo financeiro',
      'DRE',
      'Fluxo futuro',
      'Lancamentos cancelados',
      'Financeiro por vendedor',
      'Financeiro por formas pgto',
      'Comissoes por financeiro',
      'Conciliacao bancaria',
      'Boletos',
      'Recebimentos por cliente',
    ],
  },
  {
    title: 'Vendas',
    tone: 'bg-teal-100 border-teal-300 text-teal-900',
    items: [
      'Vendas detalhadas',
      'Detalhes dos produtos vendidos',
      'Comissoes de vendas',
      'ABC de produtos vendidos',
      'ABC de vendas por cliente',
      'ABC de vendas por vendedor',
      'Vendas por tipo de documento',
      'Vendas por categoria/NCM',
      'Resumo de vendas',
    ],
  },
  {
    title: 'Compras',
    tone: 'bg-sky-100 border-sky-300 text-sky-900',
    items: [
      'Compras detalhadas',
      'Sugestao de compra',
      'Detalhes dos produtos comprados',
      'ABC de produtos comprados',
    ],
  },
  {
    title: 'Produtos',
    tone: 'bg-emerald-100 border-emerald-300 text-emerald-900',
    items: [
      'Estoque minimo',
      'Estoque em data especifica',
      'Historico por produto',
      'Movimentacao de um produto',
      'Produtos por fornecedor',
      'Produtos sem vendas',
      'Ajuste de estoque',
      'Movimentacao de estoque',
    ],
  },
  {
    title: 'Contatos',
    tone: 'bg-blue-100 border-blue-300 text-blue-900',
    items: [
      'Historico de um contato',
      'Personalizado de contatos',
      'Comemoracoes do mes',
      'Inatividade de clientes',
      'Contatos duplicados',
    ],
  },
]

const reportDescriptions: Record<string, string> = {
  'Extrato financeiro': 'Resumo dos lancamentos com filtros por conta e categoria.',
  'Fluxo de caixa periodico': 'Saldo acumulado do caixa em intervalos regulares.',
  'Fluxo financeiro': 'Entradas e saidas agrupadas por tipo.',
  DRE: 'Demonstracao de Resultado do Exercício.',
  'Fluxo futuro': 'Projecoes considerando recorrencias.',
  'Lancamentos cancelados': 'Historico de cancelamentos e motivos.',
  'Financeiro por vendedor': 'Resultados divididos por vendedor.',
  'Financeiro por formas pgto': 'Visao por forma de pagamento.',
  'Comissoes por financeiro': 'Comissoes geradas em lancamentos.',
  'Conciliacao bancaria': 'Status das conciliacoes e divergencias.',
  Boletos: 'Controle completo dos boletos.',
  'Recebimentos por cliente': 'Total por cliente.',
  'Vendas detalhadas': 'Lista completa de vendas e itens.',
  'Detalhes dos produtos vendidos': 'Movimentacao de cada produto.',
  'Comissoes de vendas': 'Comissoes por vendedor.',
  'ABC de produtos vendidos': 'Classificacao ABC dos produtos.',
  'ABC de vendas por cliente': 'Ranking de clientes por receita.',
  'ABC de vendas por vendedor': 'Ranking de vendedores.',
  'Vendas por tipo de documento': 'Comparativo entre tipos de vendas.',
  'Vendas por categoria/NCM': 'Distribuicao por categoria e NCM.',
  'Resumo de vendas': 'Totais e tendencias do periodo.',
  'Compras detalhadas': 'Pedidos por fornecedor.',
  'Sugestao de compra': 'Recomendacoes baseadas em estoque minimo.',
  'Detalhes dos produtos comprados': 'Produtos adquiridos por periodo.',
  'ABC de produtos comprados': 'Classificacao ABC das compras.',
  'Estoque minimo': 'Produtos abaixo do minimo.',
  'Estoque em data especifica': 'Saldo em data passada.',
  'Historico por produto': 'Historico completo do produto.',
  'Movimentacao de um produto': 'Entradas e saidas por origem.',
  'Produtos por fornecedor': 'Produtos agregados por fornecedor.',
  'Produtos sem vendas': 'Itens sem vendas recentes.',
  'Ajuste de estoque': 'Registro de ajustes realizados.',
  'Movimentacao de estoque': 'Visao geral das movimentacoes.',
  'Historico de um contato': 'Interacoes registradas do contato.',
  'Personalizado de contatos': 'Campos extras e observacoes.',
  'Comemoracoes do mes': 'Datas especiais dos contatos.',
  'Inatividade de clientes': 'Clientes sem pedidos recentes.',
  'Contatos duplicados': 'Possiveis duplicidades para revisar.',
}

type ReportsPanelProps = {
  onNavigate: (group: string, name: string) => void
}

function PanelToast({ message, onClose }: { message: string | null; onClose: () => void }) {
  if (!message) return null
  return (
    <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-md shadow z-50 flex items-center gap-3">
      <span>{message}</span>
      <button className="text-white/80 hover:text-white" onClick={onClose}>
        Fechar
      </button>
    </div>
  )
}

export function ReportsPanel({ onNavigate }: ReportsPanelProps) {
  const [reportSearch, setReportSearch] = useState('')
  const [reportSelected, setReportSelected] = useState<string[]>([])
  const [reportToast, setReportToast] = useState<string | null>(null)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    reportGroups.reduce((acc, g) => ({ ...acc, [g.title]: true }), {} as Record<string, boolean>),
  )
  const flatReports = reportGroups.flatMap((group) =>
    group.items.map((item) => ({
      id: `${group.title}-${item}`,
      nome: item,
      grupo: group.title,
    })),
  )
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('erp.reports.favorites')
      if (raw) return JSON.parse(raw)
    } catch {
      //
    }
    return []
  })
  const [activeReport, setActiveReport] = useState<typeof flatReports[number] | null>(null)

  useEffect(() => {
    localStorage.setItem('erp.reports.favorites', JSON.stringify(favorites))
  }, [favorites])

  const filteredReports = flatReports.filter((r) => {
    const term = reportSearch.trim().toLowerCase()
    if (!term) return true
    return [r.nome, r.grupo].join(' ').toLowerCase().includes(term)
  })

  const toggleReport = (id: string) => {
    setReportSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleReportAll = () => {
    if (filteredReports.length === 0) return
    const ids = filteredReports.map((r) => r.id)
    const all = ids.every((id) => reportSelected.includes(id))
    setReportSelected(all ? [] : ids)
  }

  const handleReportExport = () => {
    if (filteredReports.length === 0) {
      setReportToast('Nada para exportar.')
      return
    }
    const header = ['Grupo', 'Relatorio']
    const rows = filteredReports.map((r) => [r.grupo, r.nome])
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'relatorios.csv'
    a.click()
    URL.revokeObjectURL(url)
    setReportToast('Exportado com sucesso')
  }

  const toggleGroup = (title: string) => setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }))
  const toggleFavorite = (reportId: string) =>
    setFavorites((prev) => (prev.includes(reportId) ? prev.filter((id) => id !== reportId) : [...prev, reportId]))

  const handleDetailNavigate = () => {
    if (activeReport) {
      onNavigate(activeReport.grupo, activeReport.nome)
    }
  }

  return (
    <section className="space-y-4">
      <PanelToast message={reportToast} onClose={() => setReportToast(null)} />
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <input
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700"
            placeholder="Buscar relatorio"
            value={reportSearch}
            onChange={(e) => setReportSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleReportAll}
            className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 bg-white hover:bg-slate-50"
          >
            {filteredReports.length > 0 && reportSelected.length === filteredReports.length ? 'Limpar selecao' : 'Selecionar todos'}
          </button>
          <button
            onClick={handleReportExport}
            className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 bg-white hover:bg-slate-50"
          >
            Exportar
          </button>
        </div>
        <span className="text-sm text-slate-500">Escolha uma categoria para ver os relatorios disponiveis.</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(320px,0.8fr)]">
        <div className="space-y-4">
          {reportGroups.map((group) => (
            <div key={group.title} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <button
                onClick={() => toggleGroup(group.title)}
                className={`w-full flex items-center justify-between px-4 py-3 border-b font-semibold text-left ${group.tone}`}
              >
                <span>{group.title}</span>
                <span className="text-sm">{openGroups[group.title] ? '-' : '+'}</span>
              </button>
              {openGroups[group.title] && (
                <div className="space-y-2 px-4 py-3">
                  {group.items.map((item) => {
                    const id = `${group.title}-${item}`
                    const report = { id, nome: item, grupo: group.title }
                    const isSelected = reportSelected.includes(id)
                    const isFavorite = favorites.includes(id)
                    return (
                      <div
                        key={id}
                        className={`flex items-center justify-between gap-3 rounded-md border border-slate-100 px-3 py-2 text-sm text-slate-700 ${
                          isSelected ? 'bg-slate-50 border-slate-300' : 'hover:bg-slate-50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            toggleReport(id)
                            setActiveReport(report)
                          }}
                          className="text-left flex-1"
                        >
                          <span className="font-semibold block">{item}</span>
                          <span className="text-xs text-slate-500">{group.title}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleFavorite(id)}
                          className="text-amber-600 hover:text-amber-800 text-lg font-semibold"
                        >
                          {isFavorite ? '★' : '☆'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Favoritos</p>
                <h3 className="font-semibold text-slate-800">Relatórios rápidos</h3>
              </div>
              <button
                className="text-xs text-slate-500 hover:underline"
                onClick={() => setFavorites([])}
              >
                Limpar tudo
              </button>
            </div>
            {favorites.length === 0 ? (
              <p className="text-sm text-slate-500">Marque com ★ os relatórios para ter atalhos aqui.</p>
            ) : (
              <div className="space-y-2">
                {favorites
                  .map((fav) => flatReports.find((r) => r.id === fav))
                  .filter(Boolean)
                  .map((report) => (
                    <button
                      key={report!.id}
                      className="w-full text-left px-3 py-2 border border-slate-200 rounded-md text-sm font-semibold text-slate-700 flex items-center justify-between bg-slate-50"
                      onClick={() => {
                        setActiveReport(report!)
                        onNavigate(report!.grupo, report!.nome)
                      }}
                    >
                      <span>{report!.nome}</span>
                      <span className="text-xs text-slate-500">{report!.grupo}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Detalhes</p>
                <h3 className="font-semibold text-slate-800">
                  {activeReport ? activeReport.nome : 'Selecione um relatório'}
                </h3>
              </div>
              {activeReport && (
                <button
                  onClick={() => toggleFavorite(activeReport.id)}
                  className="text-amber-600 hover:text-amber-900 text-lg font-semibold"
                >
                  {favorites.includes(activeReport.id) ? '★' : '☆'}
                </button>
              )}
            </div>
            <p className="text-sm text-slate-600 min-h-[60px]">
              {activeReport ? reportDescriptions[activeReport.nome] || 'Detalhes sobre o relatório.' : 'Clique em um relatório para ver mais informações.'}
            </p>
            <button
              disabled={!activeReport}
              className="w-full text-center bg-amber-500 text-white rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handleDetailNavigate}
            >
              Abrir relatório
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
