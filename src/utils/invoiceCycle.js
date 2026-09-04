/**
 * Ciclo de faturamento do cartão.
 *
 * O ciclo do painel (salário, 5º dia útil) NÃO é o mesmo da fatura do cartão.
 * Uma fatura que fecha dia 15 reúne as compras de 15/07 a 14/08 e vence em 22/08 —
 * ou seja, um único período que atravessa dois meses do calendário.
 *
 * Convenção adotada (intervalo semiaberto):
 *   fatura que fecha no mês M = compras em [dia D de M-1, dia D de M)
 * Assim, uma compra feita no próprio dia do fechamento já entra na fatura seguinte.
 *
 * Vencimento: dia V do mês do fechamento se V >= D; senão, do mês seguinte
 * (ex.: fecha 28 / vence 05 → vence no mês seguinte).
 *
 * Funções puras (sem Vue/DOM) para facilitar teste.
 */

export const DEFAULT_CARD = { enabled: false, closingDay: 15, dueDay: 22 }

const daysInMonth = (y, m /* 0-11 */) => new Date(y, m + 1, 0).getDate()

const clampDay = (y, m, day) => Math.min(Math.max(day, 1), daysInMonth(y, m))

const toISO = (y, m /* 0-11 */, d) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

const parseISO = (iso) => {
  const [y, m, d] = String(iso).split('-').map(Number)
  return { y, m: m - 1, d }
}

/** Soma meses a uma data ISO, ajustando o dia ao tamanho do mês de destino. */
export const addMonthsISO = (iso, delta) => {
  const { y, m, d } = parseISO(iso)
  const total = y * 12 + m + delta
  const ny = Math.floor(total / 12)
  const nm = ((total % 12) + 12) % 12
  return toISO(ny, nm, clampDay(ny, nm, d))
}

/** Mês (0-11) em que fecha a fatura que contém a compra `iso`. */
export const closingMonthOf = (iso, closingDay) => {
  const { y, m, d } = parseISO(iso)
  // Compra a partir do dia do fechamento já cai na fatura do mês seguinte
  const shift = d >= closingDay ? 1 : 0
  const total = y * 12 + m + shift
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 }
}

/** Data de vencimento (ISO) da fatura que contém a compra `iso`. */
export const dueDateOf = (iso, closingDay, dueDay) => {
  const { year, month } = closingMonthOf(iso, closingDay)
  // Se vence antes do dia do fechamento, o vencimento é no mês seguinte
  const total = year * 12 + month + (dueDay < closingDay ? 1 : 0)
  const y = Math.floor(total / 12)
  const m = ((total % 12) + 12) % 12
  return toISO(y, m, clampDay(y, m, dueDay))
}

/** Período coberto pela fatura que fecha em (year, month): [de, até] inclusivos. */
export const periodOfClosingMonth = (year, month, closingDay) => {
  const prev = year * 12 + month - 1
  const py = Math.floor(prev / 12)
  const pm = ((prev % 12) + 12) % 12
  const from = toISO(py, pm, clampDay(py, pm, closingDay))
  // "até" = véspera do fechamento do mês atual
  const closeThis = toISO(year, month, clampDay(year, month, closingDay))
  const { y: cy, m: cm, d: cd } = parseISO(closeThis)
  const toDate = new Date(cy, cm, cd - 1)
  const to = toISO(toDate.getFullYear(), toDate.getMonth(), toDate.getDate())
  return { from, to }
}

/**
 * Descobre qual fatura vence dentro do intervalo de datas do ciclo do painel.
 * @param {Date} cycleStart início do ciclo (inclusive)
 * @param {Date} cycleEnd fim do ciclo (exclusivo)
 * @returns {{from:string,to:string,due:string}|null}
 */
export const invoicePeriodForCycle = (cycleStart, cycleEnd, closingDay, dueDay) => {
  const baseY = cycleStart.getFullYear()
  const baseM = cycleStart.getMonth()
  for (const delta of [-1, 0, 1, 2]) {
    const total = baseY * 12 + baseM + delta
    const year = Math.floor(total / 12)
    const month = ((total % 12) + 12) % 12
    // vencimento da fatura que fecha em (year, month)
    const dTotal = year * 12 + month + (dueDay < closingDay ? 1 : 0)
    const dy = Math.floor(dTotal / 12)
    const dm = ((dTotal % 12) + 12) % 12
    const dd = clampDay(dy, dm, dueDay)
    const dueDate = new Date(dy, dm, dd)
    if (dueDate >= cycleStart && dueDate < cycleEnd) {
      return { ...periodOfClosingMonth(year, month, closingDay), due: toISO(dy, dm, dd) }
    }
  }
  return null
}

/** dd/mm — rótulo curto para exibir o período. */
export const shortDate = (iso) => {
  if (!iso) return ''
  const [, m, d] = String(iso).split('-')
  return `${d}/${m}`
}
