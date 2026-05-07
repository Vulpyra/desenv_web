<script setup>
import { ref, watch, nextTick } from 'vue'
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

watch(() => props.fields, (newFields) => {
  inputValues.value = newFields.map(f => f.value || '')
}, { immediate: true })

watch(() => props.isOpen, (open) => {
  if (open) {
    nextTick(() => {
      inputRefs.value[0]?.focus()
    })
  }
})

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
  <div v-if="isOpen" class="modal-overlay" @click.self="cancel">
    <div class="glass-panel modal-content">
      <h3 class="panel-title">{{ title }}</h3>
      <div class="modal-body">
        <input
          v-for="(field, index) in fields"
          :key="index"
          ref="el => { if (el) inputRefs[index] = el }"
          v-model="inputValues[index]"
          :type="field.isCurrency ? 'text' : 'text'"
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
