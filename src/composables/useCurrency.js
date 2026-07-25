export function useCurrency() {
  const formatCurrency = (value) => {
    const num = Number(value)
    if (isNaN(num)) return 'R$ 0,00'
    return 'R$ ' + num.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const parseCurrency = (valueStr) => {
    if (!valueStr) return NaN
    const digits = valueStr.replace(/\D/g, '')
    if (digits === '') return NaN
    return parseInt(digits, 10) / 100
  }

  // Interpreta entrada livre digitada pelo usuário (ex: "1.200,50", "R$ 950", "170")
  // no padrão pt-BR: ponto = separador de milhar, vírgula = decimal.
  const parseLoose = (valueStr) => {
    if (valueStr === null || valueStr === undefined) return 0
    const n = Number(
      String(valueStr)
        .replace(/\s|R\$/g, '')
        .replace(/\./g, '')
        .replace(',', '.')
    )
    return isNaN(n) ? 0 : n
  }

  const maskCurrency = (event) => {
    const input = event.target
    let value = input.value.replace(/\D/g, '')
    if (value === '') value = '0'
    value = (parseInt(value, 10) / 100).toFixed(2)
    input.value = 'R$ ' + parseFloat(value).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  return { formatCurrency, parseCurrency, parseLoose, maskCurrency }
}