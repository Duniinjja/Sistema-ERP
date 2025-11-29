const fs = require('fs');
const path = 'src/App.tsx';
let text = fs.readFileSync(path, 'utf8');
const start = text.indexOf('const buildSalesDefaultForm = useCallback(');
const marker = 'const [salesForm, setSalesForm] = useState<SaleForm>(buildSalesDefaultForm)';
const end = text.indexOf(marker, start) + marker.length;
const newBlock =   const buildSalesDefaultForm = useCallback(\n    (): SaleForm => ({\n      cliente: '',\n      vendedor: '',\n      data: new Date().toISOString().slice(0, 10),\n      tipo: activeTab === 'devolucoes' ? 'Devolucao' : 'Venda',\n      itens: [{ produtoId: '', quantidade: 1, valor: 0 }],\n      total: 0,\n      situacao: 'Concluida' as SaleForm['situacao'],\n    }),\n    [activeTab],\n  )\n\n  const [salesForm, setSalesForm] = useState<SaleForm>(buildSalesDefaultForm)\n;
text = text.slice(0, start) + newBlock + text.slice(end);
fs.writeFileSync(path, text, 'utf8');
