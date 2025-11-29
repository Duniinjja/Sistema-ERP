from pathlib import Path
path = Path('src/App.tsx')
text = path.read_text(encoding='utf-8')
start = text.index('const sampleSales: SaleRecord[] = [')
end_marker = '\nconst samplePurchases'
end = text.index(end_marker, start)
new_block = " const sampleSales: SaleRecord[] = [\n \n    id: 'V001',\n    cliente: 'Loja Centro',\n    vendedor: 'Carlos',\n    data: '2025-11-05',\n    tipo: 'Venda',\n    registro: 'vendas',\n    total: 1520.5,\n    itens: [{ produtoId: 'P001', quantidade: 1, valor: 1520.5 }],\n  ,\n \n    id: 'V002',\n    cliente: 'ACME',\n    vendedor: 'Ana',\n    data: '2025-11-12',\n    tipo: 'Venda',\n    registro: 'vendas',\n    total: 820.0,\n    itens: [{ produtoId: 'P002', quantidade: 2, valor: 410 }],\n  ,\n \n    id: 'D001',\n    cliente: 'Cliente Beta',\n    vendedor: 'Carlos',\n    data: '2025-11-18',\n    tipo: 'Devolucao',\n    registro: 'devolucoes',\n    total: 210.0,\n    itens: [{ produtoId: 'P002', quantidade: 1, valor: 210 }],\n  ,\n]\n
text = text[:start] + new_block + text[end:]
path.write_text(text, encoding='utf-8')
