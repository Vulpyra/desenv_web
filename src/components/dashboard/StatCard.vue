<script setup>
defineProps({
  label: String,
  value: String,
  variant: {
    type: String,
    default: 'default' // 'default', 'danger'
  },
  showEdit: Boolean,
  showAdd: Boolean,
  showClear: Boolean,
  showAddExpense: Boolean,
  mutedLabel: String,
  progress: Number,
  isHidden: Boolean
})

defineEmits(['edit', 'add', 'clear', 'addExpense'])
</script>

<template>
  <div class="stat-card">
    <div class="card-header-actions">
      <span class="label">
        {{ label }}
        <span v-if="mutedLabel" class="label-muted">({{ mutedLabel }})</span>
      </span>
      <div class="actions" style="display: flex; gap: 4px">
        <button
          v-if="showClear"
          class="btn-icon-edit"
          style="color: var(--danger-soft)"
          @click="$emit('clear')"
          title="Zerar"
        >
          <i class="fas fa-trash-alt"></i>
        </button>
        <button
          v-if="showAdd || showAddExpense"
          class="btn-icon-edit"
          @click="showAdd ? $emit('add') : $emit('addExpense')"
          :title="showAdd ? 'Adicionar' : 'Despesa Avulsa'"
        >
          <i class="fas fa-plus"></i>
        </button>
        <button
          v-if="showEdit"
          class="btn-icon-edit"
          @click="$emit('edit')"
          title="Editar"
        >
          <i class="fas fa-pencil-alt"></i>
        </button>
      </div>
    </div>
    <span 
      class="value hide-value"
      :class="{ 'value-hidden': isHidden }"
      :style="variant === 'danger' ? { color: 'var(--danger-soft)' } : {}"
    >
      {{ value }}
      <slot name="suffix"></slot>
    </span>
    <div v-if="progress !== undefined" class="progress-container">
      <div class="progress-bar" :style="{ width: progress + '%' }"></div>
    </div>
  </div>
</template>
