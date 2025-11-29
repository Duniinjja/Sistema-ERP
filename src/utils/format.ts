export const formatMoney = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })

export const formatMonthLabel = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })
