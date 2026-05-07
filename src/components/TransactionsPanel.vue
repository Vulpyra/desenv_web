<script setup>
import TransactionItem from './TransactionItem.vue'

defineProps({
  transacoes: Array,
  isHidden: Boolean
})

defineEmits(['clear', 'remove'])
</script>

<template>
  <div class="glass-panel transactions-panel">
    <div class="panel-header">
      <h3 class="panel-title">Transações Recentes</h3>
      <button
        class="btn-add"
        @click="$emit('clear')"
        title="Limpar Histórico"
        style="color: var(--danger-soft); border-color: rgba(255, 133, 153, 0.3); background: rgba(255, 133, 153, 0.1)"
      >
        <i class="fas fa-broom"></i>
      </button>
    </div>
    <ul class="transaction-list">
      <TransactionItem
        v-for="transacao in transacoes"
        :key="transacao.id"
        :transacao="transacao"
        :is-hidden="isHidden"
        @remove="$emit('remove', $event)"
      />
      <p v-if="transacoes.length === 0" style="color: var(--text-soft); font-size: 0.9rem; text-align: center; margin-top: 30px">
        Nenhuma movimentação.
      </p>
    </ul>
  </div>
</template>
