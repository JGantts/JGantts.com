import './assets/main.css'

import '@radix-ui/colors/blue.css'
import '@radix-ui/colors/slate.css'
import '@radix-ui/colors/tomato.css'
import '@radix-ui/colors/mauve.css'

import '@radix-ui/colors/blue-dark.css'
import '@radix-ui/colors/slate-dark.css'
import '@radix-ui/colors/tomato-dark.css'
import '@radix-ui/colors/mauve-dark.css'

import '@fontsource-variable/azeret-mono/wght.css';
import '@fontsource-variable/figtree/wght.css';

import { createApp } from 'vue'
import App from './App.vue'
const app = createApp(App)

import router from './router'
app.use(router)

app.mount('#app')

// Updating an installed worker never takes over or reloads an active editor.
import { prepareWorker, reconcileInstallation } from './notifications/client'
if ('serviceWorker' in navigator && window.isSecureContext) {
  void prepareWorker().then(() => {
    if (window.location.pathname !== '/notifications') return reconcileInstallation()
  }).catch(() => { /* Settings provides an explicit retry path. */ })
}
