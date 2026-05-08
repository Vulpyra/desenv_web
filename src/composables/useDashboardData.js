import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useCurrency } from './useCurrency'

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
  const addRenda = async (nome, valor) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error: err } = await supabase
      .from('rendas')
      .insert({ usuario_id: user.id, nome, valor, icone: 'fa-money-bill-wave', cor: 'var(--accent-cyan)' })
      .select()
      .single()

    if (err) { error.value = err.message; return }
    rendas.value.push(data)
    await _addTransacao('renda', nome, valor, data.id, user.id)
  }

  const addDespesaFixa = async (nome, valor) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error: err } = await supabase
      .from('despesas')
      .insert({ usuario_id: user.id, nome, valor, is_fixa: true })
      .select()
      .single()

    if (err) { error.value = err.message; return }
    despesas.value.push(data)
    await _addTransacao('despesa', nome, valor, data.id, user.id)
  }

  const addDespesaAvulsa = async (nome, valor) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error: err } = await supabase
      .from('despesas')
      .insert({ usuario_id: user.id, nome, valor, is_fixa: false })
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

  const addMeta = async (nome, alvo, atual) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error: err } = await supabase
      .from('metas')
      .insert({
        usuario_id: user.id,
        nome,
        valor_alvo: alvo,
        valor_atual: atual,
        icone: 'fa-bullseye',
        cor1: 'var(--accent-sky)',
        cor2: 'var(--button-b)'
      })
      .select()
      .single()

    if (err) { error.value = err.message; return }
    metas.value.push({ ...data, alvo: data.valor_alvo, atual: data.valor_atual })
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

  // Remover
  const removeRenda = async (id) => {
    const { error: err } = await supabase.from('rendas').delete().eq('id', id)
    if (err) { error.value = err.message; return }
    rendas.value = rendas.value.filter(r => r.id !== id)
    await supabase.from('transacoes').delete().eq('ref_id', id).eq('tipo', 'renda')
    transacoes.value = transacoes.value.filter(t => !(t.tipo === 'renda' && t.refId === id))
  }

  const removeDespesa = async (id) => {
    const { error: err } = await supabase.from('despesas').delete().eq('id', id)
    if (err) { error.value = err.message; return }
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
    // Métodos
    load,
    addRenda,
    addDespesaFixa,
    addDespesaAvulsa,
    addMeta,
    addHistorico,
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
