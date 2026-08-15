import { ref } from 'vue'

//Gerencia o reordenamento sob demanda de cada painel no dashboard.
const STORAGE = 'rf_panelLayout_v1'

export function usePanelLayout(defaultOrder) {
  const loadSaved = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE)) || {} } catch { return {} }
  }
  const saved = loadSaved()

  // Reconcilia a ordem salva com os painéis atuais (remove os que sumiram,
  // adiciona os novos ao final).
  const reconcile = (savedOrder) => {
    const valid = (savedOrder || []).filter((id) => defaultOrder.includes(id))
    const missing = defaultOrder.filter((id) => !valid.includes(id))
    return [...valid, ...missing]
  }

  const order = ref(reconcile(saved.order))
  const minimized = ref(new Set(saved.minimized || []))
  const dragId = ref(null)
  const preview = ref({ x: 0, y: 0, ox: 0, oy: 0, w: 0, h: 0, title: '' })

  const persist = () => {
    try {
      localStorage.setItem(
        STORAGE,
        JSON.stringify({ order: order.value, minimized: [...minimized.value] })
      )
    } catch { /* armazenamento indisponível */ }
  }

  const isMinimized = (id) => minimized.value.has(id)
  const toggleMinimize = (id) => {
    const s = new Set(minimized.value)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    minimized.value = s
    persist()
  }

  // O trabalho pesado do arraste (elementFromPoint força layout) roda no máximo
  // uma vez por frame via requestAnimationFrame, evitando travar em pointermove.
  let rafId = null
  let lastEvent = null

  const processMove = () => {
    rafId = null
    const e = lastEvent
    if (!e || !dragId.value) return
    preview.value = { ...preview.value, x: e.clientX, y: e.clientY }

    const el = document.elementFromPoint(e.clientX, e.clientY)
    const target = el && el.closest ? el.closest('[data-panel-id]') : null
    if (!target) return
    const overId = target.getAttribute('data-panel-id')
    if (!overId || overId === dragId.value) return

    const rect = target.getBoundingClientRect()
    const after = e.clientX > rect.left + rect.width / 2

    const without = order.value.filter((id) => id !== dragId.value)
    let idx = without.indexOf(overId)
    if (idx === -1) return
    if (after) idx += 1
    without.splice(idx, 0, dragId.value)

    const changed =
      without.length !== order.value.length ||
      without.some((id, k) => id !== order.value[k])
    if (changed) order.value = without
  }

  const onMove = (e) => {
    if (!dragId.value) return
    lastEvent = e
    if (rafId == null) rafId = requestAnimationFrame(processMove)
  }

  const onUp = () => {
    dragId.value = null
    if (rafId != null) { cancelAnimationFrame(rafId); rafId = null }
    lastEvent = null
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
    document.body.classList.remove('dragging-panel')
    persist()
  }

  const onHandleDown = (e, id, title) => {
    // No touch o reordenar é por botões (setas), evitando conflito com o scroll
    if (e.pointerType === 'touch') return
    if (e.button != null && e.button !== 0) return
    const panelEl = e.currentTarget?.closest?.('[data-panel-id]')
    if (!panelEl) return
    const rect = panelEl.getBoundingClientRect()
    dragId.value = id
    preview.value = {
      x: e.clientX, y: e.clientY,
      ox: e.clientX - rect.left, oy: e.clientY - rect.top,
      w: rect.width, h: rect.height, title
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    document.body.classList.add('dragging-panel')
    e.preventDefault()
  }

  // Reordenar por botão (mobile): move o painel ±1 na ordem
  const movePanel = (id, dir) => {
    const i = order.value.indexOf(id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= order.value.length) return
    const next = [...order.value]
    ;[next[i], next[j]] = [next[j], next[i]]
    order.value = next
    persist()
  }

  return { order, dragId, preview, isMinimized, toggleMinimize, onHandleDown, movePanel }
}
