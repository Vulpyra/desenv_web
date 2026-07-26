<script setup>
import { computed } from 'vue'
import { useCurrency } from '@/composables/useCurrency'
import GlossaryTerm from '@/components/common/GlossaryTerm.vue'

const props = defineProps({
  rendas: Array,
  total: Number,
  isHidden: Boolean
})

defineEmits(['add', 'edit', 'remove'])

const { formatCurrency } = useCurrency()

const items = computed(() =>
  props.rendas.map(r => ({
    ...r,
    tipo: 'renda',
    type: 'renda',
    icone: r.icone || 'fa-money-bill-wave'
  }))
)

const fmtDia = (data) => {
  if (!data) return 'sem data'
  const [, m, d] = String(data).split('-')
  return `dia ${d}/${m}`
}
</script>

<template>
  <div class="glass-panel income-panel">
    <div class="panel-header">
      <GlossaryTerm
        term="Entradas"
        explanation="Todo o dinheiro que entra no ciclo: salário, freelas e outras receitas."
      />
      <button class="btn-add" @click="$emit('add')" title="Adicionar Renda">
        <i class="fas fa-plus"></i>
      </button>
    </div>

    <span class="panel-eyebrow">Renda do ciclo</span>
    <div class="big-number hide-value" :class="{ 'value-hidden': isHidden }">
      {{ formatCurrency(total) }}
    </div>
    <p class="panel-hint">o que entra — não é o que sobra pra gastar</p>

    <ul class="detail-list" style="margin-top: 16px">
      <li v-for="item in items" :key="item.id">
        <div>
          <i class="fas" :class="item.icone" :style="{ color: item.cor || 'var(--accent-cyan)' }"></i>
          <div class="entry-text">
            <span>
              {{ item.nome }}
              <span v-if="item.recorrente" class="recur-badge" title="Renda recorrente — repete todo ciclo">
                <i class="fas fa-rotate"></i> recorrente
              </span>
            </span>
            <span class="item-sub">{{ fmtDia(item.dataDisplay || item.data) }}</span>
          </div>
        </div>
        <div>
          <span class="value hide-value" :class="{ 'value-hidden': isHidden }">
            {{ formatCurrency(item.valor) }}
          </span>
          <button class="btn-remove" @click="$emit('edit', item)" title="Editar" style="margin-right: 2px">
            <i class="fas fa-pencil" style="font-size: 0.75rem"></i>
          </button>
          <button class="btn-remove" @click="$emit('remove', item)" title="Remover">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </li>
      <p v-if="items.length === 0" class="panel-empty">Nenhuma entrada neste ciclo.</p>
    </ul>
  </div>
</template>

<style scoped>
.income-panel .detail-list {
  overflow-y: auto;
  max-height: 260px;
  min-height: 0;
  justify-content: flex-start;
}
</style>
