<script setup>
import { computed } from 'vue'
import { useCurrency } from '@/composables/useCurrency'

const props = defineProps({
  rendas: Array,
  despesas: Array,
  isHidden: Boolean
})

const emit = defineEmits(['addRenda', 'addDespesa', 'removeRenda', 'removeDespesa'])

const { formatCurrency } = useCurrency()

const items = computed(() => {
  const rendaItems = props.rendas.map(r => ({
    ...r,
    type: 'renda',
    icone: r.icone || 'fa-money-bill-wave',
    prefix: ''
  }))
  
  const despesaItems = props.despesas.map(d => ({
    ...d,
    type: 'despesa',
    icone: 'fa-file-invoice-dollar',
    cor: 'var(--danger-soft)',
    prefix: '- '
  }))
  
  return [...rendaItems, ...despesaItems]
})
</script>

<template>
  <div class="glass-panel income-details">
    <div class="panel-header">
      <h3 class="panel-title">Receitas e Despesas Fixas</h3>
      <div style="display: flex; gap: 8px">
        <button class="btn-add" @click="$emit('addRenda')" title="Adicionar Renda">
          <i class="fas fa-plus"></i>
        </button>
        <button
          class="btn-add"
          @click="$emit('addDespesa')"
          title="Adicionar Despesa Fixa"
          style="color: var(--danger-soft); border-color: rgba(255, 133, 153, 0.3); background: rgba(255, 133, 153, 0.1)"
        >
          <i class="fas fa-minus"></i>
        </button>
      </div>
    </div>
    <ul class="detail-list">
      <li v-for="item in items" :key="item.id">
        <div>
          <i class="fas" :class="item.icone" :style="{ color: item.cor || 'var(--accent-cyan)' }"></i>
          <span>{{ item.nome }}</span>
        </div>
        <div>
          <span 
            class="value hide-value"
            :class="{ 'value-hidden': isHidden }"
            :style="item.type === 'despesa' ? { color: 'var(--danger-soft)' } : {}"
          >
            {{ item.prefix }}{{ formatCurrency(item.valor) }}
          </span>
          <button
            class="btn-remove"
            @click="item.type === 'renda' ? $emit('removeRenda', item.id) : $emit('removeDespesa', item.id)"
            title="Remover"
          >
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
