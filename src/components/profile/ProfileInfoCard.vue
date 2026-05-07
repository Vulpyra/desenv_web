<script setup>
defineProps({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  createdAt: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: null
  }
})

defineEmits(['change-photo'])
</script>

<template>
  <section class="glass-panel profile-card">
    <div class="profile-header">
      <div class="avatar-section">
        <div class="avatar-placeholder">
          <img v-if="avatar" :src="avatar" :alt="name" />
          <i v-else class="fas fa-user"></i>
        </div>
        <button class="btn-secondary" @click="$emit('change-photo')">
          Alterar Foto
        </button>
      </div>
      <div class="profile-info">
        <h2>{{ name }}</h2>
        <p class="email">{{ email }}</p>
        <p class="member-since">Membro desde {{ createdAt }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
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
  overflow: hidden;
}

.avatar-placeholder img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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

@media (max-width: 600px) {
  .profile-header {
    flex-direction: column;
    text-align: center;
  }
}
</style>
