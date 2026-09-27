import { describe, expect, it } from 'vitest'
import { calculatePhotoMasonry, comparePhotoScreenPosition, type PhotoCard, type PhotoMasonry, type PlacedPhotoCard } from './masonry'

// A viewed two-photo post moves behind four newer posts. The first photo fits in
// a hole in the skyline, but leaves no shared edge for its larger second photo.
const trappedPostCards: PhotoCard[] = [
  ['a', 'a', 5712, 3615],
  ['b', 'b', 4032, 2643],
  ['c', 'c', 3622, 2101],
  ['d', 'd', 4029, 2875],
  ['e-small', 'e', 2048, 1536],
  ['e-large', 'e', 4032, 3024],
].map(([id, clusterKey, width, height]) => ({
  id: String(id), clusterKey: String(clusterKey),
  sourceWidth: Number(width), sourceHeight: Number(height),
  aspectRatio: Number(width) / Number(height),
}))

function expectCompleteLayout(layout: PhotoMasonry, cards: PhotoCard[], width: number, gap: number) {
  const placed = layout.clusters.flatMap(cluster => cluster.cards)
  expect(placed.map(card => card.id).sort()).toEqual(cards.map(card => card.id).sort())
  expect(Number.isFinite(layout.height)).toBe(true)
  expect(layout.height).toBeGreaterThan(0)
  for (const card of placed) {
    expect([card.x, card.y, card.width, card.height].every(Number.isFinite)).toBe(true)
    expect(card.width).toBeGreaterThan(0)
    expect(card.height).toBeGreaterThan(0)
    expect(card.x).toBeGreaterThanOrEqual(0)
    expect(card.y).toBeGreaterThanOrEqual(0)
    expect(card.x + card.width).toBeLessThanOrEqual(width + 0.001)
    expect(card.y + card.height).toBeLessThanOrEqual(layout.height + 0.001)
    for (const other of placed) {
      if (other === card) continue
      expect(card.x + card.width + gap <= other.x + 0.001
        || other.x + other.width + gap <= card.x + 0.001
        || card.y + card.height + gap <= other.y + 0.001
        || other.y + other.height + gap <= card.y + 0.001).toBe(true)
    }
  }
}

describe('calculatePhotoMasonry', () => {
  it('keeps every photo visible when a reordered post cannot fit in the skyline', () => {
    const layout = calculatePhotoMasonry(trappedPostCards, 366, 6, 10, 674)
    expectCompleteLayout(layout, trappedPostCards, 366, 10)
    const [small, large] = layout.clusters.find(cluster => cluster.key === 'e')!.cards
    expect(large!.y).toBeCloseTo(small!.y + small!.height + 10)
    const sharedBorder = Math.min(small!.x + small!.width, large!.x + large!.width)
      - Math.max(small!.x, large!.x)
    expect(sharedBorder).toBeGreaterThanOrEqual((366 - 5 * 10) / 6 - 0.001)
  })

  it('preserves all photos after reorder, resize, and featured-post selection', () => {
    for (const width of [290, 360, 366, 480, 768, 1200]) {
      for (let shift = 0; shift < trappedPostCards.length; shift += 1) {
        const cards = [...trappedPostCards.slice(shift), ...trappedPostCards.slice(0, shift)]
        for (const featured of [undefined, 'e']) {
          expectCompleteLayout(
            calculatePhotoMasonry(cards, width, width < 520 ? 6 : 12, 10, 674, featured),
            cards, width, 10,
          )
        }
      }
    }
  })
})

function photo(id: string, x: number, y: number, width: number): PlacedPhotoCard {
  return {
    aspectRatio: 1,
    clusterKey: id,
    height: 100,
    id,
    width,
    x,
    y,
  }
}

describe('comparePhotoScreenPosition', () => {
  it('orders photos from top to bottom and breaks top-edge ties by horizontal center', () => {
    const photos = [
      photo('bottom-left', 0, 200, 40),
      photo('top-center-right', 0, 20, 200),
      photo('top-center-left', 50, 20, 20),
      photo('middle', 20, 100, 40),
    ]

    expect(photos.sort(comparePhotoScreenPosition).map(({ id }) => id)).toEqual([
      'top-center-left',
      'top-center-right',
      'middle',
      'bottom-left',
    ])
  })
})
