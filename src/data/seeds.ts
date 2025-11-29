import type { ProductItem } from '../types/erp'

export const produtosSeed: ProductItem[] = [
  { id: 'P001', nome: 'Notebook Pro', categoria: 'Eletronicos', preco: 5200, estoque: 8, estoqueMinimo: 2, palavras: 'notebook', tipo: 'produtos', documentos: [], camposExtras: '' },
  { id: 'P002', nome: 'Mouse', categoria: 'Acessorios', preco: 80, estoque: 120, estoqueMinimo: 20, palavras: 'periferico', tipo: 'produtos', documentos: [], camposExtras: '' },
  { id: 'S001', nome: 'Instalacao', categoria: '', preco: 150, estoque: 0, palavras: 'setup', tipo: 'servicos' },
  { id: 'S002', nome: 'Manutencao', categoria: '', preco: 200, estoque: 0, palavras: 'suporte', tipo: 'servicos' },
  {
    id: 'A001',
    nome: 'Ajuste inventario',
    categoria: '',
    preco: 0,
    estoque: 0,
    palavras: 'inventario',
    tipo: 'ajuste',
    contato: 'Equipe estoque',
    observacoes: 'Ajuste trimestral',
    data: '2025-11-10',
  },
]
