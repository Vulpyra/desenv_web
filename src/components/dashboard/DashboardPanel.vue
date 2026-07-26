<script setup>
defineProps({
  id: { type: String, required: true },
  title: { type: String, default: '' },
  minimized: Boolean,
  isDragging: Boolean
})

const emit = defineEmits(['toggle', 'handledown'])

// Só inicia o arraste com o botão principal do mouse / toque
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
      <span class="dpanel-name" :class="{ 'dpanel-name--always': minimized }">{{ title }}</span>
      <span class="dpanel-grip" title="Arraste para reordenar" aria-hidden="true">
        <i class="fas fa-grip"></i>
      </span>
    </div>
    <div v-show="!minimized" class="dpanel-slot">
      <slot />
    </div>
  </div>
</template>
