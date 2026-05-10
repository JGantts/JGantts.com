
import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
const app = createApp(App)

import router from './router'
app.use(router)

import vuetify from './plugins/vuetify'
app.use(vuetify)

app.mount('#app')
