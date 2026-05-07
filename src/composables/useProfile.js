import { ref } from 'vue'

const DEFAULT_PROFILE = {
  name: 'Usuário',
  email: 'usuario@email.com',
  avatar: null,
  createdAt: '2024-01-15'
}

const DEFAULT_PREFERENCES = {
  currency: 'BRL',
  theme: 'dark',
  notifications: true,
  hideValues: false
}

export function useProfile() {
  const profile = ref({ ...DEFAULT_PROFILE })
  const preferences = ref({ ...DEFAULT_PREFERENCES })
  const isLoading = ref(false)
  const error = ref(null)

  const updateProfile = async (data) => {
    isLoading.value = true
    error.value = null
    try {
      // TODO: Integrar com API
      profile.value = { ...profile.value, ...data }
      return { success: true }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  const updatePreferences = async (data) => {
    isLoading.value = true
    error.value = null
    try {
      // TODO: Integrar com API ou localStorage
      preferences.value = { ...preferences.value, ...data }
      return { success: true }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  const saveAll = async () => {
    isLoading.value = true
    error.value = null
    try {
      // TODO: Salvar no backend
      await new Promise(resolve => setTimeout(resolve, 500))
      return { success: true }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  const deleteAccount = async () => {
    // TODO: Implementar exclusão de conta
    return { success: false, message: 'Funcionalidade não implementada' }
  }

  return {
    profile,
    preferences,
    isLoading,
    error,
    updateProfile,
    updatePreferences,
    saveAll,
    deleteAccount
  }
}
