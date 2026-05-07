<script setup>
defineEmits(['addReceita', 'addDespesa', 'novoSimulado', 'clearAll'])
</script>

<template>
  <div class="sidebar-actions">
    <slot name="ai-suggestion"></slot>
    
    <div class="quick-actions">
      <button class="btn-outline" @click="$emit('addReceita')">
        <i class="fas fa-plus"></i> Receita
      </button>
      <button class="btn-outline" @click="$emit('addDespesa')">
        <i class="fas fa-plus"></i> Despesa Avulsa
      </button>
    </div>
    
    <button class="btn-main-action" @click="$emit('novoSimulado')" style="margin-bottom: 12px">
      Novo Simulado
    </button>
    
    <button
      class="btn-outline"
      @click="$emit('clearAll')"
      style="width: 100%; color: var(--danger-soft); border-color: rgba(255, 133, 153, 0.3); background: rgba(255, 133, 153, 0.05)"
      title="Apagar todos os dados do sistema"
    >
      <i class="fas fa-power-off"></i> Zerar Todo o Sistema
    </button>
  </div>
</template>
