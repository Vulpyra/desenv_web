<script setup>
import { ref, watch, computed } from 'vue'
import { useCurrency } from '@/composables/useCurrency'

const props = defineProps({
  isOpen: Boolean,
  entry: Object,      // { id, nome, valor, tipo: 'renda'|'despesa', data }
  allNames: Array     // all current names excluding this entry's own
})

const emit = defineEmits(['close', 'save'])

const { maskCurrency, parseCurrency, formatCurrency } = useCurrency()

const nome = ref('')
const valorRaw = ref('')
const tipo = ref('renda')

watch(() => props.isOpen, (open) => {
  if (open && props.entry) {
    nome.value = props.entry.nome ?? ''
    valorRaw.value = formatCurrency(props.entry.valor ?? 0)
    tipo.value = props.entry.tipo ?? 'renda'
  }
})

const nameWarning = computed(() => {
  const n = nome.value.trim()
  if (!n || n.toLowerCase() === (props.entry?.nome ?? '').toLowerCase()) return null
  const existing = (props.allNames || []).map(x => x.toLowerCase())
  if (!existing.includes(n.toLowerCase())) return null
  let counter = 1
  while (existing.includes(`${n}(${counter})`.toLowerCase())) counter++
  return `O nome '${n}' já existe. Este item será nomeado: '${n}(${counter})'`
})

const resolvedNome = computed(() => {
  if (!nameWarning.value) return nome.value.trim()
  const match = nameWarning.value.match(/será nomeado: '(.+)'$/)
  return match ? match[1] : nome.value.trim()
})

const handleValorInput = (e) => {
  maskCurrency(e)
  valorRaw.value = e.target.value
}

const handleSave = () => {
  const valor = parseCurrency(valorRaw.value)
  if (!resolvedNome.value || !valor) return
  emit('save', {
    id: props.entry.id,
    tipoOriginal: props.entry.tipo,
    nome: resolvedNome.value,
    valor,
    tipo: tipo.value,
    data: props.entry.data
  })
  emit('close')
}

const close = () => emit('close')
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click.self="close" role="dialog" aria-modal="true" aria-label="Editar entrada">
      <div class="glass-panel modal-content edit-entry-modal">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px">
          <h3 class="panel-title" style="margin: 0">Editar Entrada</h3>
          <button class="btn-icon-edit" @click="close" title="Fechar (Esc)">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="modal-body">
          <!-- Category toggle -->
          <div class="edit-toggle-row">
            <span class="edit-toggle-label">Tipo</span>
              <button
                class="type-toggle"
                :class="tipo === 'renda' ? 'toggle-renda' : 'toggle-despesa'"
                @click="tipo = tipo === 'renda' ? 'despesa' : 'renda'"
                type="button">
              <span class="toggle-knob"></span>
              <span class="toggle-text">{{ tipo === 'renda' ? 'Renda' : 'Despesa' }}</span>
            </button>
          </div>

          <!-- Name input -->
          <input
            v-model="nome"
            placeholder="Nome da entrada"
            class="modal-input"
          />
          <p v-if="nameWarning" class="modal-field-warning">
            <i class="fas fa-circle-exclamation" style="margin-right: 4px"></i>{{ nameWarning }}
          </p>

          <!-- Value input -->
          <input
            :value="valorRaw"
            placeholder="Valor (ex: R$ 1.000,00)"
            class="modal-input"
            @input="handleValorInput"
          />
        </div>

        <div class="modal-actions">
          <button class="btn-outline" style="padding: 10px 20px" @click="close">Cancelar</button>
          <button class="btn-main-action" style="padding: 10px 20px; font-size: 1rem; width: auto" @click="handleSave">
            Salvar
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.edit-entry-modal {
  width: min(420px, 95vw);
}

.edit-toggle-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
}

.edit-toggle-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-soft);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  min-width: 32px;
}

/* Square toggle with sliding knob */
.type-toggle {
  position: relative;
  display: flex;
  align-items: center;
  width: 132px;
  height: 34px;
  border-radius: 8px;
  border: 2px solid;
  cursor: pointer;
  background: none;
  padding: 0;
  transition: border-color 0.22s, background 0.22s;
  overflow: hidden;
  flex-shrink: 0;
}

.toggle-renda {
  border-color: var(--accent-cyan, #38bdf8);
  background: rgba(56, 189, 248, 0.12);
}

.toggle-despesa {
  border-color: var(--danger-soft, #ff8599);
  background: rgba(255, 133, 153, 0.12);
}

.toggle-knob {
  position: absolute;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  transition: transform 0.22s cubic-bezier(.4,0,.2,1), background 0.22s;
}

.toggle-renda .toggle-knob {
  transform: translateX(3px);
  background: var(--accent-cyan, #38bdf8);
}

.toggle-despesa .toggle-knob {
  transform: translateX(100px);
  background: var(--danger-soft, #ff8599);
}

.toggle-text {
  position: absolute;
  width: 100%;
  text-align: center;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  transition: color 0.22s;
  pointer-events: none;
}

.toggle-renda .toggle-text {
  color: var(--accent-cyan, #38bdf8);
}

.toggle-despesa .toggle-text {
  color: var(--danger-soft, #ff8599);
}
</style>
