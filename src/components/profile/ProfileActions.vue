<script setup>
defineProps({
  isLoading: {
    type: Boolean,
    default: false
  }
})

defineEmits(['save', 'delete'])
</script>

<template>
  <section class="profile-actions">
    <button
      class="btn-primary"
      :disabled="isLoading"
      @click="$emit('save')"
    >
      <span v-if="isLoading">Salvando...</span>
      <span v-else>Salvar Alterações</span>
    </button>
    <button
      class="btn-danger"
      :disabled="isLoading"
      @click="$emit('delete')"
    >
      Excluir Conta
    </button>
  </section>
</template>

<style scoped>
.profile-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-primary {
  padding: 12px 24px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(90deg, var(--accent-6), var(--accent-7));
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 188, 212, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-danger {
  padding: 12px 24px;
  border-radius: 10px;
  border: 1px solid var(--danger-soft);
  background: transparent;
  color: var(--danger-soft);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-danger:hover:not(:disabled) {
  background: var(--danger-soft);
  color: white;
}

.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 600px) {
  .profile-actions {
    flex-direction: column;
  }
}
</style>
