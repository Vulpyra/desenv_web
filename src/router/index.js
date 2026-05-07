import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '@/lib/supabase'
import DashboardView from '../views/DashboardView.vue'
import SimuladoView from '../views/SimuladoView.vue'
import ProfileView from '../views/ProfileView.vue'
import AuthView from '../views/AuthView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true },
    },
    {
      path: '/simulado',
      name: 'simulado',
      component: SimuladoView,
      meta: { requiresAuth: true },
    },
    {
      path: '/perfil',
      name: 'perfil',
      component: ProfileView,
      meta: { requiresAuth: true },
    },
    {
      path: '/auth',
      name: 'auth',
      component: AuthView,
    },
  ],
})

router.beforeEach(async (to) => {
  const { data: { session } } = await supabase.auth.getSession()
  const isAuthenticated = !!session

  if (to.meta.requiresAuth && !isAuthenticated) {
    return { name: 'auth' }
  }

  if (to.name === 'auth' && isAuthenticated) {
    return { name: 'dashboard' }
  }
})

export default router
