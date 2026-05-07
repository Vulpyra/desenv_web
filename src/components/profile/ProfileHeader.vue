<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

defineEmits(['sign-out'])

const goToDashboard = () => router.push('/')
const goToSimulado = () => router.push('/simulado')
</script>

<template>
  <header class="top-bar">
    <div class="brand-mark" @click="goToDashboard" aria-label="Renda Fácil">
      <span class="brand-text">← Voltar</span>
    </div>
    <div class="top-icons">
      <i
        class="far fa-chart-bar"
        @click="goToSimulado"
        title="Simulador"
      ></i>
      <i class="far fa-user-circle active"></i>
      <i class="fas fa-sign-out-alt" @click="$emit('sign-out')" title="Sair"></i>
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
