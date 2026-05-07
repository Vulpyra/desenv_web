<script setup>
import { useCurrency } from '@/composables/useCurrency'

const props = defineProps({
  transacao: Object,
  isHidden: Boolean
})

const emit = defineEmits(['remove'])

const { formatCurrency } = useCurrency()

const isPositive = props.transacao.tipo === 'renda'
const sinal = isPositive ? '+' : '-'
const classeCor = isPositive ? 'positive' : 'negative'
</script>

<template>
  <li class="transaction-item">
    <div class="transaction-info">
      <span class="transaction-title">{{ transacao.nome }}</span>
      <span class="transaction-date">{{ transacao.data }}</span>
    </div>
    <div style="display: flex; align-items: center; gap: 12px">
      <span 
        class="transaction-value"
        :class="[classeCor, { 'value-hidden': isHidden }]"
      >
        {{ sinal }} {{ formatCurrency(transacao.valor) }}
      </span>
      <button
        class="btn-remove"
        @click="$emit('remove', transacao.id)"
        style="padding: 2px"
        title="Apagar e Estornar"
      >
        <i class="fas fa-trash" style="font-size: 0.85rem"></i>
      </button>
    </div>
  </li>
</template>
