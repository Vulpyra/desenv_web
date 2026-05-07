<script setup>
import { ProfileHeader, ProfileInfoCard, ProfilePreferences, ProfileActions } from '@/components'
import { useProfile } from '@/composables'

const { profile, preferences, isLoading, saveAll, deleteAccount } = useProfile()

const handleSave = async () => {
  const result = await saveAll()
  if (result.success) {
    alert('Perfil salvo com sucesso!')
  } else {
    alert('Erro ao salvar: ' + result.error)
  }
}

const handleDelete = async () => {
  if (confirm('Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.')) {
    const result = await deleteAccount()
    alert(result.message || 'Funcionalidade em desenvolvimento')
  }
}

const handleChangePhoto = () => {
  alert('Funcionalidade de upload de foto em desenvolvimento')
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
      <ProfileHeader />

      <main class="profile-content">
        <h1 class="page-title">Meu Perfil</h1>

        <ProfileInfoCard
          :name="profile.name"
          :email="profile.email"
          :created-at="profile.createdAt"
          :avatar="profile.avatar"
          @change-photo="handleChangePhoto"
        />

        <ProfilePreferences
          :preferences="preferences"
          @update:currency="preferences.currency = $event"
          @update:theme="preferences.theme = $event"
          @update:notifications="preferences.notifications = $event"
          @update:hideValues="preferences.hideValues = $event"
        />

        <ProfileActions
          :is-loading="isLoading"
          @save="handleSave"
          @delete="handleDelete"
        />
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
</style>
