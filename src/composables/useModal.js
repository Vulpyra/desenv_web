import { ref } from 'vue'

export function useModal() {
  const isOpen = ref(false)
  const title = ref('')
  const fields = ref([])
  const resolvePromise = ref(null)
  const inputValues = ref([])

  const open = (modalTitle, modalFields) => {
    title.value = modalTitle
    fields.value = modalFields
    inputValues.value = modalFields.map(f => f.value || '')
    isOpen.value = true
    
    return new Promise((resolve) => {
      resolvePromise.value = resolve
    })
  }

  const confirm = () => {
    if (resolvePromise.value) {
      resolvePromise.value(inputValues.value)
    }
    close()
  }

  const cancel = () => {
    if (resolvePromise.value) {
      resolvePromise.value(null)
    }
    close()
  }

  const close = () => {
    isOpen.value = false
    title.value = ''
    fields.value = []
    resolvePromise.value = null
  }

  return {
    isOpen,
    title,
    fields,
    inputValues,
    open,
    confirm,
    cancel,
    close
  }
}
