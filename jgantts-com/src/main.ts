import './assets/main.css'

import '@radix-ui/colors/blue.css'
import '@radix-ui/colors/slate.css'
import '@radix-ui/colors/tomato.css'
import '@radix-ui/colors/mauve.css'

import '@radix-ui/colors/blue-dark.css'
import '@radix-ui/colors/slate-dark.css'
import '@radix-ui/colors/tomato-dark.css'
import '@radix-ui/colors/mauve-dark.css'

import { createApp } from 'vue'
import App from './App.vue'
const app = createApp(App)

import router from './router'
app.use(router)

app.mount('#app')
