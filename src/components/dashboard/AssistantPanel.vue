<script setup>
import AISuggestion from './AISuggestion.vue'
import GlossaryTerm from '@/components/common/GlossaryTerm.vue'

defineProps({
  suggestion: String
})

defineEmits(['simulado'])

const glossaryTerms = [
  {
    term: 'Elisão fiscal',
    explanation: 'Planejamento permitido por lei para reduzir a carga tributária.'
  },
  {
    term: 'Base de cálculo',
    explanation: 'Valor usado como referência para calcular o imposto.'
  },
  {
    term: 'Valor dedutível',
    explanation: 'Despesa que pode diminuir a base de cálculo do imposto.'
  }
]
</script>

<template>
  <div class="glass-panel assistant-panel">
    <AISuggestion :suggestion="suggestion" title="Assistente" icon="fa-lightbulb" />

    <p class="assistant-disclaimer">
      Sugestões educativas. Confirme decisões fiscais com um contador.
    </p>

    <div class="glossary-chips">
      <GlossaryTerm
        v-for="item in glossaryTerms"
        :key="item.term"
        :term="item.term"
        :explanation="item.explanation"
      />
    </div>

    <button class="btn-outline" style="width: 100%; margin-top: 16px" @click="$emit('simulado')">
      <i class="fas fa-graduation-cap"></i> Novo Simulado
    </button>
  </div>
</template>
