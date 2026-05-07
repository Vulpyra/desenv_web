<script setup>
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
</script>

<template>
  <section class="stats-grid">
    <StatCard
      label="Patrimônio"
      :value="formatCurrency(patrimonio)"
      :is-hidden="isHidden"
      show-edit
      @edit="$emit('editPatrimonio')"
    />
    <StatCard
      label="Renda Mensal"
      :value="formatCurrency(totalRenda)"
      :is-hidden="isHidden"
      show-add
      @add="$emit('addRenda')"
    />
    <StatCard
      label="Despesas Mensais"
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
