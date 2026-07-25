<script setup>
defineProps({
  label: String,
  isCurrent: Boolean
})

defineEmits(['prev', 'next', 'reset'])
</script>

<template>
  <div class="cycle-pill" role="group" aria-label="Seleção de ciclo">
    <button class="cycle-btn" @click="$emit('prev')" title="Ciclo anterior" aria-label="Ciclo anterior">
      <i class="fas fa-chevron-left"></i>
    </button>
    <span class="cycle-label">{{ label }}</span>
    <button class="cycle-btn" @click="$emit('next')" title="Próximo ciclo" aria-label="Próximo ciclo">
      <i class="fas fa-chevron-right"></i>
    </button>
    <button
      v-if="!isCurrent"
      class="cycle-btn cycle-reset"
      @click="$emit('reset')"
      title="Voltar ao ciclo atual"
      aria-label="Voltar ao ciclo atual"
    >
      <i class="fas fa-rotate-left"></i>
    </button>
  </div>
</template>
