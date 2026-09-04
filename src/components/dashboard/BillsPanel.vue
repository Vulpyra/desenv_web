<script setup>
import { ref, computed } from 'vue'
import { useCurrency } from '@/composables/useCurrency'
import { usePagedList } from '@/composables/usePagedList'
import GlossaryTerm from '@/components/common/GlossaryTerm.vue'
import ListPager from '@/components/common/ListPager.vue'
import AddForm from '@/components/common/AddForm.vue'

const props = defineProps({
  fixed: { type: Array, default: () => [] },
  subscriptions: { type: Array, default: () => [] },
  installments: { type: Array, default: () => [] },
  oneTime: { type: Array, default: () => [] },
  totalSubscriptions: Number,
  paidIds: { type: Array, default: () => [] },
  invoicePaid: Boolean,
  totalInstallments: Number,
  totalOneTime: Number,
  totalInvoice: Number,
  totalContas: Number,
  totalPago: Number,
  restante: Number,
  isHidden: Boolean,
  card: { type: Object, default: () => ({ enabled: false, closingDay: 15, dueDay: 22 }) },
  invoicePeriod: { type: Object, default: null }
})

const emit = defineEmits([
  'add-fixed', 'add-installment', 'add-onetime', 'add-subscription',
  'set-amount', 'toggle-fixed-paid', 'toggle-invoice-paid', 'remove', 'import',
  'save-card', 'clear-bills', 'to-subscription'
])

const { formatCurrency, parseLoose } = useCurrency()

const formatDec = (n) => (Number(n) || 0).toFixed(2).replace('.', ',')
const isPaid = (id) => props.paidIds.includes(id)
const fmtDate = (iso) => {
  if (!iso) return null
  const [y, m, d] = String(iso).split('-')
  return `${d}/${m}/${y.slice(2)}`
}

// ---- Formulários de adição ----
const fxName = ref(''); const fxDay = ref(''); const fxVal = ref('')
const rName = ref(''); const rPar = ref(''); const rVal = ref('')
const oName = ref(''); const oVal = ref('')
const sName = ref(''); const sDay = ref(''); const sVal = ref('')

const commitSubscription = () => {
  const name = sName.value.trim(); const amount = parseLoose(sVal.value)
  if (!name || !amount) return
  emit('add-subscription', { name, amount, day: parseInt(sDay.value) || 1 })
  sName.value = ''; sDay.value = ''; sVal.value = ''
}

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

// ---- Ciclo de faturamento do cartão ----
const cardOpen = ref(false)
const draft = ref({ ...props.card })

const openCard = () => {
  draft.value = { ...props.card }
  cardOpen.value = !cardOpen.value
}

const saveCard = () => {
  emit('save-card', { ...draft.value })
  cardOpen.value = false
}

const periodLabel = computed(() => {
  const p = props.invoicePeriod
  if (!p) return null
  const dm = (iso) => iso.split('-').slice(1).reverse().join('/')
  return `Fatura de ${dm(p.from)} a ${dm(p.to)} · vence ${dm(p.due)}`
})

// ---- Filtro da fatura ----
const filterOpen = ref(false)
const f = ref({ text: '', min: '', max: '', from: '', to: '', category: '' })

const filterActive = computed(() =>
  !!(f.value.text.trim() || f.value.min || f.value.max || f.value.from || f.value.to || f.value.category)
)

const clearFilter = () => { f.value = { text: '', min: '', max: '', from: '', to: '', category: '' } }

const categories = computed(() => {
  const set = new Set()
  for (const it of [...props.installments, ...props.oneTime]) {
    if (it.categoria) set.add(it.categoria)
  }
  return [...set].sort()
})

const matches = (item) => {
  const q = f.value.text.trim().toLowerCase()
  if (q && !String(item.name).toLowerCase().includes(q)) return false

  const min = parseLoose(f.value.min); const max = parseLoose(f.value.max)
  if (f.value.min && item.amount < min) return false
  if (f.value.max && item.amount > max) return false

  if (f.value.category && item.categoria !== f.value.category) return false

  if (f.value.from || f.value.to) {
    if (!item.data) return false // sem data não dá para comparar
    if (f.value.from && item.data < f.value.from) return false
    if (f.value.to && item.data > f.value.to) return false
  }
  return true
}

const shownInstallments = computed(() =>
  filterActive.value ? props.installments.filter(matches) : props.installments
)
const shownOneTime = computed(() =>
  filterActive.value ? props.oneTime.filter(matches) : props.oneTime
)

const shownSubscriptions = computed(() =>
  filterActive.value ? props.subscriptions.filter(matches) : props.subscriptions
)

const sum = (arr) => arr.reduce((a, b) => a + (Number(b.amount) || 0), 0)
const subtotal = computed(() =>
  sum(shownInstallments.value) + sum(shownOneTime.value) + sum(shownSubscriptions.value)
)
const shownCount = computed(() =>
  shownInstallments.value.length + shownOneTime.value.length + shownSubscriptions.value.length
)
const totalCount = computed(() =>
  props.installments.length + props.oneTime.length + props.subscriptions.length
)

// ---- Paginação (só acima de 15 itens em cada seção) ----
const pgFixed = usePagedList(computed(() => props.fixed))
const pgSubs = usePagedList(shownSubscriptions)
const pgInst = usePagedList(shownInstallments)
const pgOne = usePagedList(shownOneTime)
</script>

<template>
  <div class="glass-panel bills-panel">
    <div class="panel-header">
      <GlossaryTerm
        term="Preciso pagar"
        explanation="O que sai obrigatoriamente no ciclo: contas fixas (recorrem todo mês), assinaturas, parcelas do cartão (avançam sozinhas) e compras únicas."
      />
      <button
        class="hdr-btn hdr-btn--danger"
        title="Apagar contas fixas e fatura do cartão"
        @click="$emit('clear-bills')"
      >
        <i class="fas fa-trash"></i> Limpar
      </button>
    </div>

    <!-- ============ SEÇÃO 1: Contas fixas ============ -->
    <section class="bills-section">
      <div class="group-hdr"><i class="fas fa-house"></i> Contas fixas</div>

      <ul class="detail-list planner-list">
        <li v-for="item in pgFixed.paged.value" :key="item.id" :class="{ 'item-paid': isPaid(item.id) }">
          <div class="li-left">
            <input
              type="checkbox"
              class="chk-paid"
              :checked="isPaid(item.id)"
              :title="isPaid(item.id) ? 'Marcar como não paga' : 'Marcar como paga'"
              @change="$emit('toggle-fixed-paid', item.id)"
            />
            <div class="entry-text">
              <span>{{ item.name }}</span>
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
        <p v-if="!fixed.length" class="panel-empty">Nenhuma conta fixa neste ciclo.</p>
      </ul>
      <ListPager
        v-if="pgFixed.needsPaging.value"
        :page="pgFixed.page.value"
        :per-page="pgFixed.perPage.value"
        :total-pages="pgFixed.totalPages.value"
        :total="pgFixed.total.value"
        @update:page="pgFixed.setPage"
        @update:per-page="pgFixed.setPerPage"
      />

      <!-- Formulário: nova conta fixa -->
      <AddForm title="Nova conta fixa" submit-label="Adicionar conta" @submit="commitFixed">
        <label class="add-field add-field--grow">
          <span class="add-label">Descrição</span>
          <input v-model="fxName" placeholder="Ex.: Aluguel" @keydown.enter="commitFixed" />
        </label>
        <label class="add-field add-field--sm">
          <span class="add-label">Dia</span>
          <input v-model="fxDay" inputmode="numeric" placeholder="10" @keydown.enter="commitFixed" />
        </label>
        <label class="add-field add-field--md">
          <span class="add-label">Valor (R$)</span>
          <input v-model="fxVal" class="num" inputmode="decimal" placeholder="0,00" @keydown.enter="commitFixed" />
        </label>
      </AddForm>
    </section>

    <!-- Divisória entre contas fixas e cartão -->
    <div class="bills-divider" role="separator"></div>

    <!-- ============ SEÇÃO 2: Fatura do cartão ============ -->
    <section class="bills-section">
      <div class="group-hdr group-hdr--spread">
        <span><i class="fas fa-credit-card"></i> Fatura do cartão</span>
        <div class="hdr-actions">
          <button
            class="hdr-btn"
            :class="{ 'hdr-btn--on': cardOpen }"
            title="Configurar o ciclo de faturamento do cartão"
            @click="openCard"
          >
            <i class="fas fa-calendar-days"></i> Ciclo
          </button>
          <button class="hdr-btn" title="Importar fatura em .csv" @click="$emit('import')">
            <i class="fas fa-file-import"></i> Importar
          </button>
          <button
            class="hdr-btn"
            :class="{ 'hdr-btn--on': filterActive }"
            title="Filtrar lançamentos"
            @click="filterOpen = !filterOpen"
          >
            <i class="fas fa-filter"></i> Filtrar
          </button>
          <label class="paid-toggle">
            <input type="checkbox" class="chk-paid" :checked="invoicePaid" @change="$emit('toggle-invoice-paid')" />
            paga
          </label>
        </div>
      </div>

      <!-- Configuração do ciclo do cartão -->
      <div v-show="cardOpen" class="filter-box">
        <label class="card-toggle">
          <input type="checkbox" class="chk-paid" v-model="draft.enabled" />
          <span>
            Usar o ciclo do cartão
            <span class="item-sub">
              a fatura entra inteira no mês em que é paga, mesmo virando o mês
            </span>
          </span>
        </label>
        <div class="filter-grid" style="margin-top: 10px">
          <label class="add-field add-field--md">
            <span class="add-label">Fecha dia</span>
            <input v-model="draft.closingDay" inputmode="numeric" placeholder="15" />
          </label>
          <label class="add-field add-field--md">
            <span class="add-label">Vence dia</span>
            <input v-model="draft.dueDay" inputmode="numeric" placeholder="22" />
          </label>
        </div>
        <p class="import-hint" style="margin-top: 8px">
          Compras feitas a partir do dia do fechamento entram na fatura seguinte.
          Se o vencimento for antes do fechamento, ela vence no mês seguinte.
        </p>
        <div class="filter-foot">
          <button class="hdr-btn" @click="cardOpen = false">Cancelar</button>
          <button class="hdr-btn hdr-btn--on" @click="saveCard">
            <i class="fas fa-check"></i> Salvar ciclo
          </button>
        </div>
      </div>

      <!-- Período coberto pela fatura deste ciclo -->
      <div v-if="periodLabel" class="invoice-period">
        <i class="fas fa-calendar-days"></i> {{ periodLabel }}
      </div>

      <!-- Painel de filtros -->
      <div v-show="filterOpen" class="filter-box">
        <div class="filter-grid">
          <label class="add-field add-field--grow">
            <span class="add-label">Descrição contém</span>
            <input v-model="f.text" placeholder="Ex.: Uber" />
          </label>
          <label class="add-field add-field--md">
            <span class="add-label">Valor mín.</span>
            <input v-model="f.min" class="num" inputmode="decimal" placeholder="0,00" />
          </label>
          <label class="add-field add-field--md">
            <span class="add-label">Valor máx.</span>
            <input v-model="f.max" class="num" inputmode="decimal" placeholder="0,00" />
          </label>
          <label class="add-field add-field--md">
            <span class="add-label">De</span>
            <input v-model="f.from" type="date" />
          </label>
          <label class="add-field add-field--md">
            <span class="add-label">Até</span>
            <input v-model="f.to" type="date" />
          </label>
          <label v-if="categories.length" class="add-field add-field--md">
            <span class="add-label">Categoria</span>
            <select v-model="f.category">
              <option value="">todas</option>
              <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
            </select>
          </label>
        </div>
        <div class="filter-foot">
          <button class="hdr-btn" @click="clearFilter"><i class="fas fa-eraser"></i> Limpar</button>
          <span class="item-sub">{{ shownCount }} de {{ totalCount }} lançamento(s)</span>
        </div>
      </div>

      <!-- Subtotal do filtro -->
      <div v-if="filterActive" class="filter-subtotal">
        <span><i class="fas fa-filter"></i> Subtotal do filtro ({{ shownCount }} item(ns))</span>
        <strong class="hide-value" :class="{ 'value-hidden': isHidden }">{{ formatCurrency(subtotal) }}</strong>
      </div>

      <!-- Assinaturas: mensalidades recorrentes, canceláveis a qualquer momento -->
      <div class="sub-hdr"><i class="fas fa-repeat"></i> assinaturas — mensais até você cancelar</div>
      <ul class="detail-list planner-list">
        <li v-for="item in pgSubs.paged.value" :key="item.id">
          <div class="li-left">
            <i class="fas fa-repeat li-ic"></i>
            <div class="entry-text">
              <span>{{ item.name }}</span>
              <span class="item-sub">assinatura · dia {{ item.day }}</span>
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
              class="cancel-sub"
              title="Cancelar assinatura (deixa de ser cobrada a partir deste mês)"
              @click="$emit('remove', { plannerKind: 'subscription', id: item.id, nome: item.name })"
            >
              Cancelar
            </button>
          </div>
        </li>
        <p v-if="!shownSubscriptions.length" class="panel-empty">
          {{ filterActive && subscriptions.length ? 'Nenhuma assinatura no filtro.' : 'Sem assinaturas neste ciclo.' }}
        </p>
      </ul>
      <ListPager
        v-if="pgSubs.needsPaging.value"
        :page="pgSubs.page.value"
        :per-page="pgSubs.perPage.value"
        :total-pages="pgSubs.totalPages.value"
        :total="pgSubs.total.value"
        @update:page="pgSubs.setPage"
        @update:per-page="pgSubs.setPerPage"
      />

      <!-- Formulário: nova assinatura -->
      <AddForm title="Nova assinatura" submit-label="Adicionar assinatura" @submit="commitSubscription">
        <label class="add-field add-field--grow">
          <span class="add-label">Serviço</span>
          <input v-model="sName" placeholder="Ex.: Spotify" @keydown.enter="commitSubscription" />
        </label>
        <label class="add-field add-field--sm">
          <span class="add-label">Dia</span>
          <input v-model="sDay" inputmode="numeric" placeholder="10" @keydown.enter="commitSubscription" />
        </label>
        <label class="add-field add-field--md">
          <span class="add-label">Valor (R$)</span>
          <input v-model="sVal" class="num" inputmode="decimal" placeholder="0,00" @keydown.enter="commitSubscription" />
        </label>
      </AddForm>

      <div class="sub-hdr"><i class="fas fa-rotate"></i> parcelas — repetem todo mês</div>
      <ul class="detail-list planner-list">
        <li v-for="item in pgInst.paged.value" :key="item.id">
          <div class="li-left">
            <i class="fas fa-rotate li-ic"></i>
            <div class="entry-text">
              <span>{{ item.name }}</span>
              <span class="item-sub">
                parcela {{ item.parcela }}/{{ item.total }}
                <template v-if="item.data"> · {{ fmtDate(item.data) }}</template>
                <template v-if="item.categoria"> · {{ item.categoria }}</template>
              </span>
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
        <p v-if="!shownInstallments.length" class="panel-empty">
          {{ filterActive && installments.length ? 'Nenhuma parcela no filtro.' : 'Sem parcelas neste ciclo.' }}
        </p>
      </ul>
      <ListPager
        v-if="pgInst.needsPaging.value"
        :page="pgInst.page.value"
        :per-page="pgInst.perPage.value"
        :total-pages="pgInst.totalPages.value"
        :total="pgInst.total.value"
        @update:page="pgInst.setPage"
        @update:per-page="pgInst.setPerPage"
      />

      <!-- Formulário: nova parcela -->
      <AddForm title="Nova parcela" submit-label="Adicionar parcela" @submit="commitInstallment">
        <label class="add-field add-field--grow">
          <span class="add-label">Descrição</span>
          <input v-model="rName" placeholder="Ex.: Notebook" @keydown.enter="commitInstallment" />
        </label>
        <label class="add-field add-field--sm">
          <span class="add-label">Parcela</span>
          <input v-model="rPar" placeholder="3/10" @keydown.enter="commitInstallment" />
        </label>
        <label class="add-field add-field--md">
          <span class="add-label">Valor (R$)</span>
          <input v-model="rVal" class="num" inputmode="decimal" placeholder="0,00" @keydown.enter="commitInstallment" />
        </label>
      </AddForm>

      <div class="sub-hdr"><i class="fas fa-bag-shopping"></i> compras únicas — não repetem</div>
      <ul class="detail-list planner-list">
        <li v-for="item in pgOne.paged.value" :key="item.id">
          <div class="li-left">
            <i class="fas fa-bag-shopping li-ic"></i>
            <div class="entry-text">
              <span>{{ item.name }}</span>
              <span class="item-sub">
                <template v-if="item.data">{{ fmtDate(item.data) }}</template>
                <template v-else>compra única</template>
                <template v-if="item.categoria"> · {{ item.categoria }}</template>
              </span>
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
              class="btn-icon-sub"
              title="Transformar em assinatura mensal"
              @click="$emit('to-subscription', item.id)"
            >
              <i class="fas fa-repeat"></i>
            </button>
            <button
              class="btn-remove"
              @click="$emit('remove', { plannerKind: 'onetime', id: item.id, nome: item.name })"
              title="Remover"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>
        </li>
        <p v-if="!shownOneTime.length" class="panel-empty">
          {{ filterActive && oneTime.length ? 'Nenhuma compra no filtro.' : 'Sem compras únicas neste ciclo.' }}
        </p>
      </ul>
      <ListPager
        v-if="pgOne.needsPaging.value"
        :page="pgOne.page.value"
        :per-page="pgOne.perPage.value"
        :total-pages="pgOne.totalPages.value"
        :total="pgOne.total.value"
        @update:page="pgOne.setPage"
        @update:per-page="pgOne.setPerPage"
      />

      <!-- Formulário: nova compra única -->
      <AddForm title="Nova compra única" submit-label="Adicionar compra" @submit="commitOneTime">
        <label class="add-field add-field--grow">
          <span class="add-label">Descrição</span>
          <input v-model="oName" placeholder="Ex.: Tênis" @keydown.enter="commitOneTime" />
        </label>
        <label class="add-field add-field--md">
          <span class="add-label">Valor (R$)</span>
          <input v-model="oVal" class="num" inputmode="decimal" placeholder="0,00" @keydown.enter="commitOneTime" />
        </label>
      </AddForm>

      <div class="inv-total">
        <span>Fatura total</span>
        <span
          class="hide-value"
          :class="{ 'value-hidden': isHidden }"
          style="color: var(--danger-soft)"
        >{{ formatCurrency(totalInvoice) }}</span>
      </div>
      <div class="sub-inv hide-value" :class="{ 'value-hidden': isHidden }">
        <span>assinaturas <b>{{ formatCurrency(totalSubscriptions) }}</b></span>
        <span>parcelas <b>{{ formatCurrency(totalInstallments) }}</b></span>
        <span>únicas <b>{{ formatCurrency(totalOneTime) }}</b></span>
      </div>
    </section>

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
