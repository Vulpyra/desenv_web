import { createRouter, createWebHashHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import SimuladoView from '../views/SimuladoView.vue'
import AiChatView from '../views/AiChatView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
    },
    {
      path: '/simulado',
      name: 'simulado',
      component: SimuladoView,
    },
    {
      path: '/chat-ia',
      name: 'chat-ia',
      component: AiChatView,
    },
  ],
})

export default router
