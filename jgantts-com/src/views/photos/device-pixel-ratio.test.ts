import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('useDevicePixelRatio', () => {
  it('reacts when a window moves to a display with a different pixel ratio', async () => {
    let ratio = 1
    let resolutionChange: (() => void) | undefined
    const removeEventListener = vi.fn()
    vi.stubGlobal('devicePixelRatio', ratio)
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      addEventListener: (_event: string, listener: () => void) => { resolutionChange = listener },
      removeEventListener,
    })))
    const { useDevicePixelRatio } = await import('./device-pixel-ratio')
    const wrapper = mount(defineComponent({
      setup() {
        return { ratio: useDevicePixelRatio() }
      },
      template: '<span>{{ ratio }}</span>',
    }))

    expect(wrapper.text()).toBe('1')
    ratio = 2
    vi.stubGlobal('devicePixelRatio', ratio)
    resolutionChange?.()
    await nextTick()

    expect(wrapper.text()).toBe('2')
    expect(window.matchMedia).toHaveBeenLastCalledWith('(resolution: 2dppx)')
    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    wrapper.unmount()
  })
})
