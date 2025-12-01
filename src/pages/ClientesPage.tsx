import { useMemo, useState } from 'react'
import { useLocalCrud } from '../store'
import type { ContactItem, ContactTab } from '../types/erp'
import { Modal } from '../components/Modal'
import { Toast } from '../components/Toast'
import { ModuleToolbar } from '../components/ModuleToolbar'
import { usePageMonitor } from '../hooks/usePageMonitor'

export function ClientesPage({
  activeTab,
  setActiveTab,
}: {
  activeTab: ContactTab
  setActiveTab: (t: ContactTab) => void
}) {
  usePageMonitor('Clientes')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ nome: '', tipo: 'clientes' as ContactTab })
  const { items: contacts, add } = useLocalCrud<ContactItem>('erp.contatos', [
    { id: 'C001', nome: 'Cliente Alfa', tipo: 'clientes' },
  ])

  const filtered = useMemo(
    () => contacts.filter((contact) => contact.nome.toLowerCase().includes(search.toLowerCase())),
    [contacts, search],
  )

  const toolbarActions = [
    { label: 'Novo contato', onClick: () => setModalOpen(true), variant: 'primary' },
    { label: 'Exportar', onClick: () => setToast('Exportação de contatos concluída'), variant: 'ghost' },
    { label: 'Importar', onClick: () => setToast('Importação pendente'), variant: 'ghost' },
  ]

  const tabButtons = (
    <div className="flex gap-2">
      {(['clientes', 'fornecedores', 'transportadoras'] as ContactTab[]).map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`px-3 py-1 rounded-full border text-xs font-semibold ${activeTab === tab ? 'bg-amber-100 border-amber-300' : 'border-slate-200'}`}
        >
          {tab}
        </button>
      ))}
    </div>
  )

  return (
    <section className="space-y-6">
      <Toast message={toast} onClose={() => setToast(null)} />
      <Modal open={modalOpen} title="Novo contato" onClose={() => setModalOpen(false)}>
        <div className="space-y-3">
          <input
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="Nome"
            value={form.nome}
            onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
          />
          <select
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={form.tipo}
            onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value as ContactTab }))}
          >
            <option value="clientes">Clientes</option>
            <option value="fornecedores">Fornecedores</option>
            <option value="transportadoras">Transportadoras</option>
          </select>
          <button
            className="bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-semibold"
            onClick={() => {
              if (!form.nome) {
                setToast('Informe um nome.')
                return
              }
              add({ id: crypto.randomUUID(), nome: form.nome, tipo: form.tipo })
              setToast('Contato salvo')
              setForm({ nome: '', tipo: 'clientes' })
              setModalOpen(false)
            }}
          >
            Salvar
          </button>
        </div>
      </Modal>
      <header className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <ModuleToolbar title="Contatos" description="Clientes, fornecedores e transportadoras." actions={toolbarActions} extra={tabButtons} />
      </header>
      <div className="flex gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-2 rounded-md text-sm w-full"
          placeholder="Buscar contatos"
        />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="py-3 px-3 text-left">Nome</th>
              <th className="py-3 px-3 text-left">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((contact) => (
              <tr key={contact.id} className="border-t border-slate-100">
                <td className="py-3 px-3">{contact.nome}</td>
                <td className="py-3 px-3">{contact.tipo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
