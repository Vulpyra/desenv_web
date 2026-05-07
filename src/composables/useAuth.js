import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const isLoading = ref(false)
  const error = ref(null)

  const signUp = async (email, password) => {
    isLoading.value = true
    error.value = null
    try {
      const { error: err } = await supabase.auth.signUp({ email, password })
      if (err) throw err
      return { success: true }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  const signIn = async (email, password) => {
    isLoading.value = true
    error.value = null
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) throw err
      return { success: true }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  const signOut = async () => {
    isLoading.value = true
    error.value = null
    try {
      const { error: err } = await supabase.auth.signOut()
      if (err) throw err
      return { success: true }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }

  return { isLoading, error, signUp, signIn, signOut, getSession }
}
