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

      const [{ data: profileData }, { data: prefsData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('preferencias').select('*').eq('usuario_id', user.id).single()
      ])

      profile.value = profileData
        ? { ...profileData, email: user.email }
        : { ...DEFAULT_PROFILE, email: user.email, criado_em: user.created_at }

      if (prefsData) {
        preferences.value = {
          moeda: prefsData.moeda ?? DEFAULT_PREFERENCES.moeda,
          tema: prefsData.tema ?? DEFAULT_PREFERENCES.tema,
          notificacoes: prefsData.notificacoes ?? DEFAULT_PREFERENCES.notificacoes,
          ocultar_valores: prefsData.ocultar_valores ?? DEFAULT_PREFERENCES.ocultar_valores,
        }
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

      const { nome, avatar_url } = data
      const { moeda, tema, notificacoes, ocultar_valores } = preferences.value
      const { error: err } = await supabase
        .from('profiles')
        .upsert({ id: user.id, nome, avatar_url, moeda, tema, notificacoes, ocultar_valores, atualizado_em: new Date().toISOString() })

      if (err) throw err
      profile.value = { ...profile.value, nome, avatar_url }
      return { success: true }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  const updatePreferences = (data) => {
    preferences.value = { ...preferences.value, ...data }
    return { success: true }
  }

  const saveAll = async () => {
    const res = await updateProfile(profile.value)
    if (!res.success) return { success: false, error: error.value }
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
