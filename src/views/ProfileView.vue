<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ProfileHeader, ProfileInfoCard, ProfilePreferences, ProfileActions } from '@/components'
import { useProfile } from '@/composables'
import { useAuth } from '@/composables/useAuth'
import { useTheme } from '@/composables/useTheme'

const router = useRouter()
const { signOut } = useAuth()
const { profile, preferences, isLoading, load, saveAll, deleteAccount, updatePreferences } = useProfile()
const { commitPalette, revertPalette } = useTheme()

onMounted(load)

// Ao sair da página de preferências sem salvar, descarta o preview do tema
onBeforeUnmount(revertPalette)

const handleSignOut = async () => {
  await signOut()
  router.push('/auth')
}

const handleSave = async () => {
  const result = await saveAll()
  if (result.success) {
    commitPalette() // persiste a paleta escolhida (localStorage) só ao salvar
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
      <ProfileHeader @sign-out="handleSignOut" />

      <main class="profile-content">
        <h1 class="page-title">Meu Perfil</h1>

        <ProfileInfoCard
          :name="profile.nome"
          :email="profile.email"
          :created-at="profile.criado_em"
          :avatar="profile.avatar_url"
          @change-photo="handleChangePhoto"
        />

        <ProfilePreferences
          :preferences="preferences"
          @update:currency="updatePreferences({ moeda: $event })"
          @update:notifications="updatePreferences({ notificacoes: $event })"
          @update:hideValues="updatePreferences({ ocultar_valores: $event })"
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

