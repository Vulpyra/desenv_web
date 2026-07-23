<script setup>
import { ref, computed } from 'vue'
import { useCurrency } from '@/composables/useCurrency'

const { formatCurrency, parseLoose } = useCurrency()

const props = defineProps({
  meta: Object,
  isHidden: Boolean
})

const emit = defineEmits(['remove', 'invest'])

const porcentagem = computed(() => {
  if (!props.meta.alvo || props.meta.alvo <= 0) return '0.0'
  return Math.min((props.meta.atual / props.meta.alvo) * 100, 100).toFixed(1)
})

const investRaw = ref('')
const commitInvest = () => {
  const amount = parseLoose(investRaw.value)
  if (!amount) return
  emit('invest', { metaId: props.meta.id, metaNome: props.meta.nome, amount })
  investRaw.value = ''
}
</script>

<template>
  <div class="goal-card">
    <div class="goal-header">
      <span class="goal-name">
        <i class="fas" :class="meta.icone"></i>
        {{ meta.nome }}
      </span>
      <span class="goal-pct">{{ porcentagem }}%</span>
      <button class="btn-remove" @click="$emit('remove', meta.id)" title="Remover">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div class="goal-values hide-value" :class="{ 'value-hidden': isHidden }">
      <span class="goal-atual">{{ formatCurrency(meta.atual) }}</span>
      <span class="goal-sep">de</span>
      <span class="goal-alvo">{{ formatCurrency(meta.alvo) }}</span>
    </div>

    <div class="progress-container">
      <div
        class="progress-bar"
        :style="{
          width: porcentagem + '%',
          background: `linear-gradient(90deg, ${meta.cor1 || 'var(--accent-sky)'}, ${meta.cor2 || 'var(--button-b)'})`
        }"
      ></div>
    </div>

    <div class="spend-row">
      <input
        class="mini-in mini-in--goal num"
        placeholder="0,00"
        inputmode="decimal"
        v-model="investRaw"
        @keydown.enter="commitInvest"
      />
      <button class="mini-btn mini-btn--goal" @click="commitInvest">Investir</button>
    </div>
  </div>
</template>
