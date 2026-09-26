import { shallowMount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import QRCode from 'qrcode'
import IndexView from './IndexView.vue'

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn(async () => 'data:image/png;base64,AA==') } }))
let wrapper: ReturnType<typeof shallowMount>
const post = (media: unknown[] = []) => ({
 id: 'review', slug: 'review', title: 'Review post', bodyHtml: '<p>Visible text content</p>',
 bodyMarkdown: 'Visible text content', date: null, time: null, location: null,
 publishedAt: '2026-09-26T00:00:00Z', updatedAt: '2026-09-26T00:00:00Z',
 canonicalUrl: '/photos/review?rev=4', shareUrl: '/photos/review?rev=4&preview=abc123',
 heroMediaId: null, preview: 'abc123', media,
})
const photo = { id: 'photo', altText: 'Photo', width: 100, height: 100, urls: { thumbnail: '/media/p/thumb', large: '/media/p/large' } }
beforeEach(() => {
 vi.stubGlobal('sessionStorage', { getItem: () => null, setItem: vi.fn() })
 vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
 vi.spyOn(performance, 'getEntriesByType').mockReturnValue([])
})
afterEach(() => { wrapper?.unmount(); document.head.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals() })
it('renders text-only posts through the article view', async () => {
 vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => url.includes('/comments/') ? { comments: [], state: 'not_syndicated', stale: false, truncated: false } : { items: [post()], nextCursor: null } })))
 wrapper=shallowMount(IndexView, { props: { postId: 'review' }, global: { stubs: { PostView: false, RouterLink: true } } })
 await flushPromises()
 expect(wrapper.text()).toContain('Visible text content')
 expect(document.title).toBe('Review post | JGantts')
 expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toContain('/photos/review?rev=4')
})
it('preserves revision and preview tokens in every photo share control', async () => {
 const writeText = vi.fn(async () => {})
 Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
 vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => url.includes('/comments/') ? {comments:[],state:'not_syndicated',stale:false,truncated:false} : { items: [post([photo])], nextCursor: null } })))
 wrapper=shallowMount(IndexView, { props: { postId: 'review' } })
 await flushPromises()
 const panel=wrapper.findComponent({name:'PhotoCommentsPanel'})
 const expected = new URL('/photos/review?rev=4&preview=abc123', window.location.origin).href
 for (const [prop, key] of [['facebookShareUrl', 'u'], ['xShareUrl', 'url'], ['linkedinShareUrl', 'url']]) {
   expect(new URL(panel.props(prop!)).searchParams.get(key!)).toBe(expected)
 }
 expect(new URL(panel.props('emailShareUrl')).searchParams.get('body')).toContain(expected)
 expect(QRCode.toDataURL).toHaveBeenCalledWith(expected, expect.any(Object))
 panel.vm.$emit('copy-link')
 await flushPromises()
 expect(writeText).toHaveBeenCalledWith(expected)
})
it('loads older photos after a full text-only page and retries failed pages', async () => {
 let attempts = 0
 const older = { ...post([photo]), id: 'older', slug: 'older' }
 const fetcher=vi.fn(async (url: string) => {
   if (url.includes('/comments/')) return {ok:true,json:async()=>({comments:[],state:'not_syndicated',stale:false,truncated:false})}
   if (url.includes('cursor=')) {
     attempts++
     return {ok: attempts > 1,json:async()=>({items:[older, older],nextCursor:null})}
   }
   return {ok:true,json:async()=>({items:Array.from({length:50},(_,i)=>({...post(),id:String(i),slug:String(i)})),nextCursor:'next/page'})}
 })
 vi.stubGlobal('fetch', fetcher)
 wrapper=shallowMount(IndexView)
 await flushPromises()
 await wrapper.get('.photo-pagination button').trigger('click')
 await flushPromises()
 expect(wrapper.get('[role="alert"]').text()).toContain('Please try again')
 await wrapper.get('.photo-pagination button').trigger('click')
 await flushPromises()
 expect(fetcher).toHaveBeenCalledWith('/api/posts?limit=50&cursor=next%2Fpage')
 expect(wrapper.findComponent({name:'ClusteredPhotoMasonry'}).props('posts')).toHaveLength(1)
 expect(wrapper.find('.photo-pagination').exists()).toBe(false)
})
it('fetches a deep-linked article outside the initial page', async () => {
 const fetcher = vi.fn(async (url: string) => ({ok:true,json:async()=>url.includes('/comments/') ? {comments:[],state:'not_syndicated',stale:false,truncated:false} : url.includes('?') ? {items:[],nextCursor:null} : post()}))
 vi.stubGlobal('fetch', fetcher)
 wrapper=shallowMount(IndexView, {props:{postId:'review'},global:{stubs:{PostView:false,RouterLink:true}}})
 await flushPromises()
 expect(fetcher).toHaveBeenCalledWith('/api/posts/review')
 expect(wrapper.text()).toContain('Visible text content')
})
