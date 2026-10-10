import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import maplibregl from 'maplibre-gl'
import { initMap } from './maps'
import { loadTownLabelFonts } from './townLabels'

vi.mock('maplibre-gl', () => ({ default: { Map: vi.fn() } }))
vi.mock('../common/Settings', () => ({ useSettings: () => ({ enabledLayers: [] }) }))
vi.mock('../common/DarkMode', () => ({ effectiveDarkMode: { value: 'light' } }))
vi.mock('./townLabels', () => ({ loadTownLabelFonts: vi.fn() }))
const config = { world: { id: 'world', layers: [], dataSources: [] }, regions: [] }
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ text: async () => JSON.stringify(config) }))
})
afterEach(() => vi.unstubAllGlobals())

it('does not allocate a graphics context after leaving during font loading', async () => {
  let finish!: () => void
  vi.mocked(loadTownLabelFonts).mockReturnValue(new Promise<void>(resolve => { finish = resolve }))
  const controller = new AbortController()
  const pending = initMap(document.createElement('div'), false, controller.signal)
  await flushPromises()
  expect(loadTownLabelFonts).toHaveBeenCalledOnce()
  controller.abort()
  finish()
  expect(await pending).toBeNull()
  expect(maplibregl.Map).not.toHaveBeenCalled()
})

it('does not start requests for an already unmounted view', async () => {
  const controller = new AbortController()
  controller.abort()
  expect(await initMap(document.createElement('div'), false, controller.signal)).toBeNull()
  expect(fetch).not.toHaveBeenCalled()
  expect(maplibregl.Map).not.toHaveBeenCalled()
})
