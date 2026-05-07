import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

const DEFAULT_PROFILE = {
  nome: 'Usuário',
  email: '',
  avatar_url: null,
  criado_em: null
}

const DEFAULT_PREFERENCES = {
  moeda: 'BRL',
  tema: 'dark',
  notificacoes: true,
  ocultar_valores: false
}

export function useProfile() {
  const profile = ref({ ...DEFAULT_PROFILE })
  const preferences = ref({ ...DEFAULT_PREFERENCES })
  const isLoading = ref(false)
  const error = ref(null)

  const load = async () => {
    isLoading.value = true
    error.value = null
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: profileData }, { data: prefData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('preferencias').select('*').eq('usuario_id', user.id).single()
      ])

      if (profileData) {
        profile.value = { ...profileData, email: user.email }
      } else {
        profile.value = { ...DEFAULT_PROFILE, email: user.email, criado_em: user.created_at }
      }

      if (prefData) {
        preferences.value = prefData
      }
    } catch (err) {
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  const updateProfile = async (data) => {
    isLoading.value = true
    error.value = null
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { success: false }

      const { error: err } = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...data, atualizado_em: new Date().toISOString() })

      if (err) throw err
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { success: false }

      const { error: err } = await supabase
        .from('preferencias')
        .upsert({ usuario_id: user.id, ...data })

      if (err) throw err
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
    const [resProfile, resPref] = await Promise.all([
      updateProfile(profile.value),
      updatePreferences(preferences.value)
    ])
    if (!resProfile.success || !resPref.success) {
      return { success: false, error: error.value }
    }
    return { success: true }
  }

  const deleteAccount = async () => {
    return { success: false, message: 'Funcionalidade não implementada' }
  }

  return {
    profile,
    preferences,
    isLoading,
    error,
    load,
    updateProfile,
    updatePreferences,
    saveAll,
    deleteAccount
  }
}
