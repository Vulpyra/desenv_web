<script setup>
defineProps({
  icon: {
    type: String,
    default: 'fa-dollar-sign'
  },
  title: {
    type: String,
    default: 'Sugestão da IA'
  },
  suggestion: {
    type: String,
    default: 'Invista R$ 500 em saúde e economize + R$ 1000 por mês de imposto.'
  }
})
</script>

<template>
  <div class="ai-suggestion-box">
    <div class="ai-header">
      <div class="icon-circle">
        <i class="fas" :class="icon"></i>
      </div>
      <h3>{{ title }}</h3>
    </div>
    <p>{{ suggestion }}</p>
  </div>
</template>
