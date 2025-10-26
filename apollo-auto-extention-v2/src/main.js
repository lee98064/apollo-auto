import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

import App from './App.vue'
import router from './router'
import { initializeAppState } from './composables/useAppState'
import './styles.css'

const app = createApp(App)

initializeAppState(router)
  .catch((error) => {
    console.error('Failed to initialize app state:', error)
  })
  .finally(() => {
    app.use(router)
    app.use(ElementPlus)
    app.mount('#app')
  })
