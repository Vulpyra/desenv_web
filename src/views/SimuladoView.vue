<script setup>
import { reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/composables/useAuth'
import { useCurrency } from '@/composables/useCurrency'

const router = useRouter()
const { getSession } = useAuth()
const { parseCurrency, maskCurrency, formatCurrency } = useCurrency()

const LIMITE_MOEDA = 99999999

const form = reactive({
  nome: '',
  cpf: '',
  idade: '',
  salario: '',
  dependentes: '',
  saude: '',
  educacao: '',
  pgbl: '',
  observacoes: '',
})

const erros = reactive({
  cpf: '',
  salario: '',
  saude: '',
  educacao: '',
  pgbl: '',
})

const loadFormsData = async () => {
  const session = await getSession()

  if (!session) {
    alert('Sessão expirada. Faça login novamente.')
    router.push('/auth')
    return
  }

  const uid = session.user.id
  
  const [
  { data: simuladoData }
  ] = await Promise.all([
    supabase.from('simulados').select('*').eq('usuario_id', uid)
  ])

  if(!simuladoData) return;
    
  const row = simuladoData?.[0]
  if (!row) return

  form.nome        = row.nome        ?? ''
  form.cpf         = row.cpf         ? formatCPF(row.cpf) : ''
  form.idade       = row.idade       ?? ''
  form.dependentes = row.dependentes ?? ''
  form.observacoes = row.observacoes ?? ''
  form.salario     = row.salario     ? formatCurrency(row.salario)   : ''
  form.saude       = row.saude       ? formatCurrency(row.saude)     : ''
  form.educacao    = row.educacao    ? formatCurrency(row.educacao)  : ''
  form.pgbl        = row.pgbl        ? formatCurrency(row.pgbl)      : ''

  console.log(`salario: ${form.salario}`)
}

const formatCPF = (valor) => {
  const digits = valor.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

const onCPFInput = (e) => {
  form.cpf = formatCPF(e.target.value)
  erros.cpf = ''
}

const onCPFKeydown = (e) => {
  const permitidas = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
  if (permitidas.includes(e.key)) return
  if (!/^\d$/.test(e.key)) e.preventDefault()
}

const validarCPF = (cpf) => {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return false
  if (/^(\d)\1{10}$/.test(digits)) return false
  const calc = (mod) => {
    let sum = 0
    for (let i = 0; i < mod - 1; i++) sum += parseInt(digits[i]) * (mod - i)
    const rest = (sum * 10) % 11
    return rest === 10 || rest === 11 ? 0 : rest
  }
  return calc(10) === parseInt(digits[9]) && calc(11) === parseInt(digits[10])
}

const onCPFBlur = () => {
  if (!form.cpf) return
  const digits = form.cpf.replace(/\D/g, '')
  if (digits.length < 11) {
    erros.cpf = 'CPF incompleto. Deve ter 11 dígitos.'
  } else if (!validarCPF(form.cpf)) {
    erros.cpf = 'CPF inválido.'
  } else {
    erros.cpf = ''
  }
}


const onCurrencyInput = (field, event) => {
  const digits = event.target.value.replace(/\D/g, '')
  const num = parseInt(digits || '0', 10) / 100

  if (num > LIMITE_MOEDA) {
    erros[field] = `O valor deve ser menor ou igual a R$ ${LIMITE_MOEDA.toLocaleString('pt-BR')},00.`
    event.target.value = form[field] // reverte para o valor anterior
    return
  }

  erros[field] = ''
  maskCurrency(event)
  form[field] = event.target.value
}


onMounted(loadFormsData)

const goBack = () => router.push('/')
const goToProfile = () => router.push('/perfil')


const resetForm = () => {
  Object.keys(form).forEach((key) => (form[key] = ''))
  Object.keys(erros).forEach((key) => (erros[key] = ''))
}

const submitForm = async () => {
  if (form.cpf && !validarCPF(form.cpf)) {
    erros.cpf = 'CPF inválido.'
    return
  }

  if (Object.values(erros).some(e => e)) return

  const session = await getSession()

  if (!session) {
    alert('Sessão expirada. Faça login novamente.')
    router.push('/auth')
    return
  }

  const uid = session.user.id

  await supabase.from('simulados').delete().eq('usuario_id', uid)

  const operacoes = []

  if (form.nome) {
    operacoes.push(
      supabase.from('profiles').update({ nome: form.nome }).eq('id', uid)
    )
  }

  if (form.salario) {
    operacoes.push(
      supabase.from('rendas').insert({
        usuario_id: uid,
        nome: 'Salário',
        valor: parseCurrency(form.salario),
      })
    )
  }

  const despesasParaInserir = [
    { nome: 'Saúde', campo: form.saude },
    { nome: 'Educação', campo: form.educacao },
    { nome: 'PGBL', campo: form.pgbl },
  ].filter(d => d.campo)

  if (despesasParaInserir.length > 0) {
    operacoes.push(
      supabase.from('despesas').insert(
        despesasParaInserir.map(d => ({
          usuario_id: uid,
          nome: d.nome,
          valor: parseCurrency(d.campo),
          is_fixa: true,
        }))
      )
    )
  }

  operacoes.push(
    supabase.from('simulados').insert({
      usuario_id: uid,
      nome: form.nome,
      cpf: form.cpf || null,
      idade: form.idade ? Number(form.idade) : null,
      salario: Number(parseCurrency(form.salario)),
      dependentes: form.dependentes ? Number(form.dependentes) : null,
      saude: Number(parseCurrency(form.saude)),
      educacao: Number(parseCurrency(form.educacao)),
      pgbl: Number(parseCurrency(form.pgbl)),
      observacoes: form.observacoes || null,
    })
  )

  const resultados = await Promise.all(operacoes)
  const errosSalvo = resultados.filter(r => r.error).map(r => r.error.message)

  if (errosSalvo.length > 0) {
    alert('Erros ao salvar:\n' + errosSalvo.join('\n'))
  } else {
    alert('Simulação salva com sucesso!')
    resetForm()
    router.push('/')
  }
}
</script>

<template>
  <div class="bg-scene" aria-hidden="true">
    <span class="glow orb-a"></span>
    <span class="glow orb-b"></span>
    <span class="glow orb-c"></span>
    <span class="noise-layer"></span>
  </div>

  <div class="dashboard-shell simulado-shell">
    <span class="particle-stream" aria-hidden="true"></span>
    <div class="dashboard">
      <header class="top-bar">
        <img
          class="return-icon"
          src="/images/icons/return-svgrepo-com.svg"
          alt="Voltar"
          @click="goBack"
        >
        <div class="top-title">
          <span class="eyebrow">Simulado financeiro</span>
          <h1>Dados do contribuinte</h1>
        </div>
        <div class="top-icons">
          <i class="far fa-user-circle" @click="goToProfile" title="Meu Perfil" style="cursor: pointer"></i>
        </div>
      </header>

      <section class="main-content simulado-layout">
        <form class="form-panel glass-panel" @submit.prevent="submitForm" @reset.prevent="resetForm">
          <div class="section-heading">
            <p>Informações pessoais</p>
            <h2>Cadastro do usuário</h2>
          </div>

          <div class="field-grid two-cols">
            <label class="field full-span">
              <span>Nome completo</span>
              <input v-model="form.nome" type="text" name="nome" placeholder="Digite o nome completo" maxlength="50">
            </label>

            <label class="field">
              <span>CPF</span>
              <input
                :value="form.cpf"
                type="text"
                name="cpf"
                placeholder="000.000.000-00"
                inputmode="numeric"
                maxlength="14"
                @input="onCPFInput"
                @keydown="onCPFKeydown"
                @blur="onCPFBlur"
              >
              <span v-if="erros.cpf" class="field-error">{{ erros.cpf }}</span>
            </label>

            <label class="field">
              <span>Idade</span>
              <input
                v-model="form.idade"
                type="number"
                name="idade"
                min="0"
                max="120"
                step="1"
                placeholder="Ex.: 32"
              >
            </label>

            <label class="field">
              <span>Salário mensal</span>
              <input
                :value="form.salario"
                type="text"
                name="salario"
                inputmode="numeric"
                placeholder="R$ 0,00"
                @input="onCurrencyInput('salario', $event)"
              >
              <span v-if="erros.salario" class="field-error">{{ erros.salario }}</span>
            </label>

            <label class="field">
              <span>Dependentes</span>
              <input
                v-model="form.dependentes"
                type="number"
                name="dependentes"
                min="0"
                max="50"
                step="1"
                placeholder="Ex.: 2"
              >
            </label>
          </div>

          <div class="section-heading spacing-top">
            <p>Investimentos dedutíveis</p>
            <h2>Aplicações e despesas</h2>
          </div>

          <div class="field-grid three-cols">
            <label class="field">
              <span>Saúde</span>
              <input
                :value="form.saude"
                type="text"
                name="saude"
                inputmode="numeric"
                placeholder="R$ 0,00"
                @input="onCurrencyInput('saude', $event)"
              >
              <span v-if="erros.saude" class="field-error">{{ erros.saude }}</span>
            </label>

            <label class="field">
              <span>Educação</span>
              <input
                :value="form.educacao"
                type="text"
                name="educacao"
                inputmode="numeric"
                placeholder="R$ 0,00"
                @input="onCurrencyInput('educacao', $event)"
              >
              <span v-if="erros.educacao" class="field-error">{{ erros.educacao }}</span>
            </label>

            <label class="field">
              <span>PGBL</span>
              <input
                :value="form.pgbl"
                type="text"
                name="pgbl"
                inputmode="numeric"
                placeholder="R$ 0,00"
                @input="onCurrencyInput('pgbl', $event)"
              >
              <span v-if="erros.pgbl" class="field-error">{{ erros.pgbl }}</span>
            </label>

            <label class="field full-span">
              <span>Observações</span>
              <textarea
                v-model="form.observacoes"
                name="observacoes"
                rows="4"
                placeholder="Descreva outras despesas ou detalhes relevantes"
              ></textarea>
            </label>
          </div>

          <div class="form-actions">
            <button type="reset" class="btn-outline">Limpar</button>
            <button type="submit" class="btn-main-action">Gerar simulação</button>
          </div>
        </form>

        <aside class="summary-panel glass-panel">
          <div class="section-heading">
            <p>Resumo</p>
            <h2>Prévia da simulação</h2>
          </div>

          <div class="summary-item">
            <span class="summary-label">Base mensal</span>
            <strong>Automática</strong>
          </div>

          <div class="summary-item">
            <span class="summary-label">Dedução potencial</span>
            <strong>Saúde, educação e PGBL</strong>
          </div>

          <div class="summary-item">
            <span class="summary-label">Status</span>
            <strong>Pronto para cálculo</strong>
          </div>

          <div class="summary-chart">
            <div class="pie-chart"></div>
            <p>
              Os dados inseridos vão alimentar a distribuição da renda dedutível e não dedutível.
            </p>
          </div>
        </aside>
      </section>
    </div>
  </div>
</template>

<style scoped>
.field-error {
  display: block;
  margin-top: 4px;
  font-size: 0.75rem;
  color: #ff6b6b;
}
</style>