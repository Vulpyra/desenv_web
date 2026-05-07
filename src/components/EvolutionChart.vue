<script setup>
import { ref, onMounted, watch } from 'vue'
import { useCurrency } from '@/composables/useCurrency'

const props = defineProps({
  labels: Array,
  data: Array
})

const emit = defineEmits(['addMes', 'clear'])

const { formatCurrency } = useCurrency()
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

onMounted(initChart)
watch(() => [props.labels, props.data], initChart, { deep: true })
</script>

<template>
  <div class="glass-panel evolution-panel">
    <div class="panel-header">
      <h3 class="panel-title">Evolução Patrimonial</h3>
      <div style="display: flex; gap: 8px">
        <button class="btn-add" @click="$emit('addMes')" title="Adicionar Mês">
          <i class="fas fa-plus"></i>
        </button>
        <button
          class="btn-add"
          @click="$emit('clear')"
          title="Limpar Gráfico"
          style="color: var(--danger-soft); border-color: rgba(255, 133, 153, 0.3); background: rgba(255, 133, 153, 0.1)"
        >
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    </div>
    <div class="chart-container" style="position: relative; height: 250px; width: 100%">
      <canvas ref="canvasRef"></canvas>
    </div>
  </div>
</template>
