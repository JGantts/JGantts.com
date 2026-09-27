import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'
import NotificationsView from './NotificationsView.vue'
import * as client from '@/notifications/client'
vi.mock('@/notifications/client', () => ({
  disable: vi.fn(), getConfiguration: vi.fn(), needsInstallation: vi.fn(), persistSubscription: vi.fn(), prepareWorker: vi.fn(), storedInstallation: vi.fn(), subscribe: vi.fn(), supported: vi.fn(),
  NotificationRequestError: class extends Error { constructor(message: string, public status: number) { super(message) } },
}))
const worker = { pushManager: { getSubscription: vi.fn() } }
const mountSettings = () => mount(NotificationsView, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })
beforeEach(() => {
  vi.resetAllMocks(); vi.stubGlobal('Notification', { permission: 'default' })
  vi.mocked(client.supported).mockReturnValue(true)
  vi.mocked(client.getConfiguration).mockResolvedValue({ enabled: true, publicKey: 'key', keyVersion: 'v1', payloadVersion: 1 })
  vi.mocked(client.prepareWorker).mockResolvedValue(worker as unknown as ServiceWorkerRegistration)
  worker.pushManager.getSubscription.mockResolvedValue(null)
})
it('only subscribes following an explicit click', async () => {
  const wrapper = mountSettings(); await flushPromises()
  expect(client.subscribe).not.toHaveBeenCalled(); expect(wrapper.text()).toContain('Notify me about new posts')
  vi.mocked(client.subscribe).mockResolvedValue('184a1f93-09e2-430d-8016-1f0765693f00')
  await wrapper.get('button').trigger('click'); await flushPromises()
  expect(client.subscribe).toHaveBeenCalledOnce(); expect(wrapper.text()).toContain('Notifications are on'); expect(wrapper.text()).toContain('Installation 184a1f93-09e2-430d-8016-1f0765693f00')
  wrapper.unmount()
})
it('guides an iOS browser to install without requesting permission', async () => {
  vi.mocked(client.needsInstallation).mockReturnValue(true)
  const wrapper = mountSettings(); await flushPromises()
  expect(wrapper.text()).toContain('Home Screen'); expect(client.prepareWorker).not.toHaveBeenCalled(); wrapper.unmount()
})
it('reports registration failure and retries the saved browser subscription', async () => {
  const wrapper = mountSettings(); await flushPromises()
  vi.mocked(client.subscribe).mockRejectedValue(new Error('offline'))
  await wrapper.get('button').trigger('click'); await flushPromises()
  expect(wrapper.text()).toContain('Setup needs another try'); expect(wrapper.text()).not.toContain('Notifications are on')
  worker.pushManager.getSubscription.mockResolvedValue({ endpoint: 'endpoint' })
  vi.mocked(client.storedInstallation).mockReturnValue({ credential: 'credential', endpoint: 'endpoint', keyVersion: 'v1' })
  vi.mocked(client.persistSubscription).mockResolvedValue('184a1f93-09e2-430d-8016-1f0765693f00')
  await wrapper.get('button').trigger('click'); await flushPromises()
  expect(wrapper.text()).toContain('Notifications are on'); wrapper.unmount()
})
it('shows blocked permission and reconciles revocation without prompting', async () => {
  vi.stubGlobal('Notification', { permission: 'denied' })
  vi.mocked(client.storedInstallation).mockReturnValue({ credential: 'credential', endpoint: 'endpoint', keyVersion: 'v1' })
  const wrapper = mountSettings(); await flushPromises()
  expect(wrapper.text()).toContain('Permission is turned off'); expect(client.disable).toHaveBeenCalledOnce(); expect(client.subscribe).not.toHaveBeenCalled(); wrapper.unmount()
})
it('retains a retry action when unsubscribe fails', async () => {
  worker.pushManager.getSubscription.mockResolvedValue({ endpoint: 'endpoint' })
  vi.mocked(client.storedInstallation).mockReturnValue({ credential: 'credential', endpoint: 'endpoint', keyVersion: 'v1' })
  const wrapper = mountSettings(); await flushPromises()
  vi.mocked(client.disable).mockRejectedValue(new Error('offline'))
  await wrapper.get('button').trigger('click'); await flushPromises()
  expect(wrapper.text()).toContain("Turning off isn't finished"); wrapper.unmount()
})
