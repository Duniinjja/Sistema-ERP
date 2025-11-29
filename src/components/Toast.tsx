export type ToastProps = { message: string | null; onClose: () => void }

export function Toast({ message, onClose }: ToastProps) {
  if (!message) return null
  return (
    <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-md shadow z-50 flex items-center gap-3">
      <span>{message}</span>
      <button className="text-white/80 hover:text-white" onClick={onClose}>
        Fechar
      </button>
    </div>
  )
}
