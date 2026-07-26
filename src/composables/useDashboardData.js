import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useCurrency } from './useCurrency'

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const FULL_MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]
const PAID_STORAGE_KEY = 'rf_contasPagas'

export function useDashboardData() {
  const { formatCurrency } = useCurrency()
  const monthOrder = {
    jan: 1,
    fev: 2,
    mar: 3,
    abr: 4,
    mai: 5,
    jun: 6,
    jul: 7,
    ago: 8,
    set: 9,
    out: 10,
    nov: 11,
    dez: 12
  }

  const normalizeMonth = (mes) => {
    if (!mes) return ''
    const base = String(mes)
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^\w\s]/g, '')

    const token = base.slice(0, 3)
    const aliases = {
      january: 'jan', janeiro: 'jan', jan: 'jan',
      february: 'fev', fevereiro: 'fev', fev: 'fev',
      march: 'mar', marco: 'mar', mar: 'mar',
      april: 'abr', abril: 'abr', abr: 'abr',
      may: 'mai', maio: 'mai', mai: 'mai',
      june: 'jun', junho: 'jun', jun: 'jun',
      july: 'jul', julho: 'jul', jul: 'jul',
      august: 'ago', agosto: 'ago', ago: 'ago',
      september: 'set', setembro: 'set', set: 'set',
      october: 'out', outubro: 'out', out: 'out',
      november: 'nov', novembro: 'nov', nov: 'nov',
      december: 'dez', dezembro: 'dez', dez: 'dez'
    }

    const normalized = aliases[base] || aliases[token] || token
    return normalized.charAt(0).toUpperCase() + normalized.slice(1)
  }

  const monthIndex = (mes) => monthOrder[normalizeMonth(mes).toLowerCase()] || 99

  const sortHistoricoRows = (rows = []) =>
    [...rows].sort((a, b) => monthIndex(a.mes) - monthIndex(b.mes))

  // Estado
  const patrimonio = ref(0)
  const cycleOffset = ref(0)
  const rendas = ref([])
  const despesas = ref([])
  const despesasAvulsas = ref([])
  const metas = ref([])
  const transacoes = ref([])
  const historico = ref({ labels: [], dados: [] })
  const isLoading = ref(false)
  const error = ref(null)

  // Computed
  const totalRenda = computed(() =>
    rendas.value.reduce((sum, r) => sum + Number(r.valor), 0)
  )

  const totalDespesa = computed(() =>
    despesas.value.reduce((sum, d) => sum + Number(d.valor), 0) +
    despesasAvulsas.value.reduce((sum, d) => sum + Number(d.valor), 0)
  )

  const saldo = computed(() => totalRenda.value - totalDespesa.value)

  const getCycleStartForDate = (date) => {
    const y = date.getFullYear()
    const m = date.getMonth()
    const fifth = getNthWorkday(y, m, 5)
    if (date >= fifth) return fifth
    const pm = m === 0 ? 11 : m - 1
    const py = m === 0 ? y - 1 : y
    return getNthWorkday(py, pm, 5)
  }

  const historicoCalculado = computed(() => {
    const cycleFlow = {}

    const addFlow = (dateStr, amount) => {
      const date = parseEntryDate(dateStr)
      const cs = getCycleStartForDate(date)
      const key = `${cs.getFullYear()}-${String(cs.getMonth() + 1).padStart(2, '0')}`
      cycleFlow[key] = (cycleFlow[key] || 0) + amount
    }

    for (const r of rendas.value) {
      if (!r.data) continue
      addFlow(r.data, Number(r.valor))
    }

    for (const d of [...despesas.value, ...despesasAvulsas.value]) {
      if (!d.data) continue
      addFlow(d.data, -Number(d.valor))
    }

    // Mostra a evolução apenas até o ciclo selecionado (chaves YYYY-MM ordenam lexicograficamente)
    const cycles = Object.keys(cycleFlow).sort().filter(c => c <= cycleKey.value)
    let cumulative = 0
    const labels = []
    const dados = []

    for (const cycle of cycles) {
      cumulative += cycleFlow[cycle]
      const [year, monthNum] = cycle.split('-')
      labels.push(`${MONTH_NAMES[parseInt(monthNum, 10) - 1]}/${year.slice(2)}`)
      dados.push(cumulative)
    }

    return { labels, dados }
  })

  // Helpers de ciclo mensal (5º dia útil do mês atual → 5º dia útil do próximo)
  const getNthWorkday = (year, month, n) => {
    let count = 0, day = 1
    while (true) {
      const date = new Date(year, month, day)
      const dow = date.getDay()
      if (dow !== 0 && dow !== 6) {
        if (++count === n) return date
      }
      day++
    }
  }

  const parseEntryDate = (dateStr) => {
    const [y, m, d] = String(dateStr).split('-').map(Number)
    return new Date(y, m - 1, d)
  }

  const addMonthsYM = (y, m, delta) => {
    const total = y * 12 + m + delta
    return { y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 }
  }

  // Mês/ano cujo 5º dia útil inicia o ciclo que contém a data de hoje
  const baseCycleMonth = () => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    const startThisMonth = getNthWorkday(y, m, 5)
    if (now >= startThisMonth) return { y, m }
    return addMonthsYM(y, m, -1)
  }

  // Ciclo selecionado pelo usuário (offset 0 = ciclo atual)
  const selectedCycle = computed(() => {
    const base = baseCycleMonth()
    const { y, m } = addMonthsYM(base.y, base.m, cycleOffset.value)
    const next = addMonthsYM(y, m, 1)
    return {
      start: getNthWorkday(y, m, 5),
      end: getNthWorkday(next.y, next.m, 5),
      year: y,
      month: m
    }
  })

  const cycleKey = computed(() =>
    `${selectedCycle.value.year}-${String(selectedCycle.value.month + 1).padStart(2, '0')}`
  )

  const cycleLabel = computed(() =>
    `${FULL_MONTH_NAMES[selectedCycle.value.month]} ${selectedCycle.value.year}`
  )

  const isCurrentCycle = computed(() => cycleOffset.value === 0)

  // Índice numérico do ciclo (ano * 12 + mês do 5º dia útil que o abre)
  const selectedCycleIndex = computed(() =>
    selectedCycle.value.year * 12 + selectedCycle.value.month
  )

  // Índice do ciclo que contém uma data/instante. Aceita Date, 'YYYY-MM-DD'
  // (interpretado no fuso local) ou um timestamp ISO (ex: criado_em).
  const cycleIndexOf = (input) => {
    let d
    if (input instanceof Date) d = input
    else if (/^\d{4}-\d{2}-\d{2}$/.test(String(input))) d = parseEntryDate(input)
    else d = new Date(input)
    const cs = getCycleStartForDate(d)
    return cs.getFullYear() * 12 + cs.getMonth()
  }
  // Compatibilidade: agrupamento por data de lançamento
  const cycleIndexOfDate = (dateStr) => cycleIndexOf(dateStr)

  // Rótulo curto de um índice de ciclo (ex: "Mai/26")
  const labelForCycleIndex = (i) => {
    const m = ((i % 12) + 12) % 12
    const y = Math.floor(i / 12)
    return `${MONTH_NAMES[m]}/${String(y).slice(2)}`
  }

  const prevCycle = () => { cycleOffset.value-- }
  const nextCycle = () => { cycleOffset.value++ }
  const resetCycle = () => { cycleOffset.value = 0 }

  // Ciclo "casa" de uma entrada: definido por quando foi DECLARADA (ciclo_inicio)
  const rendaStartCycle = (r) =>
    r.ciclo_inicio != null ? r.ciclo_inicio : cycleIndexOf(r.criado_em || r.data)

  // Uma renda aparece no ciclo i se: (recorrente) do início até o fim; (única) só no início.
  const rendaActiveInCycle = (r, i) => {
    const start = rendaStartCycle(r)
    if (r.recorrente) return start <= i && (r.ciclo_fim == null || i <= r.ciclo_fim)
    return start === i
  }

  // Data de ocorrência de uma renda recorrente no ciclo i: mesmo dia do mês da
  // data original, mas no mês/ano do ciclo visualizado (03/07 → 03/08 em agosto).
  const rendaOccurrenceData = (r, i) => {
    if (!r.recorrente || !r.data) return r.data
    const day = Number(String(r.data).split('-')[2]) || 1
    const m = ((i % 12) + 12) % 12
    const y = Math.floor(i / 12)
    const diasNoMes = new Date(y, m + 1, 0).getDate()
    const dd = Math.min(day, diasNoMes)
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
  }

  const rendasCiclo = computed(() =>
    rendas.value
      .filter(r => rendaActiveInCycle(r, selectedCycleIndex.value))
      .map(r => (r.recorrente
        ? { ...r, dataDisplay: rendaOccurrenceData(r, selectedCycleIndex.value) }
        : r))
  )

  // Total de renda de um ciclo arbitrário (para a evolução patrimonial)
  const rendaTotalAt = (i) =>
    rendas.value
      .filter(r => rendaActiveInCycle(r, i))
      .reduce((sum, r) => sum + Number(r.valor), 0)

  // Menor ciclo com alguma renda (para o intervalo da evolução)
  const earliestRendaCycle = computed(() => {
    if (!rendas.value.length) return null
    return Math.min(...rendas.value.map(rendaStartCycle))
  })

  // Despesas (aportes em metas): também por declaração (criado_em)
  const despesaInSelectedCycle = (d) =>
    cycleIndexOf(d.criado_em || d.data) === selectedCycleIndex.value

  const despesasFixasCiclo = computed(() => despesas.value.filter(despesaInSelectedCycle))

  const despesasAvulsasCiclo = computed(() => despesasAvulsas.value.filter(despesaInSelectedCycle))

  // Contas fixas do ciclo, separadas dos aportes em metas (despesas com meta_id)
  const contasFixasCiclo = computed(() => despesasFixasCiclo.value.filter(d => !d.meta_id))
  const aportesMetaCiclo = computed(() => despesasFixasCiclo.value.filter(d => d.meta_id))

  const totalRendaCiclo = computed(() => rendaTotalAt(selectedCycleIndex.value))

  const totalDespesaCiclo = computed(() =>
    despesasFixasCiclo.value.reduce((sum, d) => sum + Number(d.valor), 0) +
    despesasAvulsasCiclo.value.reduce((sum, d) => sum + Number(d.valor), 0)
  )

  const totalContasFixasCiclo = computed(() =>
    contasFixasCiclo.value.reduce((sum, d) => sum + Number(d.valor), 0)
  )

  const totalAportesMetaCiclo = computed(() =>
    aportesMetaCiclo.value.reduce((sum, d) => sum + Number(d.valor), 0)
  )

  const totalAvulsasCiclo = computed(() =>
    despesasAvulsasCiclo.value.reduce((sum, d) => sum + Number(d.valor), 0)
  )

  // Livre para gastar = renda − contas fixas − aportes em metas
  const livreCiclo = computed(() =>
    totalRendaCiclo.value - totalContasFixasCiclo.value - totalAportesMetaCiclo.value
  )

  // O que resta do teto depois dos gastos avulsos do ciclo
  const restamCiclo = computed(() => livreCiclo.value - totalAvulsasCiclo.value)

  // Contas pagas: estado local por ciclo (não há coluna no banco)
  const loadPaidStore = () => {
    try {
      return JSON.parse(localStorage.getItem(PAID_STORAGE_KEY)) || {}
    } catch {
      return {}
    }
  }

  const paidStore = ref(loadPaidStore())

  const paidIdsCiclo = computed(() => paidStore.value[cycleKey.value] || [])

  const togglePaga = (id) => {
    const key = cycleKey.value
    const current = new Set(paidStore.value[key] || [])
    if (current.has(id)) current.delete(id)
    else current.add(id)
    paidStore.value = { ...paidStore.value, [key]: [...current] }
    try {
      localStorage.setItem(PAID_STORAGE_KEY, JSON.stringify(paidStore.value))
    } catch { /* armazenamento indisponível: estado segue apenas em memória */ }
  }

  const clearPaidStore = () => {
    paidStore.value = {}
    try {
      localStorage.removeItem(PAID_STORAGE_KEY)
    } catch { /* armazenamento indisponível */ }
  }

  const totalPagoCiclo = computed(() =>
    contasFixasCiclo.value
      .filter(d => paidIdsCiclo.value.includes(d.id))
      .reduce((sum, d) => sum + Number(d.valor), 0)
  )

  const restanteAPagarCiclo = computed(() => totalContasFixasCiclo.value - totalPagoCiclo.value)

  // Carregar todos os dados do usuário autenticado
  const load = async () => {
    isLoading.value = true
    error.value = null
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [
        { data: rendasData },
        { data: despesasData },
        { data: metasData },
        { data: transacoesData },
        { data: historicoData }
      ] = await Promise.all([
        supabase.from('rendas').select('*').eq('usuario_id', user.id).order('criado_em'),
        supabase.from('despesas').select('*').eq('usuario_id', user.id).order('criado_em'),
        supabase.from('metas').select('*').eq('usuario_id', user.id).order('criado_em'),
        supabase.from('transacoes').select('*').eq('usuario_id', user.id).order('criado_em', { ascending: false }).limit(50),
        supabase.from('patrimonio_historico').select('*').eq('usuario_id', user.id).order('registrado_em')
      ])

      rendas.value = rendasData || []
      despesas.value = (despesasData || []).filter(d => d.is_fixa)
      despesasAvulsas.value = (despesasData || []).filter(d => !d.is_fixa)
      metas.value = (metasData || []).map(m => ({ ...m, alvo: m.valor_alvo, atual: m.valor_atual }))
      transacoes.value = (transacoesData || []).map(t => ({
        ...t,
        refId: t.ref_id,
        data: new Date(t.criado_em).toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        })
      }))
      const orderedHistorico = sortHistoricoRows(historicoData || [])
      historico.value = {
        labels: orderedHistorico.map(h => normalizeMonth(h.mes)),
        dados: orderedHistorico.map(h => Number(h.valor))
      }
      patrimonio.value = orderedHistorico.length
        ? Number(orderedHistorico[orderedHistorico.length - 1].valor)
        : 0
    } catch (err) {
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  // Ações
  const addRenda = async (nome, valor, data_lancamento, recorrente = false) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Ciclo de declaração = o ciclo que está sendo visualizado ao criar a entrada
    const cicloInicio = selectedCycleIndex.value

    const { data, error: err } = await supabase
      .from('rendas')
      .insert({
        usuario_id: user.id, nome, valor, data: data_lancamento,
        recorrente, ciclo_inicio: cicloInicio, ciclo_fim: null,
        icone: 'fa-money-bill-wave', cor: 'var(--accent-cyan)'
      })
      .select()
      .single()

    if (err) { error.value = err.message; return }
    rendas.value.push(data)
    await _addTransacao('renda', nome, valor, data.id, user.id)
  }

  const addDespesaFixa = async (nome, valor, data_lancamento) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error: err } = await supabase
      .from('despesas')
      .insert({ usuario_id: user.id, nome, valor, data: data_lancamento, is_fixa: true })
      .select()
      .single()

    if (err) { error.value = err.message; return }
    despesas.value.push(data)
    await _addTransacao('despesa', nome, valor, data.id, user.id)
  }

  const addDespesaAvulsa = async (nome, valor, data_lancamento) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error: err } = await supabase
      .from('despesas')
      .insert({ usuario_id: user.id, nome, valor, data: data_lancamento, is_fixa: false })
      .select()
      .single()

    if (err) { error.value = err.message; return }
    despesasAvulsas.value.push(data)
    await _addTransacao('despesa', nome, valor, data.id, user.id)
  }

  const _addTransacao = async (tipo, nome, valor, refId, userId) => {
    const { data, error: err } = await supabase
      .from('transacoes')
      .insert({ usuario_id: userId, tipo, nome, valor, ref_id: refId })
      .select()
      .single()

    if (err) { error.value = err.message; return }
    transacoes.value.unshift({
      ...data,
      refId: data.ref_id,
      data: new Date(data.criado_em).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      })
    })
    if (transacoes.value.length > 50) transacoes.value.pop()
  }

  const addMeta = async (nome, alvo) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error: err } = await supabase
      .from('metas')
      .insert({
        usuario_id: user.id,
        nome,
        valor_alvo: alvo,
        valor_atual: 0,
        icone: 'fa-bullseye',
        cor1: 'var(--accent-sky)',
        cor2: 'var(--button-b)'
      })
      .select()
      .single()

    if (err) { error.value = err.message; return }
    metas.value.push({ ...data, alvo: data.valor_alvo, atual: 0 })
  }

  const addDespesaMeta = async (metaId, metaNome, valor, data_lancamento) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const nome = `Meta: ${metaNome}`
    const { data, error: err } = await supabase
      .from('despesas')
      .insert({ usuario_id: user.id, nome, valor, data: data_lancamento, is_fixa: true, meta_id: metaId })
      .select()
      .single()

    if (err) { error.value = err.message; return }

    const meta = metas.value.find(m => m.id === metaId)
    if (meta) {
      const novoAtual = (meta.atual || 0) + valor
      await supabase.from('metas').update({ valor_atual: novoAtual }).eq('id', metaId)
      meta.atual = novoAtual
    }

    despesas.value.push(data)
    await _addTransacao('despesa', nome, valor, data.id, user.id)
  }

  const addHistorico = async (mes, valor) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const normalizedMes = normalizeMonth(mes)

    const { error: err } = await supabase
      .from('patrimonio_historico')
      .insert({ usuario_id: user.id, mes: normalizedMes, valor })

    if (err) { error.value = err.message; return }

    const merged = historico.value.labels.map((m, i) => ({
      mes: normalizeMonth(m),
      valor: Number(historico.value.dados[i])
    }))

    merged.push({ mes: normalizedMes, valor: Number(valor) })

    const orderedHistorico = sortHistoricoRows(merged)
    historico.value = {
      labels: orderedHistorico.map(h => h.mes),
      dados: orderedHistorico.map(h => h.valor)
    }
    patrimonio.value = historico.value.dados.length
      ? historico.value.dados[historico.value.dados.length - 1]
      : 0
  }

  // Nomes únicos
  // Nome único considerando APENAS o ciclo visualizado — um "Salário" do mês
  // passado (fora do ciclo atual) não deve renomear um novo "Salário" de hoje.
  const getUniqueName = (name, excludeId = null) => {
    const i = selectedCycleIndex.value
    const existing = [
      ...rendas.value.filter(r => rendaActiveInCycle(r, i)),
      ...despesas.value.filter(despesaInSelectedCycle),
      ...despesasAvulsas.value.filter(despesaInSelectedCycle)
    ]
      .filter(e => e.id !== excludeId)
      .map(e => e.nome.toLowerCase())
    if (!existing.includes(name.toLowerCase())) return name
    let counter = 1
    while (existing.includes(`${name}(${counter})`.toLowerCase())) counter++
    return `${name}(${counter})`
  }

  // Editar
  const updateRenda = async (id, nome, valor) => {
    const { error: err } = await supabase.from('rendas').update({ nome, valor }).eq('id', id)
    if (err) { error.value = err.message; return }
    const item = rendas.value.find(r => r.id === id)
    if (item) { item.nome = nome; item.valor = valor }
  }

  const updateDespesa = async (id, nome, valor) => {
    const { error: err } = await supabase.from('despesas').update({ nome, valor }).eq('id', id)
    if (err) { error.value = err.message; return }
    const item = [...despesas.value, ...despesasAvulsas.value].find(d => d.id === id)
    if (item) { item.nome = nome; item.valor = valor }
  }

  const convertRendaToDespesa = async (id, nome, valor, data_lancamento) => {
    await removeRenda(id)
    await addDespesaFixa(nome, valor, data_lancamento)
  }

  const convertDespesaToRenda = async (id, nome, valor, data_lancamento) => {
    await removeDespesa(id)
    await addRenda(nome, valor, data_lancamento)
  }

  // Remover
  const removeRenda = async (id) => {
    const item = rendas.value.find(r => r.id === id)
    const i = selectedCycleIndex.value

    // Renda recorrente removida num ciclo posterior ao início: apenas para de
    // recorrer daqui pra frente (mantém os ciclos passados), como as contas fixas.
    if (item && item.recorrente && rendaStartCycle(item) < i) {
      const { error: err } = await supabase.from('rendas').update({ ciclo_fim: i - 1 }).eq('id', id)
      if (err) { error.value = err.message; return }
      item.ciclo_fim = i - 1
      return
    }

    const { error: err } = await supabase.from('rendas').delete().eq('id', id)
    if (err) { error.value = err.message; return }
    rendas.value = rendas.value.filter(r => r.id !== id)
    await supabase.from('transacoes').delete().eq('ref_id', id).eq('tipo', 'renda')
    transacoes.value = transacoes.value.filter(t => !(t.tipo === 'renda' && t.refId === id))
  }

  const removeDespesa = async (id) => {
    const despesa = [...despesas.value, ...despesasAvulsas.value].find(d => d.id === id)

    const { error: err } = await supabase.from('despesas').delete().eq('id', id)
    if (err) { error.value = err.message; return }

    if (despesa?.meta_id) {
      const meta = metas.value.find(m => m.id === despesa.meta_id)
      if (meta) {
        const novoAtual = Math.max(0, (meta.atual || 0) - Number(despesa.valor))
        await supabase.from('metas').update({ valor_atual: novoAtual }).eq('id', despesa.meta_id)
        meta.atual = novoAtual
      }
    }

    despesas.value = despesas.value.filter(d => d.id !== id)
    despesasAvulsas.value = despesasAvulsas.value.filter(d => d.id !== id)
    await supabase.from('transacoes').delete().eq('ref_id', id).eq('tipo', 'despesa')
    transacoes.value = transacoes.value.filter(t => !(t.tipo === 'despesa' && t.refId === id))
  }

  const removeMeta = async (id) => {
    // Remove os aportes (despesas com meta_id) antes de apagar a meta, senão eles
    // ficariam órfãos reduzindo o "livre" do ciclo sem aparecer em lugar nenhum.
    const aportes = despesas.value.filter(d => d.meta_id === id)
    if (aportes.length) {
      const aporteIds = aportes.map(d => d.id)
      await supabase.from('despesas').delete().in('id', aporteIds)
      await supabase.from('transacoes').delete().in('ref_id', aporteIds).eq('tipo', 'despesa')
      despesas.value = despesas.value.filter(d => d.meta_id !== id)
      transacoes.value = transacoes.value.filter(
        t => !(t.tipo === 'despesa' && aporteIds.includes(t.refId))
      )
    }

    const { error: err } = await supabase.from('metas').delete().eq('id', id)
    if (err) { error.value = err.message; return }
    metas.value = metas.value.filter(m => m.id !== id)
  }

  const removeTransacao = async (id) => {
    const { error: err } = await supabase.from('transacoes').delete().eq('id', id)
    if (err) { error.value = err.message; return }
    transacoes.value = transacoes.value.filter(t => t.id !== id)
  }

  const clearDespesas = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('despesas').delete().eq('usuario_id', user.id)
    despesas.value = []
    despesasAvulsas.value = []
    clearPaidStore()
    if (metas.value.some(m => m.atual > 0)) {
      await supabase.from('metas').update({ valor_atual: 0 }).eq('usuario_id', user.id)
      metas.value.forEach(m => { m.atual = 0 })
    }
  }

  const clearTransacoes = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('transacoes').delete().eq('usuario_id', user.id)
    transacoes.value = []
  }

  const clearHistorico = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('patrimonio_historico').delete().eq('usuario_id', user.id)
    historico.value = { labels: [], dados: [] }
    patrimonio.value = 0
  }

  // Clear all
  const clearAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await Promise.all([
      supabase.from('rendas').delete().eq('usuario_id', user.id),
      supabase.from('despesas').delete().eq('usuario_id', user.id),
      supabase.from('metas').delete().eq('usuario_id', user.id),
      supabase.from('transacoes').delete().eq('usuario_id', user.id),
      supabase.from('patrimonio_historico').delete().eq('usuario_id', user.id)
    ])

    patrimonio.value = 0
    rendas.value = []
    despesas.value = []
    despesasAvulsas.value = []
    metas.value = []
    historico.value = { labels: [], dados: [] }
    transacoes.value = []
    clearPaidStore()
  }

  return {
    // Estado
    patrimonio,
    rendas,
    despesas,
    despesasAvulsas,
    metas,
    transacoes,
    historico,
    isLoading,
    error,
    // Computed
    totalRenda,
    totalDespesa,
    saldo,
    historicoCalculado,
    rendasCiclo,
    despesasFixasCiclo,
    despesasAvulsasCiclo,
    contasFixasCiclo,
    aportesMetaCiclo,
    totalRendaCiclo,
    totalDespesaCiclo,
    totalContasFixasCiclo,
    totalAportesMetaCiclo,
    totalAvulsasCiclo,
    livreCiclo,
    restamCiclo,
    // Ciclo selecionável
    cycleOffset,
    selectedCycle,
    selectedCycleIndex,
    cycleIndexOfDate,
    cycleIndexOf,
    labelForCycleIndex,
    rendaTotalAt,
    earliestRendaCycle,
    cycleLabel,
    isCurrentCycle,
    prevCycle,
    nextCycle,
    resetCycle,
    // Contas pagas
    paidIdsCiclo,
    togglePaga,
    totalPagoCiclo,
    restanteAPagarCiclo,
    // Métodos
    load,
    addRenda,
    addDespesaFixa,
    addDespesaAvulsa,
    addMeta,
    addDespesaMeta,
    addHistorico,
    getUniqueName,
    updateRenda,
    updateDespesa,
    convertRendaToDespesa,
    convertDespesaToRenda,
    removeRenda,
    removeDespesa,
    removeMeta,
    removeTransacao,
    clearDespesas,
    clearTransacoes,
    clearHistorico,
    clearAll,
    formatCurrency
  }
}
