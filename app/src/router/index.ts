import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import BackgorundDescriptionPage from '../views/BackgorundDescriptionPage.vue'
import GalleryPage from '../views/GalleryPage.vue'
import NotFound from '../views/NotFound.vue'

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
      name: "background",
      component: BackgorundDescriptionPage
    },
    {
      path: "/gallery/",
      name: "gallery",
      component: GalleryPage
    },
    {
      path: "/:pathMatch(.*)*",
      component: NotFound
    },
  ]
})

export default router
