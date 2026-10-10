// Presentation only: these settings must never change names or geographic data.
// Ratios use the primary label's font size; distances are CSS pixels unless noted.
export const cartography = {
  labels: {
    romanizationScale: 0.8,
    supplementaryScale: 0.62,
    rubyScale: 0.55,
    haloRatio: 0.055,
    color: '#ffffff',
    haloColor: '#111111',
    rubyGap: 3,
    lineGap: 4,
    collisionPadding: 8,
    regionCollisionPadding: 12,
    markerGapEm: 1,
    boundaryClearance: 5,
  },
  terrain: {
    // Applied to transparent land rasters only, never to the black background.
    shadowFloor: 0.08,
    saturation: -0.06,
    politicalSaturation: -0.12,
  },
  rivers: {
    // Opaque vector strokes avoid dark seams where short width samples meet.
    opacity: 1,
    rasterOpacity: 0.78,
    color: '#648a99',
    minimumWidth: 0.35,
    maximumWidth: 2.3,
    areaExponent: 0.35,
    overviewScale: 0.65,
    detailScale: 1.25,
    minorWidthScale: 0.55,
    majorAreaFraction: 0.015,
  },
  borders: {
    national: { brightness: 0.12, opacity: 0.95 },
    administrative: { brightness: 0.22, opacity: 0.72 },
    casingBlur: 2,
    casingOpacity: 0.35,
    classes: {
      national: { color: '#25252a', width: [1.25, 1.8], opacity: [0.95, 1], clearanceWeight: 3 },
      provincial: { color: '#302d34', width: [0.8, 1.3], opacity: [0.85, 0.95], clearanceWeight: 2 },
      county: { color: '#3b363a', width: [0.45, 0.8], opacity: [0.3, 0.65], clearanceWeight: 0.3 },
    },
  },
  settlements: {
    villageRadius: 2,
    townRadius: 3,
    cityRadius: 4.5,
    capitalRadius: 5.5,
    townPopulation: 500,
    cityPopulation: 5000,
    outline: 1.1,
    spacing: 2,
    minorLabelZoomDelay: 1,
  },
}
