import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import SimuladoView from '../views/SimuladoView.vue'
import ProfileView from '../views/ProfileView.vue'

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
    {
      path: '/perfil',
      name: 'perfil',
      component: ProfileView,
    },
  ],
})

export default router
