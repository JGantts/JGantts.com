import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import BackgorundDescriptionPage from '../views/BackgorundDescriptionPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      alias: "/home/",
      name: "home",
      component: Home
    },
    {
      path: "/jganttscom-background/",
      name: "Background",
      component: BackgorundDescriptionPage
    },
  ]
})

export default router
