import { createRouter, createWebHashHistory } from 'vue-router'
import { useAppState } from '../composables/useAppState'

const routes = [
  {
    path: '/',
    redirect: '/login',
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../views/RegisterView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../views/SettingsView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login',
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const appState = useAppState()
  const store = appState.state

  if (!store.isReady) {
    next()
    return
  }

  if (to.meta.requiresAuth && !store.authToken) {
    next({ name: 'login' })
    return
  }

  if ((to.name === 'login' || to.name === 'register') && store.authToken) {
    next({ name: 'dashboard' })
    return
  }

  next()
})

export default router
