import type { ReactNode } from 'react'
import type { Page } from '../types/erp'

export function MainLayout({
  navItems,
  placeholderNav = [],
  activePage,
  onNavigate,
  children,
}: {
  navItems: Page[]
  placeholderNav?: string[]
  activePage: Page
  onNavigate: (page: Page) => void
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="h-16 bg-[#0f3047] text-white flex items-center px-6 gap-4 shadow-md">
        <div className="font-bold tracking-tight text-lg">ERP Wolkan</div>
        <div className="flex-1 max-w-2xl">
          <input
            className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="Buscar em todo o sistema..."
          />
        </div>
        <div className="flex items-center gap-3 text-sm">
          <button className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 transition">Ajuda</button>
          <button className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 transition">Notificacoes</button>
          <div className="w-8 h-8 rounded-full bg-amber-400 text-[#0f3047] font-semibold grid place-content-center">EA</div>
        </div>
      </header>

      <div className="grid grid-cols-[240px_1fr] min-h-[calc(100vh-4rem)]">
        <aside className="bg-slate-900 text-slate-100 px-4 py-6 space-y-6">
          <div className="text-xs uppercase tracking-wide text-slate-400">Navegacao</div>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item}
                onClick={() => onNavigate(item)}
                className={`w-full text-left px-3 py-2 rounded-md transition border-l-4 ${
                  activePage === item ? 'bg-white/10 border-amber-400' : 'border-transparent hover:bg-white/5'
                }`}
              >
                {item}
              </button>
            ))}
            {placeholderNav.map((item) => (
              <button
                key={item}
                className="w-full text-left px-3 py-2 rounded-md transition border-l-4 border-transparent opacity-60 cursor-not-allowed"
              >
                {item}
              </button>
            ))}
          </nav>
        </aside>

        <main className="p-6 space-y-6">{children}</main>
      </div>
    </div>
  )
}
