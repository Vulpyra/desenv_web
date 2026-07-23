<script setup>
import { ref } from 'vue'
import { useCurrency } from '@/composables/useCurrency'
import GlossaryTerm from '@/components/common/GlossaryTerm.vue'

const props = defineProps({
  fixed: { type: Array, default: () => [] },
  installments: { type: Array, default: () => [] },
  oneTime: { type: Array, default: () => [] },
  paidIds: { type: Array, default: () => [] },
  invoicePaid: Boolean,
  totalInstallments: Number,
  totalOneTime: Number,
  totalInvoice: Number,
  totalContas: Number,
  totalPago: Number,
  restante: Number,
  isHidden: Boolean
})

const emit = defineEmits([
  'add-fixed', 'add-installment', 'add-onetime',
  'set-amount', 'toggle-fixed-paid', 'toggle-invoice-paid', 'remove'
])

const { formatCurrency, parseLoose } = useCurrency()

const formatDec = (n) => (Number(n) || 0).toFixed(2).replace('.', ',')
const isPaid = (id) => props.paidIds.includes(id)

// Estado dos campos de adição (ghost rows)
const fxName = ref(''); const fxDay = ref(''); const fxVal = ref('')
const rName = ref(''); const rPar = ref(''); const rVal = ref('')
const oName = ref(''); const oVal = ref('')

const commitFixed = () => {
  const name = fxName.value.trim(); const amount = parseLoose(fxVal.value)
  if (!name || !amount) return
  emit('add-fixed', { name, amount, day: parseInt(fxDay.value) || 1 })
  fxName.value = ''; fxDay.value = ''; fxVal.value = ''
}

const commitInstallment = () => {
  const name = rName.value.trim(); const amount = parseLoose(rVal.value)
  if (!name || !amount) return
  const [pa, pt] = String(rPar.value || '1/12').split('/').map((s) => parseInt(s))
  emit('add-installment', { name, amount, parcelaAtual: pa || 1, parcelaTotal: pt || 12 })
  rName.value = ''; rPar.value = ''; rVal.value = ''
}

const commitOneTime = () => {
  const name = oName.value.trim(); const amount = parseLoose(oVal.value)
  if (!name || !amount) return
  emit('add-onetime', { name, amount })
  oName.value = ''; oVal.value = ''
}
</script>

<template>
  <div class="glass-panel bills-panel">
    <div class="panel-header">
      <GlossaryTerm
        term="Preciso pagar"
        explanation="O que sai obrigatoriamente no ciclo: contas fixas (recorrem todo mês), parcelas do cartão (avançam sozinhas) e compras únicas."
      />
    </div>

    <!-- Contas fixas -->
    <div class="group-hdr"><i class="fas fa-house"></i> Contas fixas</div>
    <ul class="detail-list planner-list">
      <li v-for="item in fixed" :key="item.id" :class="{ 'item-paid': isPaid(item.id) }">
        <div class="li-left">
          <input
            type="checkbox"
            class="chk-paid"
            :checked="isPaid(item.id)"
            :title="isPaid(item.id) ? 'Marcar como não paga' : 'Marcar como paga'"
            @change="$emit('toggle-fixed-paid', item.id)"
          />
          <div class="entry-text">
            <span>{{ item.nome || item.name }}</span>
            <span class="item-sub">dia {{ item.day }} · essencial</span>
          </div>
        </div>
        <div class="li-right">
          <span class="amt-wrap">
            <span class="amt-cur">R$</span>
            <input
              class="amt-in num"
              :class="{ 'value-hidden': isHidden }"
              :value="formatDec(item.amount)"
              inputmode="decimal"
              @change="$emit('set-amount', { kind: 'fixed', id: item.id, amount: parseLoose($event.target.value) })"
            />
          </span>
          <button
            class="btn-remove"
            @click="$emit('remove', { plannerKind: 'fixed', id: item.id, nome: item.name })"
            title="Remover"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
      </li>
    </ul>
    <div class="ghost-row">
      <div class="gh-plus">+</div>
      <input class="gh-name" v-model="fxName" placeholder="Nova conta" @keydown.enter="commitFixed" />
      <input class="gh-day" v-model="fxDay" inputmode="numeric" placeholder="dia" @keydown.enter="commitFixed" />
      <input class="gh-amt num" v-model="fxVal" inputmode="decimal" placeholder="R$" @keydown.enter="commitFixed" />
      <button class="gh-commit" @click="commitFixed" title="Adicionar"><i class="fas fa-check"></i></button>
    </div>

    <!-- Fatura do cartão -->
    <div class="group-hdr group-hdr--spread">
      <span><i class="fas fa-credit-card"></i> Fatura do cartão</span>
      <label class="paid-toggle">
        <input type="checkbox" class="chk-paid" :checked="invoicePaid" @change="$emit('toggle-invoice-paid')" />
        paga
      </label>
    </div>

    <div class="sub-hdr"><i class="fas fa-rotate"></i> parcelas — repetem todo mês</div>
    <ul class="detail-list planner-list">
      <li v-for="item in installments" :key="item.id">
        <div class="li-left">
          <i class="fas fa-rotate li-ic"></i>
          <div class="entry-text">
            <span>{{ item.name }}</span>
            <span class="item-sub">parcela {{ item.parcela }}/{{ item.total }}</span>
          </div>
        </div>
        <div class="li-right">
          <span class="amt-wrap">
            <span class="amt-cur">R$</span>
            <input
              class="amt-in num"
              :class="{ 'value-hidden': isHidden }"
              :value="formatDec(item.amount)"
              inputmode="decimal"
              @change="$emit('set-amount', { kind: 'installment', id: item.id, amount: parseLoose($event.target.value) })"
            />
          </span>
          <button
            class="btn-remove"
            @click="$emit('remove', { plannerKind: 'installment', id: item.id, nome: item.name })"
            title="Remover"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
      </li>
    </ul>
    <div class="ghost-row">
      <div class="gh-plus">+</div>
      <input class="gh-name" v-model="rName" placeholder="Nova parcela" @keydown.enter="commitInstallment" />
      <input class="gh-day" v-model="rPar" placeholder="3/10" @keydown.enter="commitInstallment" />
      <input class="gh-amt num" v-model="rVal" inputmode="decimal" placeholder="R$" @keydown.enter="commitInstallment" />
      <button class="gh-commit" @click="commitInstallment" title="Adicionar"><i class="fas fa-check"></i></button>
    </div>

    <div class="sub-hdr"><i class="fas fa-bag-shopping"></i> compras únicas — não repetem</div>
    <ul class="detail-list planner-list">
      <li v-for="item in oneTime" :key="item.id">
        <div class="li-left">
          <i class="fas fa-bag-shopping li-ic"></i>
          <div class="entry-text">
            <span>{{ item.name }}</span>
            <span class="item-sub">compra única</span>
          </div>
        </div>
        <div class="li-right">
          <span class="amt-wrap">
            <span class="amt-cur">R$</span>
            <input
              class="amt-in num"
              :class="{ 'value-hidden': isHidden }"
              :value="formatDec(item.amount)"
              inputmode="decimal"
              @change="$emit('set-amount', { kind: 'onetime', id: item.id, amount: parseLoose($event.target.value) })"
            />
          </span>
          <button
            class="btn-remove"
            @click="$emit('remove', { plannerKind: 'onetime', id: item.id, nome: item.name })"
            title="Remover"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
      </li>
    </ul>
    <div class="ghost-row">
      <div class="gh-plus">+</div>
      <input class="gh-name" v-model="oName" placeholder="Compra única" @keydown.enter="commitOneTime" />
      <input class="gh-amt num" v-model="oVal" inputmode="decimal" placeholder="R$" @keydown.enter="commitOneTime" />
      <button class="gh-commit" @click="commitOneTime" title="Adicionar"><i class="fas fa-check"></i></button>
    </div>

    <div class="inv-total">
      <span>Fatura total</span>
      <span
        class="hide-value"
        :class="{ 'value-hidden': isHidden }"
        style="color: var(--danger-soft)"
      >{{ formatCurrency(totalInvoice) }}</span>
    </div>
    <div class="sub-inv hide-value" :class="{ 'value-hidden': isHidden }">
      <span>parcelas <b>{{ formatCurrency(totalInstallments) }}</b></span>
      <span>únicas <b>{{ formatCurrency(totalOneTime) }}</b></span>
    </div>

    <div class="panel-foot">
      <span class="foot-label">Restante a pagar</span>
      <div style="text-align: right">
        <div
          class="foot-big hide-value"
          :class="{ 'value-hidden': isHidden }"
          style="color: var(--danger-soft)"
        >
          {{ formatCurrency(restante) }}
        </div>
        <div class="item-sub hide-value" :class="{ 'value-hidden': isHidden }">
          total <b>{{ formatCurrency(totalContas) }}</b> · pago <b>{{ formatCurrency(totalPago) }}</b>
        </div>
      </div>
    </div>
  </div>
</template>
