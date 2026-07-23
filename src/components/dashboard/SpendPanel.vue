<script setup>
import { ref, computed } from 'vue'
import { useCurrency } from '@/composables/useCurrency'
import GlossaryTerm from '@/components/common/GlossaryTerm.vue'

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

// Ghost add
const plName = ref(''); const plVal = ref('')
const commitBudget = () => {
  const name = plName.value.trim()
  if (!name) return
  emit('add-budget', { name, limit: parseLoose(plVal.value) })
  plName.value = ''; plVal.value = ''
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
          <span class="budget-name">{{ b.name }}</span>
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

    <div class="ghost-row">
      <div class="gh-plus">+</div>
      <input class="gh-name" v-model="plName" placeholder="Nova categoria" @keydown.enter="commitBudget" />
      <input class="gh-amt num" v-model="plVal" inputmode="decimal" placeholder="orçado" @keydown.enter="commitBudget" />
      <button class="gh-commit" @click="commitBudget" title="Adicionar"><i class="fas fa-check"></i></button>
    </div>

    <div class="panel-foot">
      <span class="foot-label">Total orçado</span>
      <div
        class="foot-big num hide-value"
        :class="{ 'value-hidden': isHidden }"
      >{{ formatCurrency(totalBudget) }}</div>
    </div>
  </div>
</template>
