<script setup>
import { computed } from 'vue'
import PieChart from '@/components/charts/PieChart.vue'
import GlossaryTerm from '@/components/common/GlossaryTerm.vue'
import { useCurrency } from '@/composables/useCurrency'

const props = defineProps({
  renda: Number,
  comprometido: Number,
  aportes: Number,
  livre: Number,
  isHidden: Boolean
})

const { formatCurrency } = useCurrency()

const chartData = computed(() => {
  const c = Math.max(props.comprometido, 0)
  const a = Math.max(props.aportes, 0)
  const l = Math.max(props.livre, 0)
  if (c === 0 && a === 0 && l === 0) return [1]
  return [c, a, l]
})

const chartLabels = computed(() =>
  chartData.value.length === 1 ? ['Sem dados'] : ['Comprometido', 'Metas', 'Livre']
)

const chartColors = computed(() =>
  chartData.value.length === 1 ? ['--glass-border'] : ['--danger-soft', '--accent-sky', '--accent-cyan']
)

const legend = computed(() => [
  { nome: 'Comprometido', valor: props.comprometido, colorVar: '--danger-soft' },
  { nome: 'Metas', valor: props.aportes, colorVar: '--accent-sky' },
  { nome: 'Livre', valor: props.livre, colorVar: '--accent-cyan' }
])
</script>

<template>
  <div class="chart-section flow-panel">
    <div class="panel-header" style="margin-bottom: 12px">
      <GlossaryTerm
        term="Livre para gastar"
        explanation="O que sobra da renda do ciclo depois das contas fixas e dos aportes em metas."
      />
    </div>

    <div
      class="big-number hide-value"
      :class="{ 'value-hidden': isHidden }"
      :style="{ color: livre < 0 ? 'var(--danger-soft)' : 'var(--accent-cyan)' }"
    >
      {{ formatCurrency(livre) }}
    </div>

    <PieChart
      bare
      :data="chartData"
      :labels="chartLabels"
      :color-vars="chartColors"
      :center-value="renda"
      center-label="Renda do ciclo"
      :show-legend="false"
      :is-hidden="isHidden"
      style="margin-top: 10px"
    />

    <div class="flow-legend">
      <div v-for="row in legend" :key="row.nome" class="legend-row">
        <span class="legend-name">
          <span class="legend-dot" :style="{ background: `var(${row.colorVar})` }"></span>
          {{ row.nome }}
        </span>
        <span
          class="legend-value hide-value"
          :class="{ 'value-hidden': isHidden }"
          :style="{ color: `var(${row.colorVar})` }"
        >
          {{ formatCurrency(row.valor) }}
        </span>
      </div>
    </div>
  </div>
</template>
