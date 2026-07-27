<script setup>
import { ref } from 'vue'
import { useTheme } from '@/composables/useTheme'

defineProps({
  preferences: {
    type: Object,
    required: true
  }
})

defineEmits(['update:currency', 'update:notifications', 'update:hideValues'])

const { palettes, activeId, previewPalette } = useTheme()
const themesOpen = ref(false)
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

      <!-- Temas: lista expansível de paletas de cores -->
      <div class="preference-item preference-item--stack">
        <button
          class="themes-toggle"
          type="button"
          :aria-expanded="themesOpen"
          @click="themesOpen = !themesOpen"
        >
          <span>Temas</span>
          <i class="fas" :class="themesOpen ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
        </button>

        <ul v-show="themesOpen" class="themes-list">
          <li
            v-for="p in palettes"
            :key="p.id"
            class="theme-row"
            :class="{ 'theme-row--active': p.id === activeId }"
            role="button"
            tabindex="0"
            @click="previewPalette(p.id)"
            @keydown.enter.prevent="previewPalette(p.id)"
            @keydown.space.prevent="previewPalette(p.id)"
          >
            <span class="theme-radio" aria-hidden="true">
              <span v-if="p.id === activeId" class="theme-radio-dot"></span>
            </span>
            <span class="theme-swatch" aria-hidden="true">
              <span
                v-for="(c, i) in p.swatch"
                :key="i"
                class="theme-swatch-dot"
                :style="{ background: c }"
              ></span>
            </span>
            <span class="theme-name">{{ p.name }}</span>
          </li>
        </ul>
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
