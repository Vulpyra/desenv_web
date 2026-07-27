import './assets/styles/index.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { applyStoredPalette } from './composables/useTheme'

// Aplica a paleta salva antes de montar (evita flash da paleta padrão)
applyStoredPalette()

createApp(App).use(router).mount('#app')
