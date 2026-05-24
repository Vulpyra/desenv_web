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
    default: null
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
        <button class="btn-change-photo" @click="$emit('change-photo')">
          Alterar Foto
        </button>
      </div>
      <div class="profile-info">
        <h2>{{ name }}</h2>
        <p class="email">{{ email }}</p>
        <p class="member-since" v-if="createdAt">Membro desde {{ createdAt }}</p>
      </div>
    </div>
  </section>
</template>
