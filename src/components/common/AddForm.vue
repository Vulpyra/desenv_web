<script setup>
import { ref } from 'vue'

/**
 * Formulário de adição recolhido por padrão: mostra só um "+ Título" e abre os
 * campos quando clicado. Mantém a interface limpa quando há vários formulários
 * no mesmo painel.
 */
defineProps({
  title: { type: String, required: true },
  submitLabel: { type: String, default: 'Adicionar' }
})

const emit = defineEmits(['submit'])

const open = ref(false)
const toggle = () => { open.value = !open.value }

const submit = () => {
  emit('submit')
  // Mantém aberto para lançamentos em sequência
}
</script>

<template>
  <div class="add-form" :class="{ 'add-form--open': open }">
    <button
      class="add-form-toggle"
      type="button"
      :aria-expanded="open"
      @click="toggle"
    >
      <span class="add-form-plus"><i class="fas" :class="open ? 'fa-minus' : 'fa-plus'"></i></span>
      <span class="add-form-title">{{ title }}</span>
      <i class="fas add-form-caret" :class="open ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
    </button>

    <div v-if="open" class="add-form-body">
      <div class="add-grid">
        <slot />
      </div>
      <button class="add-submit" type="button" @click="submit">
        <i class="fas fa-check"></i> {{ submitLabel }}
      </button>
    </div>
  </div>
</template>
