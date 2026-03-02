import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
  //@ts-expect-error
  type ScrollBehaviorNormalized,
} from 'vue-router'

import MainLayout from '@/layouts/MainLayout.vue'
import HolmesLayout from '@/layouts/HolmesLayout.vue'

import WelcomePageVue from '@/views/WelcomePage.vue'
/*import GettingStartedPageVue from '@/views/GettingStartedPage.vue'
import ServicesPageVue from '@/views/ServicesPage.vue'
import AboutMePage from '@/views/about-me/AboutMePage.vue'
import AboutMe2Page from '@/views/about-me/AboutMe2Page.vue'*/
import HolmesPage from '@/views/HolmesPage.vue'
import holmesSocialPreviewUrl from '@/assets/holmes-social-preview.svg?url'

type AppRouteMeta = {
  title?: string
  description?: string
  socialTitle?: string
  socialDescription?: string
  socialImage?: string
}

const defaultMeta: Required<AppRouteMeta> = {
  title: 'JGantts',
  description: 'JGantts',
  socialTitle: 'JGantts',
  socialDescription: 'JGantts',
  socialImage: '',
}

function upsertMetaTag(attribute: 'name' | 'property', key: string, content: string) {
  if (typeof document === 'undefined') {
    return
  }

  let tag = document.head.querySelector(`meta[${attribute}="${key}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attribute, key)
    document.head.appendChild(tag)
  }

  tag.setAttribute('content', content)
}

function resolveMeta(to: RouteLocationNormalized): Required<AppRouteMeta> {
  const routeMeta = to.meta as AppRouteMeta
  const socialImage = routeMeta.socialImage
    ? new URL(routeMeta.socialImage, window.location.origin).toString()
    : ''

  return {
    title: routeMeta.title ?? defaultMeta.title,
    description: routeMeta.description ?? defaultMeta.description,
    socialTitle: routeMeta.socialTitle ?? routeMeta.title ?? defaultMeta.socialTitle,
    socialDescription:
      routeMeta.socialDescription ?? routeMeta.description ?? defaultMeta.socialDescription,
    socialImage,
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        {
          path: '',
          alias: 'welcome/',
          name: 'welcome',
          component: WelcomePageVue,
          meta: {
            title: 'JGantts',
            description: 'JGantts',
            socialTitle: 'JGantts',
            socialDescription: 'JGantts',
          },
        },
        /*{
          path: "services/",
          name: "services",
          component: ServicesPageVue
        },
        {
          path: "getting-started/",
          name: "getting-started",
          component: GettingStartedPageVue
        },
        {
          path: "about-me/",
          name: "about-me",
          component: AboutMePage
        },
        {
          path: "about-me2/",
          name: "about-me2",
          component: AboutMe2Page
        },


        {
          path: "/:pathMatch(.*)*",
          component: NotFound
        },*/
      ],
    },
    {
      path: '/holmes',
      component: HolmesLayout,
      children: [
        {
          path: '',
          name: 'Holmes',
          component: HolmesPage,
          meta: {
            title: 'Holmes, Zachary',
            description: 'Professional tour guide at Desert Adventures. Find Zachary Holmes on social, maps, and tip links.',
            socialTitle: 'Holmes, Zachary | Desert Adventures',
            socialDescription:
              'Professional tour guide. Follow Zachary Holmes, get directions, and find tip links in one place.',
            socialImage: holmesSocialPreviewUrl,
          },
        },
      ],
    },
  ],
  scrollBehavior(
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    savedPosition: ScrollBehaviorNormalized,
  ) {
    // always scroll to top
    if (savedPosition) {
      return savedPosition
    }

    return { top: 0 }
  },
})

router.afterEach((to) => {
  if (typeof document === 'undefined') {
    return
  }

  const meta = resolveMeta(to)

  document.title = meta.title
  upsertMetaTag('name', 'description', meta.description)
  upsertMetaTag('property', 'og:title', meta.socialTitle)
  upsertMetaTag('property', 'og:description', meta.socialDescription)
  upsertMetaTag('property', 'og:image', meta.socialImage)
  upsertMetaTag('property', 'og:url', window.location.href)
  upsertMetaTag('property', 'og:type', 'website')
  upsertMetaTag('name', 'twitter:card', meta.socialImage ? 'summary_large_image' : 'summary')
  upsertMetaTag('name', 'twitter:title', meta.socialTitle)
  upsertMetaTag('name', 'twitter:description', meta.socialDescription)
  upsertMetaTag('name', 'twitter:image', meta.socialImage)
})

export default router
