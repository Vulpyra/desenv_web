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
  patrimonio, rendas, despesas, metas, transacoes, historico,
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
const handleConfirm = (values) => {
  if (!values) return
  
  switch (modalAction.value) {
    case 'patrimonio':
      patrimonio.value = values[0]
      break
    case 'renda':
      if (values[0] && values[1]) addRenda(values[0], values[1])
      break
    case 'despesaFixa':
      if (values[0] && values[1]) addDespesaFixa(values[0], values[1])
      break
    case 'despesaAvulsa':
      if (values[0] && values[1]) addDespesaAvulsa(values[0], values[1])
      break
    case 'meta':
      if (values[0] && values[1] && values[2]) addMeta(values[0], values[1], values[2])
      break
    case 'historico':
      if (values[0] && values[1]) addHistorico(values[0], values[1])
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

// Confirmar limpar tudo
const confirmClearAll = () => {
  if (confirm('ATENÇÃO: Você está prestes a apagar todos os dados. Deseja continuar?')) {
    clearAll()
  }
}

// Confirmar limpar despesas
const confirmClearDespesas = () => {
  if (confirm('Tem certeza que deseja apagar TODAS as despesas (fixas e avulsas)?')) {
    despesas.value = []
  }
}

// Confirmar limpar transações
const confirmClearTransacoes = () => {
  if (confirm('Tem certeza que deseja limpar APENAS o histórico visual de transações?')) {
    transacoes.value = []
  }
}

// Confirmar limpar histórico
const confirmClearHistorico = () => {
  if (confirm('Tem certeza que deseja limpar as linhas de Evolução Patrimonial?')) {
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
