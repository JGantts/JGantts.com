import { describe, expect, it } from 'vitest'
import { comparePhotoScreenPosition, type PlacedPhotoCard } from './masonry'

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
