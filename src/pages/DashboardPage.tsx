import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import type { DashboardAlert, Kpi, OnboardingStep, PieEntry, FinanceEntry } from '../types/erp'
import { usePageMonitor } from '../hooks/usePageMonitor'

const pieColors = ['#0f3047', '#f5a524', '#2fbf71']

const shortcuts = ['Nova venda', 'Nova compra', 'Novo cliente', 'Novo produto', 'Cadastrar conta']

type DashboardProps = {
  kpis: Kpi[]
  resultado: { receita: number; custos: number; saldo: number; pendReceber: number; pendPagar: number }
  proximosFinanceiro: FinanceEntry[]
  pieData: PieEntry[]
  onVerFinanceiro: () => void
  onKpiClick: (id: Kpi['id']) => void
  onShortcut: (label: string) => void
  onboarding: { steps: OnboardingStep[]; percent: number }
  onGoConfig: () => void
  onOnboardingClick: (id: OnboardingStep['id']) => void
  alerts: DashboardAlert[]
  dailyNet: { dia: string; valor: number }[]
  formatMoney: (value: number) => string
}

export function DashboardPage({
  kpis,
  resultado,
  proximosFinanceiro,
  pieData,
  onVerFinanceiro,
  onKpiClick,
  onShortcut,
  onboarding,
  onGoConfig,
  onOnboardingClick,
  alerts,
  dailyNet,
  formatMoney,
}: DashboardProps) {
  usePageMonitor('Dashboard')
  const latestDay = dailyNet[dailyNet.length - 1] ?? { dia: '', valor: 0 }
  const renderChart = !import.meta.env.VITEST
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>{kpi.title}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  kpi.tone === 'success'
                    ? 'bg-green-50 text-green-700'
                    : kpi.tone === 'danger'
                    ? 'bg-red-50 text-red-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {kpi.trend}
              </span>
            </div>
            <div className="text-2xl font-semibold mt-2">{kpi.value}</div>
            <button
              className="mt-3 text-sm text-[#0f3047] font-semibold hover:underline"
              onClick={() => onKpiClick(kpi.id)}
            >
              Ver detalhes
            </button>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#0f3047]">Fluxo diário</h2>
              <p className="text-sm text-slate-500">Últimos 7 dias</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-slate-400">Último fechamento</p>
              <p className={`text-2xl font-semibold ${latestDay.valor >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatMoney(latestDay.valor)}</p>
            </div>
          </div>
          <div className="mt-4 h-48 min-h-[190px]">
            {renderChart ? (
              <div className="w-full flex justify-center">
                <LineChart width={600} height={190} data={dailyNet}>
                  <XAxis dataKey="dia" axisLine={false} tickLine={false} stroke="#94a3b8" />
                  <Tooltip formatter={(value: number) => formatMoney(Number(value))} />
                  <Line
                    type="monotone"
                    dataKey="valor"
                    stroke="#f5a524"
                    strokeWidth={3}
                    dot={{ stroke: '#0f3047', fill: '#fff', strokeWidth: 2 }}
                  />
                </LineChart>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-500">Gráfico desativado em testes</div>
            )}
          </div>
        </div>
        <div className="bg-[#0f3047] text-white rounded-xl p-4 shadow-sm border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/70">Resumo</p>
              <h3 className="font-semibold text-lg">Últimos 3 dias</h3>
            </div>
            <span className="text-xs text-white/60">{dailyNet.length} dias</span>
          </div>
          <div className="space-y-2 text-sm">
            {dailyNet.slice(-3).map((item) => (
              <div key={item.dia} className="flex items-center justify-between">
                <span>{item.dia}</span>
                <span className={item.valor >= 0 ? 'text-emerald-300 font-semibold' : 'text-rose-300 font-semibold'}>
                  {formatMoney(item.valor)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8 bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#0f3047]">Onboarding</h2>
              <p className="text-sm text-slate-500">Complete os passos para usar todo o ERP.</p>
            </div>
            <div className="text-sm text-slate-500">{Math.round(onboarding.percent)}% completo</div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3">
            <div className="h-2 bg-amber-400 rounded-full transition-all" style={{ width: `${onboarding.percent}%` }} />
          </div>
          <div className="mt-4 grid md:grid-cols-2 gap-3 text-sm">
            {onboarding.steps.map((step) => (
              <div
                key={step.id}
                className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 ${
                  step.done ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-slate-800 font-semibold">{step.label}</span>
                  <span className="text-slate-500 text-xs">{step.detail}</span>
                </div>
                <div className="flex items-center">
                  {step.done ? (
                    <span className="text-xs font-semibold text-green-700 px-3 py-1 rounded-full bg-green-50 border border-green-200">
                      Concluido
                    </span>
                  ) : (
                    <button
                      className="text-xs font-semibold text-amber-700 px-3 py-1 rounded-full border border-amber-200 bg-amber-50 hover:bg-amber-100 transition"
                      onClick={() => onOnboardingClick(step.id)}
                    >
                      Pendente
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-col md:flex-row md:items-start md:justify-end gap-3 text-sm">
            <button className="inline-flex items-center gap-2 text-sm font-semibold text-[#0f3047] hover:underline" onClick={onGoConfig}>
              Ir para Configuracoes
            </button>
          </div>
        </div>

        <div className="xl:col-span-4 bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-[#0f3047]">Vendas por categoria</h2>
            <span className="text-sm text-slate-500">Mes atual</span>
          </div>
          <div className="h-56">
            <PieChart width={250} height={200}>
              <Pie data={pieData} innerRadius={45} outerRadius={70} dataKey="value">
                {pieData.map((entry, index) => (
                  <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
            </PieChart>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {pieData.map((d, i) => (
              <span
                key={d.name}
                className="px-2 py-1 rounded-full text-xs font-semibold text-slate-700"
                style={{ backgroundColor: `${pieColors[i % pieColors.length]}22`, color: pieColors[i % pieColors.length] }}
              >
                {d.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8 bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-[#0f3047]">Alertas</h2>
            <span className="text-xs text-slate-500">{alerts.length === 0 ? 'Tudo certo' : `${alerts.length} pendente(s)`}</span>
          </div>
          <div className="space-y-3">
            {alerts.length === 0 && <div className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">Nenhum aviso no momento.</div>}
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                  alert.tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <span className="text-sm">{alert.text}</span>
                <button className="text-xs font-semibold text-[#0f3047] hover:underline" onClick={onVerFinanceiro}>
                  Ver financeiro
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="xl:col-span-4 bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-[#0f3047]">Resultado do mes</h2>
            <span className="text-xs text-slate-500">Mes atual</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Receita bruta</span>
              <span className="font-semibold text-green-700">{formatMoney(resultado.receita)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Custos</span>
              <span className="font-semibold text-red-700">- {formatMoney(resultado.custos)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Saldo</span>
              <span className={`font-semibold ${resultado.saldo >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatMoney(resultado.saldo)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Pend. receber</span>
              <span className="font-semibold text-amber-700">{resultado.pendReceber}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Pend. pagar</span>
              <span className="font-semibold text-amber-700">{resultado.pendPagar}</span>
            </div>
            <button className="mt-2 w-full text-sm font-semibold text-[#0f3047] hover:underline text-left" onClick={onVerFinanceiro}>
              Ver Financeiro
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-[#0f3047] mb-3">Atalhos rapidos</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {shortcuts.map((item) => (
              <button
                key={item}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-[#0f3047] font-semibold hover:border-amber-300 hover:bg-amber-50 text-left transition"
                onClick={() => onShortcut(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-[#0f3047] mb-3">Proximos vencimentos</h2>
          <div className="text-sm text-slate-600">{proximosFinanceiro.length === 0 ? 'Nenhum vencimento nos proximos 7 dias.' : ''}</div>
          <div className="space-y-2 mt-2 text-sm">
            {proximosFinanceiro.slice(0, 3).map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <span className="text-slate-700">
                  {p.descricao} · {p.data}
                </span>
                <span className={p.tipo === 'recebimento' ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
                  {formatMoney(p.valor)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
