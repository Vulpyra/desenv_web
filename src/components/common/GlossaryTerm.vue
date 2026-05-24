<script setup>
defineProps({
  term: {
    type: String,
    required: true
  },
  explanation: {
    type: String,
    required: true
  }
})
</script>

<template>
  <span class="glossary-term" tabindex="0" :aria-label="`${term}: ${explanation}`">
    <span class="glossary-term__label">{{ term }}</span>
    <span class="glossary-term__bubble" role="tooltip">
      {{ explanation }}
    </span>
  </span>
</template>