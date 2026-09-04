<script setup>
import { ref, computed } from 'vue'
import { parseInvoiceCSV } from '@/utils/csvImport'
import { useCurrency } from '@/composables/useCurrency'

defineProps({ isOpen: Boolean })
const emit = defineEmits(['close', 'confirm'])

const { formatCurrency } = useCurrency()

const fileName = ref('')
const result = ref(null)
const parseError = ref('')
const isBusy = ref(false)

const FIELD_LABELS = { date: 'Data', name: 'Descrição', amount: 'Valor', category: 'Categoria', type: 'Tipo/Parcela' }

const reset = () => {
  fileName.value = ''
  result.value = null
  parseError.value = ''
  isBusy.value = false
}

const close = () => { reset(); emit('close') }

const handleFile = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  fileName.value = file.name
  parseError.value = ''
  isBusy.value = true
  try {
    const text = await file.text()
    result.value = parseInvoiceCSV(text)
    if (result.value.missing.length) {
      parseError.value =
        'Não encontrei as colunas: ' +
        result.value.missing.map((f) => FIELD_LABELS[f]).join(', ') +
        '. Verifique o cabeçalho do arquivo.'
    }
  } catch (e) {
    parseError.value = 'Não consegui ler o arquivo: ' + e.message
  } finally {
    isBusy.value = false
  }
}

const entries = computed(() => result.value?.entries || [])
const totalValue = computed(() => entries.value.reduce((a, e) => a + e.amount, 0))
const preview = computed(() => entries.value.slice(0, 8))

const fmtDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const confirm = () => {
  if (!entries.value.length) return
  emit('confirm', entries.value)
  reset()
}
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click.self="close" role="dialog" aria-modal="true" aria-label="Importar fatura">
      <div class="glass-panel modal-content import-modal">
        <div class="modal-header">
          <h3 class="panel-title" style="margin: 0">Importar fatura (.csv)</h3>
          <button class="btn-icon-edit" @click="close" title="Fechar"><i class="fas fa-times"></i></button>
        </div>

        <div class="modal-body">
          <p class="import-hint">
            Selecione o CSV da fatura do seu banco. As colunas são detectadas pelo nome —
            <b>data</b>, <b>descrição</b> (ou "Lançamento"/"nome") e <b>valor</b> são obrigatórias;
            <b>categoria</b> e <b>tipo</b> (ex.: "Parcela 1/4") são usadas quando existem.
          </p>

          <label class="file-drop">
            <i class="fas fa-file-csv"></i>
            <span>{{ fileName || 'Escolher arquivo .csv' }}</span>
            <input type="file" accept=".csv,text/csv,text/plain" @change="handleFile" />
          </label>

          <p v-if="isBusy" class="import-hint">Lendo arquivo…</p>
          <p v-if="parseError" class="import-error">
            <i class="fas fa-circle-exclamation"></i> {{ parseError }}
          </p>

          <template v-if="result && !parseError">
            <!-- Colunas reconhecidas -->
            <div class="import-mapping">
              <span
                v-for="(header, field) in result.mapping"
                :key="field"
                class="map-chip"
              >
                {{ FIELD_LABELS[field] }} <i class="fas fa-arrow-right"></i> {{ header }}
              </span>
            </div>

            <div class="import-summary">
              <div>
                <strong>{{ entries.length }}</strong> lançamento(s) prontos
                <span v-if="result.skipped.length" class="item-sub">
                  · {{ result.skipped.length }} ignorado(s)
                </span>
              </div>
              <strong style="color: var(--danger-soft)">{{ formatCurrency(totalValue) }}</strong>
            </div>

            <ul class="import-preview">
              <li v-for="(e, i) in preview" :key="i">
                <span class="ip-date">{{ fmtDate(e.date) }}</span>
                <span class="ip-name">
                  {{ e.name }}
                  <span v-if="e.kind === 'installment'" class="ip-tag">
                    {{ e.parcelaAtual }}/{{ e.parcelaTotal }}
                  </span>
                  <span v-else-if="e.kind === 'subscription'" class="ip-tag ip-tag--sub">
                    assinatura
                  </span>
                </span>
                <span class="ip-val">{{ formatCurrency(e.amount) }}</span>
              </li>
              <li v-if="entries.length > preview.length" class="ip-more">
                + {{ entries.length - preview.length }} outro(s)…
              </li>
            </ul>

            <details v-if="result.skipped.length" class="import-skipped">
              <summary>{{ result.skipped.length }} linha(s) ignorada(s)</summary>
              <ul>
                <li v-for="(s, i) in result.skipped.slice(0, 10)" :key="i">
                  linha {{ s.line }} — {{ s.reason }}
                </li>
              </ul>
            </details>

            <p class="import-hint">
              Lançamentos de meses diferentes vão para o ciclo correspondente.
              Itens já importados antes não são duplicados.
            </p>
          </template>
        </div>

        <div class="modal-actions">
          <button class="btn-outline" style="padding: 10px 20px" @click="close">Cancelar</button>
          <button
            class="btn-main-action"
            style="padding: 10px 20px; font-size: 1rem; width: auto"
            :disabled="!entries.length"
            @click="confirm"
          >
            Importar {{ entries.length ? entries.length : '' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
