import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import CompassView from './CompassView.vue'
import type { JgMap } from '../maps/maps'

describe('compass navigation', () => {
  it.each([-90, 90])('resets bearing %s without discarding pitch', async bearing => {
    const resetNorth = vi.fn()
    const resetNorthPitch = vi.fn()
    const wrapper = mount(CompassView, {
      props: { map: { mlMap: { getBearing: () => bearing, resetNorth, resetNorthPitch } } as unknown as JgMap },
    })
    await wrapper.get('button').trigger('click')
    expect(resetNorth).toHaveBeenCalledOnce()
    expect(resetNorthPitch).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('levels pitch near north and rotates the complete compass smoothly across ±180 degrees', async () => {
    let bearing = 179
    const resetNorthPitch = vi.fn()
    const wrapper = mount(CompassView, {
      props: { map: { mlMap: { getBearing: () => bearing, resetNorthPitch } } as unknown as JgMap },
    })
    wrapper.vm.updateCompass()
    expect(wrapper.get('.compass-rose').attributes('style')).toContain('rotate(-179deg)')
    bearing = -179
    wrapper.vm.updateCompass()
    expect(wrapper.get('.compass-rose').attributes('style')).toContain('rotate(-181deg)')
    expect(wrapper.find('.compass-rose .dial').exists()).toBe(true)
    expect(wrapper.find('.compass-rose .needle').exists()).toBe(true)
    bearing = -0.5
    await wrapper.get('button').trigger('click')
    expect(resetNorthPitch).toHaveBeenCalledOnce()
    wrapper.unmount()
  })
})
