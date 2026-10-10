import type { RasterLayerSpecification } from 'maplibre-gl'
import { cartography } from './cartography'
import type { RegionLayerConfig } from './types/maps'

export function rasterPaint(id: string, layer: RegionLayerConfig): RasterLayerSpecification['paint'] {
  const defaults: Record<string, RegionLayerConfig['styleRole']> = { states: 'political', rivers: 'rivers', borders: 'national-border' }
  const role = layer.styleRole ?? defaults[id]
  if (role === 'terrain' || role === 'political') return {
    'raster-opacity': 1,
    'raster-brightness-min': cartography.terrain.shadowFloor,
    'raster-saturation': role === 'political' ? cartography.terrain.politicalSaturation : cartography.terrain.saturation,
  }
  if (role === 'rivers') return { 'raster-opacity': cartography.rivers.rasterOpacity }
  if (role === 'national-border' || role === 'administrative-border') {
    const style = cartography.borders[role === 'national-border' ? 'national' : 'administrative']
    return { 'raster-opacity': style.opacity, 'raster-brightness-min': style.brightness }
  }
  return { 'raster-opacity': 1 }
}
