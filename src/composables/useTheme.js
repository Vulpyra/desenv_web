import { ref } from 'vue'
import { palettes, DEFAULT_PALETTE_ID } from '@/config/palettes'

/**
 * Tema/paleta de cores (salvo SOMENTE no localStorage).
 *
 * Separa "pintar" de "salvar":
 *  - previewPalette(id): pinta as variáveis em <html> para o usuário VER, sem salvar.
 *  - commitPalette(): salva no localStorage a paleta atualmente pintada (botão Salvar).
 *  - revertPalette(): descarta o preview e repinta a última paleta salva (ao sair sem salvar).
 *
 * `savedId` = paleta persistida; `activeId` = paleta pintada na tela agora.
 */

const STORAGE = 'rf_palette'

const loadSavedId = () => {
  try { return localStorage.getItem(STORAGE) || DEFAULT_PALETTE_ID } catch { return DEFAULT_PALETTE_ID }
}

const findPalette = (id) =>
  palettes.find((p) => p.id === id) ||
  palettes.find((p) => p.id === DEFAULT_PALETTE_ID) ||
  palettes[0]

// Refs singleton compartilhados por todos os consumidores
const savedId = ref(loadSavedId())
const activeId = ref(savedId.value)

const paintVars = (id) => {
  const p = findPalette(id)
  const root = document.documentElement
  for (const [key, value] of Object.entries(p.vars)) {
    root.style.setProperty(key, value)
  }
  activeId.value = p.id
}

export const applyStoredPalette = () => {
  savedId.value = loadSavedId()
  paintVars(savedId.value)
}

export function useTheme() {
  const previewPalette = (id) => paintVars(id)

  const commitPalette = () => {
    savedId.value = activeId.value
    try { localStorage.setItem(STORAGE, savedId.value) } catch { /* armazenamento indisponível */ }
  }

  // Revert: descarta preview e repinta a última paleta salva
  const revertPalette = () => paintVars(savedId.value)

  return { palettes, savedId, activeId, previewPalette, commitPalette, revertPalette }
}
