# Referência das páginas principais

## App & layout principal
- `AppContent` é o ponto de entrada: carrega `useFinanceStore`, calcula `dailyNet`, monta o array de `kpis`, `pieData`, `onboarding` e passa tudo para a `DashboardPage`.
- A navegação é controlada por `PageStateContext` e `MainLayout` com navegação lateral e `Suspense` para rotas preguiçosas.
- `configurePersistenceAdapter` (chamado em `main.tsx`) permite alternar entre `localStorage` e memória; isso reflete na base de dados usada por `useLocalCrud`.

## DashboardPage
- Props esperadas: `kpis`, `resultado`, `proximosFinanceiro`, `pieData`, `dailyNet`, `alerts`, callbacks de navegação e o `formatMoney` compartilhado.
- Hooks: `usePageMonitor` monitora o ciclo de vida e os dados chegam via `useFinanceStore` (recebimentos/pagamentos) do `App`.
- Layout: KPIs do mês, blocos de onboarding com progresso, gráfico de pizza por categoria, linha de fluxo diário (últimos 7 dias), alertas e atalhos rápidos.
- Interações: clicar em um KPI muda para a aba financeira, atalhos podem levar para vendas e os alertas chamam `onVerFinanceiro`.

## FinanceiroPage
- Props: aba ativa (`FinanceTab`), lista de `entries`, `addEntry`, `removeEntry`, `updateEntry` e `formatMoney`.
- Hooks: `usePageMonitor` e `useMonthNavigator` para controlar o mês exibido e resetar/alternar datas.
- Filtragem: aba determina o tipo (recebimentos/pagamentos/recibos), busca e status também afetam o conjunto renderizado.
- A tabela utiliza `entries` fornecidas pelo store e depende de `formatMoneyProp` para apresentar valores.

## VendasPage
- Usa `useLocalCrud` com a coleção `erp.sales` e a semente `defaultSales`, além de `useMonthNavigator` para limitar por mês e `Modal`/`Toast` para feedback.
- Props: aba ativa (`SalesTab`), `setActiveTab` e `onFinanceUpsertSale` para comunicar o financeiro quando um registro novo é criado.
- Interações: barra de ações padronizada (Novo registro, Exportar e Importar), modal de nova venda com total/campo de cliente e sincronização via `onFinanceUpsertSale`, busca e listas filtradas por aba/mês.

## ComprasPage
- Similar a vendas, mas usa `erp.compras` e a semente do `produtosSeed` para mostrar inventário e custos.
- Recebe callbacks para sincronizar com financeiro (`onFinanceUpsertPurchase`, `onFinanceRemovePurchases`) e usa `useMonthNavigator` para rolagem de mês.
- Toasts são renderizados por props, embora o estado atual passe `null`.

## ClientesPage
- Persistência via `useLocalCrud('erp.contatos', [{ id: 'C001', nome: 'Cliente Alfa', tipo: 'clientes' }])` e estados locais para busca e toast.
- Alterna abas de contatos (`ContactTab`) e exibe a lista filtrada.
- O botão "Novo" e o toast estão preparados para futuras ações.

## ProdutosPage
- Também usa `useLocalCrud` com `produtosSeed` (produtos, serviços, ajustes) e mantém busca + abas de `ProductTab`.
- A tabela mostra preço e estoque formatados com `formatMoney` utilitário.

## ConfiguracoesPage
- Continua com `useLocalCrud('erp.usuarios', [{ id: 'U001', nome: 'Erick', email: 'teste', login: 'erick', permissao: 'Acesso completo', acesso: 'Sim' }])` e abas de `ConfigTab` para dividir o conteúdo.
- A aba de `usuarios` exibe uma tabela; outras abas exibem mensagens "em construção" mas podem ser estendidas.

## Relatórios (ReportsPanel)
- Componente independente, mas carregado dentro do `Dashboard` quando `activePage === 'Relatorios'`.
- Usa estados locais para busca, favoritos (salvos em `localStorage`), seleção em massa, exportação CSV e um `Modal` com detalhes antes de navegar (modal aberto ao clicar em "Abrir relatório").
- O `Toast` reaproveitado mostra mensagens de exportação e favoritos; `Modal` confirma o fluxo antes de chamar `onNavigate`.

## Hooks reutilizados
- `useMonthNavigator`: controla o mês atual exibido nas páginas financeiras (Financeiro, Vendas, Compras) e fornece `goNextMonth`, `goPrevMonth`, `resetMonth` e `label`.
- `usePageMonitor`: log simples no console para acompanhar montagens/desmontagens por página.
- `useLocalCrud`: solução genérica de CRUD (adicionar, atualizar, remover) alimentada pelo `persistence` global; inclui assinatura de eventos `erp-storage-change` para sincronizar abas.

## Persistência e dados gerais
- `configurePersistenceAdapter` suporta agora os modos `local`, `memory` e `indexeddb`, com o último caindo para memória se o navegador não expõe IndexedDB.
- `services/persistence.ts` expõe os adaptadores `createLocalStorageAdapter` e `createMemoryAdapter`, além de `configurePersistenceAdapter` e `persistence` global.
- O `financeStore` também utiliza `persistence` para manter lançamentos financeiros entre sessões.
- `data/seeds.ts` fornece dados iniciais para produtos/serviços.
