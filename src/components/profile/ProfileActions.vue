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
      class="btn-save"
      :disabled="isLoading"
      @click="$emit('save')"
    >
      <span v-if="isLoading">Salvando...</span>
      <span v-else>Salvar Alterações</span>
    </button>
    <button
      class="btn-delete"
      :disabled="isLoading"
      @click="$emit('delete')"
    >
      Excluir Conta
    </button>
  </section>
</template>
