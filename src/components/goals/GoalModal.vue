<script setup>
import { ref, watch } from 'vue'
import { useCurrency } from '@/composables/useCurrency'

const props = defineProps({
  isOpen: Boolean,
  metas: { type: Array, default: () => [] }
})

const emit = defineEmits(['close', 'add-goal', 'invest'])

const { maskCurrency, parseCurrency, formatCurrency } = useCurrency()

const novoNome = ref('')
const novoAlvoRaw = ref('')
const valorInicial = ref('')
const investValues = ref({})

watch(() => props.isOpen, (open) => {
  if (open) {
    novoNome.value = ''
    novoAlvoRaw.value = ''
    valorInicial.value = ''
    investValues.value = {}
  }
})

const handleAlvoInput = (e) => {
  maskCurrency(e)
  novoAlvoRaw.value = e.target.value
}

const handleInicialInput = (e) => {
  maskCurrency(e)
  valorInicial.value = e.target.value
}

const handleInvestInput = (e, metaId) => {
  maskCurrency(e)
  investValues.value[metaId] = e.target.value
}

const handleAddGoal = () => {
  const nome = novoNome.value.trim()
  const alvo = parseCurrency(novoAlvoRaw.value)
  const inicial = parseCurrency(valorInicial.value) ?? 0
  if (!nome || !alvo) return
  emit('add-goal', { nome, alvo, inicial })
  novoNome.value = ''
  novoAlvoRaw.value = ''
  valorInicial.value = ''
}

const handleInvest = (meta) => {
  const amount = parseCurrency(investValues.value[meta.id] || '')
  if (!amount || amount <= 0) return
  emit('invest', { metaId: meta.id, metaNome: meta.nome, amount })
  investValues.value = { ...investValues.value, [meta.id]: '' }
}

const close = () => emit('close')
</script>

<template>
  <Teleport to="body">
  <div v-if="isOpen" class="modal-overlay" @click.self="close" role="dialog" aria-modal="true" aria-label="Metas Financeiras">
    <div class="glass-panel goal-modal-content">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px">
        <h3 class="panel-title" style="margin: 0">Metas Financeiras</h3>
        <button class="btn-icon-edit" @click="close" aria-label="Fechar" title="Fechar (Esc)">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="goal-modal-body">
        <!-- Left: create new goal -->
        <div class="goal-form-col">
          <p class="goal-col-label">Nova Meta</p>
          <input
            v-model="novoNome"
            placeholder="Nome da meta (ex: Viagem)"
            class="modal-input"
            @keyup.enter="handleAddGoal"
          />
          <input
            :value="novoAlvoRaw"
            placeholder="Valor alvo (ex: R$ 1.000,00)"
            class="modal-input"
            @input="handleAlvoInput"
            @keyup.enter="handleAddGoal"
          />
          <input
            :value="valorInicial"
            placeholder="Valor já investido (ex: R$ 500,00)"
            class="modal-input"
            @input="handleInicialInput"
            @keyup.enter="handleAddGoal"
          />
          <button class="btn-main-action goal-create-btn" @click="handleAddGoal">
            <i class="fas fa-plus"></i> Criar Meta
          </button>
        </div>

        <!-- Right: invest in existing goals -->
        <div v-if="metas.length > 0" class="invest-col">
          <p class="goal-col-label">Investir este mês</p>
          <div v-for="meta in metas" :key="meta.id" class="invest-row">
            <div class="invest-meta-info">
              <span class="invest-meta-name">{{ meta.nome }}</span>
              <span class="invest-meta-progress">{{ formatCurrency(meta.atual) }} / {{ formatCurrency(meta.alvo) }}</span>
            </div>
            <div class="invest-input-row">
              <input
                :value="investValues[meta.id] || ''"
                placeholder="R$ 0,00"
                class="modal-input invest-amount-input"
                @input="handleInvestInput($event, meta.id)"
                @keyup.enter="handleInvest(meta)"
              />
              <button class="btn-add" @click="handleInvest(meta)" title="Adicionar investimento">
                <i class="fas fa-check"></i>
              </button>
            </div>
          </div>
        </div>

        <div v-else class="invest-col invest-col--empty">
          <p class="goal-col-label">Investir este mês</p>
          <p style="color: var(--text-soft); font-size: 0.85rem; margin-top: 12px">
            Crie uma meta primeiro para poder investir.
          </p>
        </div>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<style scoped>
.goal-modal-content {
  width: min(860px, 95vw);
  max-height: 90vh;
  overflow-y: auto;
  padding: 28px;
}

.goal-modal-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
}

@media (max-width: 600px) {
  .goal-modal-body {
    grid-template-columns: 1fr;
  }
}

.goal-col-label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-soft);
  margin: 0 0 14px;
}

.goal-form-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.goal-create-btn {
  width: 100%;
  margin-top: 4px;
  font-size: 0.95rem;
  padding: 10px;
}

.invest-col {
  border-left: 1px solid rgba(170, 204, 238, 0.1);
  padding-left: 28px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.invest-col--empty {
  opacity: 0.6;
}

@media (max-width: 600px) {
  .invest-col {
    border-left: none;
    border-top: 1px solid rgba(170, 204, 238, 0.1);
    padding-left: 0;
    padding-top: 20px;
  }
}

.invest-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.invest-meta-info {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}

.invest-meta-name {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.invest-meta-progress {
  font-size: 0.78rem;
  color: var(--text-soft);
  white-space: nowrap;
}

.invest-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.invest-amount-input {
  flex: 1;
  margin: 0;
}
</style>
