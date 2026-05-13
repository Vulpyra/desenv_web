<script setup>
defineProps({
  icon: {
    type: String,
    default: 'fa-dollar-sign'
  },
  title: {
    type: String,
    default: 'Sugestao de IA'
  },
  suggestion: {
    type: String,
    default: 'Invista R$ 500 em saúde e economize + R$ 1000 por mês de imposto.'
  }
})
</script>

<template>
  <RouterLink
    to="/chat-ia"
    class="ai-suggestion-box ai-suggestion-link"
    aria-label="Abrir chat com IA"
  >
    <div class="ai-header">
      <div class="icon-circle">
        <i class="fas" :class="icon"></i>
      </div>
      <h3>{{ title }}</h3>
    </div>
    <p>{{ suggestion }}</p>
    <span class="ai-suggestion-cta">
      Conversar com a IA
      <i class="fas fa-arrow-right"></i>
    </span>
  </RouterLink>
</template>
