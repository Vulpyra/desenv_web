<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { getSession } = useAuth()

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

const goBack = () => router.push('/')

const resetForm = () => {
  Object.keys(form).forEach((key) => {
    form[key] = ''
  })
}

const submitForm = async () => {
  const session = await getSession()
  
  if (!session) {
    alert('Sessão expirada. Faça login novamente.')
    router.push('/auth')
    return
  }

  const uid = session.user.id
  const operacoes = []

  if (form.nome) {
    operacoes.push(
      supabase
        .from('profiles')
        .update({ nome: form.nome })
        .eq('id', uid)
    )
  }

  if (form.salario) {
    operacoes.push(
      supabase
        .from('rendas')
        .insert({
          usuario_id: uid,
          nome: 'Salário',
          valor: Number(form.salario),
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
      supabase
        .from('despesas')
        .insert(
          despesasParaInserir.map(d => ({
            usuario_id: uid,
            nome: d.nome,
            valor: Number(d.campo),
            is_fixa: true,
          }))
        )
    )
  }

  operacoes.push(
    supabase
      .from('simulados')
      .insert({
        usuario_id: uid,
        cpf: form.cpf || null,
        idade: form.idade ? Number(form.idade) : null,
        dependentes: form.dependentes ? Number(form.dependentes) : null,
        observacoes: form.observacoes || null,
      })
  )

  const resultados = await Promise.all(operacoes)
  const erros = resultados.filter(r => r.error).map(r => r.error.message)

  if (erros.length > 0) {
    alert('Erros ao salvar:\n' + erros.join('\n'))
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
          <i class="far fa-user-circle"></i>
        </div>
      </header>

      <section class="main-content simulado-layout">
        <form class="form-panel glass-panel" @submit.prevent="submitForm" @reset.prevent="resetForm">
          <div class="section-heading">
            <p>Informacoes pessoais</p>
            <h2>Cadastro do usuario</h2>
          </div>

          <div class="field-grid two-cols">
            <label class="field full-span">
              <span>Nome completo</span>
              <input v-model="form.nome" type="text" name="nome" placeholder="Digite o nome completo">
            </label>

            <label class="field">
              <span>CPF</span>
              <input
                v-model="form.cpf"
                type="text"
                name="cpf"
                placeholder="000.000.000-00"
                inputmode="numeric"
              >
            </label>

            <label class="field">
              <span>Idade</span>
              <input v-model="form.idade" type="number" name="idade" min="0" max="120" placeholder="Ex.: 32">
            </label>

            <label class="field">
              <span>Salario mensal</span>
              <input
                v-model="form.salario"
                type="number"
                name="salario"
                min="0"
                step="0.01"
                placeholder="Ex.: 8500,00"
              >
            </label>

            <label class="field">
              <span>Dependentes</span>
              <input
                v-model="form.dependentes"
                type="number"
                name="dependentes"
                min="0"
                max="20"
                placeholder="0"
              >
            </label>
          </div>

          <div class="section-heading spacing-top">
            <p>Investimentos dedutiveis</p>
            <h2>Aplicacoes e despesas</h2>
          </div>

          <div class="field-grid three-cols">
            <label class="field">
              <span>Saude</span>
              <input v-model="form.saude" type="number" name="saude" min="0" step="0.01" placeholder="Ex.: 500,00">
            </label>

            <label class="field">
              <span>Educacao</span>
              <input
                v-model="form.educacao"
                type="number"
                name="educacao"
                min="0"
                step="0.01"
                placeholder="Ex.: 300,00"
              >
            </label>

            <label class="field">
              <span>PGBL</span>
              <input v-model="form.pgbl" type="number" name="pgbl" min="0" step="0.01" placeholder="Ex.: 700,00">
            </label>

            <label class="field full-span">
              <span>Observacoes</span>
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
            <button type="submit" class="btn-main-action">Gerar simulacao</button>
          </div>
        </form>

        <aside class="summary-panel glass-panel">
          <div class="section-heading">
            <p>Resumo</p>
            <h2>Previa da simulacao</h2>
          </div>

          <div class="summary-item">
            <span class="summary-label">Base mensal</span>
            <strong>Automatica</strong>
          </div>

          <div class="summary-item">
            <span class="summary-label">Deducao potencial</span>
            <strong>Saude, educacao e PGBL</strong>
          </div>

          <div class="summary-item">
            <span class="summary-label">Status</span>
            <strong>Pronto para calculo</strong>
          </div>

          <div class="summary-chart">
            <div class="pie-chart"></div>
            <p>
              Os dados inseridos vao alimentar a distribuicao da renda dedutivel e nao dedutivel.
            </p>
          </div>
        </aside>
      </section>
    </div>
  </div>
</template>