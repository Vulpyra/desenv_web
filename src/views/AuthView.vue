<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { isLoading, error, signIn, signUp } = useAuth()

const isLoginMode = ref(true)
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const successMessage = ref('')

const toggleMode = () => {
  isLoginMode.value = !isLoginMode.value
  error.value = null
  successMessage.value = ''
  password.value = ''
  confirmPassword.value = ''
}

const handleSubmit = async () => {
  error.value = null
  successMessage.value = ''

  if (!email.value.trim() || !password.value) {
    error.value = 'Preencha e-mail e senha.'
    return
  }

  if (!isLoginMode.value) {
    if (password.value !== confirmPassword.value) {
      error.value = 'As senhas não coincidem.'
      return
    }
    if (password.value.length < 6) {
      error.value = 'A senha deve ter pelo menos 6 caracteres.'
      return
    }
    const result = await signUp(email.value.trim(), password.value)
    if (result.success) {
      successMessage.value = 'Conta criada! Verifique seu e-mail para confirmar o cadastro.'
      isLoginMode.value = true
      password.value = ''
      confirmPassword.value = ''
    }
    return
  }

  const result = await signIn(email.value.trim(), password.value)
  if (result.success) {
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

  <div class="auth-shell">
    <div class="dashboard auth-card">
      <div class="auth-header">
        <div class="brand-mark" style="justify-content: center; margin-bottom: 8px">
          <span class="brand-text">Dashboard Financeiro</span>
        </div>
        <p class="auth-subtitle">
          {{ isLoginMode ? 'Entre na sua conta' : 'Crie sua conta' }}
        </p>
      </div>

      <form class="auth-form" @submit.prevent="handleSubmit" novalidate>
        <div class="field">
          <input
            v-model="email"
            type="email"
            placeholder="E-mail"
            class="modal-input"
            autocomplete="email"
            :disabled="isLoading"
          />
        </div>

        <div class="field">
          <input
            v-model="password"
            type="password"
            placeholder="Senha"
            class="modal-input"
            autocomplete="current-password"
            :disabled="isLoading"
          />
        </div>

        <div v-if="!isLoginMode" class="field">
          <input
            v-model="confirmPassword"
            type="password"
            placeholder="Confirmar senha"
            class="modal-input"
            autocomplete="new-password"
            :disabled="isLoading"
          />
        </div>

        <p v-if="error" class="auth-error">
          <i class="fas fa-exclamation-circle"></i>
          {{ error }}
        </p>

        <p v-if="successMessage" class="auth-success">
          <i class="fas fa-check-circle"></i>
          {{ successMessage }}
        </p>

        <button
          type="submit"
          class="btn-main-action"
          :disabled="isLoading"
          style="margin-top: 8px"
        >
          <span v-if="isLoading">
            <i class="fas fa-spinner fa-spin" style="margin-right: 8px"></i>
            Aguarde...
          </span>
          <span v-else>{{ isLoginMode ? 'Entrar' : 'Criar conta' }}</span>
        </button>
      </form>

      <div class="auth-toggle">
        <span>{{ isLoginMode ? 'Não tem conta?' : 'Já tem conta?' }}</span>
        <button class="auth-toggle-btn" @click="toggleMode" :disabled="isLoading">
          {{ isLoginMode ? 'Cadastre-se' : 'Fazer login' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-shell {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  width: 100%;
  position: relative;
  z-index: 1;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  padding: 40px 36px;
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;
}

.auth-subtitle {
  color: var(--text-soft);
  font-size: 0.95rem;
  margin-top: 6px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-error {
  color: var(--danger-soft);
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 133, 153, 0.08);
  border: 1px solid rgba(255, 133, 153, 0.2);
  border-radius: 10px;
  padding: 10px 14px;
}

.auth-success {
  color: var(--accent-cyan);
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(120, 200, 231, 0.08);
  border: 1px solid rgba(120, 200, 231, 0.2);
  border-radius: 10px;
  padding: 10px 14px;
}

.auth-toggle {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
  font-size: 0.9rem;
  color: var(--text-soft);
}

.auth-toggle-btn {
  background: none;
  border: none;
  color: var(--accent-cyan);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 700;
  padding: 0;
  transition: opacity 0.2s;
}

.auth-toggle-btn:hover {
  opacity: 0.75;
}

.auth-toggle-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-main-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
</style>
