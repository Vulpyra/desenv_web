import { ref, watch } from 'vue'

const STORAGE_KEY = 'dashboardData'

export function useLocalStorage() {
  const loadData = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : null
    } catch (e) {
      console.warn('localStorage unavailable, using memory fallback:', e)
      return null
    }
  }

  const saveData = (data) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.error('localStorage quota exceeded. Data too large:', e)
      } else {
        console.error('Failed to save to localStorage:', e)
      }
    }
  }

  const clearData = () => {
    localStorage.removeItem(STORAGE_KEY)
  }

  return { loadData, saveData, clearData }
}
