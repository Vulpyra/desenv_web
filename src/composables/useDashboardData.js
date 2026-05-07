import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useCurrency } from './useCurrency'

export function useDashboardData() {
  const { formatCurrency } = useCurrency()

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
      historico.value = {
        labels: (historicoData || []).map(h => h.mes),
        dados: (historicoData || []).map(h => Number(h.valor))
      }
      patrimonio.value = historicoData?.length
        ? Number(historicoData[historicoData.length - 1].valor)
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

    const { error: err } = await supabase
      .from('patrimonio_historico')
      .insert({ usuario_id: user.id, mes, valor })

    if (err) { error.value = err.message; return }
    historico.value.labels.push(mes)
    historico.value.dados.push(valor)
    patrimonio.value = valor
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
    clearAll,
    formatCurrency
  }
}
