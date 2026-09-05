import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
  //@ts-expect-error
  type ScrollBehaviorNormalized,
} from 'vue-router'

import MainLayout from '@/layouts/MainLayout.vue'
import HolmesLayout from '@/layouts/HolmesLayout.vue'
import KovyaloLayout from '@/layouts/KovyaloLayout.vue'

import WelcomePageVue from '@/views/WelcomePage.vue'
/*import GettingStartedPageVue from '@/views/GettingStartedPage.vue'
import ServicesPageVue from '@/views/ServicesPage.vue'
import AboutMePage from '@/views/about-me/AboutMePage.vue'
import AboutMe2Page from '@/views/about-me/AboutMe2Page.vue'*/
import HolmesPage from '@/views/HolmesPage.vue'

type AppRouteMeta = {
  title?: string
  description?: string
  socialTitle?: string
  socialDescription?: string
  socialImage?: string
  robots?: string
}

const defaultMeta: Required<AppRouteMeta> = {
  title: 'JGantts',
  description: 'JGantts',
  socialTitle: 'JGantts',
  socialDescription: 'JGantts',
  socialImage: '',
  robots: 'index, follow',
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

function upsertCanonicalLink(href: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    document.head.appendChild(link)
  }
  link.href = href
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
    robots: routeMeta.robots ?? defaultMeta.robots,
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
        {
          path: 'dev',
          name: 'Development',
          component: () => import('@/views/DevPage.vue'),
          meta: {
            title: 'Development | JGantts',
            description: 'Local development tools for JGantts.com.',
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
          alias: 'tips',
          name: 'Holmes',
          component: HolmesPage,
          props: (route) => ({
            tips: route.path === '/holmes/tips',
          }),
          meta: {
            title: 'Holmes, Zachary',
            description: 'Professional tour guide at Desert Adventures. Find Zachary Holmes on social, maps, and tip links.',
            socialTitle: 'Holmes, Zachary | Desert Adventures',
            socialDescription:
              'Professional tour guide. Follow Zachary Holmes, get directions, and find tip links in one place.',
            socialImage: '/holmes-social-preview.svg',
          },
        },
      ],
        meta: {
          title: 'Holmes, Zachary',
          description: 'Professional tour guide at Desert Adventures. Find Zachary Holmes on social, maps, and tip links.',
          socialTitle: 'Holmes, Zachary | Desert Adventures',
          socialDescription:
            'Professional tour guide. Follow Zachary Holmes, get directions, and find tip links in one place.',
          socialImage: '/holmes-social-preview.svg',
        },
    },
    {
      path: '/kovyalo',
      component: KovyaloLayout,
      children: [
        {
          path: '',
          alias: 'dev',
          name: 'Kovyalo Dev',
          component: () => import('@/views/kovyalo/IndexView.vue'),
            props: (route) => ({
            dev: route.path === '/kovyalo/dev',
          }),
          meta: {
            title: 'Kovyálo',
            description: 'Years ago, a ship landed. We are their children.',
            socialTitle: 'Kovyálo | JGantts',
            socialDescription:
              'JGantts\' Conworld of Kovyálo.',
            socialImage: '/kovyalo-social-preview.svg',
          },
        },
        {
          path: '',
          alias: 'game',
          name: 'Kovyalo Game',
          component: () => import('@/views/kovyalo/IndexView.vue'),
            props: (route) => ({
            game: route.path === '/kovyalo/game',
          }),
          meta: {
            title: 'Kovyálo',
            description: 'Years ago, a ship landed. We are their children.',
            socialTitle: 'Kovyálo | JGantts',
            socialDescription:
              'JGantts\' Conworld of Kovyálo.',
            socialImage: '/kovyalo-social-preview.svg',
          },
        },
      ],
      meta: {
        title: 'Kovyálo',
        description: 'Years ago, a ship landed. We are their children.',
        socialTitle: 'Kovyálo | JGantts',
        socialDescription:
          'JGantts\' Conworld of Kovyálo.',
        socialImage: '/kovyalo-social-preview.svg',
      },
    },
    {
      path: '/photos',
      component: MainLayout,
      children: [
        {
          path: ':postId?',
          name: 'Photos',
          component: () => import('@/views/photos/IndexView.vue'),
          props: true,
      meta: {
        title: 'JGantts Photos',
        description: '.',
        socialTitle: 'Photos | JGantts',
        socialDescription: 'Photos from JGantts',
        socialImage: '/kovyalo-social-preview.svg',
      },
        },
      ],
      meta: {
        title: 'JGantts Photos',
        description: '.',
        socialTitle: 'Photos | JGantts',
        socialDescription: 'Photos from JGantts',
        socialImage: '/kovyalo-social-preview.svg',
      },
    },
    {
      path: '/admin',
      component: MainLayout,
      children: [
        {
          path: 'posts',
          name: 'Post editor',
          component: () => import('@/views/admin/PostsAdminView.vue'),
          meta: {
            title: 'Post editor | JGantts',
            description: 'Private post authoring.',
            robots: 'noindex, nofollow',
          },
        },
      ],
    },
    {
      path: '/posts',
      component: MainLayout,
      children: [
        {
          path: '',
          name: 'Posts',
          component: () => import('@/views/posts/PostsIndexView.vue'),
          meta: {
            title: 'Posts | JGantts',
            description: 'Writing and photographs from Jacob Gantt, published here first.',
            socialTitle: 'Posts | JGantts',
            socialDescription: 'Writing and photographs from Jacob Gantt, published here first.',
          },
        },
        {
          path: ':slug',
          name: 'Post',
          component: () => import('@/views/posts/PostView.vue'),
          props: true,
          meta: {
            title: 'Post | JGantts',
            description: 'A post from Jacob Gantt on JGantts.com.',
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
    if (savedPosition) {
      return savedPosition
    }

    // Selecting a photo post changes its shareable URL without moving the gallery.
    // Initial deep links are positioned after the asynchronously loaded masonry renders.
    if (to.path.startsWith('/photos') && from.path.startsWith('/photos')) {
      return false
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
  upsertMetaTag('name', 'robots', meta.robots)
  upsertCanonicalLink(new URL(to.path, window.location.origin).toString())
  document.head.querySelectorAll('meta[property^="article:"]').forEach((tag) => tag.remove())
  document.head.querySelector('#__POST_JSON_LD__')?.remove()
})

export default router
