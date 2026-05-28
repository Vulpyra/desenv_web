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
import EditEntryModal from '@/components/dashboard/EditEntryModal.vue'
import Modal from '@/components/Modal.vue'
import GlossaryTerm from '@/components/common/GlossaryTerm.vue'

const router = useRouter()
const { signOut } = useAuth()

// Estado
const { formatCurrency } = useCurrency()
const {
  rendas, despesas, despesasAvulsas, metas, transacoes,
  saldo, historicoCalculado,
  rendasCiclo, despesasFixasCiclo, totalRendaCiclo, totalDespesaCiclo,
  error: dashError,
  load, addRenda, addDespesaFixa, addDespesaAvulsa, addMeta, addDespesaMeta,
  getUniqueName, updateRenda, updateDespesa, convertRendaToDespesa, convertDespesaToRenda,
  removeRenda, removeDespesa, removeMeta, removeTransacao, clearAll,
  clearDespesas, clearTransacoes
} = useDashboardData()

// Edit entry state
const editTarget = ref(null)
const showEditModal = ref(false)
const allNamesExcludingEdit = computed(() => {
  const excludeId = editTarget.value?.id
  return [
    ...rendas.value.filter(r => r.id !== excludeId).map(r => r.nome),
    ...despesas.value.filter(d => d.id !== excludeId).map(d => d.nome),
    ...despesasAvulsas.value.filter(d => d.id !== excludeId).map(d => d.nome)
  ]
})

const handleEditEntry = (item) => {
  editTarget.value = item
  showEditModal.value = true
}

const handleEditSave = async ({ id, tipoOriginal, nome, valor, tipo, data }) => {
  if (tipoOriginal === tipo) {
    if (tipo === 'renda') await updateRenda(id, nome, valor)
    else await updateDespesa(id, nome, valor)
  } else if (tipoOriginal === 'renda' && tipo === 'despesa') {
    await convertRendaToDespesa(id, nome, valor, data || todayISO())
  } else {
    await convertDespesaToRenda(id, nome, valor, data || todayISO())
  }
  showEditModal.value = false
  editTarget.value = null
}

const todayISO = () => new Date().toISOString().split('T')[0]
const goalsPanelRef = ref(null)

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
    hint: '— clique em + em "Metas Financeiras"',
    done: metas.value.length > 0,
    action: () => goalsPanelRef.value?.openModal()
  },
  {
    label: 'Defina uma',
    bold: 'meta de evolução',
    hint: '— adicione rendas e despesas com datas para ver o gráfico',
    done: rendas.value.some(r => r.data) || [...despesas.value, ...despesasAvulsas.value].some(d => d.data),
    action: () => openAddRenda()
  }
])

const allStepsDone = computed(() => onboardingSteps.value.every(s => s.done))
const showOnboarding = computed(() => !onboardingDismissed.value && !allStepsDone.value)

// Sugestão dinâmica baseada nos dados do ciclo atual
const aiSuggestion = computed(() => {
  const saldoCiclo = totalRendaCiclo.value - totalDespesaCiclo.value
  if (totalRendaCiclo.value === 0) return 'Adicione sua renda do ciclo atual para começar.'
  const pct = totalDespesaCiclo.value / totalRendaCiclo.value
  if (pct > 0.9) return `Suas despesas (${Math.round(pct * 100)}% da renda) estão muito altas. Revise seus gastos fixos.`
  if (pct > 0.7) return `Despesas em ${Math.round(pct * 100)}% da renda. Tente reduzir para abaixo de 70%.`
  if (metas.value.length === 0) return `Saldo de ${formatCurrency(saldoCiclo)} no ciclo. Que tal definir uma meta financeira?`
  return `Saldo de ${formatCurrency(saldoCiclo)} no ciclo atual. Continue assim!`
})

const glossaryTerms = [
  {
    term: 'Elisão fiscal',
    explanation: 'Planejamento permitido por lei para reduzir a carga tributária.'
  },
  {
    term: 'Base de cálculo',
    explanation: 'Valor usado como referência para calcular o imposto.'
  },
  {
    term: 'Valor dedutível',
    explanation: 'Despesa que pode diminuir a base de cálculo do imposto.'
  }
]

// PieChart usa dados do ciclo atual
const pieData = computed(() => {
  const r = totalRendaCiclo.value
  const d = totalDespesaCiclo.value
  if (r === 0 && d === 0) return [1, 1]
  const saldoCiclo = Math.max(r - d, 0)
  const despesasEfetivas = Math.min(d, r)

  return [despesasEfetivas, saldoCiclo]
})
const pieLabels = computed(() => ['Saldo', 'Despesas'])

const toggleVisibilidade = () => {
  valoresOcultos.value = !valoresOcultos.value
}

// Navegação
const goToSimulado = () => {
  router.push('/simulado')
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
    // case 'patrimonio':
    //   if (typeof values[0] === 'number' && !isNaN(values[0]) && values[0] >= 0) {
    //     const mes = new Date().toLocaleString('pt-BR', { month: 'short' })
    //     addHistorico(mes.charAt(0).toUpperCase() + mes.slice(1, 3), values[0])
    //   }
    //   break
    case 'renda': {
      const n = nome(values[0]); const v = valor(values[1])
      if (n && v) addRenda(getUniqueName(n), v, values[2] || todayISO())
      break
    }
    case 'despesaFixa': {
      const n = nome(values[0]); const v = valor(values[1])
      if (n && v) addDespesaFixa(getUniqueName(n), v, values[2] || todayISO())
      break
    }
    case 'despesaAvulsa': {
      const n = nome(values[0]); const v = valor(values[1])
      if (n && v) addDespesaAvulsa(getUniqueName(n), v, values[2] || todayISO())
      break
    }
    case 'confirmClearAll':
      clearAll()
      break
    case 'confirmClearDespesas':
      clearDespesas()
      break
    case 'confirmClearTransacoes':
      clearTransacoes()
      break
  }
  close()
}

// Ações do modal
const modalAction = ref('')

// const openEditPatrimonio = () => {
//   modalAction.value = 'patrimonio'
//   open('Editar Patrimônio', [
//     { placeholder: 'Novo valor do Patrimônio', value: patrimonio.value, isCurrency: true }
//   ])
// }

const nameWarningFn = (val) => {
  const n = (val || '').trim()
  if (!n) return null
  const unique = getUniqueName(n)
  if (unique === n) return null
  return `O nome '${n}' já existe. Este item será nomeado: '${unique}'`
}

const openAddRenda = () => {
  modalAction.value = 'renda'
  open('Adicionar Renda', [
    { placeholder: 'Nome da origem (ex: Salário)', warningFn: nameWarningFn },
    { placeholder: 'Valor da Renda', isCurrency: true },
    { placeholder: 'Data do recebimento', type: 'date', value: todayISO() }
  ])
}

const openAddDespesaFixa = () => {
  modalAction.value = 'despesaFixa'
  open('Nova Despesa Fixa', [
    { placeholder: 'Nome da despesa (ex: Aluguel)', warningFn: nameWarningFn },
    { placeholder: 'Valor da despesa', isCurrency: true },
    { placeholder: 'Data da despesa', type: 'date', value: todayISO() }
  ])
}

const openAddDespesaAvulsa = () => {
  modalAction.value = 'despesaAvulsa'
  open('Despesa Avulsa', [
    { placeholder: 'Motivo (ex: Uber, Lanche)', warningFn: nameWarningFn },
    { placeholder: 'Valor da despesa', isCurrency: true },
    { placeholder: 'Data da despesa', type: 'date', value: todayISO() }
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

      <section class="glossary-strip" aria-label="Glossário rápido">
        <div class="glossary-strip__header">
          <i class="fas fa-circle-info"></i>
          <div>
            <strong>Glossário rápido</strong>
            <span>Passe o mouse ou use o teclado nos termos para ver uma explicação curta.</span>
          </div>
        </div>
        <div class="glossary-strip__terms">
          <GlossaryTerm
            v-for="item in glossaryTerms"
            :key="item.term"
            :term="item.term"
            :explanation="item.explanation"
          />
        </div>
      </section>

      <!-- Cards de estatísticas -->
      <StatCards
        :patrimonio="saldo"
        :total-renda="totalRendaCiclo"
        :total-despesa="totalDespesaCiclo"
        :is-hidden="valoresOcultos"
        :show-edit="false"
        @add-renda="openAddRenda"
        @add-despesa="openAddDespesaAvulsa"
        @clear-despesas="confirmClearDespesas"
      />

      <!-- Conteúdo principal -->
      <section class="main-content">
        <PieChart :data="pieData" :labels="pieLabels" :center-value="totalRendaCiclo" />
        
        <IncomeDetails
          :rendas="rendasCiclo"
          :despesas="despesasFixasCiclo"
          :is-hidden="valoresOcultos"
          @add-renda="openAddRenda"
          @add-despesa="openAddDespesaFixa"
          @remove-renda="removeRenda"
          @remove-despesa="removeDespesa"
          @edit-entry="handleEditEntry"
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
          :labels="historicoCalculado.labels"
          :data="historicoCalculado.dados"
        />

        <GoalsPanel
          ref="goalsPanelRef"
          :metas="metas"
          :is-hidden="valoresOcultos"
          @add-goal="(g) => addMeta(g.nome, g.alvo)"
          @invest="(inv) => addDespesaMeta(inv.metaId, inv.metaNome, inv.amount, todayISO())"
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

  <!-- Edit entry modal -->
  <EditEntryModal
    :is-open="showEditModal"
    :entry="editTarget"
    :all-names="allNamesExcludingEdit"
    @close="showEditModal = false; editTarget = null"
    @save="handleEditSave"
  />
</template>