import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import IndexView from './IndexView.vue'
import { initMap, type JgMap } from './maps/maps'

vi.mock('./maps/maps', () => ({ initMap: vi.fn() }))
vi.mock('./HUD/IndexView.vue', () => ({ default: { template: '<div />' } }))
beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(42)
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

it('handles blocked WebGL without an uncaught rejection or retry loop', async () => {
  vi.mocked(initMap).mockRejectedValue(new Error('Failed to initialize WebGL: Web page caused context loss and was blocked'))
  const view = mount(IndexView)
  await flushPromises()
  expect(view.get('[role=alert]').text()).toContain('could not start the map graphics')
  expect(view.get('button').text()).toBe('Reload page')
  expect(initMap).toHaveBeenCalledTimes(1)
  view.unmount()
  expect(window.cancelAnimationFrame).toHaveBeenCalledWith(42)
})

it('aborts pending startup and disposes a late result after navigating away', async () => {
  let finish!: (value: JgMap) => void
  vi.mocked(initMap).mockReturnValue(new Promise(resolve => { finish = resolve }))
  const removeListener = vi.spyOn(window, 'removeEventListener')
  const view = mount(IndexView)
  const signal = vi.mocked(initMap).mock.calls[0][2]!
  view.unmount()
  expect(signal.aborted).toBe(true)
  const unmount = vi.fn()
  finish({ unmount } as unknown as JgMap)
  await flushPromises()
  expect(unmount).toHaveBeenCalledOnce()
  expect(removeListener.mock.calls.map(([type]) => type)).toEqual(expect.arrayContaining(['keydown', 'keyup']))
  expect(window.cancelAnimationFrame).toHaveBeenCalledWith(42)
})

it('silently handles cancellation while startup is pending', async () => {
  let reject!: (error: Error) => void
  vi.mocked(initMap).mockReturnValue(new Promise((_, fail) => { reject = fail }))
  const view = mount(IndexView)
  view.unmount()
  reject(new DOMException('Aborted', 'AbortError'))
  await flushPromises()
  expect(console.error).not.toHaveBeenCalled()
})
