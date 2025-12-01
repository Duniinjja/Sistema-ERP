import { useState } from 'react'
import type { ConfigTab } from '../types/erp'
import { useLocalCrud } from '../store'
import { Modal } from '../components/Modal'
import { Toast } from '../components/Toast'
import { ModuleToolbar } from '../components/ModuleToolbar'
import { usePageMonitor } from '../hooks/usePageMonitor'

type PlanGroup = {
  id: string
  title: string
  description: string
  items: string[]
}

const planGroupsByTab: Record<'receitas' | 'despesas' | 'dre', PlanGroup[]> = {
  receitas: [
    { id: 'grupo-receitas-var', title: 'Receitas diversas', description: 'Grupo do DRE: Receitas/despesas diversas', items: ['Rendimentos financeiros', 'Outras receitas'] },
    { id: 'grupo-receitas-vendas', title: 'Receitas de vendas', description: 'Grupo do DRE: Receita bruta', items: ['Venda de produtos/serviços'] },
  ],
  despesas: [
    { id: 'grupo-despesas-var', title: 'Despesas operacionais', description: 'Grupo do DRE: Despesas diversas', items: ['Despesas administrativas'] },
  ],
  dre: [
    { id: 'grupo-dre-geral', title: 'Configuração DRE', description: 'Agrupe contas para demonstrativo', items: ['Lucro bruto', 'Lucro líquido'] },
  ],
}

export function ConfiguracoesPage({ activeTab, setActiveTab }: { activeTab: ConfigTab; setActiveTab: (t: ConfigTab) => void }) {
  usePageMonitor('Configuracoes')
  const [toast, setToast] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', permissao: 'Acesso completo' })
  const { items: usuarios, add } = useLocalCrud('erp.usuarios', [
    { id: 'U001', nome: 'Erick', email: 'teste', login: 'erick', permissao: 'Acesso completo', acesso: 'Sim' },
  ])

  const tabs: { id: ConfigTab; label: string }[] = [
    { id: 'geral', label: 'Geral' },
    { id: 'plano', label: 'Plano' },
    { id: 'caixa', label: 'Caixa' },
    { id: 'operacoes', label: 'Operações' },
    { id: 'formas', label: 'Formas' },
    { id: 'usuarios', label: 'Usuários' },
    { id: 'fiscal', label: 'Fiscal' },
    { id: 'impressao', label: 'Impressão' },
  ]

  const toolbarActions = [
    { label: 'Novo usuário', onClick: () => setModalOpen(true), variant: 'primary' },
    { label: 'Exportar', onClick: () => setToast('Exportação de usuários pronta'), variant: 'ghost' },
    { label: 'Importar', onClick: () => setToast('Importação aguardando arquivo'), variant: 'ghost' },
  ]

  const handleAddPlanItem = (groupId: string) => {
    const text = planInput[groupId]?.trim()
    if (!text) return
    setPlanGroups((prev) => ({
      ...prev,
      [planTab]: prev[planTab].map((group) =>
        group.id === groupId ? { ...group, items: [...group.items, text] } : group,
      ),
    }))
    setPlanInput((prev) => ({ ...prev, [groupId]: '' }))
  }

  const [planTab, setPlanTab] = useState<'receitas' | 'despesas' | 'dre'>('receitas')
  const [planGroups, setPlanGroups] = useState(() => ({
    receitas: planGroupsByTab.receitas.map((group) => ({ ...group, items: [...group.items] })),
    despesas: planGroupsByTab.despesas.map((group) => ({ ...group, items: [...group.items] })),
    dre: planGroupsByTab.dre.map((group) => ({ ...group, items: [...group.items] })),
  }))
  const [planInput, setPlanInput] = useState<Record<string, string>>({})

  const tabButtons = (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`px-3 py-1 rounded-full border text-sm font-semibold ${
            activeTab === tab.id ? 'bg-amber-100 border-amber-300 text-[#0f3047]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )

  return (
    <section className="space-y-6">
      <Toast message={toast} onClose={() => setToast(null)} />
      <Modal open={modalOpen} title="Novo usuário" onClose={() => setModalOpen(false)}>
        <div className="space-y-3">
          <input
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="Nome"
            value={form.nome}
            onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
          />
          <input
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="E-mail"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />
          <select
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={form.permissao}
            onChange={(e) => setForm((prev) => ({ ...prev, permissao: e.target.value }))}
          >
            <option value="Acesso completo">Acesso completo</option>
            <option value="Financeiro">Financeiro</option>
            <option value="Operações">Operações</option>
          </select>
          <button
            className="bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-semibold"
            onClick={() => {
              if (!form.nome || !form.email) {
                setToast('Nome e e-mail obrigatórios.')
                return
              }
              add({ id: crypto.randomUUID(), nome: form.nome, email: form.email, login: form.email, permissao: form.permissao, acesso: 'Sim' })
              setToast('Usuário criado')
              setForm({ nome: '', email: '', permissao: 'Acesso completo' })
              setModalOpen(false)
            }}
          >
            Salvar usuário
          </button>
        </div>
      </Modal>
      <header className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <ModuleToolbar
          title="Configurações"
          description="Controle geral do sistema."
          actions={toolbarActions}
          extra={tabButtons}
        />
      </header>
      <div className="space-y-6">
        {activeTab === 'geral' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center text-sm font-semibold text-slate-500 uppercase tracking-[0.3em]">
                  <svg className="mr-1 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M3 12h18M3 6h18M3 18h18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Configuração geral
                </span>
              </div>
              <div className="space-y-4 rounded-xl bg-slate-50 p-4 shadow-inner">
                <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-[0.3em]">Dados gerais da empresa</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="CNPJ / CPF" />
                  <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-600">
                    Autopreencher
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Razão social / Nome" />
                  <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Nome fantasia" />
                  <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Inscrição Estadual" />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Inscrição Municipal" />
                  <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="CNAE principal" />
                  <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Telefones" />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="E-mails" />
                  <div className="flex gap-3">
                    <input className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="CEP" />
                    <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">Buscar nos Correios</button>
                  </div>
                  <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Estado" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Cidade" />
                  <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Endereço (rua, avenida, etc)" />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Número" />
                  <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Complemento" />
                  <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Bairro" />
                </div>
                <div className="text-right">
                  <button className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white">Salvar</button>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6 space-y-6">
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-[0.3em]">Dados fiscais</h3>
              <div className="grid gap-4 md:grid-cols-4">
                <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Principal atividade" />
                <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Cód. Regime Tributário Produtos" />
                <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Cód. Regime Tributário Serviços" />
                <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Alíquota do Simples Nacional" />
              </div>
              <div className="text-right">
                <button className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white">Salvar</button>
              </div>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6 space-y-6">
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-[0.3em]">Dados para impressão</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-3">
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Logomarca</span>
                  <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">Enviar logomarca</button>
                  <label className="text-sm text-slate-500 inline-flex items-center gap-2">
                    <input type="checkbox" />
                    Mostrar prefixos e sufixos (R$ e %) em relatórios
                  </label>
                </div>
                <textarea
                  rows={5}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  placeholder="Cabeçalho"
                />
              </div>
              <div className="text-right">
                <button className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white">Salvar</button>
              </div>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6 space-y-6">
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-[0.3em]">Configurar SMTP</h3>
              <div className="space-y-3">
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="smtp" defaultChecked />
                  Usar servidor do sistema
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="smtp" />
                  eGestor Gmail SMTP
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="smtp" />
                  Configurar SMTP de provedor próprio
                </label>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                O SMTP do sistema já está configurado e funcionando. Seus e-mails são enviados direto pelos nossos servidores sem precisar de configuração adicional.
              </div>
              <div className="text-right">
                <button className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white">
                  Salvar envio por SMTP do sistema
                </button>
              </div>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6 space-y-6">
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-[0.3em]">Bases legais</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Contatos" />
                <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Vendas" />
                <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Financeiro" />
                <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Fiscal" />
              </div>
              <div className="text-right">
                <button className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white">Salvar</button>
              </div>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-[0.3em]">Exportação de dados</h3>
              <p className="text-sm text-slate-600">
                O sistema permite que você extraia os dados inseridos de maneira que possam ser lidos por outras ferramentas.
              </p>
              <p className="text-sm text-slate-600">
                Dependendo da quantidade de informação cadastrada no sistema, este processo não é instantâneo e pode levar alguns minutos.
              </p>
              <p className="text-sm text-slate-600">
                É possível ler o formato gerado através de programas de planilhas eletrônicas (o mais conhecido é o Excel).
              </p>
              <a className="text-sm font-semibold text-sky-600 underline" href="#">
                Clique aqui para requisitar a criação de uma cópia dos seus dados
              </a>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-[0.3em]">Excluir conta</h3>
              <p className="text-sm text-slate-600">
                Para solicitar a exclusão da sua conta eGestor, clique no botão abaixo.
              </p>
              <button className="w-full rounded-lg border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-600">
                Solicitar exclusão de conta
              </button>
            </div>
          </div>
        )}
        {activeTab === 'plano' && (
          <div className="space-y-6 rounded-xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-[0.3em]">Configurações do Plano de Contas</h3>
              <div className="flex gap-2">
                {(['receitas', 'despesas', 'dre'] as const).map((tabId) => (
                  <button
                    key={tabId}
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${
                      planTab === tabId ? 'bg-emerald-600 text-white' : 'border border-slate-200 bg-white text-slate-600'
                    }`}
                    onClick={() => setPlanTab(tabId)}
                  >
                    {tabId === 'receitas' ? 'Configurar receitas' : tabId === 'despesas' ? 'Configurar despesas' : 'Configurar DRE'}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-sm text-slate-500">Configure o seu plano de contas.</p>
            <div className="space-y-6 rounded-xl border border-emerald-500/30 bg-emerald-50/30 p-4">
              {planGroups[planTab].map((group) => (
                <div key={group.id} className="space-y-2 rounded border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                    <div>
                      <p>{group.title}</p>
                      <p className="text-xs font-normal text-slate-500">{group.description}</p>
                    </div>
                    <div className="flex gap-2 text-slate-500">
                      <button className="inline-flex items-center gap-1 text-xs hover:text-slate-700">↕</button>
                      <button className="inline-flex items-center gap-1 text-xs hover:text-rose-600">🗑</button>
                    </div>
                  </div>
                  <ul className="text-sm text-slate-600 space-y-1">
                    {group.items.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span className="text-purple-500">+ </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder="Adicionar novo"
                      value={planInput[group.id] ?? ''}
                      onChange={(e) => setPlanInput((prev) => ({ ...prev, [group.id]: e.target.value }))}
                    />
                    <button
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
                      onClick={() => handleAddPlanItem(group.id)}
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              ))}
              <button className="text-sm font-semibold text-sky-600 underline">Criar novo grupo em receitas</button>
            </div>
          </div>
        )}
        {activeTab === 'usuarios' && (
          <div className="overflow-hidden border border-slate-200 rounded-lg bg-white">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="py-3 px-3 text-left">Nome</th>
                  <th className="py-3 px-3 text-left">E-mail</th>
                  <th className="py-3 px-3 text-left">Permissão</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => (
                  <tr key={usuario.id} className="border-t border-slate-100">
                    <td className="py-3 px-3">{usuario.nome}</td>
                    <td className="py-3 px-3">{usuario.email}</td>
                    <td className="py-3 px-3">{usuario.permissao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {activeTab !== 'geral' && activeTab !== 'usuarios' && (
          <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6">
            <p className="text-sm text-slate-500">Conteúdo de {activeTab} em construção.</p>
          </div>
        )}
      </div>
    </section>
  )
}
