<script setup>
import { computed } from 'vue'
import StatCard from './StatCard.vue'
import { useCurrency } from '@/composables/useCurrency'

const props = defineProps({
  patrimonio: Number,
  totalRenda: Number,
  totalDespesa: Number,
  isHidden: Boolean
})

const emit = defineEmits([
  'editPatrimonio', 
  'addRenda', 
  'addDespesa', 
  'clearDespesas'
])

const { formatCurrency } = useCurrency()
const declaredLimit = 5000
const declaredValue = computed(() => (typeof props.totalRenda === 'number' ? props.totalRenda : 0))
const declaredProgress = computed(() => {
  if (!declaredLimit || declaredLimit <= 0) return 0
  return Math.min((declaredValue.value / declaredLimit) * 100, 100)
})
</script>

<template>
  <section class="stats-grid">
    <StatCard
      label="Patrimônio"
      label-hint="Conjunto de bens, direitos e valores acumulados ao longo do tempo."
      :value="formatCurrency(patrimonio)"
      :is-hidden="isHidden"
      show-edit
      @edit="$emit('editPatrimonio')"
    />
    <StatCard
      label="Renda Mensal"
      label-hint="Total de entradas de dinheiro recebidas no mês."
      :value="formatCurrency(totalRenda)"
      :is-hidden="isHidden"
      show-add
      @add="$emit('addRenda')"
    />
    <StatCard
      label="Despesas Mensais"
      label-hint="Gastos recorrentes que voltam todo mês e reduzem seu saldo."
      :value="formatCurrency(totalDespesa)"
      variant="danger"
      :is-hidden="isHidden"
      show-clear
      show-add-expense
      @clear="$emit('clearDespesas')"
      @add-expense="$emit('addDespesa')"
    />
  </section>
</template>
