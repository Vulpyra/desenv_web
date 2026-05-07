<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goToDashboard = () => router.push('/')
const goToSimulado = () => router.push('/simulado')
</script>

<template>
  <header class="top-bar">
    <div class="brand-mark" @click="goToDashboard">
      <span class="brand-text">← Voltar ao Dashboard</span>
    </div>
    <div class="top-icons">
      <i
        class="far fa-chart-bar"
        @click="goToSimulado"
        title="Simulador"
      ></i>
      <i class="far fa-user-circle active"></i>
    </div>
  </header>
</template>

<style scoped>
.brand-mark {
  cursor: pointer;
}

.top-icons i {
  cursor: pointer;
}

.top-icons i.active {
  color: var(--accent-6);
}
</style>
