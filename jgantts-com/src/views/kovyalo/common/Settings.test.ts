import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { labelModes } from '../maps/townLabels'
import { hashGuiPath } from '../maps/common/hashes'

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

it.each([undefined, { zoom: 8 }, { enabledLayers: null }, { enabledLayers: [true] }])('defaults to Ziemúnd and Rivers without valid saved layers: %j', async saved => {
  if (saved) localStorage.setItem('app-settings', JSON.stringify(saved))
  vi.resetModules()
  const { useSettings } = await import('./Settings')
  expect(useSettings().enabledLayers).toEqual([
    hashGuiPath(['Political', 'National', 'Ziemúnd']),
    hashGuiPath(['Physical', 'Terrain', 'Rivers']),
  ])
  expect(useSettings().center).toEqual([-34.3927, 11.8405])
  expect(useSettings().zoom).toBe(saved && 'zoom' in saved ? saved.zoom : 6)
})

it.each([{ enabledLayers: [] }, { enabledLayers: [hashGuiPath(['Physical', 'Terrain', 'Rivers'])] }])('preserves saved layer selections including all-off: %j', async ({ enabledLayers }) => {
  localStorage.setItem('app-settings', JSON.stringify({ enabledLayers }))
  vi.resetModules()
  const { useSettings } = await import('./Settings')
  expect(useSettings().enabledLayers).toEqual(enabledLayers)
})
