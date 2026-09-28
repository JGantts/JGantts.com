import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import InstallAppView from './InstallAppView.vue'
import { standalone } from '@/notifications/client'
vi.mock('@/notifications/client', () => ({ standalone: vi.fn() }))
const share = vi.fn()
const mountView = () => mount(InstallAppView, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })
const originalShare = Object.getOwnPropertyDescriptor(navigator, 'share')
beforeEach(() => {
  vi.resetAllMocks()
  Object.defineProperty(navigator, 'share', { configurable: true, value: share })
})
afterEach(() => { if (originalShare) Object.defineProperty(navigator, 'share', originalShare); else Reflect.deleteProperty(navigator, 'share') })
it('opens the native sheet only on click and prevents duplicate requests', async () => {
  let resolve!: () => void
  share.mockImplementation(() => new Promise<void>(done => { resolve = done }))
  const view = mountView()
  expect(share).not.toHaveBeenCalled()
  await view.get('button').trigger('click')
  expect(share).toHaveBeenCalledWith({ title: 'JGantts', url: new URL('/photos', window.location.origin).href })
  expect((view.get('button').element as HTMLButtonElement).disabled).toBe(true)
  resolve(); await flushPromises()
  expect((view.get('button').element as HTMLButtonElement).disabled).toBe(false)
  expect(view.text()).toContain('Use Safari’s own Share button.')
  view.unmount()
})
it('dismissal is silent and failures retain manual instructions', async () => {
  share.mockRejectedValueOnce(new DOMException('Cancelled', 'AbortError')).mockRejectedValueOnce(new Error('Unavailable'))
  const view = mountView()
  await view.get('button').trigger('click'); await flushPromises()
  expect(view.find('[role=alert]').exists()).toBe(false)
  await view.get('button').trigger('click'); await flushPromises()
  expect(view.get('[role=alert]').text()).toBe('Use Safari’s Share button instead.')
  view.unmount()
})
it('hides the button without Web Share support or inside the installed app', () => {
  Object.defineProperty(navigator, 'share', { configurable: true, value: undefined })
  const unsupported = mountView(); expect(unsupported.find('button').exists()).toBe(false); expect(unsupported.text()).toContain('Add to Home Screen'); unsupported.unmount()
  Object.defineProperty(navigator, 'share', { configurable: true, value: share })
  vi.mocked(standalone).mockReturnValue(true)
  const installed = mountView(); expect(installed.find('button').exists()).toBe(false); installed.unmount()
})
