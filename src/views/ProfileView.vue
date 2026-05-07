<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Dados do perfil (mockados inicialmente)
const profile = ref({
  name: 'Usuário',
  email: 'usuario@email.com',
  avatar: null,
  createdAt: '2024-01-15'
})

// Preferências do usuário
const preferences = ref({
  currency: 'BRL',
  theme: 'dark',
  notifications: true,
  hideValues: false
})

// Navegação
const goToDashboard = () => {
  router.push('/')
}

const goToSimulado = () => {
  router.push('/simulado')
}
</script>

<template>
  <div class="bg-scene" aria-hidden="true">
    <span class="glow orb-a"></span>
    <span class="glow orb-b"></span>
    <span class="glow orb-c"></span>
    <span class="noise-layer"></span>
  </div>

  <div class="dashboard-shell">
    <span class="particle-stream" aria-hidden="true"></span>

    <div class="dashboard profile-page">
      <!-- Header -->
      <header class="top-bar">
        <div class="brand-mark" @click="goToDashboard" style="cursor: pointer">
          <span class="brand-text">← Voltar ao Dashboard</span>
        </div>
        <div class="top-icons">
          <i class="far fa-chart-bar" @click="goToSimulado" title="Simulador" style="cursor: pointer"></i>
          <i class="far fa-user-circle active"></i>
        </div>
      </header>

      <!-- Conteúdo do Perfil -->
      <main class="profile-content">
        <h1 class="page-title">Meu Perfil</h1>

        <!-- Card de Informações -->
        <section class="glass-panel profile-card">
          <div class="profile-header">
            <div class="avatar-section">
              <div class="avatar-placeholder">
                <i class="fas fa-user"></i>
              </div>
              <button class="btn-secondary">Alterar Foto</button>
            </div>
            <div class="profile-info">
              <h2>{{ profile.name }}</h2>
              <p class="email">{{ profile.email }}</p>
              <p class="member-since">Membro desde {{ profile.createdAt }}</p>
            </div>
          </div>
        </section>

        <!-- Card de Preferências -->
        <section class="glass-panel preferences-card">
          <h3>Preferências</h3>
          <div class="preference-list">
            <div class="preference-item">
              <span>Moeda</span>
              <select v-model="preferences.currency" class="input-field">
                <option value="BRL">Real (R$)</option>
                <option value="USD">Dólar ($)</option>
                <option value="EUR">Euro (€)</option>
              </select>
            </div>
            <div class="preference-item">
              <span>Tema</span>
              <select v-model="preferences.theme" class="input-field">
                <option value="dark">Escuro</option>
                <option value="light">Claro</option>
              </select>
            </div>
            <div class="preference-item">
              <span>Notificações</span>
              <label class="toggle">
                <input type="checkbox" v-model="preferences.notifications" />
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="preference-item">
              <span>Ocultar valores por padrão</span>
              <label class="toggle">
                <input type="checkbox" v-model="preferences.hideValues" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </section>

        <!-- Ações -->
        <section class="profile-actions">
          <button class="btn-primary">Salvar Alterações</button>
          <button class="btn-danger">Excluir Conta</button>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  padding: 24px;
}

.page-title {
  font-size: 1.8rem;
  font-weight: 600;
  margin-bottom: 24px;
  color: var(--text-primary);
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.profile-card {
  padding: 24px;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 24px;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.avatar-placeholder {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-6), var(--accent-7));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  color: white;
}

.profile-info h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.profile-info .email {
  color: var(--text-soft);
  margin-bottom: 4px;
}

.profile-info .member-since {
  font-size: 0.85rem;
  color: var(--text-soft);
}

.preferences-card {
  padding: 24px;
}

.preferences-card h3 {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--text-primary);
}

.preference-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preference-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--divider);
}

.preference-item:last-child {
  border-bottom: none;
}

.preference-item span {
  color: var(--text-primary);
}

.input-field {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--divider);
  background: var(--panel-bg);
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
}

.toggle {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--divider);
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.toggle input:checked + .toggle-slider {
  background: linear-gradient(90deg, var(--accent-6), var(--accent-7));
}

.toggle input:checked + .toggle-slider:before {
  transform: translateX(24px);
}

.profile-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-primary {
  padding: 12px 24px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(90deg, var(--accent-6), var(--accent-7));
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 188, 212, 0.3);
}

.btn-secondary {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid var(--divider);
  background: transparent;
  color: var(--text-soft);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  border-color: var(--accent-6);
  color: var(--accent-6);
}

.btn-danger {
  padding: 12px 24px;
  border-radius: 10px;
  border: 1px solid var(--danger-soft);
  background: transparent;
  color: var(--danger-soft);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-danger:hover {
  background: var(--danger-soft);
  color: white;
}

.top-icons i.active {
  color: var(--accent-6);
}

@media (max-width: 600px) {
  .profile-header {
    flex-direction: column;
    text-align: center;
  }

  .profile-actions {
    flex-direction: column;
  }
}
</style>
