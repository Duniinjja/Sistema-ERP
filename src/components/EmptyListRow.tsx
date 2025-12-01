export function EmptyListRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-6 text-center text-slate-500">
        Nenhum lançamento encontrado para este mês.
      </td>
    </tr>
  )
}
