import type { ReactNode } from 'react'

export type ToolbarAction = {
  label: string
  onClick: () => void
  variant?: 'primary' | 'ghost'
  tone?: 'success' | 'danger' | 'purple' | 'info'
}

export function ModuleToolbar({
  title,
  description,
  actions,
  extra,
}: {
  title: string
  description?: string
  actions: ToolbarAction[]
  extra?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[#0f3047]">{title}</h2>
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const toneClass =
              action.tone === 'danger'
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : action.tone === 'purple'
                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                : action.tone === 'info'
                ? 'bg-sky-600 hover:bg-sky-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            return (
              <button
                key={action.label}
                type="button"
                className={`px-3 py-2 text-sm font-semibold rounded-md transition ${
                  action.variant === 'primary'
                    ? toneClass
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
                onClick={action.onClick}
              >
                {action.label}
              </button>
            )
          })}
        </div>
      </div>
      {extra && <div className="flex flex-wrap gap-2">{extra}</div>}
    </div>
  )
}
