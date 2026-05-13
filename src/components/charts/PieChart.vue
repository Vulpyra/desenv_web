<script setup>
import { ref, onMounted, computed } from 'vue'

const props = defineProps({
  data: {
    type: Array,
    default: () => [45, 55]
  },
  labels: {
    type: Array,
    default: () => ['Não dedutível', 'Dedutível']
  }
})

const canvasRef = ref(null)
let chartInstance = null

const percentages = computed(() => {
  const total = props.data.reduce((a, b) => a + b, 0)
  return props.data.map(v => Math.round((v / total) * 100))
})

onMounted(() => {
  if (!canvasRef.value || typeof Chart === 'undefined') return
  
  const rootStyles = getComputedStyle(document.documentElement)
  const colorA = rootStyles.getPropertyValue('--chart-a').trim()
  const colorB = rootStyles.getPropertyValue('--chart-b').trim()
  const bgColor = rootStyles.getPropertyValue('--bg-mid').trim()

  chartInstance = new Chart(canvasRef.value.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: props.labels,
      datasets: [{
        data: props.data,
        backgroundColor: [colorA, colorB],
        borderWidth: 3,
        borderColor: bgColor
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '75%',
      plugins: { legend: { display: false } }
    }
  })
})
</script>

<template>
  <div class="chart-section">
    <div class="chart-container" style="position: relative; height: 220px; width: 100%; margin: 0 auto;">
      <canvas ref="canvasRef"></canvas>
    </div>
    <div class="chart-labels">
      <div class="label-item left">
        <p>{{ labels[0] }}</p>
        <span>{{ percentages[0] }}%</span>
      </div>
      <div class="label-item right">
        <p>{{ labels[1] }}</p>
        <span>{{ percentages[1] }}%</span>
      </div>
    </div>
  </div>
</template>
