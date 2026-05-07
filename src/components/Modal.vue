<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useCurrency } from '@/composables/useCurrency'

const props = defineProps({
  isOpen: Boolean,
  title: String,
  fields: Array
})

const emit = defineEmits(['confirm', 'cancel'])

const { maskCurrency, parseCurrency } = useCurrency()
const inputValues = ref([])
const inputRefs = ref([])
const previouslyFocused = ref(null)
const modalRef = ref(null)

watch(() => props.fields, (newFields) => {
  inputValues.value = newFields.map(f => f.value || '')
}, { immediate: true })

watch(() => props.isOpen, (open) => {
  if (open) {
    previouslyFocused.value = document.activeElement
    nextTick(() => {
      const firstInput = document.querySelector('.modal-input')
      firstInput?.focus()
    })
  } else if (previouslyFocused.value) {
    previouslyFocused.value.focus()
    previouslyFocused.value = null
  }
})

const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    e.preventDefault()
    cancel()
  }
  if (e.key === 'Enter' && !e.shiftKey) {
    const inputs = document.querySelectorAll('.modal-input')
    const lastInput = inputs[inputs.length - 1]
    if (document.activeElement === lastInput || inputs.length === 1) {
      e.preventDefault()
      confirm()
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

const setItemRef = (el, index) => {
  if (el) {
    inputRefs.value[index] = el
  }
}

const handleInput = (event, index) => {
  if (props.fields[index].isCurrency) {
    maskCurrency(event)
    inputValues.value[index] = event.target.value
  }
}

const confirm = () => {
  const values = inputValues.value.map((val, i) => {
    if (props.fields[i].isCurrency) {
      return parseCurrency(val)
    }
    return val.trim()
  })
  emit('confirm', values)
}

const cancel = () => {
  emit('cancel')
}
</script>

<template>
  <div v-if="isOpen" ref="modalRef" class="modal-overlay" @click.self="cancel" role="dialog" aria-modal="true" :aria-label="title">
    <div class="glass-panel modal-content">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px">
        <h3 class="panel-title" style="margin: 0">{{ title }}</h3>
        <button class="btn-icon-edit" @click="cancel" aria-label="Fechar modal" title="Fechar (Esc)">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <input
          v-for="(field, index) in fields"
          :key="index"
          :ref="(el) => setItemRef(el, index)"
          v-model="inputValues[index]"
          type="text"
          :placeholder="field.placeholder"
          class="modal-input"
          @input="handleInput($event, index)"
        />
      </div>
      <div class="modal-actions">
        <button class="btn-outline" style="padding: 10px 20px" @click="cancel">
          Cancelar
        </button>
        <button class="btn-main-action" style="padding: 10px 20px; font-size: 1rem; width: auto" @click="confirm">
          Confirmar
        </button>
      </div>
    </div>
  </div>
</template>
