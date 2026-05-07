<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

defineEmits(['sign-out'])

const goToDashboard = () => router.push('/')
const goToSimulado = () => router.push('/simulado')
</script>

<template>
  <header class="top-bar">
    <img
      class="return-icon"
      src="/images/icons/return-svgrepo-com.svg"
      alt="Voltar"
      @click="goToDashboard"
    />
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

