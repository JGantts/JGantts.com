import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import MediaCarousel from './MediaCarousel.vue'

const attachment = {
  description: 'A flower',
  preview_url: '/preview.jpg',
  type: 'image' as const,
  url: '/flower.jpg',
}

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute('open', '')
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    },
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).showModal
  delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).close
  document.documentElement.style.overflow = ''
})

describe('MediaCarousel scroll locking', () => {
  it('restores an existing comments-sheet scroll lock after its lightbox closes', async () => {
    document.documentElement.style.overflow = 'hidden'
    const wrapper = mount(MediaCarousel, {
      attachTo: document.body,
      props: { attachments: [attachment], label: 'Reply media' },
    })

    await wrapper.get('[aria-label="Open image"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(document.documentElement.style.overflow).toBe('hidden')

    const closeButton = document.querySelector<HTMLButtonElement>('[aria-label="Close photo viewer"]')
    expect(closeButton).not.toBeNull()
    closeButton!.click()
    await wrapper.vm.$nextTick()
    expect(document.documentElement.style.overflow).toBe('hidden')
    wrapper.unmount()
  })

  it('restores the unlocked document state when used outside the comments sheet', async () => {
    const wrapper = mount(MediaCarousel, {
      attachTo: document.body,
      props: { attachments: [attachment], label: 'Post media' },
    })

    await wrapper.get('[aria-label="Open image"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(document.documentElement.style.overflow).toBe('hidden')

    wrapper.unmount()
    expect(document.documentElement.style.overflow).toBe('')
  })
})
