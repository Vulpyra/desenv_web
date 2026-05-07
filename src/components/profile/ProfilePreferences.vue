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
          :value="preferences.currency"
          class="input-field"
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
          :value="preferences.theme"
          class="input-field"
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
            :checked="preferences.notifications"
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
            :checked="preferences.hideValues"
            @change="$emit('update:hideValues', $event.target.checked)"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>
  </section>
</template>

<style scoped>
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
</style>
