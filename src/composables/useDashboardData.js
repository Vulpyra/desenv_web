import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useCurrency } from './useCurrency'

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

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

  const historicoCalculado = computed(() => {
    const monthlyFlow = {}

    for (const r of rendas.value) {
      if (!r.data) continue
      const key = String(r.data).substring(0, 7)
      monthlyFlow[key] = (monthlyFlow[key] || 0) + Number(r.valor)
    }

    for (const d of [...despesas.value, ...despesasAvulsas.value]) {
      if (!d.data) continue
      const key = String(d.data).substring(0, 7)
      monthlyFlow[key] = (monthlyFlow[key] || 0) - Number(d.valor)
    }

    const months = Object.keys(monthlyFlow).sort()
    let cumulative = 0
    const labels = []
    const dados = []

    for (const month of months) {
      cumulative += monthlyFlow[month]
      const [year, monthNum] = month.split('-')
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

  const currentCycle = computed(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    const startThisMonth = getNthWorkday(y, m, 5)
    if (now >= startThisMonth) {
      const nm = m === 11 ? 0 : m + 1
      const ny = m === 11 ? y + 1 : y
      return { start: startThisMonth, end: getNthWorkday(ny, nm, 5) }
    }
    const pm = m === 0 ? 11 : m - 1
    const py = m === 0 ? y - 1 : y
    return { start: getNthWorkday(py, pm, 5), end: startThisMonth }
  })

  const rendasCiclo = computed(() => {
    const { start, end } = currentCycle.value
    return rendas.value.filter(r => {
      if (!r.data) return false
      const d = parseEntryDate(r.data)
      return d >= start && d < end
    })
  })

  const despesasFixasCiclo = computed(() => {
    const { start, end } = currentCycle.value
    return despesas.value.filter(d => {
      if (!d.data) return false
      const date = parseEntryDate(d.data)
      return date >= start && date < end
    })
  })

  const despesasAvulsasCiclo = computed(() => {
    const { start, end } = currentCycle.value
    return despesasAvulsas.value.filter(d => {
      if (!d.data) return false
      const date = parseEntryDate(d.data)
      return date >= start && date < end
    })
  })

  const totalRendaCiclo = computed(() =>
    rendasCiclo.value.reduce((sum, r) => sum + Number(r.valor), 0)
  )

  const totalDespesaCiclo = computed(() =>
    despesasFixasCiclo.value.reduce((sum, d) => sum + Number(d.valor), 0) +
    despesasAvulsasCiclo.value.reduce((sum, d) => sum + Number(d.valor), 0)
  )

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
  const addRenda = async (nome, valor, data_lancamento) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error: err } = await supabase
      .from('rendas')
      .insert({ usuario_id: user.id, nome, valor, data: data_lancamento, icone: 'fa-money-bill-wave', cor: 'var(--accent-cyan)' })
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
  const getUniqueName = (name, excludeId = null) => {
    const existing = [...rendas.value, ...despesas.value, ...despesasAvulsas.value]
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
    totalRendaCiclo,
    totalDespesaCiclo,
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
