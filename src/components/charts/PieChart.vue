<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import GlossaryTerm from '@/components/common/GlossaryTerm.vue'
import { useCurrency } from '@/composables/useCurrency'

const props = defineProps({
  data: {
    type: Array,
    default: () => [45, 55]
  },
  labels: {
    type: Array,
    default: () => ['Não dedutível', 'Dedutível']
  },
  title: {
    type: String,
    default: 'Gráfico de Renda'
  },
  titleHint: {
    type: String,
    default: 'Mostra a divisão entre despesas e saldo com base nos valores atuais.'
  },
  centerValue: {
    type: Number,
    default: null
  }
})

const { formatCurrency } = useCurrency()

const canvasRef = ref(null)
let chartInstance = null

const percentages = computed(() => {
  const total = props.data.reduce((a, b) => a + b, 0)
  if (total <= 0) return props.data.map(() => 0)
  return props.data.map(v => Math.round((v / total) * 100))
})

const buildChart = () => {
  if (!canvasRef.value || typeof Chart === 'undefined') return
  if (chartInstance) { chartInstance.destroy(); chartInstance = null }

  const rootStyles = getComputedStyle(document.documentElement)
  const colorDanger = rootStyles.getPropertyValue('--danger-soft').trim() || 'rgba(255, 133, 153, 0.85)'
  const colorSaldo = rootStyles.getPropertyValue('--chart-b').trim() || 'rgba(113, 194, 217, 0.85)'
  const bgColor = rootStyles.getPropertyValue('--bg-mid').trim()
  const textMain = rootStyles.getPropertyValue('--text-main').trim() || '#e8f1fa'
  const textSoft = rootStyles.getPropertyValue('--text-soft').trim() || 'rgba(151,171,199,0.7)'

  const centerTextPlugin = {
    id: 'centerText',
    afterDraw(chart) {
      if (props.centerValue == null) return
      const { ctx, chartArea: { top, bottom, left, right } } = chart
      const cx = (left + right) / 2
      const cy = (top + bottom) / 2
      ctx.save()
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = textSoft
      ctx.font = '500 11px system-ui, sans-serif'
      ctx.fillText('Renda Total', cx, cy - 13)
      ctx.fillStyle = textMain
      ctx.font = 'bold 14px system-ui, sans-serif'
      ctx.fillText(formatCurrency(props.centerValue), cx, cy + 10)
      ctx.restore()
    }
  }

  chartInstance = new Chart(canvasRef.value.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: props.labels,
      datasets: [{
        data: props.data,
        backgroundColor: [colorDanger, colorSaldo],
        borderWidth: 3,
        borderColor: bgColor
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '75%',
      plugins: { legend: { display: false } }
    },
    plugins: [centerTextPlugin]
  })
}

const updateChart = () => {
  if (!chartInstance) {
    buildChart()
    return
  }
  chartInstance.data.labels = [...props.labels]
  chartInstance.data.datasets[0].data = [...props.data]
  chartInstance.update()
}

onMounted(buildChart)
watch(() => props.data, updateChart, { deep: true })
watch(() => props.centerValue, () => { if (chartInstance) chartInstance.update() })
</script>

<template>
  <div class="chart-section">
    <div class="panel-header" style="margin-bottom: 18px">
      <GlossaryTerm :term="title" :explanation="titleHint" />
    </div>
    <div class="chart-container" style="position: relative; height: 220px; width: 100%; margin: 0 auto;">
      <canvas ref="canvasRef"></canvas>
    </div>
    <div class="chart-labels">
      <div class="label-item right">
        <p>{{ labels[1] }}</p>
        <span style="color: var(--danger-soft)">{{ percentages[0] }}%</span>
      </div>
      <div class="label-item left">
        <p>{{ labels[0] }}</p>
        <span style="color: var(--accent-cyan)">{{ percentages[1] }}%</span>
      </div>
    </div>
  </div>
</template>
