<script setup>
import { computed } from 'vue'
import { useCurrency } from '@/composables/useCurrency'

const { formatCurrency } = useCurrency()

const props = defineProps({
  meta: Object,
  isHidden: Boolean
})

const emit = defineEmits(['remove'])


const porcentagem = computed(() => {
  if (!props.meta.alvo || props.meta.alvo <= 0) return '0.0'
  return Math.min((props.meta.atual / props.meta.alvo) * 100, 100).toFixed(1)
})
</script>

<template>
  <div class="goal-item">
    <div class="goal-header">
      <span class="goal-name">
        <i class="fas" :class="meta.icone"></i>
        {{ meta.nome }}
      </span>
      <button class="btn-remove" @click="$emit('remove', meta.id)" title="Remover">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="goal-values" :class="{ 'value-hidden': isHidden }">
      <span class="goal-atual">{{ formatCurrency(meta.atual) }}</span>
      <span class="goal-sep">de</span>
      <span class="goal-alvo">{{ formatCurrency(meta.alvo) }}</span>
      <span class="goal-pct">{{ porcentagem }}%</span>
    </div>
    <div class="progress-container">
      <div
        class="progress-bar"
        :style="{
          width: porcentagem + '%',
          background: `linear-gradient(90deg, ${meta.cor1}, ${meta.cor2})`
        }"
      ></div>
    </div>
  </div>
</template>
