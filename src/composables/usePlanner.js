import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { DEFAULT_CARD, dueDateOf } from '@/utils/invoiceCycle'

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
  essential: r.essencial, start: r.ciclo_inicio, end: r.ciclo_fim,
  tipo: r.tipo || 'conta'
})
const mapParcela = (r) => ({
  id: r.id, name: r.nome, amount: Number(r.valor), start: r.ciclo_inicio, total: r.total_parcelas,
  data: r.data || null, categoria: r.categoria || null, fingerprint: r.fingerprint || null,
  categoriaId: r.categoria_id || null
})
const mapUnica = (r) => ({
  id: r.id, name: r.nome, amount: Number(r.valor), cycle: r.ciclo,
  data: r.data || null, categoria: r.categoria || null, fingerprint: r.fingerprint || null,
  pagamento: r.pagamento || 'credito'
})
const mapCategoria = (r, spends) => ({
  id: r.id, name: r.nome, limit: Number(r.teto), essential: r.essencial,
  start: r.ciclo_inicio, end: r.ciclo_fim, spends: spends || {},
  pagamento: r.pagamento || 'debito', parcelas: r.parcelas || null
})

/**
 * @param cycleIndexRef ref com o índice do ciclo visualizado
 * @param cycleIndexOfDate (isoDate) => índice do ciclo do painel que contém a data
 */
export function usePlanner(cycleIndexRef, cycleIndexOfDate) {
  const state = ref(blankState())
  const card = ref({ ...DEFAULT_CARD })
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
  const touch = () => { state.value = { ...state.value } }

  /**
   * Ciclo do painel em que uma compra deve aparecer.
   * Com o ciclo do cartão ativo, o que importa é QUANDO A FATURA VENCE — assim uma
   * fatura que vai de 15/07 a 14/08 aparece inteira no ciclo em que é paga, em vez
   * de ser partida entre julho e agosto.
   */
  const invoiceCycleOf = (iso) => {
    if (!iso || typeof cycleIndexOfDate !== 'function') return null
    if (!card.value.enabled) return cycleIndexOfDate(iso)
    return cycleIndexOfDate(dueDateOf(iso, card.value.closingDay, card.value.dueDay))
  }

  // Ciclo efetivo: derivado da data da compra quando ela existe (importações),
  // senão o ciclo gravado (itens criados manualmente, sem data).
  const oneTimeCycle = (o) => {
    const c = invoiceCycleOf(o.data)
    return c == null ? o.cycle : c
  }
  const instStart = (x) => {
    const c = invoiceCycleOf(x.data)
    return c == null ? x.start : c
  }
  const parcelaAt = (inst, i) => i - instStart(inst) + 1

  // ---- Listas visíveis do ciclo selecionado ----
  // `fixed` guarda contas fixas E assinaturas (mesma recorrência, seções diferentes)
  const fixedCiclo = computed(() =>
    state.value.fixed.filter((f) => f.tipo !== 'assinatura' && activeAt(f, idx()))
  )
  const subscriptionsCiclo = computed(() =>
    state.value.fixed.filter((f) => f.tipo === 'assinatura' && activeAt(f, idx()))
  )
  const installmentsCiclo = computed(() =>
    state.value.installments
      .map((x) => ({ ...x, parcela: parcelaAt(x, idx()) }))
      .filter((x) => x.parcela >= 1 && x.parcela <= x.total)
  )
  // Compras do ciclo, separadas por forma de pagamento: as de crédito entram na
  // fatura; as de débito já saíram da conta (gastos rápidos).
  const oneTimeCiclo = computed(() =>
    state.value.oneTime.filter((o) => o.pagamento !== 'debito' && oneTimeCycle(o) === idx())
  )
  const debitsCiclo = computed(() =>
    state.value.oneTime.filter((o) => o.pagamento === 'debito' && oneTimeCycle(o) === idx())
  )
  const budgetsCiclo = computed(() =>
    state.value.budgets
      .filter((b) => activeAt(b, idx()))
      .map((b) => ({ ...b, spent: (b.spends && b.spends[idx()]) || 0 }))
  )

  // ---- Totais ----
  const totalFixed = computed(() => sum(fixedCiclo.value, 'amount'))
  const totalSubscriptions = computed(() => sum(subscriptionsCiclo.value, 'amount'))
  const totalInstallments = computed(() => sum(installmentsCiclo.value, 'amount'))
  const totalOneTime = computed(() => sum(oneTimeCiclo.value, 'amount'))
  const totalDebits = computed(() => sum(debitsCiclo.value, 'amount'))
  // Assinaturas são cobradas no cartão, então entram na fatura
  const totalInvoice = computed(() =>
    totalInstallments.value + totalOneTime.value + totalSubscriptions.value
  )
  // "A pagar" = contas fixas + fatura (o débito já saiu da conta)
  const aPagar = computed(() => totalFixed.value + totalInvoice.value)
  // Já o "comprometido" (que reduz o livre) inclui também os gastos no débito
  const comprometido = computed(() => aPagar.value + totalDebits.value)
  const totalBudget = computed(() => sum(budgetsCiclo.value, 'limit'))
  const totalGasto = computed(() => sum(budgetsCiclo.value, 'spent'))

  // Só o planejado no DÉBITO entra como fatia própria no gráfico: o planejado no
  // crédito já aparece em "Comprometido" através da parcela que gerou na fatura.
  const totalBudgetDebito = computed(() =>
    sum(budgetsCiclo.value.filter((b) => b.pagamento !== 'credito'), 'limit')
  )

  // ---- Pagamentos ----
  const fixedPaidIds = computed(() => state.value.fixedPaid[idx()] || [])
  const invoicePaid = computed(() => !!state.value.invoicePaid[idx()])
  const totalPago = computed(
    () =>
      sum(fixedCiclo.value.filter((f) => fixedPaidIds.value.includes(f.id)), 'amount') +
      (invoicePaid.value ? totalInvoice.value : 0)
  )
  const restante = computed(() => aPagar.value - totalPago.value)

  // ---- Totais para um ciclo arbitrário (evolução patrimonial) ----
  const comprometidoAt = (i) =>
    sum(state.value.fixed.filter((f) => activeAt(f, i)), 'amount') +
    sum(state.value.installments.filter((x) => {
      const p = parcelaAt(x, i)
      return p >= 1 && p <= x.total
    }), 'amount') +
    sum(state.value.oneTime.filter((o) => oneTimeCycle(o) === i), 'amount')

  const gastoAt = (i) =>
    state.value.budgets
      .filter((b) => activeAt(b, i))
      .reduce((a, b) => a + ((b.spends && b.spends[i]) || 0), 0)

  const earliestIndex = computed(() => {
    const starts = [
      ...state.value.fixed.map((f) => f.start),
      ...state.value.installments.map(instStart),
      ...state.value.oneTime.map(oneTimeCycle),
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
    const [fixedR, parcelasR, unicasR, catR, gastosR, pagasR, faturasR, cartaoR] = await Promise.all([
      eq('planner_contas_fixas'),
      eq('planner_parcelas'),
      eq('planner_compras_unicas'),
      eq('planner_categorias'),
      eq('planner_categoria_gastos'),
      eq('planner_contas_pagas'),
      eq('planner_faturas_pagas'),
      eq('planner_cartao')
    ])
    const firstErr = [fixedR, parcelasR, unicasR, catR, gastosR, pagasR, faturasR, cartaoR].find((r) => r.error)
    if (firstErr) throw new Error(firstErr.error.message)

    const cfg = (cartaoR.data || [])[0]
    card.value = cfg
      ? { enabled: !!cfg.usar_ciclo, closingDay: cfg.dia_fechamento, dueDay: cfg.dia_vencimento }
      : { ...DEFAULT_CARD }

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

  // Assinatura: mesma recorrência de uma conta fixa, mas dentro da fatura
  const addSubscription = async (name, amount, day) => {
    if (!name || !amount) return
    const userId = await getUserId(); if (!userId) return
    const { data, error: err } = await supabase.from('planner_contas_fixas')
      .insert({
        usuario_id: userId, nome: name, valor: amount, dia: day || 1,
        essencial: false, tipo: 'assinatura', ciclo_inicio: idx()
      })
      .select().single()
    if (err) { error.value = err.message; return }
    state.value.fixed.push(mapFixed(data)); touch()
  }

  // Transforma uma compra única em assinatura, a partir do ciclo em que ela está
  const convertToSubscription = async (oneTimeId) => {
    const item = state.value.oneTime.find((x) => x.id === oneTimeId)
    if (!item) return
    const userId = await getUserId(); if (!userId) return
    const startCycle = oneTimeCycle(item)
    const day = item.data ? Number(String(item.data).split('-')[2]) || 1 : 1

    const { data, error: err } = await supabase.from('planner_contas_fixas')
      .insert({
        usuario_id: userId, nome: item.name, valor: item.amount, dia: day,
        essencial: false, tipo: 'assinatura', ciclo_inicio: startCycle
      })
      .select().single()
    if (err) { error.value = err.message; return }

    state.value.fixed.push(mapFixed(data))
    state.value.oneTime = state.value.oneTime.filter((x) => x.id !== oneTimeId)
    touch()

    const { error: delErr } = await supabase.from('planner_compras_unicas').delete().eq('id', oneTimeId)
    if (delErr) error.value = delErr.message
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

  const addOneTime = async (name, amount, pagamento = 'credito') => {
    if (!name || !amount) return
    const userId = await getUserId(); if (!userId) return
    const { data, error: err } = await supabase.from('planner_compras_unicas')
      .insert({
        usuario_id: userId, nome: name, valor: amount, ciclo: idx(),
        pagamento: pagamento === 'debito' ? 'debito' : 'credito'
      })
      .select().single()
    if (err) { error.value = err.message; return }
    state.value.oneTime.push(mapUnica(data)); touch()
  }

  /**
   * Gasto rápido: no débito vira uma saída direta da conta; no crédito entra na
   * fatura — como compra única (1x) ou como parcelamento (2x ou mais).
   */
  const addQuickExpense = async ({ name, amount, pagamento = 'debito', parcelas = 1 }) => {
    if (!name || !amount) return
    if (pagamento === 'debito') return addOneTime(name, amount, 'debito')
    const n = Math.min(Math.max(parseInt(parcelas, 10) || 1, 1), 60)
    if (n <= 1) return addOneTime(name, amount, 'credito')
    return addInstallment(name, Math.round((amount / n) * 100) / 100, 1, n)
  }

  /**
   * Despesa planejada. No crédito, também cria a parcela correspondente na
   * fatura (valor total dividido pelo nº de parcelas), ligada por categoria_id.
   */
  const addBudget = async (name, limit, pagamento = 'debito', parcelas = 1) => {
    if (!name) return
    const userId = await getUserId(); if (!userId) return
    const noCredito = pagamento === 'credito'
    const nParcelas = noCredito ? Math.min(Math.max(parseInt(parcelas, 10) || 1, 1), 60) : null

    const { data, error: err } = await supabase.from('planner_categorias')
      .insert({
        usuario_id: userId, nome: name, teto: limit || 0, essencial: false,
        pagamento: noCredito ? 'credito' : 'debito', parcelas: nParcelas,
        ciclo_inicio: idx()
      })
      .select().single()
    if (err) { error.value = err.message; return }
    state.value.budgets.push(mapCategoria(data, {}))

    if (noCredito && limit > 0) {
      const valorParcela = Math.round((limit / nParcelas) * 100) / 100
      const { data: par, error: pErr } = await supabase.from('planner_parcelas')
        .insert({
          usuario_id: userId, nome: name, valor: valorParcela,
          ciclo_inicio: idx(), total_parcelas: nParcelas, categoria_id: data.id
        })
        .select().single()
      if (pErr) { error.value = pErr.message }
      else state.value.installments.push(mapParcela(par))
    }
    touch()
  }

  // ---- Configuração do ciclo do cartão ----
  const saveCardConfig = async ({ enabled, closingDay, dueDay }) => {
    const clampDay = (v, fb) => {
      const n = parseInt(v, 10)
      return isNaN(n) ? fb : Math.min(Math.max(n, 1), 31)
    }
    const next = {
      enabled: !!enabled,
      closingDay: clampDay(closingDay, card.value.closingDay),
      dueDay: clampDay(dueDay, card.value.dueDay)
    }
    card.value = next // aplica na hora; os ciclos são derivados

    const userId = await getUserId(); if (!userId) return
    const { error: err } = await supabase.from('planner_cartao').upsert({
      usuario_id: userId,
      usar_ciclo: next.enabled,
      dia_fechamento: next.closingDay,
      dia_vencimento: next.dueDay,
      atualizado_em: new Date().toISOString()
    }, { onConflict: 'usuario_id' })
    if (err) error.value = err.message
  }

  // ---- Importação de fatura (CSV) ----
  // Recebe lançamentos já normalizados e com `cycle` resolvido pela data, então
  // itens de meses diferentes vão para os ciclos corretos. Deduplica por
  // `fingerprint` (contra o que já existe e dentro do próprio lote).
  const importEntries = async (entries) => {
    const userId = await getUserId()
    if (!userId) return { imported: 0, duplicates: 0, cycles: [] }

    const existing = new Set(
      [...state.value.installments, ...state.value.oneTime]
        .map((x) => x.fingerprint)
        .filter(Boolean)
    )

    const parcelas = []
    const unicas = []
    const assinaturas = []
    let duplicates = 0
    const cycles = new Set()

    // Assinaturas repetem todo mês no CSV: a chave é o NOME, e só criamos uma nova
    // se ainda não houver assinatura com esse nome ativa naquele ciclo.
    const normalize = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/\s+/g, ' ').trim()
    const subsByName = new Map()
    for (const f of state.value.fixed) {
      if (f.tipo !== 'assinatura') continue
      const list = subsByName.get(normalize(f.name)) || []
      list.push(f)
      subsByName.set(normalize(f.name), list)
    }
    const hasActiveSub = (name, cycle) =>
      (subsByName.get(normalize(name)) || []).some(
        (f) => f.start <= cycle && (f.end == null || cycle <= f.end)
      )

    for (const e of entries) {
      if (e.kind === 'subscription') {
        if (hasActiveSub(e.name, e.cycle)) { duplicates++; continue }
        const rec = {
          usuario_id: userId, nome: e.name, valor: e.amount,
          dia: Number(String(e.date).split('-')[2]) || 1,
          essencial: false, tipo: 'assinatura', ciclo_inicio: e.cycle
        }
        assinaturas.push(rec)
        // registra na memória local para não duplicar dentro do próprio arquivo
        const key = normalize(e.name)
        const list = subsByName.get(key) || []
        list.push({ name: e.name, start: e.cycle, end: null, tipo: 'assinatura' })
        subsByName.set(key, list)
        cycles.add(e.cycle)
        continue
      }

      if (!e.fingerprint || existing.has(e.fingerprint)) { duplicates++; continue }
      existing.add(e.fingerprint) // evita duplicata dentro do próprio arquivo
      cycles.add(e.cycle)

      // `data` guarda a data da COMPRA original (na parcela 1). O ciclo exibido é
      // derivado dela + configuração do cartão, então mudar o fechamento re-encaixa
      // tudo sem precisar reescrever as linhas.
      if (e.kind === 'installment') {
        parcelas.push({
          usuario_id: userId, nome: e.name, valor: e.amount,
          ciclo_inicio: e.cycle,
          total_parcelas: e.parcelaTotal || 1,
          data: e.purchaseDate || e.date, categoria: e.category, fingerprint: e.fingerprint
        })
      } else {
        unicas.push({
          usuario_id: userId, nome: e.name, valor: e.amount, ciclo: e.cycle,
          data: e.purchaseDate || e.date, categoria: e.category, fingerprint: e.fingerprint
        })
      }
    }

    if (parcelas.length) {
      const { data, error: err } = await supabase.from('planner_parcelas').insert(parcelas).select()
      if (err) { error.value = err.message; return { imported: 0, duplicates, cycles: [], failed: true } }
      state.value.installments.push(...(data || []).map(mapParcela))
    }
    if (unicas.length) {
      const { data, error: err } = await supabase.from('planner_compras_unicas').insert(unicas).select()
      if (err) { error.value = err.message; return { imported: parcelas.length, duplicates, cycles: [], failed: true } }
      state.value.oneTime.push(...(data || []).map(mapUnica))
    }
    if (assinaturas.length) {
      const { data, error: err } = await supabase.from('planner_contas_fixas').insert(assinaturas).select()
      if (err) {
        error.value = err.message
        return { imported: parcelas.length + unicas.length, duplicates, cycles: [], failed: true }
      }
      state.value.fixed.push(...(data || []).map(mapFixed))
    }
    touch()

    return {
      imported: parcelas.length + unicas.length + assinaturas.length,
      subscriptions: assinaturas.length,
      duplicates,
      cycles: [...cycles].sort()
    }
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

  // Despesa planejada no crédito: apagar a despesa apaga também a parcela gerada
  const removeBudget = async (id) => {
    const linked = state.value.installments.filter((x) => x.categoriaId === id)
    if (linked.length) {
      state.value.installments = state.value.installments.filter((x) => x.categoriaId !== id)
      const { error: err } = await supabase.from('planner_parcelas').delete().eq('categoria_id', id)
      if (err) error.value = err.message
    }
    await removeRecurring('budgets', 'planner_categorias', id)
  }

  // ...e apagar a parcela apaga a despesa planejada que a originou
  const removeInstallment = async (id) => {
    const item = state.value.installments.find((x) => x.id === id)
    const linkedBudgetId = item?.categoriaId || null

    state.value.installments = state.value.installments.filter((x) => x.id !== id); touch()
    const { error: err } = await supabase.from('planner_parcelas').delete().eq('id', id)
    if (err) { error.value = err.message; return }

    if (linkedBudgetId) {
      state.value.budgets = state.value.budgets.filter((b) => b.id !== linkedBudgetId)
      touch()
      const { error: bErr } = await supabase.from('planner_categorias').delete().eq('id', linkedBudgetId)
      if (bErr) error.value = bErr.message
    }
  }

  const removeOneTime = async (id) => {
    state.value.oneTime = state.value.oneTime.filter((x) => x.id !== id); touch()
    const { error: err } = await supabase.from('planner_compras_unicas').delete().eq('id', id)
    if (err) error.value = err.message
  }

  // Limpa só o painel de despesas: contas fixas, assinaturas e fatura do cartão
  // (mantém categorias de gasto planejado e a configuração do cartão).
  const clearBills = async () => {
    state.value.fixed = []
    state.value.installments = []
    state.value.oneTime = []
    state.value.fixedPaid = {}
    state.value.invoicePaid = {}
    touch()

    const userId = await getUserId(); if (!userId) return
    const del = (t) => supabase.from(t).delete().eq('usuario_id', userId)
    const results = await Promise.all([
      del('planner_contas_pagas'),
      del('planner_faturas_pagas'),
      del('planner_contas_fixas'),
      del('planner_parcelas'),
      del('planner_compras_unicas')
    ])
    const firstErr = results.find((r) => r.error)
    if (firstErr) error.value = firstErr.error.message
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
    error, isLoading, load, card, saveCardConfig,
    // listas do ciclo
    fixedCiclo, subscriptionsCiclo, installmentsCiclo, oneTimeCiclo, debitsCiclo, budgetsCiclo,
    // totais
    totalFixed, totalSubscriptions, totalInstallments, totalOneTime, totalDebits,
    totalInvoice, aPagar, comprometido, totalBudget, totalBudgetDebito, totalGasto,
    // pagamentos
    fixedPaidIds, invoicePaid, totalPago, restante,
    // evolução / flags
    comprometidoAt, gastoAt, earliestIndex, hasFixed, hasBudgets, hasAny,
    // ações
    addFixed, addSubscription, convertToSubscription, addInstallment, addOneTime,
    addQuickExpense, addBudget, importEntries, clearBills,
    setAmount, setBudgetLimit, launchSpend,
    toggleFixedPaid, toggleInvoicePaid,
    removeFixed, removeInstallment, removeOneTime, removeBudget,
    clear
  }
}
