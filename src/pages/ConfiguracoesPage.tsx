import { useState } from 'react'
import type { ConfigTab } from '../types/erp'
import { useLocalCrud } from '../store'
import { Modal } from '../components/Modal'
import { Toast } from '../components/Toast'
import { ModuleToolbar } from '../components/ModuleToolbar'
import { usePageMonitor } from '../hooks/usePageMonitor'

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
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
        {activeTab === 'usuarios' ? (
          <div className="overflow-hidden border border-slate-200 rounded-lg">
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
        ) : (
          <p className="text-sm text-slate-500">Conteúdo de {activeTab} em construção.</p>
        )}
      </div>
    </section>
  )
}
