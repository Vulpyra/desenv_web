<script setup>
import { ref, computed } from 'vue'
import GoalItem from './GoalItem.vue'
import GoalModal from './GoalModal.vue'
import GoalInvestmentsModal from './GoalInvestmentsModal.vue'
import GlossaryTerm from '@/components/common/GlossaryTerm.vue'
import { useCurrency } from '@/composables/useCurrency'

const props = defineProps({
  metas: Array,
  isHidden: Boolean,
  aportes: { type: Array, default: () => [] },
  cycleLabel: { type: String, default: '' }
})

defineEmits(['add-goal', 'invest', 'remove', 'remove-aporte'])

// Aportes do ciclo da meta aberta no modal
const investTarget = ref(null)
const aportesDaMeta = computed(() =>
  investTarget.value
    ? props.aportes.filter((a) => a.meta_id === investTarget.value.id)
    : []
)

const { formatCurrency } = useCurrency()

const showModal = ref(false)

const openModal = () => { showModal.value = true }
defineExpose({ openModal })

const pct = (m) => (m.alvo > 0 ? Math.min((m.atual || 0) / m.alvo, 1) : 0)

// Meta em destaque: a mais próxima de ser concluída (sem estar concluída), senão a primeira
const sortedMetas = computed(() =>
  [...(props.metas || [])].sort((a, b) => pct(b) - pct(a))
)

const featured = computed(() => {
  const emAndamento = sortedMetas.value.filter(m => pct(m) < 1)
  return emAndamento[0] || sortedMetas.value[0] || null
})

const RING_R = 30
const RING_C = 2 * Math.PI * RING_R
const ringOffset = computed(() =>
  featured.value ? RING_C * (1 - pct(featured.value)) : RING_C
)
</script>

<template>
  <div class="glass-panel goals-panel">
    <div class="panel-header">
      <GlossaryTerm
        term="Metas Financeiras"
        explanation="Objetivos de economia ou compra que você quer alcançar ao longo do tempo."
      />
      <button class="btn-add" @click="showModal = true" title="Adicionar Meta / Investir">
        <i class="fas fa-plus"></i>
      </button>
    </div>

    <div v-if="featured" class="featured-goal">
      <svg width="84" height="84" viewBox="0 0 84 84" style="flex-shrink: 0" aria-hidden="true">
        <circle cx="42" cy="42" r="30" fill="none" stroke="rgba(186, 219, 246, 0.12)" stroke-width="8" />
        <circle
          cx="42" cy="42" r="30" fill="none"
          stroke="var(--accent-cyan)" stroke-width="8" stroke-linecap="round"
          :stroke-dasharray="RING_C" :stroke-dashoffset="ringOffset"
          transform="rotate(-90 42 42)"
        />
        <text x="42" y="47" text-anchor="middle" fill="var(--text-title)" font-size="16" font-weight="700">
          {{ Math.round(pct(featured) * 100) }}%
        </text>
      </svg>
      <div style="flex: 1; min-width: 0">
        <div class="featured-goal-name">
          <i class="fas" :class="featured.icone || 'fa-bullseye'"></i>
          {{ featured.nome }}
        </div>
        <div class="item-sub hide-value" :class="{ 'value-hidden': isHidden }">
          {{ formatCurrency(featured.atual) }} de {{ formatCurrency(featured.alvo) }}
        </div>
        <div class="item-sub" style="margin-top: 2px">prioridade #1</div>
      </div>
    </div>

    <div class="goals-list">
      <GoalItem
        v-for="meta in sortedMetas"
        :key="meta.id"
        :meta="meta"
        :is-hidden="isHidden"
        @remove="$emit('remove', $event)"
        @invest="$emit('invest', $event)"
        @show-investments="investTarget = $event"
      />
      <p v-if="metas.length === 0" style="color: var(--text-soft); font-size: 0.9rem; text-align: center">
        Nenhuma meta cadastrada.
      </p>
    </div>

    <GoalModal
      :is-open="showModal"
      :metas="metas"
      @close="showModal = false"
      @add-goal="$emit('add-goal', $event)"
      @invest="$emit('invest', $event)"
    />

    <GoalInvestmentsModal
      :is-open="!!investTarget"
      :meta="investTarget"
      :aportes="aportesDaMeta"
      :cycle-label="cycleLabel"
      :is-hidden="isHidden"
      @close="investTarget = null"
      @remove="$emit('remove-aporte', $event)"
    />
  </div>
</template>
