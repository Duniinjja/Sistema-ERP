import { useMemo, useState } from 'react'
import { useLocalCrud } from '../store'
import type { ContactItem, ContactTab } from '../types/erp'
import { Toast } from '../components/Toast'
import { ModuleToolbar } from '../components/ModuleToolbar'
import { EmptyListRow } from '../components/EmptyListRow'
import { usePageMonitor } from '../hooks/usePageMonitor'

const contactTypeOptions: { label: string; value: ContactTab }[] = [
  { label: 'Cliente', value: 'clientes' },
  { label: 'Fornecedor', value: 'fornecedores' },
  { label: 'Transportadora', value: 'transportadoras' },
]

type ContactFormState = {
  tipo: ContactTab
  razao: string
  cpf: string
  fantasia: string
  contato: string
  telefone: string
  email: string
  cidade: string
  bairro: string
  rua: string
  numero: string
  complemento: string
  cep: string
  observacoes: string
}

const defaultContactForm: ContactFormState = {
  tipo: 'clientes',
  razao: '',
  cpf: '',
  fantasia: '',
  contato: '',
  telefone: '',
  email: '',
  cidade: '',
  bairro: '',
  rua: '',
  numero: '',
  complemento: '',
  cep: '',
  observacoes: '',
}

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
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [form, setForm] = useState<ContactFormState>(defaultContactForm)
  const [activeSection, setActiveSection] = useState<'dados' | 'endereco' | 'info'>('dados')
  const { items: contacts, add } = useLocalCrud<ContactItem>('erp.contatos', [
    { id: 'C001', nome: 'Cliente Alfa', tipo: 'clientes' },
  ])

  const filtered = useMemo(
    () => contacts.filter((contact) => contact.nome.toLowerCase().includes(search.toLowerCase())),
    [contacts, search],
  )

  const toolbarActions = [
    { label: 'Novo contato', onClick: () => setOverlayOpen(true), variant: 'primary' },
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

  const handleSave = () => {
    if (!form.razao) {
      setToast('Informe o nome ou razão social.')
      return
    }
    add({ id: crypto.randomUUID(), nome: form.razao, tipo: form.tipo })
    setToast('Contato salvo')
    setForm(defaultContactForm)
    setActiveSection('dados')
    setOverlayOpen(false)
  }

  return (
    <section className="space-y-6">
      <Toast message={toast} onClose={() => setToast(null)} />
      {overlayOpen && (
        <div className="fixed inset-0 z-40 flex flex-col bg-slate-900/70">
          <div className="absolute inset-0" onClick={() => setOverlayOpen(false)} />
          <div className="relative mx-auto my-8 w-full max-w-[1400px] rounded-[28px] bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 text-white flex items-center justify-between bg-sky-600">
              <div>
                <h1 className="text-2xl font-semibold">Novo contato</h1>
                <p className="text-xs opacity-90">Nenhum arquivo anexado</p>
              </div>
              <button className="text-2xl font-semibold leading-none" onClick={() => setOverlayOpen(false)}>
                ✕
              </button>
            </div>
            <div className="flex border-b border-slate-200 bg-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-[0.4em]">
              {['dados', 'endereco', 'info'].map((section) => (
                <button
                  key={section}
                  className={`flex-1 px-4 py-3 text-center ${activeSection === section ? 'bg-white text-sky-600 shadow-inner' : 'hover:bg-slate-50'}`}
                  onClick={() => setActiveSection(section as typeof activeSection)}
                >
                  {section === 'dados' ? 'Dados' : section === 'endereco' ? 'Endereço' : 'Informações adicionais'}
                </button>
              ))}
            </div>
            <div className="px-10 py-8 bg-slate-100">
              <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
                <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm border border-slate-200">
                  <p className="text-[10px] uppercase tracking-[0.5em] text-slate-500">Tipo de contato</p>
                  {contactTypeOptions.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        checked={form.tipo === option.value}
                        onChange={() => setForm((prev) => ({ ...prev, tipo: option.value }))}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                <div className="space-y-6 rounded-xl bg-white p-6 shadow-sm border border-slate-200">
                  {activeSection === 'dados' && (
                    <div className="space-y-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Dados gerais</p>
                      <div className="grid gap-4 md:grid-cols-2">
                        <input
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                          placeholder="Nome / Razão social"
                          value={form.razao}
                          onChange={(e) => setForm((prev) => ({ ...prev, razao: e.target.value }))}
                        />
                        <div className="flex items-center gap-3 border border-slate-200 rounded-lg px-3 py-2">
                          <span className="text-slate-500">CPF / CNPJ</span>
                          <input
                            className="flex-1 border-none px-1 py-0 text-sm focus:outline-none"
                            placeholder="000.000.000-00"
                            value={form.cpf}
                            onChange={(e) => setForm((prev) => ({ ...prev, cpf: e.target.value }))}
                          />
                          <button className="text-xs text-slate-500">Autopreencher</button>
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <input
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                          placeholder="Nome fantasia"
                          value={form.fantasia}
                          onChange={(e) => setForm((prev) => ({ ...prev, fantasia: e.target.value }))}
                        />
                        <input
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                          placeholder="Nome do contato"
                          value={form.contato}
                          onChange={(e) => setForm((prev) => ({ ...prev, contato: e.target.value }))}
                        />
                        <input
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                          placeholder="Telefone(s)"
                          value={form.telefone}
                          onChange={(e) => setForm((prev) => ({ ...prev, telefone: e.target.value }))}
                        />
                      </div>
                      <input
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                        placeholder="E-mail(s)"
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                  )}
                  {activeSection === 'endereco' && (
                    <div className="space-y-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Endereço</p>
                      <div className="grid gap-4 md:grid-cols-3">
                        <input
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                          placeholder="CEP"
                          value={form.cep}
                          onChange={(e) => setForm((prev) => ({ ...prev, cep: e.target.value }))}
                        />
                        <input
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                          placeholder="Cidade"
                          value={form.cidade}
                          onChange={(e) => setForm((prev) => ({ ...prev, cidade: e.target.value }))}
                        />
                        <input
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                          placeholder="Bairro"
                          value={form.bairro}
                          onChange={(e) => setForm((prev) => ({ ...prev, bairro: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <input
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                          placeholder="Rua"
                          value={form.rua}
                          onChange={(e) => setForm((prev) => ({ ...prev, rua: e.target.value }))}
                        />
                        <input
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                          placeholder="Número"
                          value={form.numero}
                          onChange={(e) => setForm((prev) => ({ ...prev, numero: e.target.value }))}
                        />
                        <input
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                          placeholder="Complemento"
                          value={form.complemento}
                          onChange={(e) => setForm((prev) => ({ ...prev, complemento: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}
                  {activeSection === 'info' && (
                    <div className="space-y-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Informações adicionais</p>
                      <textarea
                        rows={4}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm resize-none"
                        placeholder="Observações"
                        value={form.observacoes}
                        onChange={(e) => setForm((prev) => ({ ...prev, observacoes: e.target.value }))}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 px-8 pb-6 pt-2 bg-slate-50">
              <div />
              <div className="flex gap-3">
                <button className="px-5 py-3 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-100" onClick={() => setOverlayOpen(false)}>
                  Voltar
                </button>
                <button className="px-5 py-3 rounded-lg text-sm font-semibold text-white bg-emerald-600" onClick={handleSave}>
                  Salvar contato
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
            {filtered.length === 0 && <EmptyListRow colSpan={2} />}
          </tbody>
        </table>
      </div>
    </section>
  )
}
