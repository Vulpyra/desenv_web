import { ref, computed, watch } from 'vue'
import { useLocalStorage } from './useLocalStorage'
import { useCurrency } from './useCurrency'

let idCounter = Date.now()
const generateId = () => ++idCounter

export function useDashboardData() {
  const { loadData, saveData, clearData } = useLocalStorage()
  const { formatCurrency } = useCurrency()

  // Estado
  const patrimonio = ref(0)
  const rendas = ref([])
  const despesas = ref([])
  const despesasAvulsas = ref([])
  const metas = ref([])
  const transacoes = ref([])
  const historico = ref({ labels: [], dados: [] })

  // Computed
  const totalRenda = computed(() => 
    rendas.value.reduce((sum, r) => sum + r.valor, 0)
  )
  
  const totalDespesa = computed(() => 
    despesas.value.reduce((sum, d) => sum + d.valor, 0) +
    despesasAvulsas.value.reduce((sum, d) => sum + d.valor, 0)
  )

  const saldo = computed(() => totalRenda.value - totalDespesa.value)

  // Carregar dados
  const load = () => {
    const data = loadData()
    if (data) {
      patrimonio.value = data.patrimonio || 0
      rendas.value = data.rendas || []
      despesas.value = (data.despesas || []).filter(d => d.isFixa)
      despesasAvulsas.value = (data.despesas || []).filter(d => !d.isFixa)
      metas.value = data.metas || []
      historico.value = {
        labels: data.histLabels || [],
        dados: data.histDados || []
      }
      transacoes.value = data.transacoes || []
    }
  }

  // Salvar dados (flush: 'post' batches updates to reduce serialization cost)
  watch(
    [patrimonio, rendas, despesas, despesasAvulsas, metas, historico, transacoes],
    () => {
      saveData({
        patrimonio: patrimonio.value,
        rendas: rendas.value,
        despesas: [...despesas.value, ...despesasAvulsas.value],
        metas: metas.value,
        histLabels: historico.value.labels,
        histDados: historico.value.dados,
        transacoes: transacoes.value
      })
    },
    { deep: true, flush: 'post' }
  )

  // Ações
  const addRenda = (nome, valor) => {
    const id = generateId()
    rendas.value.push({
      id,
      nome,
      valor,
      icone: 'fa-money-bill-wave',
      cor: 'var(--accent-cyan)'
    })
    addTransacao('renda', nome, valor, id)
  }

  const addDespesaFixa = (nome, valor) => {
    const id = generateId()
    despesas.value.push({ id, nome, valor, isFixa: true })
    addTransacao('despesa', nome, valor, id)
  }

  const addDespesaAvulsa = (nome, valor) => {
    const id = generateId()
    despesasAvulsas.value.push({ id, nome, valor, isFixa: false })
    addTransacao('despesa', nome, valor, id)
  }

  const addTransacao = (tipo, nome, valor, refId) => {
    transacoes.value.unshift({
      id: generateId(),
      tipo,
      nome,
      valor,
      refId,
      data: new Date().toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    })
    if (transacoes.value.length > 50) {
      transacoes.value.pop()
    }
  }

  const addMeta = (nome, alvo, atual) => {
    metas.value.push({
      id: generateId(),
      nome,
      alvo,
      atual,
      icone: 'fa-bullseye',
      cor1: 'var(--accent-sky)',
      cor2: 'var(--button-b)'
    })
  }

  const addHistorico = (mes, valor) => {
    historico.value.labels.push(mes)
    historico.value.dados.push(valor)
  }

  // Remover
  const removeRenda = (id) => {
    rendas.value = rendas.value.filter(r => r.id !== id)
    transacoes.value = transacoes.value.filter(t => !(t.tipo === 'renda' && t.refId === id))
  }

  const removeDespesa = (id) => {
    despesas.value = despesas.value.filter(d => d.id !== id)
    despesasAvulsas.value = despesasAvulsas.value.filter(d => d.id !== id)
    transacoes.value = transacoes.value.filter(t => !(t.tipo === 'despesa' && t.refId === id))
  }

  const removeMeta = (id) => {
    metas.value = metas.value.filter(m => m.id !== id)
  }

  const removeTransacao = (id) => {
    transacoes.value = transacoes.value.filter(t => t.id !== id)
  }

  // Clear all
  const clearAll = () => {
    patrimonio.value = 0
    rendas.value = []
    despesas.value = []
    despesasAvulsas.value = []
    metas.value = []
    historico.value = { labels: [], dados: [] }
    transacoes.value = []
    clearData()
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
