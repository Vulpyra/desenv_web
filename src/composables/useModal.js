import { ref } from 'vue'

export function useModal() {
  const isOpen = ref(false)
  const title = ref('')
  const fields = ref([])
  const message = ref('')
  const resolvePromise = ref(null)
  const inputValues = ref([])

  const open = (modalTitle, modalFields = [], modalMessage = '') => {
    title.value = modalTitle
    fields.value = modalFields
    message.value = modalMessage
    inputValues.value = modalFields.map(f => f.value || '')
    isOpen.value = true
    
    return new Promise((resolve) => {
      resolvePromise.value = resolve
    })
  }

  const confirm = () => {
    if (resolvePromise.value) {
      resolvePromise.value({ confirmed: true, values: inputValues.value })
    }
    close()
  }

  const cancel = () => {
    if (resolvePromise.value) {
      resolvePromise.value({ confirmed: false, values: null })
    }
    close()
  }

  const close = () => {
    isOpen.value = false
    title.value = ''
    fields.value = []
    message.value = ''
    resolvePromise.value = null
  }

  return {
    isOpen,
    title,
    fields,
    message,
    inputValues,
    open,
    confirm,
    cancel,
    close
  }
}
