<script setup>
import { computed } from 'vue'
import { useCurrency } from '@/composables/useCurrency'

const props = defineProps({
  isOpen: Boolean,
  meta: { type: Object, default: null },
  aportes: { type: Array, default: () => [] },
  cycleLabel: { type: String, default: '' },
  isHidden: Boolean
})

const emit = defineEmits(['close', 'remove'])

const { formatCurrency } = useCurrency()

const total = computed(() => props.aportes.reduce((a, d) => a + Number(d.valor), 0))

const fmtDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = String(iso).split('-')
  return `${d}/${m}/${y.slice(2)}`
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen && meta"
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Investimentos da meta"
      @click.self="emit('close')"
    >
      <div class="glass-panel modal-content invest-modal">
        <div class="modal-header">
          <h3 class="panel-title" style="margin: 0">Aportes · {{ meta.nome }}</h3>
          <button class="btn-icon-edit" @click="emit('close')" title="Fechar">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="modal-body">
          <div class="invest-summary">
            <div>
              <span class="panel-eyebrow">Aportes em {{ cycleLabel }}</span>
              <div class="item-sub">
                contam no gráfico "Livre para gastar" deste ciclo
              </div>
            </div>
            <strong
              class="hide-value"
              :class="{ 'value-hidden': isHidden }"
              style="color: var(--accent-sky)"
            >{{ formatCurrency(total) }}</strong>
          </div>

          <ul class="invest-list">
            <li v-for="a in aportes" :key="a.id">
              <div class="entry-text">
                <span>{{ a.nome }}</span>
                <span class="item-sub">{{ fmtDate(a.data) }}</span>
              </div>
              <span
                class="value hide-value"
                :class="{ 'value-hidden': isHidden }"
                style="color: var(--accent-sky)"
              >{{ formatCurrency(a.valor) }}</span>
              <button
                class="cancel-sub"
                title="Desfazer este aporte (o valor volta para o livre e sai da meta)"
                @click="emit('remove', a.id)"
              >
                Desfazer
              </button>
            </li>
            <p v-if="!aportes.length" class="panel-empty">
              Nenhum aporte neste ciclo.
            </p>
          </ul>

          <p class="import-hint">
            Desfazer um aporte devolve o valor ao "livre para gastar" e desconta o
            progresso da meta.
          </p>
        </div>

        <div class="modal-actions">
          <button class="btn-outline" style="padding: 10px 20px" @click="emit('close')">
            Fechar
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
