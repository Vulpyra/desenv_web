<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDashboardData } from '@/composables/useDashboardData'
import { useModal } from '@/composables/useModal'
import { useCurrency } from '@/composables/useCurrency'

// Componentes
import StatCards from '@/components/dashboard/StatCards.vue'
import PieChart from '@/components/charts/PieChart.vue'
import IncomeDetails from '@/components/dashboard/IncomeDetails.vue'
import AISuggestion from '@/components/dashboard/AISuggestion.vue'
import QuickActions from '@/components/dashboard/QuickActions.vue'
import EvolutionChart from '@/components/charts/EvolutionChart.vue'
import GoalsPanel from '@/components/goals/GoalsPanel.vue'
import TransactionsPanel from '@/components/transactions/TransactionsPanel.vue'
import Modal from '@/components/Modal.vue'

// Estado
const { parseCurrency } = useCurrency()
const router = useRouter()
const {
  patrimonio, rendas, despesas, despesasAvulsas, metas, transacoes, historico,
  totalRenda, totalDespesa,
  load, addRenda, addDespesaFixa, addDespesaAvulsa, addMeta, addHistorico,
  removeRenda, removeDespesa, removeMeta, removeTransacao, clearAll
} = useDashboardData()

const { isOpen, title, fields, open, close } = useModal()

// Visibilidade dos valores
const valoresOcultos = ref(false)

const toggleVisibilidade = () => {
  valoresOcultos.value = !valoresOcultos.value
}

// Navegação
const goToSimulado = () => {
  router.push('/simulado')
}

// Handlers de Modal
const handleConfirm = (result) => {
  try {
    if (!result?.confirmed || !result.values) return

    const values = result.values
    const nome = (val) => (typeof val === 'string' ? val.trim() : String(val ?? '').trim())
    const valor = (val) => (typeof val === 'number' && !isNaN(val) && val > 0 ? val : null)

    switch (modalAction.value) {
      case 'patrimonio':
        if (typeof values[0] === 'number' && !isNaN(values[0]) && values[0] >= 0) {
          patrimonio.value = values[0]
        }
        break
      case 'renda':
        if (nome(values[0]) && valor(values[1])) {
          const destinoValue = values[2] || 'patrimonio'
          if (destinoValue === 'patrimonio') {
            addRenda(nome(values[0]), valor(values[1]), { type: 'patrimonio' })
          } else {
            const metaId = Number(destinoValue)
            addRenda(nome(values[0]), valor(values[1]), { type: 'meta', metaId })
          }
        }
        break
      case 'despesaFixa':
        if (nome(values[0]) && valor(values[1])) addDespesaFixa(nome(values[0]), valor(values[1]))
        break
      case 'despesaAvulsa':
        if (nome(values[0]) && valor(values[1])) addDespesaAvulsa(nome(values[0]), valor(values[1]))
        break
      case 'meta': {
        const metaNome = nome(values[0])
        const metaAlvo = valor(values[1])
        const metaAtual = typeof values[2] === 'number' && !isNaN(values[2]) && values[2] >= 0 ? values[2] : 0
        if (metaNome && metaAlvo !== null) addMeta(metaNome, metaAlvo, metaAtual)
        break
      }
      case 'historico':
        if (nome(values[0]) && typeof values[1] === 'number' && !isNaN(values[1])) {
          addHistorico(nome(values[0]), values[1])
        }
        break
      case 'confirmClearAll':
        if (String(values[0] ?? '').trim().toUpperCase() === 'EXCLUIR') {
          clearAll()
        }
        break
      case 'confirmClearDespesas':
        if (String(values[0] ?? '').trim().toUpperCase() === 'SIM') {
          despesas.value = []
          despesasAvulsas.value = []
        }
        break
      case 'confirmClearTransacoes':
        if (String(values[0] ?? '').trim().toUpperCase() === 'SIM') {
          transacoes.value = []
        }
        break
      case 'confirmClearHistorico':
        if (String(values[0] ?? '').trim().toUpperCase() === 'SIM') {
          historico.value = { labels: [], dados: [] }
        }
        break
    }
  } finally {
    close()
  }
}

// Ações do modal
const modalAction = ref('')

const monthOptions = [
  { value: 'Jan', label: 'Jan' },
  { value: 'Fev', label: 'Fev' },
  { value: 'Mar', label: 'Mar' },
  { value: 'Abr', label: 'Abr' },
  { value: 'Mai', label: 'Mai' },
  { value: 'Jun', label: 'Jun' },
  { value: 'Jul', label: 'Jul' },
  { value: 'Ago', label: 'Ago' },
  { value: 'Set', label: 'Set' },
  { value: 'Out', label: 'Out' },
  { value: 'Nov', label: 'Nov' },
  { value: 'Dez', label: 'Dez' }
]

const getCurrentMonth = () => monthOptions[new Date().getMonth()]?.value || 'Jan'
const getRendaDestinoOptions = () => {
  const options = [{ value: 'patrimonio', label: 'Patrimonio' }]
  metas.value.forEach((meta) => {
    options.push({ value: String(meta.id), label: `Meta: ${meta.nome}` })
  })
  return options
}

const openEditPatrimonio = async () => {
  modalAction.value = 'patrimonio'
  await open('Editar Patrimônio', [
    { placeholder: 'Novo valor do Patrimônio', value: patrimonio.value, isCurrency: true }
  ])
}

const openAddRenda = async () => {
  modalAction.value = 'renda'
  const destinoOptions = getRendaDestinoOptions()
  await open('Adicionar Renda', [
    { placeholder: 'Nome da origem (ex: Salário)' },
    { placeholder: 'Valor da Renda', isCurrency: true },
    { type: 'select', label: 'Destino da receita', options: destinoOptions, value: destinoOptions[0]?.value || 'patrimonio' }
  ])
}

const openAddDespesaFixa = async () => {
  modalAction.value = 'despesaFixa'
  await open('Nova Despesa Fixa', [
    { placeholder: 'Nome da despesa (ex: Aluguel)' },
    { placeholder: 'Valor da despesa', isCurrency: true }
  ])
}

const openAddDespesaAvulsa = async () => {
  modalAction.value = 'despesaAvulsa'
  await open('Despesa Avulsa', [
    { placeholder: 'Motivo (ex: Uber, Lanche)' },
    { placeholder: 'Valor da despesa', isCurrency: true }
  ])
}

const openAddMeta = async () => {
  modalAction.value = 'meta'
  await open('Nova Meta', [
    { placeholder: 'Nome da Meta (ex: Viagem)' },
    { placeholder: 'Valor alvo/total', isCurrency: true },
    { placeholder: 'Valor atual guardado', isCurrency: true }
  ])
}

const openAddHistorico = async () => {
  modalAction.value = 'historico'
  await open('Adicionar Evolução', [
    { type: 'select', label: 'Mês', options: monthOptions, value: getCurrentMonth() },
    { placeholder: 'Patrimônio no mês', isCurrency: true }
  ])
}

// Ações de confirmação usando modal
const confirmClearAll = () => {
  modalAction.value = 'confirmClearAll'
  open('ATENÇÃO', [
    { placeholder: 'Digite EXCLUIR para confirmar' }
  ])
}

const confirmClearDespesas = () => {
  modalAction.value = 'confirmClearDespesas'
  open('Confirmar', [
    { placeholder: 'Digite SIM para apagar todas as despesas' }
  ])
}

const confirmClearTransacoes = () => {
  modalAction.value = 'confirmClearTransacoes'
  open('Confirmar', [
    { placeholder: 'Digite SIM para limpar transações' }
  ])
}

const confirmClearHistorico = () => {
  modalAction.value = 'confirmClearHistorico'
  open('Confirmar', [
    { placeholder: 'Digite SIM para limpar histórico' }
  ])
}

onMounted(load)
</script>

<template>
  <div class="bg-scene" aria-hidden="true">
    <span class="glow orb-a"></span>
    <span class="glow orb-b"></span>
    <span class="glow orb-c"></span>
    <span class="noise-layer"></span>
  </div>

  <div class="dashboard-shell">
    <span class="particle-stream" aria-hidden="true"></span>

    <div class="dashboard">
      <!-- Header -->
      <header class="top-bar">
        <div class="brand-mark" aria-label="Dashboard Financeiro">
          <span class="brand-text">Dashboard Financeiro</span>
        </div>
        <div class="top-icons">
          <i
            class="far fa-eye"
            :class="{ 'fa-eye-slash': valoresOcultos }"
            @click="toggleVisibilidade"
            title="Ocultar/Exibir valores"
          ></i>
          <i class="far fa-user-circle"></i>
        </div>
      </header>

      <!-- Cards de estatísticas -->
      <StatCards
        :patrimonio="patrimonio"
        :total-renda="totalRenda"
        :total-despesa="totalDespesa"
        :is-hidden="valoresOcultos"
        @edit-patrimonio="openEditPatrimonio"
        @add-renda="openAddRenda"
        @add-despesa="openAddDespesaAvulsa"
        @clear-despesas="confirmClearDespesas"
      />

      <!-- Conteúdo principal -->
      <section class="main-content">
        <PieChart :data="[45, 55]" />
        
        <IncomeDetails
          :rendas="rendas"
          :despesas="despesas"
          :is-hidden="valoresOcultos"
          @add-renda="openAddRenda"
          @add-despesa="openAddDespesaFixa"
          @remove-renda="removeRenda"
          @remove-despesa="removeDespesa"
        />

        <QuickActions
          @add-receita="openAddRenda"
          @add-despesa="openAddDespesaAvulsa"
          @novo-simulado="goToSimulado"
          @clear-all="confirmClearAll"
        >
          <template #ai-suggestion>
            <AISuggestion />
          </template>
        </QuickActions>
      </section>

      <!-- Conteúdo inferior -->
      <section class="bottom-content">
        <EvolutionChart
          :labels="historico.labels"
          :data="historico.dados"
          @add-mes="openAddHistorico"
          @clear="confirmClearHistorico"
        />

        <GoalsPanel
          :metas="metas"
          :is-hidden="valoresOcultos"
          @add="openAddMeta"
          @remove="removeMeta"
        />

        <TransactionsPanel
          :transacoes="transacoes"
          :is-hidden="valoresOcultos"
          @clear="confirmClearTransacoes"
          @remove="removeTransacao"
        />
      </section>
    </div>
  </div>

  <!-- Modal -->
  <Modal
    :is-open="isOpen"
    :title="title"
    :fields="fields"
    @confirm="handleConfirm"
    @cancel="close"
  />
</template>
