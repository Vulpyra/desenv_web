<script setup>
import { ref } from 'vue'
import GoalItem from './GoalItem.vue'
import GoalModal from './GoalModal.vue'
import GlossaryTerm from '@/components/common/GlossaryTerm.vue'

defineProps({
  metas: Array,
  isHidden: Boolean
})

defineEmits(['add-goal', 'invest', 'remove'])

const showModal = ref(false)

const openModal = () => { showModal.value = true }
defineExpose({ openModal })
</script>

<template>
  <div class="glass-panel goals-panel">
    <div class="panel-header">
      <GlossaryTerm
        term="Metas Financeiras"
        explanation="Objetivos de economia ou compra que você quer alcançar ao longo do tempo."
      />
      <button class="btn-add" @click="showModal = true" title="Adicionar Meta / Investir">
        <i class="fas fa-plus"></i>
      </button>
    </div>
    <div style="display: flex; flex-direction: column; gap: 24px">
      <GoalItem
        v-for="meta in metas"
        :key="meta.id"
        :meta="meta"
        :is-hidden="isHidden"
        @remove="$emit('remove', $event)"
      />
      <p v-if="metas.length === 0" style="color: var(--text-soft); font-size: 0.9rem; text-align: center">
        Nenhuma meta cadastrada.
      </p>
    </div>

    <GoalModal
      :is-open="showModal"
      :metas="metas"
      @close="showModal = false"
      @add-goal="$emit('add-goal', $event)"
      @invest="$emit('invest', $event)"
    />
  </div>
</template>
