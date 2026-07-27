<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDashboardData } from '@/composables/useDashboardData'
import { usePlanner } from '@/composables/usePlanner'
import { usePanelLayout } from '@/composables/usePanelLayout'
import { useModal } from '@/composables/useModal'
import { useCurrency } from '@/composables/useCurrency'
import { useAuth } from '@/composables/useAuth'

// Componentes
import DashboardPanel from '@/components/dashboard/DashboardPanel.vue'
import CycleSelector from '@/components/dashboard/CycleSelector.vue'
import IncomePanel from '@/components/dashboard/IncomePanel.vue'
import FlowPanel from '@/components/dashboard/FlowPanel.vue'
import BillsPanel from '@/components/dashboard/BillsPanel.vue'
import SpendPanel from '@/components/dashboard/SpendPanel.vue'
import AssistantPanel from '@/components/dashboard/AssistantPanel.vue'
import EvolutionChart from '@/components/charts/EvolutionChart.vue'
import GoalsPanel from '@/components/goals/GoalsPanel.vue'
import TransactionsPanel from '@/components/transactions/TransactionsPanel.vue'
import EditEntryModal from '@/components/dashboard/EditEntryModal.vue'
import Modal from '@/components/Modal.vue'

const router = useRouter()
const { signOut } = useAuth()

// Estado (Supabase): entradas, metas, transações, evolução
const { formatCurrency } = useCurrency()
const {
  rendas, metas, transacoes,
  rendasCiclo, totalRendaCiclo, totalAportesMetaCiclo,
  selectedCycle, selectedCycleIndex, labelForCycleIndex, rendaTotalAt, earliestRendaCycle,
  cycleLabel, isCurrentCycle, prevCycle, nextCycle, resetCycle,
  error: dashError,
  load, addRenda, addMeta, addDespesaMeta,
  getUniqueName, updateRenda, removeRenda, removeMeta, removeTransacao,
  clearAll, clearTransacoes
} = useDashboardData()

// Estado (Supabase): contas fixas recorrentes, parcelas, compras únicas, categorias de gasto
const {
  fixedCiclo, installmentsCiclo, oneTimeCiclo, budgetsCiclo,
  totalInstallments, totalOneTime, totalInvoice, comprometido: plannerComprometido,
  totalBudget, totalGasto, fixedPaidIds, invoicePaid, totalPago, restante: plannerRestante,
  comprometidoAt, gastoAt, earliestIndex, hasFixed, hasBudgets,
  addFixed, addInstallment, addOneTime, addBudget,
  setAmount, setBudgetLimit, launchSpend,
  toggleFixedPaid, toggleInvoicePaid,
  removeFixed, removeInstallment, removeOneTime, removeBudget,
  load: loadPlanner, error: plannerError, clear: clearPlanner
} = usePlanner(selectedCycleIndex)

// Fluxo do ciclo: livre = renda − comprometido − aportes em metas; teto de gasto = livre
const livre = computed(() => totalRendaCiclo.value - plannerComprometido.value - totalAportesMetaCiclo.value)
const restam = computed(() => livre.value - totalGasto.value)

// ---- Layout: ordem/minimização/arraste dos painéis ----
const DEFAULT_PANELS = ['income', 'flow', 'goals', 'bills', 'spend', 'evolution', 'transactions', 'assistant']
const panelTitles = {
  income: 'Entradas', flow: 'Livre para gastar', goals: 'Metas Financeiras',
  bills: 'Preciso pagar', spend: 'Planejo gastar', evolution: 'Evolução Patrimonial',
  transactions: 'Transações', assistant: 'Assistente'
}
const panelSpanClass = {
  income: 'span-2', flow: 'span-2', goals: 'span-2',
  bills: 'span-3', spend: 'span-3',
  evolution: 'span-2', transactions: 'span-2', assistant: 'span-2'
}
const { order, dragId, preview, isMinimized, toggleMinimize, onHandleDown } = usePanelLayout(DEFAULT_PANELS)
const previewStyle = computed(() => ({
  left: (preview.value.x - preview.value.ox) + 'px',
  top: (preview.value.y - preview.value.oy) + 'px',
  width: preview.value.w + 'px',
  height: preview.value.h + 'px'
}))

// Datas: novos lançamentos caem no ciclo que está sendo visualizado
const toLocalISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const todayISO = () => toLocalISO(new Date())
const defaultEntryDate = computed(() =>
  isCurrentCycle.value ? todayISO() : toLocalISO(selectedCycle.value.start)
)

// ---- Edição de entradas (rendas, via Supabase) ----
const editTarget = ref(null)
const showEditModal = ref(false)
const allNamesExcludingEdit = computed(() => {
  const excludeId = editTarget.value?.id
  // Nomes do ciclo visualizado (mesma regra do getUniqueName)
  return rendasCiclo.value.filter(r => r.id !== excludeId).map(r => r.nome)
})

const handleEditEntry = (item) => {
  editTarget.value = item
  showEditModal.value = true
}

const handleEditSave = async ({ id, tipoOriginal, nome, valor, tipo }) => {
  if (tipo === 'renda') {
    await updateRenda(id, nome, valor)
  } else if (tipoOriginal === 'renda') {
    // Renda convertida em conta: some das entradas e vira conta fixa recorrente
    await removeRenda(id)
    addFixed(nome, valor)
  }
  showEditModal.value = false
  editTarget.value = null
}

// ---- Remoção com confirmação (entradas + itens do planner) ----
const deleteTarget = ref(null)
const skipDeleteConfirm = ref(localStorage.getItem('rf_skipDeleteConfirm') === 'true')
const dontShowAgain = ref(false)

const requestRemove = (item) => {
  if (skipDeleteConfirm.value) {
    doRemove(item)
    return
  }
  deleteTarget.value = item
  dontShowAgain.value = false
}

const confirmDelete = () => {
  if (dontShowAgain.value) {
    skipDeleteConfirm.value = true
    localStorage.setItem('rf_skipDeleteConfirm', 'true')
  }
  doRemove(deleteTarget.value)
  deleteTarget.value = null
}

const doRemove = (item) => {
  switch (item.plannerKind) {
    case 'fixed': return removeFixed(item.id)
    case 'installment': return removeInstallment(item.id)
    case 'onetime': return removeOneTime(item.id)
    case 'budget': return removeBudget(item.id)
    default: return removeRenda(item.id)
  }
}

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
    hint: '— clique aqui ou no + em "Entradas"',
    done: rendas.value.length > 0,
    action: () => openAddRenda()
  },
  {
    label: 'Cadastre suas',
    bold: 'contas fixas',
    hint: '— use os campos no painel "Preciso pagar"',
    done: hasFixed.value,
    action: () => {}
  },
  {
    label: 'Defina uma',
    bold: 'meta financeira',
    hint: '— clique em + em "Metas Financeiras"',
    done: metas.value.length > 0,
    action: () => {
      const gp = goalsPanelRef.value
      ;(Array.isArray(gp) ? gp[0] : gp)?.openModal()
    }
  },
  {
    label: 'Planeje seus',
    bold: 'gastos por categoria',
    hint: '— crie categorias no painel "Planejo gastar"',
    done: hasBudgets.value,
    action: () => {}
  }
])

const allStepsDone = computed(() => onboardingSteps.value.every(s => s.done))
const showOnboarding = computed(() => !onboardingDismissed.value && !allStepsDone.value)

// Sugestão dinâmica baseada nos dados do ciclo selecionado (mascara valores ocultos)
const fmtVal = (v) => (valoresOcultos.value ? 'R$ ••••' : formatCurrency(v))

const aiSuggestion = computed(() => {
  if (totalRendaCiclo.value === 0) {
    return `Nenhuma entrada em ${cycleLabel.value}. Adicione sua renda do ciclo para começar.`
  }
  if (livre.value < 0) {
    return `Contas e metas superam a renda em ${fmtVal(-livre.value)} neste ciclo. Reveja o que dá para cortar em "Preciso pagar".`
  }
  if (restam.value < 0) {
    return `Você passou do teto de gastos em ${fmtVal(-restam.value)}. O gasto planejado de ${cycleLabel.value} soma ${fmtVal(totalGasto.value)}.`
  }
  if (metas.value.length === 0) {
    return `Sobram ${fmtVal(restam.value)} do teto em ${cycleLabel.value}. Que tal guardar parte disso em uma meta financeira?`
  }
  return `Folga de ${fmtVal(restam.value)} no teto de ${cycleLabel.value}. Continue assim!`
})

// ---- Evolução patrimonial: caixa acumulado por ciclo (renda − contas − gastos) ----
const evolution = computed(() => {
  const sel = selectedCycleIndex.value
  const candidates = []
  if (earliestRendaCycle.value != null) candidates.push(earliestRendaCycle.value)
  if (earliestIndex.value != null) candidates.push(earliestIndex.value)

  if (!candidates.length) {
    return { labels: [labelForCycleIndex(sel)], dados: [0] }
  }

  const trueStart = Math.min(...candidates)
  const displayStart = Math.max(trueStart, sel - 11)
  const labels = []
  const dados = []
  let cumulative = 0
  for (let i = trueStart; i <= sel; i++) {
    cumulative += rendaTotalAt(i) - comprometidoAt(i) - gastoAt(i)
    if (i >= displayStart) {
      labels.push(labelForCycleIndex(i))
      dados.push(cumulative)
    }
  }
  return { labels, dados }
})

const toggleVisibilidade = () => {
  valoresOcultos.value = !valoresOcultos.value
}

// Navegação
const goToSimulado = () => router.push('/simulado')
const goToProfile = () => router.push('/perfil')
const handleSignOut = async () => {
  await signOut()
  router.push('/auth')
}

// ---- Modal (renda + confirmações) ----
const modalAction = ref('')

const handleConfirm = (values) => {
  const nome = (val) => (typeof val === 'string' ? val.trim() : '')
  const valor = (val) => (typeof val === 'number' && !isNaN(val) && val > 0 ? val : null)

  switch (modalAction.value) {
    case 'renda': {
      const n = nome(values[0]); const v = valor(values[1])
      const recorrente = values[3] === 'recorrente'
      if (n && v) addRenda(getUniqueName(n), v, values[2] || defaultEntryDate.value, recorrente)
      break
    }
    case 'confirmClearAll':
      if ((values[0] || '').trim() !== 'EXCLUIR') return
      clearAll()
      clearPlanner()
      break
    case 'confirmClearTransacoes':
      if ((values[0] || '').trim().toUpperCase() !== 'SIM') return
      clearTransacoes()
      break
  }
  close()
}

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
    { placeholder: 'Data do recebimento', type: 'date', value: defaultEntryDate.value },
    {
      placeholder: 'Tipo',
      options: [
        { label: 'Única (só este ciclo)', value: 'unica' },
        { label: 'Recorrente (todo ciclo)', value: 'recorrente' }
      ],
      value: 'unica'
    }
  ])
}

const confirmClearAll = () => {
  modalAction.value = 'confirmClearAll'
  open('ATENÇÃO', [
    { placeholder: 'Digite EXCLUIR para confirmar' }
  ])
}

const confirmClearTransacoes = () => {
  modalAction.value = 'confirmClearTransacoes'
  open('Confirmar', [
    { placeholder: 'Digite SIM para limpar transações' }
  ])
}

onMounted(() => {
  load()
  loadPlanner()
})
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

    <div v-if="dashError || plannerError" class="error-toast" @click="dashError = null; plannerError = null">
      <i class="fas fa-exclamation-circle"></i>
      {{ dashError || plannerError }}
      <i class="fas fa-times" style="margin-left: auto"></i>
    </div>

    <div class="dashboard">
      <!-- Header -->
      <header class="top-bar">
        <div class="brand-mark" aria-label="Renda Fácil">
          <span class="brand-text">Renda Fácil</span>
        </div>
        <CycleSelector
          :label="cycleLabel"
          :is-current="isCurrentCycle"
          @prev="prevCycle"
          @next="nextCycle"
          @reset="resetCycle"
        />
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

      <!-- Painéis reordenáveis / minimizáveis -->
      <TransitionGroup tag="div" class="panel-grid" name="dpanel">
        <DashboardPanel
          v-for="id in order"
          :key="id"
          :id="id"
          :title="panelTitles[id]"
          :minimized="isMinimized(id)"
          :is-dragging="dragId === id"
          :class="panelSpanClass[id]"
          @toggle="toggleMinimize(id)"
          @handledown="onHandleDown($event, id, panelTitles[id])"
        >
          <IncomePanel
            v-if="id === 'income'"
            :rendas="rendasCiclo"
            :total="totalRendaCiclo"
            :is-hidden="valoresOcultos"
            @add="openAddRenda"
            @edit="handleEditEntry"
            @remove="requestRemove"
          />

          <FlowPanel
            v-else-if="id === 'flow'"
            :renda="totalRendaCiclo"
            :comprometido="plannerComprometido"
            :aportes="totalAportesMetaCiclo"
            :livre="livre"
            :is-hidden="valoresOcultos"
          />

          <GoalsPanel
            v-else-if="id === 'goals'"
            ref="goalsPanelRef"
            :metas="metas"
            :is-hidden="valoresOcultos"
            @add-goal="(g) => addMeta(g.nome, g.alvo, g.inicial)"
            @invest="(inv) => addDespesaMeta(inv.metaId, inv.metaNome, inv.amount, defaultEntryDate)"
            @remove="removeMeta"
          />

          <BillsPanel
            v-else-if="id === 'bills'"
            :fixed="fixedCiclo"
            :installments="installmentsCiclo"
            :one-time="oneTimeCiclo"
            :paid-ids="fixedPaidIds"
            :invoice-paid="invoicePaid"
            :total-installments="totalInstallments"
            :total-one-time="totalOneTime"
            :total-invoice="totalInvoice"
            :total-contas="plannerComprometido"
            :total-pago="totalPago"
            :restante="plannerRestante"
            :is-hidden="valoresOcultos"
            @add-fixed="(p) => addFixed(p.name, p.amount, p.day)"
            @add-installment="(p) => addInstallment(p.name, p.amount, p.parcelaAtual, p.parcelaTotal)"
            @add-onetime="(p) => addOneTime(p.name, p.amount)"
            @set-amount="(p) => setAmount(p.kind, p.id, p.amount)"
            @toggle-fixed-paid="toggleFixedPaid"
            @toggle-invoice-paid="toggleInvoicePaid"
            @remove="requestRemove"
          />

          <SpendPanel
            v-else-if="id === 'spend'"
            :budgets="budgetsCiclo"
            :teto="livre"
            :gasto="totalGasto"
            :total-budget="totalBudget"
            :is-hidden="valoresOcultos"
            @add-budget="(p) => addBudget(p.name, p.limit)"
            @launch-spend="(p) => launchSpend(p.id, p.amount)"
            @set-limit="(p) => setBudgetLimit(p.id, p.limit)"
            @remove="requestRemove"
          />

          <EvolutionChart
            v-else-if="id === 'evolution'"
            :labels="evolution.labels"
            :data="evolution.dados"
            :subtitle="cycleLabel"
            :is-hidden="valoresOcultos"
          />

          <TransactionsPanel
            v-else-if="id === 'transactions'"
            :transacoes="transacoes"
            :is-hidden="valoresOcultos"
            @clear="confirmClearTransacoes"
            @remove="removeTransacao"
          />

          <AssistantPanel
            v-else-if="id === 'assistant'"
            :suggestion="aiSuggestion"
            @simulado="goToSimulado"
          />
        </DashboardPanel>
      </TransitionGroup>

      <!-- Rodapé de utilidades -->
      <div class="util-row">
        <span class="util-note">
          Ciclo de {{ cycleLabel }} · arraste a barra dos painéis para reordenar, ou minimize pelo botão.
        </span>
        <button
          class="btn-outline util-danger"
          @click="confirmClearAll"
          title="Apagar todos os dados do sistema"
        >
          <i class="fas fa-power-off"></i> Zerar Todo o Sistema
        </button>
      </div>
    </div>
  </div>

  <!-- Preview flutuante do painel sendo arrastado -->
  <Teleport to="body">
    <div v-if="dragId" class="panel-drag-preview" :style="previewStyle" aria-hidden="true">
      <i class="fas fa-grip"></i>
      <span>{{ preview.title }}</span>
    </div>
  </Teleport>

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

  <!-- Confirmação de exclusão -->
  <Teleport to="body">
    <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null" role="dialog" aria-modal="true">
      <div class="glass-panel modal-content" style="width: min(380px, 95vw)">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
          <h3 class="panel-title" style="margin: 0">Confirmar exclusão</h3>
          <button class="btn-icon-edit" @click="deleteTarget = null"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <p style="color: var(--text-main); margin-bottom: 18px">
            Deseja remover <strong>{{ deleteTarget.nome }}</strong>?
          </p>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text-soft); font-size: 0.85rem">
            <input type="checkbox" v-model="dontShowAgain" style="width: 14px; height: 14px; cursor: pointer" />
            Não mostrar novamente
          </label>
        </div>
        <div class="modal-actions" style="margin-top: 20px">
          <button class="btn-outline" style="padding: 10px 20px" @click="deleteTarget = null">Cancelar</button>
          <button
            class="btn-main-action"
            style="padding: 10px 20px; font-size: 1rem; width: auto; background: var(--danger-soft); border-color: var(--danger-soft)"
            @click="confirmDelete"
          >
            Remover
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
