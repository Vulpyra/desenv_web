<script setup>
import GoalItem from './GoalItem.vue'

defineProps({
  metas: Array,
  isHidden: Boolean
})

defineEmits(['add', 'remove'])
</script>

<template>
  <div class="glass-panel goals-panel">
    <div class="panel-header">
      <h3 class="panel-title">Metas Financeiras</h3>
      <button class="btn-add" @click="$emit('add')" title="Adicionar Meta">
        <i class="fas fa-plus"></i>
      </button>
    </div>
    <div style="display: flex; flex-direction: column; gap: 24px">
      <GoalItem
        v-for="meta in metas"
        :key="meta.id"
        :meta="meta"
        :is-hidden="isHidden"
        @remove="$emit('remove', $event)"
      />
      <p v-if="metas.length === 0" style="color: var(--text-soft); font-size: 0.9rem; text-align: center">
        Nenhuma meta cadastrada.
      </p>
    </div>
  </div>
</template>
