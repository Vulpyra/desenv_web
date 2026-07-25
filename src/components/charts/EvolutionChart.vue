<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useCurrency } from '@/composables/useCurrency'
import GlossaryTerm from '@/components/common/GlossaryTerm.vue'

const props = defineProps({
  labels: Array,
  data: Array,
  subtitle: String,
  isHidden: Boolean
})

const { formatCurrency } = useCurrency()

const patrimonioAtual = computed(() =>
  props.data && props.data.length ? props.data[props.data.length - 1] : null
)

const delta = computed(() =>
  props.data && props.data.length > 1
    ? props.data[props.data.length - 1] - props.data[props.data.length - 2]
    : null
)
const canvasRef = ref(null)
let chartInstance = null

const initChart = () => {
  if (!canvasRef.value || typeof Chart === 'undefined') return
  if (chartInstance) chartInstance.destroy()
  if (props.labels.length === 0) return

  const ctx = canvasRef.value.getContext('2d')
  const rootStyles = getComputedStyle(document.documentElement)
  const colorB = rootStyles.getPropertyValue('--chart-b').trim()
  const bgColor = rootStyles.getPropertyValue('--bg-mid').trim()
  const textColor = rootStyles.getPropertyValue('--text-main').trim()

  const gradientFill = ctx.createLinearGradient(0, 0, 0, 300)
  gradientFill.addColorStop(0, 'rgba(113, 194, 217, 0.4)')
  gradientFill.addColorStop(1, 'rgba(113, 194, 217, 0.0)')

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: props.labels,
      datasets: [{
        label: 'Patrimônio',
        data: props.data,
        borderColor: colorB,
        backgroundColor: gradientFill,
        borderWidth: 3,
        pointBackgroundColor: bgColor,
        pointBorderColor: colorB,
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(10, 22, 52, 0.85)',
          titleColor: textColor,
          bodyColor: textColor,
          callbacks: {
            title: (context) => `Mês: ${context[0].label}`,
            label: (context) => ' ' + formatCurrency(context.parsed.y)
          }
        }
      },
      scales: {
        y: {
          grid: { color: 'rgba(170, 204, 238, 0.05)' },
          ticks: {
            color: 'rgba(151, 171, 199, 0.7)',
            callback: (v) => {
              if (v >= 1000000) return v / 1000000 + 'M'
              if (v >= 1000) return v / 1000 + 'k'
              return v
            }
          }
        },
        x: {
          grid: { display: false },
          ticks: { color: 'rgba(151, 171, 199, 0.7)' }
        }
      }
    }
  })
}

const updateChart = () => {
  if (!chartInstance) {
    initChart()
    return
  }
  chartInstance.data.labels = [...props.labels]
  chartInstance.data.datasets[0].data = [...props.data]
  chartInstance.update()
}

onMounted(initChart)
watch(() => props.labels, updateChart, { deep: true })
watch(() => props.data, updateChart, { deep: true })

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
})
</script>

<template>
  <div class="glass-panel evolution-panel">
    <div class="panel-header">
      <GlossaryTerm
        term="Evolução Patrimonial"
        explanation="Acompanhe como seu patrimônio muda ao longo dos ciclos, até o ciclo selecionado."
      />
      <span
        v-if="delta !== null"
        class="evolution-delta hide-value"
        :class="{ 'value-hidden': isHidden }"
        :style="{ color: delta >= 0 ? 'var(--accent-cyan)' : 'var(--danger-soft)' }"
      >
        {{ delta >= 0 ? '+' : '−' }} {{ formatCurrency(Math.abs(delta)) }}
      </span>
    </div>
    <div v-if="patrimonioAtual !== null" style="margin-bottom: 14px">
      <div class="big-number hide-value" :class="{ 'value-hidden': isHidden }">
        {{ formatCurrency(patrimonioAtual) }}
      </div>
      <p class="panel-hint">acumulado até {{ subtitle || 'o ciclo atual' }}</p>
    </div>
    <div class="chart-container" style="position: relative; height: 250px; width: 100%">
      <canvas ref="canvasRef"></canvas>
    </div>
  </div>
</template>
