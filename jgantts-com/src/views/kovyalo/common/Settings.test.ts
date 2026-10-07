import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { labelModes } from '../maps/townLabels'

beforeEach(() => {
  const stored = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
  })
})

afterEach(() => vi.unstubAllGlobals())

it.each(labelModes)('restores the saved %s label mode', async labelMode => {
  localStorage.setItem('app-settings', JSON.stringify({ labelMode }))
  vi.resetModules()
  const { useSettings } = await import('./Settings')
  expect(useSettings().labelMode).toBe(labelMode)
})

it('falls back to bilingual labels for an unknown saved mode', async () => {
  localStorage.setItem('app-settings', JSON.stringify({ labelMode: 'unknown' }))
  vi.resetModules()
  const { useSettings } = await import('./Settings')
  expect(useSettings().labelMode).toBe('both')
})
