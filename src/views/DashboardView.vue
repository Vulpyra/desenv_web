<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const valuesHidden = ref(false)

const toggleVisibility = () => {
  valuesHidden.value = !valuesHidden.value
}

const goToSimulado = () => {
  router.push('/simulado')
}
</script>

<template>
  <div class="bg-scene" aria-hidden="true">
    <span class="glow orb-a"></span>
    <span class="glow orb-b"></span>
    <span class="glow orb-c"></span>
    <span class="noise-layer"></span>
  </div>

  <div class="dashboard-shell">
    <span class="particle-stream" aria-hidden="true"></span>
    <div class="dashboard">
      <header class="top-bar">
        <img
          class="menu-icon"
          src="/images/icons/menu-symbol-of-three-parallel-lines-svgrepo-com-white.svg"
          alt="Menu"
        >
        <div class="top-icons">
          <i
            :class="['far', valuesHidden ? 'fa-eye-slash' : 'fa-eye']"
            :title="valuesHidden ? 'Mostrar valores' : 'Ocultar valores'"
            @click="toggleVisibility"
          ></i>
          <i class="far fa-user-circle"></i>
        </div>
      </header>

      <section class="stats-grid">
        <div class="stat-card">
          <span class="label">Patrimonio</span>
          <span class="value" :class="{ 'value-hidden': valuesHidden }">R$ 127.528,75</span>
        </div>
        <div class="stat-card">
          <span class="label">Renda Mensal</span>
          <span class="value" :class="{ 'value-hidden': valuesHidden }">R$ 14.789,50</span>
        </div>
        <div class="stat-card">
          <span class="label">Renda declarada</span>
          <span class="value" :class="{ 'value-hidden': valuesHidden }">R$ 890 / R$ 1.300</span>
        </div>
      </section>

      <section class="main-content">
        <div class="chart-section">
          <div class="pie-chart"></div>
          <div class="chart-labels">
            <div class="label-item left">
              <p>Renda nao dedutivel</p>
              <span>45%</span>
            </div>
            <div class="label-item right">
              <p>Renda dedutivel</p>
              <span>55%</span>
            </div>
          </div>
        </div>

        <div class="sidebar-actions">
          <div class="ai-suggestion-box">
            <div class="ai-header">
              <div class="icon-circle">
                <i class="fas fa-dollar-sign"></i>
              </div>
              <h3>Sugestao da IA</h3>
            </div>
            <p>Invista R$ 500 em saude e economize + R$ 1000 por mes de imposto</p>
          </div>

          <div class="quick-actions">
            <button class="btn-outline" type="button"><i class="fas fa-plus"></i> Receita</button>
            <button class="btn-outline" type="button"><i class="fas fa-plus"></i> Despesas</button>
          </div>

          <button class="btn-main-action" type="button" @click="goToSimulado">Novo Simulado</button>
        </div>
      </section>
    </div>
  </div>
</template>
