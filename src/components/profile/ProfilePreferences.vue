<script setup>
defineProps({
  preferences: {
    type: Object,
    required: true
  }
})

defineEmits(['update:currency', 'update:theme', 'update:notifications', 'update:hideValues'])
</script>

<template>
  <section class="glass-panel preferences-card">
    <h3>Preferências</h3>
    <div class="preference-list">
      <div class="preference-item">
        <span>Moeda</span>
        <select
          :value="preferences.moeda"
          class="pref-select"
          @change="$emit('update:currency', $event.target.value)"
        >
          <option value="BRL">Real (R$)</option>
          <option value="USD">Dólar ($)</option>
          <option value="EUR">Euro (€)</option>
        </select>
      </div>

      <div class="preference-item">
        <span>Tema</span>
        <select
          :value="preferences.tema"
          class="pref-select"
          @change="$emit('update:theme', $event.target.value)"
        >
          <option value="dark">Escuro</option>
          <option value="light">Claro</option>
        </select>
      </div>

      <div class="preference-item">
        <span>Notificações</span>
        <label class="toggle">
          <input
            type="checkbox"
            :checked="preferences.notificacoes"
            @change="$emit('update:notifications', $event.target.checked)"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="preference-item">
        <span>Ocultar valores por padrão</span>
        <label class="toggle">
          <input
            type="checkbox"
            :checked="preferences.ocultar_valores"
            @change="$emit('update:hideValues', $event.target.checked)"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>
  </section>
</template>
