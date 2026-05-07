export function useCurrency() {
  const formatCurrency = (value) => {
    return 'R$ ' + value.toLocaleString('pt-BR', { 
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

  return { formatCurrency, parseCurrency, maskCurrency }
}
