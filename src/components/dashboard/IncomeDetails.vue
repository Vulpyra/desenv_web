<script setup>
import { ref, computed } from 'vue'
import { useCurrency } from '@/composables/useCurrency'
import GlossaryTerm from '@/components/common/GlossaryTerm.vue'

const props = defineProps({
  rendas: Array,
  despesas: Array,
  isHidden: Boolean
})

const emit = defineEmits(['addRenda', 'addDespesa', 'removeRenda', 'removeDespesa', 'editEntry'])

const { formatCurrency } = useCurrency()

const items = computed(() => {
  const rendaItems = props.rendas.map(r => ({
    ...r,
    tipo: 'renda',
    type: 'renda',
    icone: r.icone || 'fa-money-bill-wave',
    prefix: ''
  }))
  const despesaItems = props.despesas.map(d => ({
    ...d,
    tipo: 'despesa',
    type: 'despesa',
    icone: 'fa-file-invoice-dollar',
    cor: 'var(--danger-soft)',
    prefix: '- '
  }))
  return [...rendaItems, ...despesaItems]
})

// Delete confirmation
const deleteTarget = ref(null)
const skipDeleteConfirm = ref(localStorage.getItem('rf_skipDeleteConfirm') === 'true')
const dontShowAgain = ref(false)

const handleTrashClick = (item) => {
  if (skipDeleteConfirm.value) {
    doRemove(item)
    return
  }
  deleteTarget.value = item
  dontShowAgain.value = false
}

const confirmDelete = () => {
  if (dontShowAgain.value) {
    skipDeleteConfirm.value = true
    localStorage.setItem('rf_skipDeleteConfirm', 'true')
  }
  doRemove(deleteTarget.value)
  deleteTarget.value = null
}

const doRemove = (item) => {
  if (item.type === 'renda') emit('removeRenda', item.id)
  else emit('removeDespesa', item.id)
}
</script>

<template>
  <div class="glass-panel income-details">
    <div class="panel-header">
      <GlossaryTerm
        term="Receitas e Despesas Fixas"
        explanation="Entradas e saídas recorrentes do mês, como salário, aluguel e assinaturas."
      />
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
          <button class="btn-remove" @click="$emit('editEntry', item)" title="Editar" style="margin-right: 2px">
            <i class="fas fa-pencil" style="font-size: 0.75rem"></i>
          </button>
          <button class="btn-remove" @click="handleTrashClick(item)" title="Remover">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </li>
    </ul>
  </div>

  <!-- Delete confirmation modal -->
  <Teleport to="body">
    <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null" role="dialog" aria-modal="true">
      <div class="glass-panel modal-content" style="width: min(380px, 95vw)">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
          <h3 class="panel-title" style="margin: 0">Confirmar exclusão</h3>
          <button class="btn-icon-edit" @click="deleteTarget = null"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <p style="color: var(--text-main); margin-bottom: 18px">
            Deseja remover <strong>{{ deleteTarget.nome }}</strong>?
          </p>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text-soft); font-size: 0.85rem">
            <input type="checkbox" v-model="dontShowAgain" style="width: 14px; height: 14px; cursor: pointer" />
            Não mostrar novamente
          </label>
        </div>
        <div class="modal-actions" style="margin-top: 20px">
          <button class="btn-outline" style="padding: 10px 20px" @click="deleteTarget = null">Cancelar</button>
          <button
            class="btn-main-action"
            style="padding: 10px 20px; font-size: 1rem; width: auto; background: var(--danger-soft); border-color: var(--danger-soft)"
            @click="confirmDelete"
          >
            Remover
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
