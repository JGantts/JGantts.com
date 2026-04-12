<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

type BoundsTuple = [[number, number], [number, number]]

const cursorCoords = ref<{ x: number; y: number } | null>(null)
const zoomCurrent = ref<number>(0)

type RegionConfig = {
  id: string
  title: string
  imageUrl: string
  bounds: BoundsTuple
  minZoom: number
  maxZoom: number
  pane?: string
  fadeRange?: number
  parentId?: string | null
}

type ManagedRegion = RegionConfig & {
  layer: L.ImageOverlay
  active: boolean
  hintRect: L.Rectangle
  hintLabel: L.Marker
}

const mapEl = ref<HTMLElement | null>(null)
let map: L.Map | null = null
let worldLayer: L.ImageOverlay | null = null
const regions: ManagedRegion[] = []

const worldBounds: BoundsTuple = [
  [0, 0],
  [30000, 50000],
]

const regionConfigs: RegionConfig[] = [
  {
    id: 'kovyalo',
    title: 'Kovyalo',
    imageUrl: '/assets/kovyalo/map/regional/kovyalo.png',
    bounds: [
      [14390, 18150],
      [17440, 21850],
    ],
    minZoom: -3,
    maxZoom: 0,
    pane: 'regions',
    fadeRange: 2,
    parentId: null,
  },
  {
    id: 'ziemund',
    title: 'Ziemúnd',
    imageUrl: '/assets/kovyalo/map/regional/ziemund.png',
    bounds: [
      [16550, 19820],
      [17390, 20500],
    ],
    minZoom: -1.5,
    maxZoom: 3,
    pane: 'regions',
    fadeRange: 2,
    parentId: 'kovyalo',
  },
]

function handleMouseMove(e: L.LeafletMouseEvent): void {
  cursorCoords.value = {
    x: Math.round(e.latlng.lng),
    y: Math.round(e.latlng.lat),
  }
}

function handleZoomChange(): void {
  if (!map) return
  zoomCurrent.value = map.getZoom()
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function normalizeBounds(bounds: BoundsTuple): BoundsTuple {
  const [[y1, x1], [y2, x2]] = bounds
  return [
    [Math.min(y1, y2), Math.min(x1, x2)],
    [Math.max(y1, y2), Math.max(x1, x2)],
  ]
}

function regionBounds(region: RegionConfig): L.LatLngBounds {
  return L.latLngBounds(normalizeBounds(region.bounds))
}

function isRegionInView(region: RegionConfig): boolean {
  if (!map) return false
  return map.getBounds().intersects(regionBounds(region))
}

function isRegionEligible(region: RegionConfig): boolean {
  if (!map) return false

  const zoom = map.getZoom()
  if (zoom < region.minZoom || zoom > region.maxZoom) return false
  if (!isRegionInView(region)) return false

  return true
}

function getBaseRegionOpacity(region: RegionConfig): number {
  if (!map) return 0
  if (!isRegionEligible(region)) return 0

  const zoom = map.getZoom()
  const fadeRange = region.fadeRange ?? 0

  if (fadeRange <= 0) {
    return 1
  }

  if (zoom < region.minZoom - fadeRange) return 0
  if (zoom >= region.minZoom) return 1

  const t = (zoom - (region.minZoom - fadeRange)) / fadeRange
  return clamp(t, 0, 1)
}

function getRegionById(id: string | null | undefined): ManagedRegion | undefined {
  if (!id) return undefined
  return regions.find((region) => region.id === id)
}

function getRegionDepth(region: ManagedRegion): number {
  let depth = 0
  let current: ManagedRegion | undefined = region

  while (current?.parentId) {
    const parent = getRegionById(current.parentId)
    if (!parent) break
    depth += 1
    current = parent
  }

  return depth
}

function isParentCurrentlyVisible(region: ManagedRegion): boolean {
  if (!region.parentId) return true
  const parent = getRegionById(region.parentId)
  return !!parent?.active
}

function zoomToRegion(region: ManagedRegion): void {
  if (!map) return
  map.fitBounds(region.bounds, {
    padding: [24, 24],
    animate: true,
  })
}

function createHintRectangle(region: RegionConfig): L.Rectangle {
  return L.rectangle(normalizeBounds(region.bounds), {
    pane: 'hints',
    color: '#ffd866',
    weight: 2,
    opacity: 0.95,
    fillOpacity: 0.06,
    dashArray: '10 6',
    interactive: true,
  })
}

function getRegionCenter(region: RegionConfig): L.LatLng {
  return regionBounds(region).getCenter()
}

function getRegionTopLeftLabelPosition(region: RegionConfig): L.LatLng {
  const bounds = normalizeBounds(region.bounds)
  const [[topY, leftX]] = bounds

  // Slight inset so the label isn't hugging the exact border.
  return L.latLng(topY + 90, leftX + 120)
}

function createHintLabel(region: RegionConfig): L.Marker {
  return L.marker(getRegionCenter(region), {
    pane: 'hints',
    interactive: false,
    icon: L.divIcon({
      className: 'region-hint-marker',
      html: `<div class="region-hint-label">${region.title}</div>`,
      iconSize: undefined,
    }),
  })
}

function setHintRectInteractive(region: ManagedRegion, interactive: boolean): void {
  const path = region.hintRect.getElement()
  if (!path) return

  if (interactive) {
    path.classList.remove('region-hint-rect--inactive')
    path.classList.add('region-hint-rect--interactive')
  } else {
    path.classList.remove('region-hint-rect--interactive')
    path.classList.add('region-hint-rect--inactive')
  }
}

function updateHintLabelPosition(region: ManagedRegion): void {
  const position = region.active
    ? getRegionTopLeftLabelPosition(region)
    : getRegionCenter(region)

  region.hintLabel.setLatLng(position)
}

function updateHintLabelContent(region: ManagedRegion): void {
  const element = region.hintLabel.getElement()
  if (!element) return

  const label = element.querySelector('.region-hint-label')
  if (!label) return

  label.textContent = region.active
    ? region.title
    : `${region.title}`

  label.classList.toggle('region-hint-label--corner', region.active)
  label.classList.toggle('region-hint-label--center', !region.active)
}

function syncRegions(): void {
  if (!map) return

  const eligibleRegions = regions.filter(isRegionEligible)
  const eligibleIds = new Set(eligibleRegions.map((region) => region.id))

  for (const region of regions) {
    const shouldBeVisible = eligibleIds.has(region.id)

    if (!shouldBeVisible) {
      if (region.active) {
        map.removeLayer(region.layer)
        region.active = false
      }
      continue
    }

    const finalOpacity = getBaseRegionOpacity(region)

    if (!region.active) {
      region.layer.addTo(map)
      region.active = true
    }

    region.layer.setOpacity(finalOpacity)
  }

  eligibleRegions
    .slice()
    .sort((a, b) => getRegionDepth(a) - getRegionDepth(b))
    .forEach((region) => {
      if (region.active) {
        region.layer.bringToFront()
      }
    })
}

function syncRegionHints(): void {
  if (!map) return

  for (const region of regions) {
    const parentVisible = isParentCurrentlyVisible(region)
    const inView = isRegionInView(region)
    const shouldShowHint = parentVisible && inView

    if (shouldShowHint) {
      if (!map.hasLayer(region.hintRect)) {
        region.hintRect.addTo(map)
      }

      if (!map.hasLayer(region.hintLabel)) {
        region.hintLabel.addTo(map)
      }

      updateHintLabelPosition(region)
      updateHintLabelContent(region)

      // Clickable only before activation.
      setHintRectInteractive(region, !region.active)

      // Visual style change once active.
      region.hintRect.setStyle({
        weight: region.active ? 1.5 : 2,
        fillOpacity: region.active ? 0.02 : 0.06,
        dashArray: region.active ? '6 6' : '10 6',
      })

      region.hintRect.bringToFront()
    } else {
      if (map.hasLayer(region.hintRect)) {
        map.removeLayer(region.hintRect)
      }

      if (map.hasLayer(region.hintLabel)) {
        map.removeLayer(region.hintLabel)
      }
    }
  }
}

function syncAll(): void {
  syncRegions()
  syncRegionHints()
}

onMounted(() => {
  if (!mapEl.value) return

  map = L.map(mapEl.value, {
    crs: L.CRS.Simple,
    minZoom: -5,
    maxZoom: 5,
    zoomSnap: 0.25,
    zoomDelta: 0.5,
    wheelPxPerZoomLevel: 120,
    attributionControl: false,
  })

  map.createPane('world')
  map.createPane('regions')
  map.createPane('cities')
  map.createPane('markers')
  map.createPane('hints')

  const worldPane = map.getPane('world')
  const regionsPane = map.getPane('regions')
  const citiesPane = map.getPane('cities')
  const markersPane = map.getPane('markers')
  const hintsPane = map.getPane('hints')

  if (worldPane) worldPane.style.zIndex = '200'
  if (regionsPane) regionsPane.style.zIndex = '300'
  if (citiesPane) citiesPane.style.zIndex = '400'
  if (markersPane) markersPane.style.zIndex = '500'
  if (hintsPane) hintsPane.style.zIndex = '550'

  worldLayer = L.imageOverlay('/assets/kovyalo/map/0.png', worldBounds, {
    pane: 'world',
    opacity: 1,
    interactive: false,
  }).addTo(map)

  for (const config of regionConfigs) {
    const normalized = normalizeBounds(config.bounds)

    const layer = L.imageOverlay(config.imageUrl, normalized, {
      pane: config.pane ?? 'regions',
      opacity: 0,
      interactive: false,
    })

    const normalizedConfig: RegionConfig = {
      ...config,
      bounds: normalized,
    }

    const hintRect = createHintRectangle(normalizedConfig)
    const hintLabel = createHintLabel(normalizedConfig)

    const managedRegion: ManagedRegion = {
      ...normalizedConfig,
      layer,
      active: false,
      hintRect,
      hintLabel,
    }
  
    hintRect.on('click', () => {
      if (!managedRegion.active) {
        zoomToRegion(managedRegion)
      }
    })

  hintRect.on('mouseover', () => {
    if (managedRegion.active) return

    hintRect.setStyle({
      weight: 3,
      fillOpacity: 0.1,
    })
  })

  hintRect.on('mouseout', () => {
    hintRect.setStyle({
      weight: managedRegion.active ? 1.5 : 2,
      fillOpacity: managedRegion.active ? 0.02 : 0.06,
      dashArray: managedRegion.active ? '6 6' : '10 6',
    })
  })

    regions.push(managedRegion)
  }

  map.fitBounds(worldBounds)
  map.setMaxBounds(worldBounds)

  map.on('zoom move moveend zoomend resize', syncAll)
  map.on('mousemove', handleMouseMove)
  map.on('zoomend', handleZoomChange)

  handleZoomChange()
  syncAll()
})

onBeforeUnmount(() => {
  if (map) {
    map.off('zoom move moveend zoomend resize', syncAll)
    map.off('mousemove', handleMouseMove)
    map.off('zoomend', handleZoomChange)
    map.remove()
    map = null
  }

  worldLayer = null
  regions.length = 0
})
</script>

<template>
  <div class="map-status">
    <div>
      {{ cursorCoords ? `Cursor: (x: ${cursorCoords.x}, y: ${cursorCoords.y})` : 'Move cursor over map' }}
    </div>
    <div>
      {{ `Zoom: ${zoomCurrent.toFixed(2)}` }}
    </div>
  </div>

  <div class="fantasy-map-root">
    <div ref="mapEl" class="fantasy-map" />
  </div>
</template>

<style scoped>
.fantasy-map-root {
  width: 100%;
  height: 100%;
  min-height: 500px;
}

.fantasy-map {
  width: 100%;
  height: 100%;
  min-height: 500px;
  background: #111;
}

.map-status {
  margin-bottom: 8px;
}

:deep(.leaflet-popup-content) {
  margin: 10px 12px;
  line-height: 1.35;
}

:deep(.leaflet-container) {
  font-family: inherit;
}

:deep(.region-hint-marker) {
  background: transparent;
  border: none;
}

:deep(.region-hint-label) {
  background: rgba(20, 20, 20, 0.9);
  border: 1px solid rgba(255, 216, 102, 0.95);
  color: #fff3bf;
  border-radius: 6px;
  padding: 2px 6px;
  box-shadow: none;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  display: inline-block;
}

:deep(.region-hint-label--center) {
  transform: translate(-50%, -50%);
}

:deep(.region-hint-label--corner) {
  transform: translate(0, 0);
}

:deep(.region-hint-rect--interactive) {
  pointer-events: auto;
  cursor: pointer;
}

:deep(.region-hint-rect--inactive) {
  pointer-events: none;
}
</style>