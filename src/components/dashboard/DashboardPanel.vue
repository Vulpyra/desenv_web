<script setup>
defineProps({
  id: { type: String, required: true },
  title: { type: String, default: '' },
  minimized: Boolean,
  isDragging: Boolean,
  isFirst: Boolean,
  isLast: Boolean
})

const emit = defineEmits(['toggle', 'handledown', 'move'])

// Só inicia o arraste com o botão principal do mouse (touch é ignorado no composable)
const onBarDown = (e) => {
  emit('handledown', e)
}
</script>

<template>
  <div
    class="dpanel"
    :data-panel-id="id"
    :class="{ 'dpanel--min': minimized, 'dpanel--ghost': isDragging }"
  >
    <div class="dpanel-bar" @pointerdown="onBarDown">
      <button
        class="dpanel-btn"
        :title="minimized ? 'Expandir' : 'Minimizar'"
        @pointerdown.stop
        @click.stop="emit('toggle')"
      >
        <i class="fas" :class="minimized ? 'fa-chevron-down' : 'fa-chevron-up'"></i>
      </button>
      <span class="dpanel-name">{{ title }}</span>

      <!-- Reordenar por setas (mobile / touch) -->
      <span class="dpanel-reorder">
        <button
          class="dpanel-btn"
          :disabled="isFirst"
          title="Mover para cima"
          aria-label="Mover painel para cima"
          @pointerdown.stop
          @click.stop="emit('move', -1)"
        >
          <i class="fas fa-arrow-up"></i>
        </button>
        <button
          class="dpanel-btn"
          :disabled="isLast"
          title="Mover para baixo"
          aria-label="Mover painel para baixo"
          @pointerdown.stop
          @click.stop="emit('move', 1)"
        >
          <i class="fas fa-arrow-down"></i>
        </button>
      </span>

      <span class="dpanel-grip" title="Arraste para reordenar" aria-hidden="true">
        <i class="fas fa-grip"></i>
      </span>
    </div>
    <div v-show="!minimized" class="dpanel-slot">
      <slot />
    </div>
  </div>
</template>
