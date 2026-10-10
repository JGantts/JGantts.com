import { type Map as MapLibreMap } from 'maplibre-gl'
import type { GuiNode } from '../../HUD/GuiView/types/gui';

export type JgMap = {
    mlMap: MapLibreMap
    guiTree: GuiNode
    savePosition: () => void
    unmount: () => void
}

export type BoundsTuple = [[number, number], [number, number]]

export type RegionLayerConfig = {
  type: "tiled" | "single"
  zoom: ZoomConfig|null
  zoomDisplay: ZoomConfig|null
  hasDark: boolean|null
  exclusivityGroup: string|null,
  uiPath: string[]|null
}

export type DataSourceKind = 'towns'

export type Zoom = { min: number, max: number }

export type Zooms = {data: Zoom, display: Zoom}

export type ZoomConfig = Zoom|Zooms

export type RegionConfig = {
  id: string
  title: string | Town['title']
  labelCoordinates?: [number, number]
  bounds: BoundsTuple
  zoom: ZoomConfig
  parentId?: string | null
  base: RegionLayerConfig
  background: RegionLayerConfig
  layers: (RegionLayerConfig&{id: string})[]
  dataSources?: {
    kind: DataSourceKind
    points: Town[]
  }[]
}

export type WorldConfig = {
  world: RegionConfig
  regions: RegionConfig[]
}

export type ImageCoordinates = [
  [number, number],
  [number, number],
  [number, number],
  [number, number],
]

export type Town = {
  title: {
    native: string
    latin?: string
    hangul?: string
  }
  coordinates: [number, number]
  population: number
}

export type TownPlusRegion = Town & { regionId: string }
