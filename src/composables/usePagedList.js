import { ref, computed } from 'vue'

/**
 * Paginação leve para listas longas.
 *
 * Só entra em ação acima de `threshold` itens — abaixo disso a lista é devolvida
 * inteira e o rodapé de paginação nem aparece. Tudo é computed (fatia de array),
 * então não há custo perceptível em telas pequenas.
 */
export const PER_PAGE_MIN = 5
export const PER_PAGE_MAX = 15

export function usePagedList(itemsRef, { threshold = 15, defaultPerPage = 10 } = {}) {
  const page = ref(1)
  const perPage = ref(defaultPerPage)

  const total = computed(() => itemsRef.value.length)
  const needsPaging = computed(() => total.value > threshold)

  const totalPages = computed(() =>
    needsPaging.value ? Math.max(1, Math.ceil(total.value / perPage.value)) : 1
  )

  // Mantém a página dentro do intervalo mesmo se a lista encolher (ex.: filtro)
  const safePage = computed(() => Math.min(Math.max(page.value, 1), totalPages.value))

  const paged = computed(() => {
    if (!needsPaging.value) return itemsRef.value
    const start = (safePage.value - 1) * perPage.value
    return itemsRef.value.slice(start, start + perPage.value)
  })

  const setPage = (p) => {
    const n = parseInt(p, 10)
    page.value = isNaN(n) ? 1 : Math.min(Math.max(n, 1), totalPages.value)
  }

  const setPerPage = (n) => {
    const v = parseInt(n, 10)
    perPage.value = isNaN(v) ? defaultPerPage : Math.min(Math.max(v, PER_PAGE_MIN), PER_PAGE_MAX)
    page.value = 1
  }

  return { paged, page: safePage, perPage, total, totalPages, needsPaging, setPage, setPerPage }
}
