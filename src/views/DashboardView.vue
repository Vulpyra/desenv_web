<script setup>
import { ref, onMounted } from 'vue'
import { useDashboardData } from '@/composables/useDashboardData'
import { useModal } from '@/composables/useModal'
import { useCurrency } from '@/composables/useCurrency'

// Componentes
import StatCards from '@/components/StatCards.vue'
import PieChart from '@/components/PieChart.vue'
import IncomeDetails from '@/components/IncomeDetails.vue'
import AISuggestion from '@/components/AISuggestion.vue'
import QuickActions from '@/components/QuickActions.vue'
import EvolutionChart from '@/components/EvolutionChart.vue'
import GoalsPanel from '@/components/GoalsPanel.vue'
import TransactionsPanel from '@/components/TransactionsPanel.vue'
import Modal from '@/components/Modal.vue'

// Estado
const { parseCurrency } = useCurrency()
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
  window.location.href = '/simulado'
}

// Handlers de Modal
const handleConfirm = (result) => {
  if (!result?.confirmed || !result.values) return

  const values = result.values
  const nome = (val) => (typeof val === 'string' ? val.trim() : '')
  const valor = (val) => (typeof val === 'number' && !isNaN(val) && val > 0 ? val : null)

  switch (modalAction.value) {
    case 'patrimonio':
      if (typeof values[0] === 'number' && !isNaN(values[0]) && values[0] >= 0) {
        patrimonio.value = values[0]
      }
      break
    case 'renda':
      if (nome(values[0]) && valor(values[1])) addRenda(nome(values[0]), valor(values[1]))
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
  }
  close()
}

// Ações do modal
const modalAction = ref('')

const openEditPatrimonio = async () => {
  modalAction.value = 'patrimonio'
  await open('Editar Patrimônio', [
    { placeholder: 'Novo valor do Patrimônio', value: patrimonio.value, isCurrency: true }
  ])
}

const openAddRenda = async () => {
  modalAction.value = 'renda'
  await open('Adicionar Renda', [
    { placeholder: 'Nome da origem (ex: Salário)' },
    { placeholder: 'Valor da Renda', isCurrency: true }
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
    { placeholder: 'Mês (ex: Abr)' },
    { placeholder: 'Patrimônio no mês', isCurrency: true }
  ])
}

// Ações de confirmação usando modal
const confirmClearAll = async () => {
  modalAction.value = 'confirmClearAll'
  const result = await open('ATENÇÃO', [
    { placeholder: 'Digite EXCLUIR para confirmar' }
  ])
  if (result?.confirmed && result.values?.[0]?.trim().toUpperCase() === 'EXCLUIR') {
    clearAll()
  }
}

const confirmClearDespesas = async () => {
  modalAction.value = 'confirmClearDespesas'
  const result = await open('Confirmar', [
    { placeholder: 'Digite SIM para apagar todas as despesas' }
  ])
  if (result?.confirmed && result.values?.[0]?.trim().toUpperCase() === 'SIM') {
    despesas.value = []
    despesasAvulsas.value = []
  }
}

const confirmClearTransacoes = async () => {
  modalAction.value = 'confirmClearTransacoes'
  const result = await open('Confirmar', [
    { placeholder: 'Digite SIM para limpar transações' }
  ])
  if (result?.confirmed && result.values?.[0]?.trim().toUpperCase() === 'SIM') {
    transacoes.value = []
  }
}

const confirmClearHistorico = async () => {
  modalAction.value = 'confirmClearHistorico'
  const result = await open('Confirmar', [
    { placeholder: 'Digite SIM para limpar histórico' }
  ])
  if (result?.confirmed && result.values?.[0]?.trim().toUpperCase() === 'SIM') {
    historico.value = { labels: [], dados: [] }
  }
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
