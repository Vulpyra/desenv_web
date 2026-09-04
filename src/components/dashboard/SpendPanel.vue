<script setup>
import { ref, computed } from 'vue'
import { useCurrency } from '@/composables/useCurrency'
import GlossaryTerm from '@/components/common/GlossaryTerm.vue'
import AddForm from '@/components/common/AddForm.vue'

const props = defineProps({
  budgets: { type: Array, default: () => [] },
  teto: Number,
  gasto: Number,
  totalBudget: Number,
  isHidden: Boolean
})

const emit = defineEmits(['add-budget', 'launch-spend', 'set-limit', 'remove'])

const { formatCurrency, parseLoose } = useCurrency()

const formatDec = (n) => (Number(n) || 0).toFixed(2).replace('.', ',')

const pctUsado = computed(() => {
  if (props.teto > 0) return (props.gasto / props.teto) * 100
  return props.gasto > 0 ? 100 : 0
})
const restam = computed(() => props.teto - props.gasto)

const barPct = (b) => {
  if (b.limit > 0) return Math.min((b.spent / b.limit) * 100, 100)
  return b.spent > 0 ? 100 : 0
}

// Campo de "Lançar gasto" por categoria
const launchVals = ref({})
const commitLaunch = (id) => {
  const amount = parseLoose(launchVals.value[id])
  if (!amount) return
  emit('launch-spend', { id, amount })
  launchVals.value = { ...launchVals.value, [id]: '' }
}

// Nova despesa planejada (débito ou crédito parcelado)
const plName = ref(''); const plVal = ref('')
const plPagamento = ref('debito'); const plParcelas = ref('1')

const parcelaPreview = computed(() => {
  if (plPagamento.value !== 'credito') return null
  const total = parseLoose(plVal.value)
  const n = Math.min(Math.max(parseInt(plParcelas.value, 10) || 1, 1), 60)
  if (!total) return null
  return `${n}x de ${formatCurrency(Math.round((total / n) * 100) / 100)} na fatura`
})

const commitBudget = () => {
  const name = plName.value.trim()
  if (!name) return
  emit('add-budget', {
    name,
    limit: parseLoose(plVal.value),
    pagamento: plPagamento.value,
    parcelas: parseInt(plParcelas.value, 10) || 1
  })
  plName.value = ''; plVal.value = ''
  plPagamento.value = 'debito'; plParcelas.value = '1'
}
</script>

<template>
  <div class="glass-panel spend-panel">
    <div class="panel-header">
      <GlossaryTerm
        term="Planejo gastar"
        explanation="Categorias de gasto planejado com o dinheiro livre (renda − contas − metas). Cada categoria tem um teto e recebe lançamentos."
      />
    </div>

    <!-- Medidor do teto do ciclo -->
    <div class="gauge-top">
      <div>
        <span class="panel-eyebrow">Teto do ciclo</span>
        <div
          class="gauge-num hide-value"
          :class="{ 'value-hidden': isHidden }"
          style="color: var(--accent-cyan)"
        >
          {{ formatCurrency(teto) }}
        </div>
      </div>
      <div style="text-align: right">
        <span class="panel-eyebrow">já gasto</span>
        <div class="gauge-num-sm hide-value" :class="{ 'value-hidden': isHidden }">
          {{ formatCurrency(gasto) }}
        </div>
      </div>
    </div>

    <div class="gauge-bar">
      <div
        class="gauge-fill"
        :class="{ over: restam < 0 }"
        :style="{ width: Math.min(pctUsado, 100) + '%' }"
      ></div>
    </div>
    <div class="gauge-sub">
      <span>{{ Math.round(pctUsado) }}% usado</span>
      <span>
        restam
        <b
          class="hide-value"
          :class="{ 'value-hidden': isHidden }"
          :style="{ color: restam < 0 ? 'var(--danger-soft)' : 'var(--accent-cyan)' }"
        >{{ formatCurrency(restam) }}</b>
      </span>
    </div>

    <!-- Categorias -->
    <div class="group-hdr"><i class="fas fa-cart-shopping"></i> Categorias</div>

    <div class="budget-list">
      <div v-for="b in budgets" :key="b.id" class="budget-row">
        <div class="budget-head">
          <span class="budget-name">
            {{ b.name }}
            <span v-if="b.pagamento === 'credito'" class="pay-tag" title="Vira parcela na fatura do cartão">
              <i class="fas fa-credit-card"></i> {{ b.parcelas }}x
            </span>
          </span>
          <button
            class="btn-remove"
            @click="$emit('remove', { plannerKind: 'budget', id: b.id, nome: b.name })"
            title="Remover categoria"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="pbar2">
          <div class="pbar2-fill" :class="{ over: b.spent > b.limit && b.limit > 0 }" :style="{ width: barPct(b) + '%' }"></div>
          <span class="pbar2-lbl l-left hide-value" :class="{ 'value-hidden': isHidden }">{{ formatCurrency(b.spent) }}</span>
          <span class="pbar2-lbl l-right">
            R$
            <input
              class="cap-in num"
              :class="{ 'value-hidden': isHidden }"
              :value="formatDec(b.limit)"
              inputmode="decimal"
              title="Teto da categoria"
              @change="$emit('set-limit', { id: b.id, limit: parseLoose($event.target.value) })"
            />
          </span>
        </div>

        <div class="spend-row">
          <input
            class="mini-in num"
            placeholder="0,00"
            inputmode="decimal"
            v-model="launchVals[b.id]"
            @keydown.enter="commitLaunch(b.id)"
          />
          <button class="mini-btn" @click="commitLaunch(b.id)">Lançar gasto</button>
        </div>
      </div>

      <p v-if="budgets.length === 0" class="panel-empty">Nenhuma categoria planejada neste ciclo.</p>
    </div>

    <AddForm title="Nova despesa planejada" submit-label="Adicionar despesa" @submit="commitBudget">
      <label class="add-field add-field--grow">
        <span class="add-label">Descrição</span>
        <input v-model="plName" placeholder="Ex.: Mercado" @keydown.enter="commitBudget" />
      </label>
      <label class="add-field add-field--md">
        <span class="add-label">Valor (R$)</span>
        <input v-model="plVal" class="num" inputmode="decimal" placeholder="0,00" @keydown.enter="commitBudget" />
      </label>
      <label class="add-field add-field--md">
        <span class="add-label">Pagamento</span>
        <select v-model="plPagamento">
          <option value="debito">Débito</option>
          <option value="credito">Crédito</option>
        </select>
      </label>
      <label v-if="plPagamento === 'credito'" class="add-field add-field--sm">
        <span class="add-label">Parcelas</span>
        <input v-model="plParcelas" inputmode="numeric" placeholder="1" @keydown.enter="commitBudget" />
      </label>
      <p v-if="parcelaPreview" class="add-note">
        <i class="fas fa-credit-card"></i> {{ parcelaPreview }}
      </p>
    </AddForm>

    <div class="panel-foot">
      <span class="foot-label">Total orçado</span>
      <div
        class="foot-big num hide-value"
        :class="{ 'value-hidden': isHidden }"
      >{{ formatCurrency(totalBudget) }}</div>
    </div>
  </div>
</template>
