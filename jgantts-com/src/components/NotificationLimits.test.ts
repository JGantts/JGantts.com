import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'
import NotificationLimits from './NotificationLimits.vue'
import { notificationLimits } from '@/notifications/client'
vi.mock('@/notifications/client', () => ({ notificationLimits: vi.fn() }))
beforeEach(() => { vi.resetAllMocks(); vi.mocked(notificationLimits).mockResolvedValue({ maxPerDay: 2, maxPerWeek: 3 }) })
it('loads server defaults and saves subscriber limits including unlimited', async () => {
  const view = mount(NotificationLimits); await flushPromises()
  expect((view.get('#daily-limit').element as HTMLInputElement).value).toBe('2')
  expect((view.get('#weekly-limit').element as HTMLInputElement).value).toBe('3')
  await view.get('#daily-limit').setValue('1'); await view.get('#weekly-limit').setValue('')
  await view.get('form').trigger('submit'); await flushPromises()
  expect(notificationLimits).toHaveBeenLastCalledWith({ maxPerDay: 1, maxPerWeek: null })
  expect(view.get('[role=status]').text()).toContain('saved')
  view.unmount()
})
it('keeps edited limits after a failed save and supports retrying a failed load', async () => {
  vi.mocked(notificationLimits).mockRejectedValueOnce(new Error('Offline'))
  const view = mount(NotificationLimits); await flushPromises()
  expect(view.find('form').exists()).toBe(false)
  await view.get('button').trigger('click'); await flushPromises()
  await view.get('#daily-limit').setValue('0')
  vi.mocked(notificationLimits).mockRejectedValueOnce(new Error('Could not save'))
  await view.get('form').trigger('submit'); await flushPromises()
  expect(view.get('[role=alert]').text()).toBe('Could not save')
  expect((view.get('#daily-limit').element as HTMLInputElement).value).toBe('0')
  expect(view.find('[role=status]').exists()).toBe(false)
  view.unmount()
})
