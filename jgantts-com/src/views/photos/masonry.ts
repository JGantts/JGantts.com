export type PhotoCard = {
  id: string
  clusterKey: string
  aspectRatio: number
  sourceWidth?: number
  sourceHeight?: number
}

export type PlacedPhotoCard = PhotoCard & {
  x: number
  y: number
  width: number
  height: number
}

export type PlacedPhotoCluster = {
  key: string
  x: number
  y: number
  width: number
  height: number
  cards: PlacedPhotoCard[]
}

export type PhotoMasonry = {
  height: number
  clusters: PlacedPhotoCluster[]
}

type GridCard = PhotoCard & { columnSpan: number; rowSpan: number }

const POSITION_EPSILON = 0.001

const RATIO_TILES = [
  { columnSpan: 2, rowSpan: 6 },
  { columnSpan: 2, rowSpan: 3 },
  { columnSpan: 3, rowSpan: 4 },
  { columnSpan: 3, rowSpan: 3 },
  { columnSpan: 4, rowSpan: 3 },
  { columnSpan: 3, rowSpan: 2 },
  { columnSpan: 6, rowSpan: 2 },
] as const

function sourceArea(card: PhotoCard) {
  if (!card.sourceWidth || !card.sourceHeight) return null
  if (card.sourceWidth <= 0 || card.sourceHeight <= 0) return null
  return card.sourceWidth * card.sourceHeight
}

function medianSourceArea(cards: PhotoCard[]) {
  const areas = cards
    .map(sourceArea)
    .filter((area): area is number => area !== null)
    .sort((a, b) => a - b)
  if (!areas.length) return null

  const middle = Math.floor(areas.length / 2)
  return areas.length % 2 === 0
    ? (areas[middle - 1]! + areas[middle]!) / 2
    : areas[middle]!
}

function tileSpan(card: PhotoCard, totalColumns: number, referenceArea: number | null) {
  const ratio = Math.max(0.1, card.aspectRatio)
  const available = RATIO_TILES.filter((tile) => tile.columnSpan <= totalColumns)
  if (!available.length) return { columnSpan: 1, rowSpan: 1 }

  // Log distance treats reciprocal portrait/landscape ratios symmetrically.
  const ratioTile = available.reduce((closest, tile) => {
    const closestRatio = closest.columnSpan / closest.rowSpan
    const tileRatio = tile.columnSpan / tile.rowSpan
    return Math.abs(Math.log(ratio / tileRatio)) < Math.abs(Math.log(ratio / closestRatio))
      ? tile
      : closest
  })

  const area = sourceArea(card)
  if (!area || !referenceArea) return ratioTile

  // A larger source earns a larger tile, but use a fourth root so resolution outliers do not
  // dominate the page. This makes displayed area grow roughly with source linear resolution.
  const scale = Math.min(1.5, Math.max(0.6, (area / referenceArea) ** 0.25))
  const targetArea = ratioTile.columnSpan * ratioTile.rowSpan * scale ** 2
  const maximumColumnSpan = Math.min(totalColumns, 8)
  let best: { columnSpan: number; rowSpan: number } = {
    columnSpan: ratioTile.columnSpan,
    rowSpan: ratioTile.rowSpan,
  }
  let bestScore = Number.POSITIVE_INFINITY

  for (let columnSpan = 1; columnSpan <= maximumColumnSpan; columnSpan += 1) {
    for (let rowSpan = 1; rowSpan <= 8; rowSpan += 1) {
      const candidateRatio = columnSpan / rowSpan
      const ratioError = Math.abs(Math.log(ratio / candidateRatio))
      const areaError = Math.abs(Math.log((columnSpan * rowSpan) / targetArea))
      const score = ratioError * 2 + areaError
      if (score < bestScore) {
        best = { columnSpan, rowSpan }
        bestScore = score
      }
    }
  }

  return best
}

function pixelsForSpan(span: number, cellSize: number, gap: number) {
  return span * cellSize + Math.max(0, span - 1) * gap
}

function intervalOverlap(
  firstStart: number,
  firstEnd: number,
  secondStart: number,
  secondEnd: number,
) {
  return Math.max(0, Math.min(firstEnd, secondEnd) - Math.max(firstStart, secondStart))
}

function sharedBorderLength(
  candidate: Pick<PlacedPhotoCard, 'x' | 'y' | 'width' | 'height'>,
  clusterCards: PlacedPhotoCard[],
  gap: number,
) {
  return clusterCards.reduce((longestBorder, card) => {
    const candidateRight = candidate.x + candidate.width
    const candidateBottom = candidate.y + candidate.height
    const cardRight = card.x + card.width
    const cardBottom = card.y + card.height
    let sharedBorder = 0

    if (
      Math.abs(candidate.x - cardRight - gap) < POSITION_EPSILON
      || Math.abs(card.x - candidateRight - gap) < POSITION_EPSILON
    ) {
      sharedBorder = intervalOverlap(candidate.y, candidateBottom, card.y, cardBottom)
    }
    if (
      Math.abs(candidate.y - cardBottom - gap) < POSITION_EPSILON
      || Math.abs(card.y - candidateBottom - gap) < POSITION_EPSILON
    ) {
      sharedBorder = Math.max(
        sharedBorder,
        intervalOverlap(candidate.x, candidateRight, card.x, cardRight),
      )
    }

    return Math.max(longestBorder, sharedBorder)
  }, 0)
}

function attachedYPositions(
  x: number,
  width: number,
  height: number,
  minimumY: number,
  minimumBorderOverlap: number,
  clusterCards: PlacedPhotoCard[],
  gap: number,
) {
  const positions = new Set([minimumY])
  for (const card of clusterCards) {
    const horizontallyAdjacent =
      Math.abs(x - (card.x + card.width + gap)) < POSITION_EPSILON
      || Math.abs(x + width + gap - card.x) < POSITION_EPSILON
    if (horizontallyAdjacent) {
      // A cell is an exact fraction of every grid-derived photo edge, so this adjustment keeps
      // the card on the same implicit grid while creating a substantial shared border.
      positions.add(Math.max(minimumY, card.y + minimumBorderOverlap - height))
    }

    const horizontalOverlap = intervalOverlap(x, x + width, card.x, card.x + card.width)
    if (horizontalOverlap + POSITION_EPSILON >= minimumBorderOverlap) {
      positions.add(Math.max(minimumY, card.y + card.height + gap))
    }
  }
  return positions
}

/**
 * Photos are placed independently on the skyline so smaller cards can fill space beside taller
 * ones. Cards retain their post key and are regrouped after placement for selection and styling.
 */
function calculatePhotoMasonryAtDensity(
  cards: PhotoCard[],
  containerWidth: number,
  totalColumns: number,
  gap: number,
): PhotoMasonry | null {
  if (!cards.length || containerWidth <= 0 || totalColumns <= 0) {
    return { height: 0, clusters: [] }
  }

  const cellSize = (containerWidth - gap * (totalColumns - 1)) / totalColumns
  const referenceArea = medianSourceArea(cards)
  const gridCards: GridCard[] = cards.map((card) => ({
    ...card,
    ...tileSpan(card, totalColumns, referenceArea),
  }))
  const placedByCluster = new Map<string, PlacedPhotoCard[]>()
  for (const card of cards) {
    if (!placedByCluster.has(card.clusterKey)) placedByCluster.set(card.clusterKey, [])
  }

  const skyline = new Array(totalColumns).fill(0) as number[]
  for (const card of gridCards) {
    let bestColumn = 0
    let bestY = Number.POSITIVE_INFINITY
    const clusterCards = placedByCluster.get(card.clusterKey)!

    for (let column = 0; column <= totalColumns - card.columnSpan; column += 1) {
      const minimumY = Math.max(...skyline.slice(column, column + card.columnSpan))
      const x = column * (cellSize + gap)
      const width = pixelsForSpan(card.columnSpan, cellSize, gap)
      const height = pixelsForSpan(card.rowSpan, cellSize, gap)
      const yPositions = clusterCards.length
        ? attachedYPositions(x, width, height, minimumY, cellSize, clusterCards, gap)
        : [minimumY]

      for (const y of yPositions) {
        if (
          clusterCards.length
          && sharedBorderLength({ x, y, width, height }, clusterCards, gap)
            + POSITION_EPSILON < cellSize
        ) {
          continue
        }
        if (y < bestY) {
          bestY = y
          bestColumn = column
        }
      }
    }

    // Reject this density rather than create a cluster joined by less than one whole grid cell.
    if (!Number.isFinite(bestY)) return null

    const x = bestColumn * (cellSize + gap)
    const width = pixelsForSpan(card.columnSpan, cellSize, gap)
    const height = pixelsForSpan(card.rowSpan, cellSize, gap)
    placedByCluster.get(card.clusterKey)!.push({
      id: card.id,
      clusterKey: card.clusterKey,
      aspectRatio: card.aspectRatio,
      sourceWidth: card.sourceWidth,
      sourceHeight: card.sourceHeight,
      x,
      y: bestY,
      width,
      height,
    })

    const bottom = bestY + height + gap
    for (let column = bestColumn; column < bestColumn + card.columnSpan; column += 1) {
      skyline[column] = bottom
    }
  }

  const clusters = Array.from(placedByCluster, ([key, clusterCards]) => {
    const x = Math.min(...clusterCards.map((card) => card.x))
    const y = Math.min(...clusterCards.map((card) => card.y))
    const right = Math.max(...clusterCards.map((card) => card.x + card.width))
    const bottom = Math.max(...clusterCards.map((card) => card.y + card.height))
    return { key, x, y, width: right - x, height: bottom - y, cards: clusterCards }
  })

  return {
    clusters,
    height: Math.max(0, ...skyline) - gap,
  }
}

function masonryScore(
  masonry: PhotoMasonry,
  containerWidth: number,
  targetHeight: number,
  preferredShortEdge: number,
) {
  const photoArea = masonry.clusters.reduce(
    (total, cluster) =>
      total + cluster.cards.reduce((clusterTotal, card) => clusterTotal + card.width * card.height, 0),
    0,
  )
  const canvasArea = Math.max(1, containerWidth * masonry.height)
  const emptyFraction = Math.max(0, 1 - photoArea / canvasArea)
  const heightRatio = masonry.height / Math.max(1, targetHeight)
  const underfill = Math.max(0, 1 - heightRatio)
  const overflow = Math.max(0, heightRatio - 1)
  const cards = masonry.clusters.flatMap((cluster) => cluster.cards)
  const undersized = cards.length
    ? cards.reduce((total, card) => {
        const shortEdge = Math.min(card.width, card.height)
        return total + Math.max(0, 1 - shortEdge / preferredShortEdge) ** 2
      }, 0) / cards.length
    : 0
  const upscaled = cards.length
    ? cards.reduce((total, card) => {
        if (!card.sourceWidth || !card.sourceHeight) return total
        const scale = Math.max(card.width / card.sourceWidth, card.height / card.sourceHeight)
        return total + Math.max(0, scale - 1) ** 2
      }, 0) / cards.length
    : 0

  // Missing the available page is conspicuous, while a little vertical overflow is harmless.
  // EmptyFraction steers the skyline toward densities that use the full page width, while the
  // upscale penalty avoids choosing a density that stretches small source images unnecessarily.
  return underfill * 7 + overflow * 1.15 + undersized * 5 + emptyFraction * 2.5 + upscaled * 2
}

/**
 * Select a grid density instead of making it a breakpoint constant. The selected density aims
 * to give photos a generous short edge while using roughly one viewport of gallery space.
 */
export function calculatePhotoMasonry(
  cards: PhotoCard[],
  containerWidth: number,
  maximumColumns: number,
  gap: number,
  targetHeight = containerWidth * 0.7,
): PhotoMasonry {
  if (!cards.length || containerWidth <= 0 || maximumColumns <= 0) {
    return { height: 0, clusters: [] }
  }

  const minimumColumns = Math.min(6, maximumColumns)
  const preferredShortEdge = Math.min(300, Math.max(150, containerWidth / 4.5))
  let best: PhotoMasonry | null = null
  let bestScore = Number.POSITIVE_INFINITY

  for (let columns = minimumColumns; columns <= maximumColumns; columns += 1) {
    const candidate = calculatePhotoMasonryAtDensity(cards, containerWidth, columns, gap)
    if (!candidate) continue
    const candidateScore = masonryScore(
      candidate,
      containerWidth,
      targetHeight,
      preferredShortEdge,
    )
    if (candidateScore < bestScore) {
      best = candidate
      bestScore = candidateScore
    }
  }

  return best ?? { height: 0, clusters: [] }
}
