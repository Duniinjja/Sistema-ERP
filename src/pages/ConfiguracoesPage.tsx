import { useState } from 'react'
import type { ConfigTab } from '../types/erp'
import { useLocalCrud } from '../store'
import { Modal } from '../components/Modal'
import { Toast } from '../components/Toast'
import { usePageMonitor } from '../hooks/usePageMonitor'

export function ConfiguracoesPage({ activeTab, setActiveTab }: { activeTab: ConfigTab; setActiveTab: (t: ConfigTab) => void }) {
  usePageMonitor('Configuracoes')
  const [toast, setToast] = useState<string | null>(null)
  const { items: usuarios } = useLocalCrud('erp.usuarios', [
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

  return (
    <section className="space-y-6">
      <Toast message={toast} onClose={() => setToast(null)} />
      <header className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#0f3047]">Configuracoes</h2>
          <p className="text-sm text-slate-500">Controle geral do sistema.</p>
        </div>
      </header>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
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
