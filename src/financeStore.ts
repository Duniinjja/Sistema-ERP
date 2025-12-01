import { useEffect, useMemo, useState } from 'react'
import { persistence } from './services/persistence'

export type FinanceTipo = 'recebimento' | 'pagamento' | 'recibo'

export type FinanceEntry = {
  id: string
  tipo: FinanceTipo
  descricao: string
  contato: string
  conta: string
  data: string
  situacao: 'Pendente' | 'Pago' | 'Recebido'
  valor: number
  referente?: string
  comprovante?: string
  conciliado?: boolean
  categoria?: string
  palavras?: string
  observacao?: string
  emitente?: string
  vias?: string
  cpfCnpj?: string
  reciboDate?: string
}

const STORAGE_KEY = 'erp.finance.entries'

const sample: FinanceEntry[] = [
  {
    id: '1',
    tipo: 'recebimento',
    descricao: 'Venda #1001',
    contato: 'Cliente ACME',
    conta: 'Caixa interno',
    data: new Date().toISOString().slice(0, 10),
    situacao: 'Recebido',
    valor: 1200,
    referente: 'Pedido 1001',
    conciliado: true,
  },
  {
    id: '2',
    tipo: 'pagamento',
    descricao: 'Compra fornecedor',
    contato: 'Fornecedor XPTO',
    conta: 'Banco',
    data: new Date().toISOString().slice(0, 10),
    situacao: 'Pago',
    valor: 550,
    referente: 'NF 2002',
    conciliado: true,
  },
  {
    id: '3',
    tipo: 'recebimento',
    descricao: 'Servico consultoria',
    contato: 'Cliente Beta',
    conta: 'Banco',
    data: new Date().toISOString().slice(0, 10),
    situacao: 'Pendente',
    valor: 800,
    referente: 'Consultoria novembro',
  },
]

export function useFinanceStore() {
  const [entries, setEntries] = useState<FinanceEntry[]>(() => {
    const stored = persistence.read<FinanceEntry[]>(STORAGE_KEY)
    if (Array.isArray(stored)) return stored
    return sample
  })

  useEffect(() => {
    persistence.write(STORAGE_KEY, entries)
  }, [entries])

  const addEntry = (data: Omit<FinanceEntry, 'id'>) => {
    const id = crypto.randomUUID()
    setEntries((prev) => [...prev, { ...data, id }])
    return id
  }

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((item) => item.id !== id))
  }

  const updateEntry = (id: string, data: Partial<FinanceEntry>) => {
    setEntries((prev) => prev.map((item) => (item.id === id ? { ...item, ...data } : item)))
  }

  const summary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const endOfWeek = (() => {
      const d = new Date()
      d.setDate(d.getDate() + 7)
      return d.toISOString().slice(0, 10)
    })()

    const between = (date: string, start: string, end: string) => date >= start && date <= end

    const todayReceb = entries.filter((e) => e.tipo === 'recebimento' && e.data === today)
    const todayPag = entries.filter((e) => e.tipo === 'pagamento' && e.data === today)

    const weekReceb = entries.filter((e) => e.tipo === 'recebimento' && between(e.data, today, endOfWeek))
    const weekPag = entries.filter((e) => e.tipo === 'pagamento' && between(e.data, today, endOfWeek))

    const sum = (arr: FinanceEntry[]) => arr.reduce((acc, e) => acc + e.valor, 0)

    return {
      receberHoje: sum(todayReceb),
      pagarHoje: sum(todayPag),
      receberSemana: sum(weekReceb),
      pagarSemana: sum(weekPag),
    }
  }, [entries])

  return { entries, addEntry, removeEntry, updateEntry, summary }
}
