<script setup>
import { ref, nextTick } from 'vue'

const props = defineProps({
  id: { type: String, required: true },
  title: { type: String, default: '' },
  minimized: Boolean,
  isDragging: Boolean,
  isFirst: Boolean,
  isLast: Boolean
})

const emit = defineEmits(['toggle', 'handledown', 'move', 'rename'])

// Só inicia o arraste com o botão principal do mouse (touch é ignorado no composable)
const onBarDown = (e) => {
  if (editing.value) return
  emit('handledown', e)
}

// ---- Renomear painel ----
const editing = ref(false)
const draft = ref('')
const inputRef = ref(null)

const startEdit = async () => {
  draft.value = props.title
  editing.value = true
  await nextTick()
  inputRef.value?.focus()
  inputRef.value?.select()
}

const commit = () => {
  if (!editing.value) return
  editing.value = false
  if (draft.value.trim() !== props.title) emit('rename', draft.value)
}

const cancel = () => { editing.value = false }
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

      <input
        v-if="editing"
        ref="inputRef"
        v-model="draft"
        class="dpanel-rename"
        maxlength="40"
        placeholder="Nome do painel"
        @pointerdown.stop
        @click.stop
        @keydown.enter.prevent="commit"
        @keydown.esc.prevent="cancel"
        @blur="commit"
      />
      <span
        v-else
        class="dpanel-name"
        title="Clique duas vezes para renomear"
        @dblclick.stop="startEdit"
      >{{ title }}</span>

      <button
        v-if="!editing"
        class="dpanel-btn"
        title="Renomear painel"
        aria-label="Renomear painel"
        @pointerdown.stop
        @click.stop="startEdit"
      >
        <i class="fas fa-pen"></i>
      </button>

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
