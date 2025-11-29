import { useState } from 'react'
import { useLocalCrud } from '../store'
import type { ContactItem, ContactTab } from '../types/erp'
import { Modal } from '../components/Modal'
import { Toast } from '../components/Toast'
import { usePageMonitor } from '../hooks/usePageMonitor'

export function ClientesPage({ activeTab, setActiveTab, openNewSignal }: { activeTab: ContactTab; setActiveTab: (t: ContactTab) => void; openNewSignal: number }) {
  usePageMonitor('Clientes')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const { items: contacts } = useLocalCrud<ContactItem>('erp.contatos', [
    { id: 'C001', nome: 'Cliente Alfa', tipo: 'clientes' },
  ])

  const filtered = contacts.filter((contact) => contact.nome.toLowerCase().includes(search.toLowerCase()))

  return (
    <section className="space-y-6">
      <Toast message={toast} onClose={() => setToast(null)} />
      <header className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#0f3047]">Clientes</h2>
          <p className="text-sm text-slate-500">Contatos cadastrados.</p>
        </div>
        <div className="flex gap-2">
          {(['clientes', 'fornecedores', 'transportadoras'] as ContactTab[]).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1 rounded-full border ${activeTab === tab ? 'bg-amber-100 border-amber-300' : 'border-slate-200'}`}>
              {tab}
            </button>
          ))}
        </div>
      </header>
      <div className="flex gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} className="border px-3 py-2 rounded-md text-sm w-full" placeholder="Buscar contados" />
        <button className="bg-emerald-600 text-white px-3 py-2 rounded-md text-sm font-semibold">Novo</button>
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
