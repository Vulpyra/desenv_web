<script setup>
import { ref, computed } from 'vue'
import { useCurrency } from '@/composables/useCurrency'
import GlossaryTerm from '@/components/common/GlossaryTerm.vue'

const props = defineProps({
  debits: { type: Array, default: () => [] },
  totalDebits: Number,
  isHidden: Boolean
})

const emit = defineEmits(['add', 'remove'])

const { formatCurrency, parseLoose } = useCurrency()

const name = ref('')
const value = ref('')
const pagamento = ref('debito')
const parcelas = ref('1')

const nParcelas = computed(() => Math.min(Math.max(parseInt(parcelas.value, 10) || 1, 1), 60))

const preview = computed(() => {
  const total = parseLoose(value.value)
  if (!total) return null
  if (pagamento.value === 'debito') return 'sai agora do "livre para gastar"'
  if (nParcelas.value <= 1) return 'entra como compra única na fatura'
  return `${nParcelas.value}x de ${formatCurrency(Math.round((total / nParcelas.value) * 100) / 100)} na fatura`
})

const commit = () => {
  const n = name.value.trim()
  const amount = parseLoose(value.value)
  if (!n || !amount) return
  emit('add', { name: n, amount, pagamento: pagamento.value, parcelas: nParcelas.value })
  name.value = ''; value.value = ''; parcelas.value = '1'
}

const fmtDate = (iso) => {
  if (!iso) return 'neste ciclo'
  const [y, m, d] = String(iso).split('-')
  return `${d}/${m}/${y.slice(2)}`
}
</script>

<template>
  <div class="glass-panel quick-panel">
    <div class="panel-header">
      <GlossaryTerm
        term="Gasto rápido"
        explanation="Lance uma compra em segundos: no débito ela sai do dinheiro livre; no crédito vira um item da fatura do cartão."
      />
    </div>

    <!-- Formulário sempre visível: o objetivo do painel é ser rápido -->
    <div class="add-grid quick-grid">
      <label class="add-field add-field--grow">
        <span class="add-label">Descrição</span>
        <input v-model="name" placeholder="Ex.: Almoço" @keydown.enter="commit" />
      </label>
      <label class="add-field add-field--md">
        <span class="add-label">Valor (R$)</span>
        <input v-model="value" class="num" inputmode="decimal" placeholder="0,00" @keydown.enter="commit" />
      </label>
      <label class="add-field add-field--md">
        <span class="add-label">Pagamento</span>
        <select v-model="pagamento">
          <option value="debito">Débito</option>
          <option value="credito">Crédito</option>
        </select>
      </label>
      <label v-if="pagamento === 'credito'" class="add-field add-field--sm">
        <span class="add-label">Parcelas</span>
        <input v-model="parcelas" inputmode="numeric" placeholder="1" @keydown.enter="commit" />
      </label>
    </div>

    <p v-if="preview" class="quick-preview">
      <i class="fas" :class="pagamento === 'debito' ? 'fa-wallet' : 'fa-credit-card'"></i>
      {{ preview }}
    </p>

    <button class="add-submit" @click="commit">
      <i class="fas fa-bolt"></i> Lançar gasto
    </button>

    <!-- Débitos do ciclo (os de crédito aparecem no painel da fatura) -->
    <div class="group-hdr" style="margin-top: 18px">
      <i class="fas fa-wallet"></i> No débito neste ciclo
    </div>
    <ul class="detail-list planner-list">
      <li v-for="item in debits" :key="item.id">
        <div class="li-left">
          <i class="fas fa-wallet li-ic"></i>
          <div class="entry-text">
            <span>{{ item.name }}</span>
            <span class="item-sub">{{ fmtDate(item.data) }}</span>
          </div>
        </div>
        <div class="li-right">
          <span
            class="value hide-value"
            :class="{ 'value-hidden': isHidden }"
            style="color: var(--danger-soft)"
          >- {{ formatCurrency(item.amount) }}</span>
          <button
            class="btn-remove"
            title="Remover"
            @click="$emit('remove', { plannerKind: 'onetime', id: item.id, nome: item.name })"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
      </li>
      <p v-if="!debits.length" class="panel-empty">Nenhum gasto no débito neste ciclo.</p>
    </ul>

    <div class="panel-foot">
      <span class="foot-label">Total no débito</span>
      <div
        class="foot-big hide-value"
        :class="{ 'value-hidden': isHidden }"
        style="color: var(--danger-soft)"
      >{{ formatCurrency(totalDebits) }}</div>
    </div>
  </div>
</template>
