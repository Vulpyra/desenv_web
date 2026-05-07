<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDashboardData } from '@/composables/useDashboardData'
import { useModal } from '@/composables/useModal'
import { useCurrency } from '@/composables/useCurrency'
import { useAuth } from '@/composables/useAuth'

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

const router = useRouter()
const { signOut } = useAuth()

// Estado
const { parseCurrency, formatCurrency } = useCurrency()
const {
  patrimonio, rendas, despesas, despesasAvulsas, metas, transacoes, historico,
  totalRenda, totalDespesa, error: dashError,
  load, addRenda, addDespesaFixa, addDespesaAvulsa, addMeta, addHistorico,
  removeRenda, removeDespesa, removeMeta, removeTransacao, clearAll,
  clearDespesas, clearTransacoes, clearHistorico
} = useDashboardData()

const { isOpen, title, fields, message, open, close } = useModal()

// Visibilidade dos valores
const valoresOcultos = ref(false)

// Onboarding
const onboardingDismissed = ref(false)

const onboardingSteps = computed(() => [
  {
    label: 'Adicione sua',
    bold: 'renda mensal',
    hint: '— clique aqui ou no + em "Renda Mensal"',
    done: rendas.value.length > 0,
    action: () => openAddRenda()
  },
  {
    label: 'Cadastre suas',
    bold: 'despesas fixas',
    hint: '(aluguel, planos, etc.)',
    done: despesas.value.length > 0,
    action: () => openAddDespesaFixa()
  },
  {
    label: 'Defina uma',
    bold: 'meta financeira',
    hint: 'para ter algo a perseguir',
    done: metas.value.length > 0,
    action: () => openAddMeta()
  },
  {
    label: 'Registre o',
    bold: 'patrimônio atual',
    hint: 'para acompanhar sua evolução',
    done: historico.value.labels.length > 0,
    action: () => openAddHistorico()
  }
])

const allStepsDone = computed(() => onboardingSteps.value.every(s => s.done))
const showOnboarding = computed(() => !onboardingDismissed.value && !allStepsDone.value)

// Sugestão dinâmica baseada nos dados reais
const aiSuggestion = computed(() => {
  const saldoAtual = totalRenda.value - totalDespesa.value
  if (totalRenda.value === 0) return 'Adicione sua primeira fonte de renda para começar.'
  const pct = totalDespesa.value / totalRenda.value
  if (pct > 0.9) return `Suas despesas (${Math.round(pct * 100)}% da renda) estão muito altas. Revise seus gastos fixos.`
  if (pct > 0.7) return `Despesas em ${Math.round(pct * 100)}% da renda. Tente reduzir para abaixo de 70%.`
  if (metas.value.length === 0) return `Saldo positivo de ${formatCurrency(saldoAtual)}. Que tal definir uma meta financeira?`
  return `Saldo de ${formatCurrency(saldoAtual)} disponível. Continue assim!`
})

// Dados reais para o PieChart
const pieData = computed(() => {
  const r = totalRenda.value
  const d = totalDespesa.value
  if (r === 0 && d === 0) return [1, 1]
  return [r, d]
})
const pieLabels = computed(() => ['Renda', 'Despesas'])

const toggleVisibilidade = () => {
  valoresOcultos.value = !valoresOcultos.value
}

// Navegação
const goToSimulado = () => {
  window.location.href = '/simulado'
}

const goToProfile = () => {
  router.push('/perfil')
}

const handleSignOut = async () => {
  await signOut()
  router.push('/auth')
}

// Handlers de Modal
const handleConfirm = (values) => {
  const nome = (val) => (typeof val === 'string' ? val.trim() : '')
  const valor = (val) => (typeof val === 'number' && !isNaN(val) && val > 0 ? val : null)

  switch (modalAction.value) {
    case 'patrimonio':
      if (typeof values[0] === 'number' && !isNaN(values[0]) && values[0] >= 0) {
        const mes = new Date().toLocaleString('pt-BR', { month: 'short' })
        addHistorico(mes.charAt(0).toUpperCase() + mes.slice(1, 3), values[0])
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
    case 'confirmClearAll':
      clearAll()
      break
    case 'confirmClearDespesas':
      clearDespesas()
      break
    case 'confirmClearTransacoes':
      clearTransacoes()
      break
    case 'confirmClearHistorico':
      clearHistorico()
      break
  }
  close()
}

// Ações do modal
const modalAction = ref('')

const openEditPatrimonio = () => {
  modalAction.value = 'patrimonio'
  open('Editar Patrimônio', [
    { placeholder: 'Novo valor do Patrimônio', value: patrimonio.value, isCurrency: true }
  ])
}

const openAddRenda = () => {
  modalAction.value = 'renda'
  open('Adicionar Renda', [
    { placeholder: 'Nome da origem (ex: Salário)' },
    { placeholder: 'Valor da Renda', isCurrency: true }
  ])
}

const openAddDespesaFixa = () => {
  modalAction.value = 'despesaFixa'
  open('Nova Despesa Fixa', [
    { placeholder: 'Nome da despesa (ex: Aluguel)' },
    { placeholder: 'Valor da despesa', isCurrency: true }
  ])
}

const openAddDespesaAvulsa = () => {
  modalAction.value = 'despesaAvulsa'
  open('Despesa Avulsa', [
    { placeholder: 'Motivo (ex: Uber, Lanche)' },
    { placeholder: 'Valor da despesa', isCurrency: true }
  ])
}

const openAddMeta = () => {
  modalAction.value = 'meta'
  open('Nova Meta', [
    { placeholder: 'Nome da Meta (ex: Viagem)' },
    { placeholder: 'Valor alvo/total', isCurrency: true },
    { placeholder: 'Valor atual guardado', isCurrency: true }
  ])
}

const MESES = [
  { value: 'Jan', label: 'Janeiro' },
  { value: 'Fev', label: 'Fevereiro' },
  { value: 'Mar', label: 'Março' },
  { value: 'Abr', label: 'Abril' },
  { value: 'Mai', label: 'Maio' },
  { value: 'Jun', label: 'Junho' },
  { value: 'Jul', label: 'Julho' },
  { value: 'Ago', label: 'Agosto' },
  { value: 'Set', label: 'Setembro' },
  { value: 'Out', label: 'Outubro' },
  { value: 'Nov', label: 'Novembro' },
  { value: 'Dez', label: 'Dezembro' },
]

const openAddHistorico = () => {
  modalAction.value = 'historico'
  open('Adicionar Evolução', [
    { placeholder: 'Selecione o mês', options: MESES },
    { placeholder: 'Patrimônio no mês', isCurrency: true }
  ])
}

// Ações de confirmação usando modal
const confirmClearAll = () => {
  modalAction.value = 'confirmClearAll'
  open('Zerar sistema', [], 'Deseja realmente apagar todos os dados? Esta ação não pode ser desfeita.')
}

const confirmClearDespesas = () => {
  modalAction.value = 'confirmClearDespesas'
  open('Apagar despesas', [], 'Deseja realmente apagar todas as despesas?')
}

const confirmClearTransacoes = () => {
  modalAction.value = 'confirmClearTransacoes'
  open('Limpar transações', [], 'Deseja realmente limpar o histórico de transações?')
}

const confirmClearHistorico = () => {
  modalAction.value = 'confirmClearHistorico'
  open('Limpar gráfico', [], 'Deseja realmente limpar o histórico de evolução patrimonial?')
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

    <div v-if="dashError" class="error-toast" @click="dashError = null">
      <i class="fas fa-exclamation-circle"></i>
      {{ dashError }}
      <i class="fas fa-times" style="margin-left: auto"></i>
    </div>

    <div class="dashboard">
      <!-- Header -->
      <header class="top-bar">
        <div class="brand-mark" aria-label="Renda Fácil">
          <span class="brand-text">Renda Fácil</span>
        </div>
        <div class="top-icons">
          <i
            class="far fa-eye"
            :class="{ 'fa-eye-slash': valoresOcultos }"
            @click="toggleVisibilidade"
            title="Ocultar/Exibir valores"
          ></i>
          <i class="far fa-user-circle" @click="goToProfile" title="Meu Perfil" style="cursor: pointer"></i>
          <i class="fas fa-sign-out-alt" @click="handleSignOut" title="Sair" style="cursor: pointer"></i>
        </div>
      </header>

      <!-- Banner de onboarding -->
      <div v-if="showOnboarding" class="onboarding-banner">
        <div class="onboarding-header">
          <div class="onboarding-title">
            <i class="fas fa-rocket"></i>
            Bem-vindo ao Renda Fácil! Siga os passos para começar:
          </div>
          <button class="onboarding-dismiss" @click="onboardingDismissed = true" title="Dispensar">
            Dispensar <i class="fas fa-times"></i>
          </button>
        </div>
        <ol class="onboarding-list">
          <li
            v-for="(step, i) in onboardingSteps"
            :key="i"
            :class="{ 'step-done': step.done }"
            @click="!step.done && step.action()"
          >
            <span class="step-num">
              <i v-if="step.done" class="fas fa-check"></i>
              <span v-else>{{ i + 1 }}</span>
            </span>
            <span>
              {{ step.label }} <strong>{{ step.bold }}</strong> {{ step.hint }}
            </span>
            <i v-if="!step.done" class="fas fa-chevron-right step-arrow"></i>
          </li>
        </ol>
      </div>

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
        <PieChart :data="pieData" :labels="pieLabels" />
        
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
            <AISuggestion :suggestion="aiSuggestion" />
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
    :message="message"
    @confirm="handleConfirm"
    @cancel="close"
  />
</template>
