import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

/**
 * Planner: funcionalidades do painel que dependem de recorrência entre ciclos
 * (contas fixas, parcelas do cartão, compras únicas e categorias de gasto), com
 * persistência no Supabase para sincronizar entre web e mobile.
 *
 * O modelo em memória (state) é idêntico ao das listas do reference: cada "ciclo"
 * é um índice inteiro = ano * 12 + mês (mês 0-11), passado por `cycleIndexRef`.
 *  - Contas fixas / categorias: recorrem de `start` até `end` (null = sem fim). Ao
 *    remover, some do ciclo atual e dos futuros (end = ciclo-1) preservando o passado.
 *  - Parcelas: avançam 1 por ciclo (parcela = ciclo - start + 1) e expiram no total.
 *  - Compras únicas: aparecem só no ciclo em que foram lançadas.
 *  - Categorias: cada uma tem um teto e um gasto lançado por ciclo (spends[ciclo]).
 *
 * Só a camada de persistência muda em relação à versão local: os computeds abaixo
 * continuam sendo a fonte de verdade da UI.
 */

const LEGACY_KEY = 'rf_planner_v1' // localStorage antigo, migrado uma única vez

const blankState = () => ({
  fixed: [], // { id, name, amount, day, essential, start, end|null }
  installments: [], // { id, name, amount, start, total }
  oneTime: [], // { id, name, amount, cycle }
  budgets: [], // { id, name, limit, essential, start, end|null, spends: { [ciclo]: number } }
  fixedPaid: {}, // { [ciclo]: string[] }
  invoicePaid: {} // { [ciclo]: boolean }
})

const mapFixed = (r) => ({
  id: r.id, name: r.nome, amount: Number(r.valor), day: r.dia,
  essential: r.essencial, start: r.ciclo_inicio, end: r.ciclo_fim
})
const mapParcela = (r) => ({
  id: r.id, name: r.nome, amount: Number(r.valor), start: r.ciclo_inicio, total: r.total_parcelas
})
const mapUnica = (r) => ({ id: r.id, name: r.nome, amount: Number(r.valor), cycle: r.ciclo })
const mapCategoria = (r, spends) => ({
  id: r.id, name: r.nome, limit: Number(r.teto), essential: r.essencial,
  start: r.ciclo_inicio, end: r.ciclo_fim, spends: spends || {}
})

export function usePlanner(cycleIndexRef) {
  const state = ref(blankState())
  const error = ref(null)
  const isLoading = ref(false)

  let cachedUserId = null
  const getUserId = async () => {
    if (cachedUserId) return cachedUserId
    const { data: { user } } = await supabase.auth.getUser()
    cachedUserId = user?.id || null
    return cachedUserId
  }

  const idx = () => cycleIndexRef.value
  const sum = (arr, k) => arr.reduce((a, b) => a + (Number(b[k]) || 0), 0)
  const activeAt = (item, i) => item.start <= i && (item.end == null || i <= item.end)
  const parcelaAt = (inst, i) => i - inst.start + 1
  const touch = () => { state.value = { ...state.value } }

  // ---- Listas visíveis do ciclo selecionado (inalteradas) ----
  const fixedCiclo = computed(() => state.value.fixed.filter((f) => activeAt(f, idx())))
  const installmentsCiclo = computed(() =>
    state.value.installments
      .map((x) => ({ ...x, parcela: parcelaAt(x, idx()) }))
      .filter((x) => x.parcela >= 1 && x.parcela <= x.total)
  )
  const oneTimeCiclo = computed(() => state.value.oneTime.filter((o) => o.cycle === idx()))
  const budgetsCiclo = computed(() =>
    state.value.budgets
      .filter((b) => activeAt(b, idx()))
      .map((b) => ({ ...b, spent: (b.spends && b.spends[idx()]) || 0 }))
  )

  // ---- Totais ----
  const totalFixed = computed(() => sum(fixedCiclo.value, 'amount'))
  const totalInstallments = computed(() => sum(installmentsCiclo.value, 'amount'))
  const totalOneTime = computed(() => sum(oneTimeCiclo.value, 'amount'))
  const totalInvoice = computed(() => totalInstallments.value + totalOneTime.value)
  const comprometido = computed(() => totalFixed.value + totalInvoice.value)
  const totalBudget = computed(() => sum(budgetsCiclo.value, 'limit'))
  const totalGasto = computed(() => sum(budgetsCiclo.value, 'spent'))

  // ---- Pagamentos ----
  const fixedPaidIds = computed(() => state.value.fixedPaid[idx()] || [])
  const invoicePaid = computed(() => !!state.value.invoicePaid[idx()])
  const totalPago = computed(
    () =>
      sum(fixedCiclo.value.filter((f) => fixedPaidIds.value.includes(f.id)), 'amount') +
      (invoicePaid.value ? totalInvoice.value : 0)
  )
  const restante = computed(() => comprometido.value - totalPago.value)

  // ---- Totais para um ciclo arbitrário (evolução patrimonial) ----
  const comprometidoAt = (i) =>
    sum(state.value.fixed.filter((f) => activeAt(f, i)), 'amount') +
    sum(state.value.installments.filter((x) => {
      const p = parcelaAt(x, i)
      return p >= 1 && p <= x.total
    }), 'amount') +
    sum(state.value.oneTime.filter((o) => o.cycle === i), 'amount')

  const gastoAt = (i) =>
    state.value.budgets
      .filter((b) => activeAt(b, i))
      .reduce((a, b) => a + ((b.spends && b.spends[i]) || 0), 0)

  const earliestIndex = computed(() => {
    const starts = [
      ...state.value.fixed.map((f) => f.start),
      ...state.value.installments.map((f) => f.start),
      ...state.value.oneTime.map((o) => o.cycle),
      ...state.value.budgets.map((b) => b.start)
    ]
    return starts.length ? Math.min(...starts) : null
  })

  const hasFixed = computed(() => state.value.fixed.length > 0)
  const hasBudgets = computed(() => state.value.budgets.length > 0)
  const hasAny = computed(
    () =>
      state.value.fixed.length + state.value.installments.length +
        state.value.oneTime.length + state.value.budgets.length > 0
  )

  // ---- Carregamento ----
  const fetchAndMap = async (userId) => {
    const eq = (t) => supabase.from(t).select('*').eq('usuario_id', userId)
    const [fixedR, parcelasR, unicasR, catR, gastosR, pagasR, faturasR] = await Promise.all([
      eq('planner_contas_fixas'),
      eq('planner_parcelas'),
      eq('planner_compras_unicas'),
      eq('planner_categorias'),
      eq('planner_categoria_gastos'),
      eq('planner_contas_pagas'),
      eq('planner_faturas_pagas')
    ])
    const firstErr = [fixedR, parcelasR, unicasR, catR, gastosR, pagasR, faturasR].find((r) => r.error)
    if (firstErr) throw new Error(firstErr.error.message)

    const spendsByCat = {}
    for (const g of gastosR.data || []) {
      ;(spendsByCat[g.categoria_id] ||= {})[g.ciclo] = Number(g.valor)
    }
    const next = blankState()
    next.fixed = (fixedR.data || []).map(mapFixed)
    next.installments = (parcelasR.data || []).map(mapParcela)
    next.oneTime = (unicasR.data || []).map(mapUnica)
    next.budgets = (catR.data || []).map((r) => mapCategoria(r, spendsByCat[r.id]))
    for (const p of pagasR.data || []) (next.fixedPaid[p.ciclo] ||= []).push(p.conta_id)
    for (const f of faturasR.data || []) next.invoicePaid[f.ciclo] = true
    state.value = next
  }

  const load = async () => {
    isLoading.value = true
    error.value = null
    try {
      const userId = await getUserId()
      if (!userId) return
      await fetchAndMap(userId)
      if (await maybeMigrate(userId)) await fetchAndMap(userId)
    } catch (e) {
      error.value = e.message
    } finally {
      isLoading.value = false
    }
  }

  // Migração única do planner que ficava em localStorage (só se o Supabase estiver vazio)
  const maybeMigrate = async (userId) => {
    let legacy = null
    try { legacy = JSON.parse(localStorage.getItem(LEGACY_KEY)) } catch { legacy = null }
    if (!legacy) return false

    const supaHasData =
      state.value.fixed.length || state.value.installments.length ||
      state.value.oneTime.length || state.value.budgets.length
    if (supaHasData) {
      try { localStorage.removeItem(LEGACY_KEY) } catch { /* ignore */ }
      return false
    }

    try {
      if (legacy.fixed?.length) {
        await supabase.from('planner_contas_fixas').insert(legacy.fixed.map((f) => ({
          usuario_id: userId, nome: f.name, valor: f.amount, dia: f.day || 1,
          essencial: f.essential ?? true, ciclo_inicio: f.start, ciclo_fim: f.end ?? null
        })))
      }
      if (legacy.installments?.length) {
        await supabase.from('planner_parcelas').insert(legacy.installments.map((x) => ({
          usuario_id: userId, nome: x.name, valor: x.amount, ciclo_inicio: x.start, total_parcelas: x.total
        })))
      }
      if (legacy.oneTime?.length) {
        await supabase.from('planner_compras_unicas').insert(legacy.oneTime.map((o) => ({
          usuario_id: userId, nome: o.name, valor: o.amount, ciclo: o.cycle
        })))
      }
      // Categorias precisam do id gerado para vincular os gastos, então insere uma a uma.
      for (const b of legacy.budgets || []) {
        const { data, error: err } = await supabase.from('planner_categorias').insert({
          usuario_id: userId, nome: b.name, teto: b.limit || 0,
          essencial: b.essential ?? false, ciclo_inicio: b.start, ciclo_fim: b.end ?? null
        }).select().single()
        if (err || !data) continue
        const spends = b.spends || {}
        const gastos = Object.keys(spends)
          .filter((c) => Number(spends[c]) > 0)
          .map((c) => ({ usuario_id: userId, categoria_id: data.id, ciclo: Number(c), valor: Number(spends[c]) }))
        if (gastos.length) await supabase.from('planner_categoria_gastos').insert(gastos)
      }
      // Pagamentos migram só se a conta correspondente existir; como os ids mudaram,
      // o estado de "pago" é recomeçado (informação de baixo impacto).
      try { localStorage.removeItem(LEGACY_KEY) } catch { /* ignore */ }
      return true
    } catch (e) {
      error.value = e.message
      return false
    }
  }

  // ---- Ações: adicionar ----
  const addFixed = async (name, amount, day) => {
    if (!name || !amount) return
    const userId = await getUserId(); if (!userId) return
    const { data, error: err } = await supabase.from('planner_contas_fixas')
      .insert({ usuario_id: userId, nome: name, valor: amount, dia: day || 1, essencial: true, ciclo_inicio: idx() })
      .select().single()
    if (err) { error.value = err.message; return }
    state.value.fixed.push(mapFixed(data)); touch()
  }

  const addInstallment = async (name, amount, parcelaAtual, parcelaTotal) => {
    if (!name || !amount) return
    const userId = await getUserId(); if (!userId) return
    const total = Math.max(parcelaTotal || 1, 1)
    const pa = Math.min(Math.max(parcelaAtual || 1, 1), total)
    const { data, error: err } = await supabase.from('planner_parcelas')
      .insert({ usuario_id: userId, nome: name, valor: amount, ciclo_inicio: idx() - (pa - 1), total_parcelas: total })
      .select().single()
    if (err) { error.value = err.message; return }
    state.value.installments.push(mapParcela(data)); touch()
  }

  const addOneTime = async (name, amount) => {
    if (!name || !amount) return
    const userId = await getUserId(); if (!userId) return
    const { data, error: err } = await supabase.from('planner_compras_unicas')
      .insert({ usuario_id: userId, nome: name, valor: amount, ciclo: idx() })
      .select().single()
    if (err) { error.value = err.message; return }
    state.value.oneTime.push(mapUnica(data)); touch()
  }

  const addBudget = async (name, limit) => {
    if (!name) return
    const userId = await getUserId(); if (!userId) return
    const { data, error: err } = await supabase.from('planner_categorias')
      .insert({ usuario_id: userId, nome: name, teto: limit || 0, essencial: false, ciclo_inicio: idx() })
      .select().single()
    if (err) { error.value = err.message; return }
    state.value.budgets.push(mapCategoria(data, {})); touch()
  }

  // ---- Ações: editar ----
  const setAmount = async (kind, id, amount) => {
    const table = kind === 'fixed' ? 'planner_contas_fixas'
      : kind === 'installment' ? 'planner_parcelas' : 'planner_compras_unicas'
    const arr = kind === 'fixed' ? state.value.fixed
      : kind === 'installment' ? state.value.installments : state.value.oneTime
    const it = arr.find((x) => x.id === id)
    if (it) { it.amount = amount; touch() }
    const { error: err } = await supabase.from(table).update({ valor: amount }).eq('id', id)
    if (err) error.value = err.message
  }

  const setBudgetLimit = async (id, limit) => {
    const b = state.value.budgets.find((x) => x.id === id)
    if (b) { b.limit = limit; touch() }
    const { error: err } = await supabase.from('planner_categorias').update({ teto: limit }).eq('id', id)
    if (err) error.value = err.message
  }

  const launchSpend = async (id, amount) => {
    if (!amount) return
    const userId = await getUserId(); if (!userId) return
    const b = state.value.budgets.find((x) => x.id === id)
    if (!b) return
    if (!b.spends) b.spends = {}
    const novo = (b.spends[idx()] || 0) + amount
    b.spends[idx()] = novo; touch()
    const { error: err } = await supabase.from('planner_categoria_gastos')
      .upsert({ usuario_id: userId, categoria_id: id, ciclo: idx(), valor: novo }, { onConflict: 'categoria_id,ciclo' })
    if (err) error.value = err.message
  }

  // ---- Ações: pagamentos ----
  const toggleFixedPaid = async (id) => {
    const userId = await getUserId(); if (!userId) return
    const i = idx()
    const cur = new Set(state.value.fixedPaid[i] || [])
    const willPay = !cur.has(id)
    if (willPay) cur.add(id); else cur.delete(id)
    state.value.fixedPaid[i] = [...cur]; touch()
    if (willPay) {
      const { error: err } = await supabase.from('planner_contas_pagas')
        .insert({ usuario_id: userId, conta_id: id, ciclo: i })
      if (err) error.value = err.message
    } else {
      const { error: err } = await supabase.from('planner_contas_pagas')
        .delete().eq('conta_id', id).eq('ciclo', i)
      if (err) error.value = err.message
    }
  }

  const toggleInvoicePaid = async () => {
    const userId = await getUserId(); if (!userId) return
    const i = idx()
    const willPay = !state.value.invoicePaid[i]
    state.value.invoicePaid[i] = willPay; touch()
    if (willPay) {
      const { error: err } = await supabase.from('planner_faturas_pagas')
        .insert({ usuario_id: userId, ciclo: i })
      if (err) error.value = err.message
    } else {
      const { error: err } = await supabase.from('planner_faturas_pagas')
        .delete().eq('usuario_id', userId).eq('ciclo', i)
      if (err) error.value = err.message
    }
  }

  // ---- Ações: remover ----
  // Recorrentes: some do ciclo atual e futuros (end = ciclo-1); some de vez se não
  // houver passado a preservar (start >= ciclo atual).
  const removeRecurring = async (arrName, table, id) => {
    const i = idx()
    const it = state.value[arrName].find((x) => x.id === id)
    if (!it) return
    if (it.start >= i) {
      state.value[arrName] = state.value[arrName].filter((x) => x.id !== id); touch()
      const { error: err } = await supabase.from(table).delete().eq('id', id)
      if (err) error.value = err.message
    } else {
      it.end = i - 1; touch()
      const { error: err } = await supabase.from(table).update({ ciclo_fim: i - 1 }).eq('id', id)
      if (err) error.value = err.message
    }
  }

  const removeFixed = (id) => removeRecurring('fixed', 'planner_contas_fixas', id)
  const removeBudget = (id) => removeRecurring('budgets', 'planner_categorias', id)

  const removeInstallment = async (id) => {
    state.value.installments = state.value.installments.filter((x) => x.id !== id); touch()
    const { error: err } = await supabase.from('planner_parcelas').delete().eq('id', id)
    if (err) error.value = err.message
  }

  const removeOneTime = async (id) => {
    state.value.oneTime = state.value.oneTime.filter((x) => x.id !== id); touch()
    const { error: err } = await supabase.from('planner_compras_unicas').delete().eq('id', id)
    if (err) error.value = err.message
  }

  const clear = async () => {
    state.value = blankState()
    const userId = await getUserId(); if (!userId) return
    const del = (t) => supabase.from(t).delete().eq('usuario_id', userId)
    const results = await Promise.all([
      del('planner_categoria_gastos'),
      del('planner_contas_pagas'),
      del('planner_faturas_pagas'),
      del('planner_contas_fixas'),
      del('planner_parcelas'),
      del('planner_compras_unicas'),
      del('planner_categorias')
    ])
    const firstErr = results.find((r) => r.error)
    if (firstErr) error.value = firstErr.error.message
  }

  return {
    // estado
    error, isLoading, load,
    // listas do ciclo
    fixedCiclo, installmentsCiclo, oneTimeCiclo, budgetsCiclo,
    // totais
    totalFixed, totalInstallments, totalOneTime, totalInvoice, comprometido,
    totalBudget, totalGasto,
    // pagamentos
    fixedPaidIds, invoicePaid, totalPago, restante,
    // evolução / flags
    comprometidoAt, gastoAt, earliestIndex, hasFixed, hasBudgets, hasAny,
    // ações
    addFixed, addInstallment, addOneTime, addBudget,
    setAmount, setBudgetLimit, launchSpend,
    toggleFixedPaid, toggleInvoicePaid,
    removeFixed, removeInstallment, removeOneTime, removeBudget,
    clear
  }
}
