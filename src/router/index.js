import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import SimuladoView from '../views/SimuladoView.vue'

const router = createRouter({
  history: createWebHistory(),
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
  ],
})

export default router
