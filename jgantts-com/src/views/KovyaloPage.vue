<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, shallowRef, triggerRef } from 'vue'
import { useRoute } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps<{
  dev?: boolean
}>()


type BoundsTuple = [[number, number], [number, number]]
type EdgeKey = 'top' | 'right' | 'bottom' | 'left'

const cursorCoords = ref<{ x: number; y: number } | null>(null)
const zoomCurrent = ref<number>(0)

const selectedRegionId = ref<string | null>(null)
const selectedEdge = ref<EdgeKey | null>(null)

const regionOverlayOpacity = computed(() => (props.dev ? 0.5 : 1))

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
const regions = shallowRef<ManagedRegion[]>([])

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
       [16515, 19907],
       [17424, 20469]
    ],
    minZoom: -1.5,
    maxZoom: 3,
    pane: 'regions',
    fadeRange: 2,
    parentId: 'kovyalo',
  },
]

function normalizeBounds(bounds: BoundsTuple): BoundsTuple {
  const [[y1, x1], [y2, x2]] = bounds
  return [
    [Math.min(y1, y2), Math.min(x1, x2)],
    [Math.max(y1, y2), Math.max(x1, x2)],
  ]
}

function boundsToString(bounds: BoundsTuple): string {
  const [[y1, x1], [y2, x2]] = normalizeBounds(bounds)
  return `bounds: [
  [${Math.round(y1)}, ${Math.round(x1)}],
  [${Math.round(y2)}, ${Math.round(x2)}],
]`
}

const selectedRegion = computed(() => {
  if (!selectedRegionId.value) return null
  return regions.value.find((region) => region.id === selectedRegionId.value) ?? null
})

const selectedRegionCode = computed(() => {
  if (!selectedRegion.value) return ''
  return `{
  id: '${selectedRegion.value.id}',
  title: '${selectedRegion.value.title}',
  imageUrl: '${selectedRegion.value.imageUrl}',
  ${boundsToString(selectedRegion.value.bounds)},
  minZoom: ${selectedRegion.value.minZoom},
  maxZoom: ${selectedRegion.value.maxZoom},
  pane: '${selectedRegion.value.pane ?? 'regions'}',
  fadeRange: ${selectedRegion.value.fadeRange ?? 0},
  parentId: ${selectedRegion.value.parentId === null ? 'null' : `'${selectedRegion.value.parentId}'`},
}`
})

function regionBounds(region: RegionConfig): L.LatLngBounds {
  return L.latLngBounds(normalizeBounds(region.bounds))
}

function getRegionCenter(region: RegionConfig): L.LatLng {
  return regionBounds(region).getCenter()
}

function getRegionTopLeftLabelPosition(region: RegionConfig): L.LatLng {
  const [[topY, leftX]] = normalizeBounds(region.bounds)
  return L.latLng(topY + 90, leftX + 120)
}

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

  if (fadeRange <= 0) return 1
  if (zoom < region.minZoom - fadeRange) return 0
  if (zoom >= region.minZoom) return 1

  const t = (zoom - (region.minZoom - fadeRange)) / fadeRange
  return clamp(t, 0, 1)
}

function getRegionById(id: string | null | undefined): ManagedRegion | undefined {
  if (!id) return undefined
  return regions.value.find((region) => region.id === id)
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
  map.fitBounds(regionBounds(region), {
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

function createHintLabel(region: RegionConfig): L.Marker {
  return L.marker(getRegionCenter(region), {
    pane: 'hint-labels',
    interactive: false,
    icon: L.divIcon({
      className: 'region-hint-marker',
      html: `<div class="region-hint-label">Zoom in: ${region.title}</div>`,
      iconSize: undefined,
    }),
  })
}

function updateHintLabelPosition(region: ManagedRegion): void {
  region.hintLabel.setLatLng(
    region.active ? getRegionTopLeftLabelPosition(region) : getRegionCenter(region),
  )
}

function updateHintLabelContent(region: ManagedRegion): void {
  const element = region.hintLabel.getElement()
  if (!element) return

  const label = element.querySelector('.region-hint-label')
  if (!label) return

  label.textContent = region.active ? region.title : `Zoom in: ${region.title}`
  label.classList.toggle('region-hint-label--corner', region.active)
  label.classList.toggle('region-hint-label--center', !region.active)
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

function refreshRegionGeometry(region: ManagedRegion): void {
  const normalized = normalizeBounds(region.bounds)
  region.bounds = normalized

  region.layer.setBounds(L.latLngBounds(normalized))
  region.hintRect.setBounds(normalized)
  updateHintLabelPosition(region)
  updateHintLabelContent(region)
  syncEditOverlay()
}

function syncRegions(): void {
  if (!map) return

  const eligibleRegions = regions.value.filter(isRegionEligible)
  const eligibleIds = new Set(eligibleRegions.map((region) => region.id))

  for (const region of regions.value) {
    const shouldBeVisible = eligibleIds.has(region.id)

    if (!shouldBeVisible) {
      if (region.active) {
        map.removeLayer(region.layer)
        region.active = false
      }
      continue
    }

    const finalOpacity = getBaseRegionOpacity(region) * regionOverlayOpacity.value

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

  for (const region of regions.value) {
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

      setHintRectInteractive(region, !region.active && !props.dev)

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

/* =========================
   Edit mode
========================= */

let editRect: L.Rectangle | null = null
const editEdges = new Map<EdgeKey, L.Polyline>()

function edgeLineLatLngs(bounds: BoundsTuple): Record<EdgeKey, L.LatLngTuple[]> {
  const [[topY, leftX], [bottomY, rightX]] = normalizeBounds(bounds)
  return {
    top: [
      [topY, leftX],
      [topY, rightX],
    ],
    right: [
      [topY, rightX],
      [bottomY, rightX],
    ],
    bottom: [
      [bottomY, leftX],
      [bottomY, rightX],
    ],
    left: [
      [topY, leftX],
      [bottomY, leftX],
    ],
  }
}

function ensureEditOverlay(): void {
  if (!map) return

  if (!editRect) {
    editRect = L.rectangle([[0, 0], [0, 0]], {
      pane: 'edit',
      color: '#00e0ff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.02,
      dashArray: '8 6',
      interactive: false,
    })
  }

  for (const edge of ['top', 'right', 'bottom', 'left'] as const) {
    if (!editEdges.has(edge)) {
      const line = L.polyline([[0, 0], [0, 0]], {
        pane: 'edit',
        color: '#00e0ff',
        weight: 12,
        opacity: 0.001,
        interactive: true,
      })

      line.on('click', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stop(e)
        if (!props.dev || !selectedRegion.value) return
        selectedEdge.value = edge
        syncEditOverlay()
      })

      line.on('mouseover', () => {
        if (!props.dev || !selectedRegion.value) return
        const isSelected = selectedEdge.value === edge
        line.setStyle({
          opacity: isSelected ? 0.9 : 0.35,
        })
      })

      line.on('mouseout', () => {
        const isSelected = selectedEdge.value === edge
        line.setStyle({
          opacity: isSelected ? 0.9 : 0.001,
        })
      })

      editEdges.set(edge, line)
    }
  }
}

function syncEditOverlay(): void {
  if (!map) return
  ensureEditOverlay()

  if (!editRect) return
  const region = selectedRegion.value

  if (!props.dev || !region) {
    if (map.hasLayer(editRect)) {
      map.removeLayer(editRect)
    }

    for (const line of editEdges.values()) {
      if (map.hasLayer(line)) {
        map.removeLayer(line)
      }
    }

    return
  }

  const normalizedBounds = normalizeBounds(region.bounds)
  editRect.setBounds(L.latLngBounds(normalizedBounds))

  if (!map.hasLayer(editRect)) {
    editRect.addTo(map)
  }

  const latLngsByEdge = edgeLineLatLngs(normalizedBounds)
  for (const [edge, line] of editEdges.entries()) {
    line.setLatLngs(latLngsByEdge[edge])

    const isSelected = selectedEdge.value === edge
    line.setStyle({
      color: isSelected ? '#ff7b72' : '#00e0ff',
      opacity: isSelected ? 0.9 : 0.001,
      weight: 12,
    })

    if (!map.hasLayer(line)) {
      line.addTo(map)
    }
  }

  editRect.bringToFront()
  for (const line of editEdges.values()) {
    line.bringToFront()
  }
}

function moveSelectedRegion(dx: number, dy: number): void {
  const region = selectedRegion.value
  if (!region) return

  const [[y1, x1], [y2, x2]] = normalizeBounds(region.bounds)

  region.bounds = [
    [y1 + dy, x1 + dx],
    [y2 + dy, x2 + dx],
  ]

  refreshRegionGeometry(region)
  syncAll()
}

function resizeSelectedRegion(edge: EdgeKey, amount: number): void {
  const region = selectedRegion.value
  if (!region) return

  let [[topY, leftX], [bottomY, rightX]] = normalizeBounds(region.bounds)
  const minSize = 40

  switch (edge) {
    case 'top':
      topY = Math.min(topY + amount, bottomY - minSize)
      break
    case 'bottom':
      bottomY = Math.max(bottomY + amount, topY + minSize)
      break
    case 'left':
      leftX = Math.min(leftX + amount, rightX - minSize)
      break
    case 'right':
      rightX = Math.max(rightX + amount, leftX + minSize)
      break
  }

  region.bounds = [
    [topY, leftX],
    [bottomY, rightX],
  ]

  refreshRegionGeometry(region)
  syncAll()
}

function handleKeydown(e: KeyboardEvent): void {
  if (!props.dev) return
  if (!selectedRegion.value) return

  const target = e.target as HTMLElement | null
  if (
    target &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable)
  ) {
    return
  }

  const step = e.shiftKey ? 10 : 1

  if (selectedEdge.value) {
    switch (selectedEdge.value) {
      case 'top':
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          resizeSelectedRegion('top', -step)
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          resizeSelectedRegion('top', step)
        }
        return

      case 'bottom':
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          resizeSelectedRegion('bottom', -step)
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          resizeSelectedRegion('bottom', step)
        }
        return

      case 'left':
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          resizeSelectedRegion('left', -step)
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          resizeSelectedRegion('left', step)
        }
        return

      case 'right':
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          resizeSelectedRegion('right', -step)
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          resizeSelectedRegion('right', step)
        }
        return
    }
  }

  switch (e.key) {
    case 'ArrowUp':
      e.preventDefault()
      moveSelectedRegion(0, -step)
      break
    case 'ArrowDown':
      e.preventDefault()
      moveSelectedRegion(0, step)
      break
    case 'ArrowLeft':
      e.preventDefault()
      moveSelectedRegion(-step, 0)
      break
    case 'ArrowRight':
      e.preventDefault()
      moveSelectedRegion(step, 0)
      break
    case 'Escape':
      e.preventDefault()
      selectedEdge.value = null
      syncEditOverlay()
      break
  }
}

function selectRegion(id: string): void {
  selectedRegionId.value = id
  selectedEdge.value = null
  syncEditOverlay()
}

function syncAll(): void {
  syncRegions()
  syncRegionHints()
  syncEditOverlay()
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
    keyboard: !props.dev,
  })

  map.createPane('world')
  map.createPane('regions')
  map.createPane('cities')
  map.createPane('markers')
  map.createPane('hints')
  map.createPane('hint-labels')
  map.createPane('edit')

  map.getPane('world')!.style.zIndex = '200'
  map.getPane('regions')!.style.zIndex = '300'
  map.getPane('cities')!.style.zIndex = '400'
  map.getPane('markers')!.style.zIndex = '500'
  map.getPane('hints')!.style.zIndex = '550'
  map.getPane('hint-labels')!.style.zIndex = '560'
  map.getPane('edit')!.style.zIndex = '700'

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
      if (props.dev) {
        selectRegion(managedRegion.id)
      } else if (!managedRegion.active) {
        zoomToRegion(managedRegion)
      }
    })

    hintRect.on('mouseover', () => {
      if (managedRegion.active || props.dev) return
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

    regions.value.push(managedRegion)
    triggerRef(regions)
  }

  if (regions.value.length > 0) {
    selectedRegionId.value = regions.value[0].id
  }

  map.fitBounds(worldBounds)
  map.setMaxBounds(worldBounds)

  map.on('zoom move moveend zoomend resize', syncAll)
  map.on('mousemove', handleMouseMove)
  map.on('zoomend', handleZoomChange)

  window.addEventListener('keydown', handleKeydown)

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

  window.removeEventListener('keydown', handleKeydown)

  worldLayer = null
  regions.value.length = 0
  triggerRef(regions)
})
</script>

<template>
  <div v-if="props.dev" class="toolbar">
    <label class="toolbar-row">
      Region
      <select :value="selectedRegionId ?? ''" @change="selectRegion(($event.target as HTMLSelectElement).value)">
        <option v-for="region in regions" :key="region.id" :value="region.id">
          {{ region.title }}
        </option>
      </select>
    </label>

    <div>
      bounds: {{ selectedRegion ? `[ [${Math.round(selectedRegion.bounds[0][0])}, ${Math.round(selectedRegion.bounds[0][1])}], [${Math.round(selectedRegion.bounds[1][0])}, ${Math.round(selectedRegion.bounds[1][1])}] ]` : 'N/A' }}
    </div>

    <div class="status">
      <div>
        {{ cursorCoords ? `Cursor: (x: ${cursorCoords.x}, y: ${cursorCoords.y})` : 'Move cursor over map' }}
      </div>
      <div>
        {{ `Zoom: ${zoomCurrent.toFixed(2)}` }}
      </div>
      <div class="edit-help">
        <strong>Edit mode:</strong>
        Arrow = move by 1. Shift + Arrow = move by 10.
        Click an edge to select it, then Arrow / Shift + Arrow resizes that edge only.
        Press Esc to clear edge selection.
      </div>
      <div v-if="selectedEdge" class="edit-help">
        Selected edge: <strong>{{ selectedEdge }}</strong>
      </div>
    </div>

    <pre v-if="selectedRegionCode" class="output">{{ selectedRegionCode }}</pre>
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

.toolbar {
  display: grid;
  gap: 8px;
  margin-bottom: 10px;
}

.toolbar-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.status {
  display: grid;
  gap: 2px;
}

.edit-help {
  font-size: 12px;
  opacity: 0.85;
}

.output {
  margin: 0;
  padding: 10px;
  border-radius: 8px;
  background: #111;
  color: #ddd;
  overflow: auto;
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