<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
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
  // Variáveis CSS usadas como cor de cada fatia, na ordem dos dados
  colorVars: {
    type: Array,
    default: () => ['--danger-soft', '--chart-b']
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
  },
  centerLabel: {
    type: String,
    default: 'Renda Total'
  },
  showLegend: {
    type: Boolean,
    default: true
  },
  isHidden: {
    type: Boolean,
    default: false
  },
  // Renderiza apenas o gráfico, sem o painel/cabeçalho (para uso dentro de outro painel)
  bare: {
    type: Boolean,
    default: false
  }
})

const { formatCurrency } = useCurrency()

const FALLBACK_COLORS = ['rgba(255, 133, 153, 0.85)', 'rgba(113, 194, 217, 0.85)', 'rgba(144, 175, 217, 0.85)', 'rgba(126, 167, 217, 0.85)']

const canvasRef = ref(null)
let chartInstance = null

const percentages = computed(() => {
  const total = props.data.reduce((a, b) => a + b, 0)
  if (total <= 0) return props.data.map(() => 0)
  return props.data.map(v => Math.round((v / total) * 100))
})

const resolveColors = () => {
  const rootStyles = getComputedStyle(document.documentElement)
  return props.data.map((_, i) => {
    const varName = props.colorVars[i]
    const resolved = varName ? rootStyles.getPropertyValue(varName).trim() : ''
    return resolved || FALLBACK_COLORS[i % FALLBACK_COLORS.length]
  })
}

const buildChart = () => {
  if (!canvasRef.value || typeof Chart === 'undefined') return
  if (chartInstance) { chartInstance.destroy(); chartInstance = null }

  const rootStyles = getComputedStyle(document.documentElement)
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
      ctx.fillText(props.centerLabel, cx, cy - 13)
      ctx.fillStyle = textMain
      ctx.font = 'bold 14px system-ui, sans-serif'
      ctx.fillText(props.isHidden ? 'R$ ••••' : formatCurrency(props.centerValue), cx, cy + 10)
      ctx.restore()
    }
  }

  if (Chart.Tooltip?.positioners) {
    Chart.Tooltip.positioners.outerArc = function (elements) {
      if (!elements.length) return false
      const el = elements[0].element
      const chart = this.chart
      const cx = (chart.chartArea.left + chart.chartArea.right) / 2
      const cy = (chart.chartArea.top + chart.chartArea.bottom) / 2
      const mid = (el.startAngle + el.endAngle) / 2
      const cosVal = Math.cos(mid)
      const sinVal = Math.sin(mid)
      const r = el.outerRadius * 1.25
      // Align caret to point back toward the ring from outside
      let xAlign, yAlign
      if (Math.abs(cosVal) >= Math.abs(sinVal)) {
        xAlign = cosVal > 0 ? 'left' : 'right'
        yAlign = 'center'
      } else {
        xAlign = 'center'
        yAlign = sinVal > 0 ? 'top' : 'bottom'
      }
      return { x: cx + cosVal * r, y: cy + sinVal * r, xAlign, yAlign }
    }
  }

  chartInstance = new Chart(canvasRef.value.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: props.labels,
      datasets: [{
        data: props.data,
        backgroundColor: resolveColors(),
        borderWidth: 3,
        borderColor: bgColor
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '75%',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: !props.isHidden, position: 'outerArc' }
      }
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
  chartInstance.data.datasets[0].backgroundColor = resolveColors()
  chartInstance.options.plugins.tooltip.enabled = !props.isHidden
  chartInstance.update()
}

onMounted(buildChart)
watch(() => props.data, updateChart, { deep: true })
watch(() => props.labels, updateChart, { deep: true })
watch(() => props.isHidden, updateChart)
watch(() => props.centerValue, () => { if (chartInstance) chartInstance.update() })

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
})
</script>

<template>
  <div :class="bare ? '' : 'chart-section'">
    <div v-if="!bare" class="panel-header" style="margin-bottom: 18px">
      <GlossaryTerm :term="title" :explanation="titleHint" />
    </div>
    <div class="chart-container" style="position: relative; height: 220px; width: 100%; margin: 0 auto;">
      <canvas ref="canvasRef"></canvas>
    </div>
    <div v-if="showLegend" class="chart-labels">
      <div v-for="(label, i) in labels" :key="label" class="label-item" :class="i === 0 ? 'left' : 'right'">
        <p>{{ label }}</p>
        <span :style="{ color: `var(${colorVars[i] || '--text-title'})` }">{{ percentages[i] }}%</span>
      </div>
    </div>
  </div>
</template>
