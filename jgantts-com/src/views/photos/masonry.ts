export type PhotoCard = {
  id: string
  clusterKey: string
  aspectRatio: number
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
type GridPlacement = GridCard & { column: number; row: number }
type ClusterShape = {
  columnSpan: number
  rowSpan: number
  cards: GridPlacement[]
}

const RATIO_TILES = [
  { columnSpan: 2, rowSpan: 6 },
  { columnSpan: 2, rowSpan: 3 },
  { columnSpan: 3, rowSpan: 4 },
  { columnSpan: 3, rowSpan: 3 },
  { columnSpan: 4, rowSpan: 3 },
  { columnSpan: 3, rowSpan: 2 },
  { columnSpan: 6, rowSpan: 2 },
] as const

function tileSpan(card: PhotoCard, totalColumns: number) {
  const ratio = Math.max(0.1, card.aspectRatio)
  const available = RATIO_TILES.filter((tile) => tile.columnSpan <= totalColumns)

  // Log distance treats reciprocal portrait/landscape ratios symmetrically.
  return available.reduce((closest, tile) => {
    const closestRatio = closest.columnSpan / closest.rowSpan
    const tileRatio = tile.columnSpan / tile.rowSpan
    return Math.abs(Math.log(ratio / tileRatio)) < Math.abs(Math.log(ratio / closestRatio))
      ? tile
      : closest
  })
}

function packAtWidth(cards: GridCard[], gridWidth: number): ClusterShape | null {
  const occupied: boolean[][] = []
  const placements: GridPlacement[] = []

  const fits = (card: GridCard, column: number, row: number) => {
    if (column + card.columnSpan > gridWidth) return false
    for (let y = row; y < row + card.rowSpan; y += 1) {
      for (let x = column; x < column + card.columnSpan; x += 1) {
        if (occupied[y]?.[x]) return false
      }
    }
    return true
  }

  for (const card of cards) {
    let placed: GridPlacement | null = null
    for (let row = 0; !placed && row < 10_000; row += 1) {
      for (let column = 0; column <= gridWidth - card.columnSpan; column += 1) {
        if (!fits(card, column, row)) continue
        placed = { ...card, column, row }
        break
      }
    }
    if (!placed) return null

    placements.push(placed)
    for (let y = placed.row; y < placed.row + placed.rowSpan; y += 1) {
      occupied[y] ??= []
      for (let x = placed.column; x < placed.column + placed.columnSpan; x += 1) {
        occupied[y]![x] = true
      }
    }
  }

  const columnSpan = Math.max(...placements.map((card) => card.column + card.columnSpan))
  const rowSpan = Math.max(...placements.map((card) => card.row + card.rowSpan))
  return { columnSpan, rowSpan, cards: placements }
}

function chooseClusterShape(cards: PhotoCard[], totalColumns: number): ClusterShape {
  const gridCards = cards.map((card) => ({ ...card, ...tileSpan(card, totalColumns) }))
  const minimumWidth = Math.max(...gridCards.map((card) => card.columnSpan))
  const maximumWidth = Math.min(totalColumns, Math.max(6, minimumWidth, cards.length * 3))
  const totalArea = gridCards.reduce((area, card) => area + card.columnSpan * card.rowSpan, 0)

  const candidates: ClusterShape[] = []
  for (let width = minimumWidth; width <= maximumWidth; width += 1) {
    const candidate = packAtWidth(gridCards, width)
    if (candidate) candidates.push(candidate)
  }

  return candidates.reduce((best, candidate) => {
    const bestWaste = best.columnSpan * best.rowSpan - totalArea
    const candidateWaste = candidate.columnSpan * candidate.rowSpan - totalArea
    const bestScore = best.rowSpan + best.columnSpan * 0.12 + bestWaste * 0.08
    const candidateScore =
      candidate.rowSpan + candidate.columnSpan * 0.12 + candidateWaste * 0.08
    return candidateScore < bestScore ? candidate : best
  })
}

function pixelsForSpan(span: number, cellSize: number, gap: number) {
  return span * cellSize + Math.max(0, span - 1) * gap
}

/**
 * Photos occupy ratio-aware atomic regions inside their post. The completed post is then
 * packed as one skyline block, so posts stay clustered and no image is ever segmented.
 */
function calculatePhotoMasonryAtDensity(
  cards: PhotoCard[],
  containerWidth: number,
  totalColumns: number,
  gap: number,
): PhotoMasonry {
  if (!cards.length || containerWidth <= 0 || totalColumns <= 0) {
    return { height: 0, clusters: [] }
  }

  const cellSize = (containerWidth - gap * (totalColumns - 1)) / totalColumns
  const grouped = new Map<string, PhotoCard[]>()
  for (const card of cards) {
    const cluster = grouped.get(card.clusterKey)
    if (cluster) cluster.push(card)
    else grouped.set(card.clusterKey, [card])
  }

  const skyline = new Array(totalColumns).fill(0) as number[]
  const clusters: PlacedPhotoCluster[] = []

  for (const [key, clusterCards] of grouped) {
    const shape = chooseClusterShape(clusterCards, totalColumns)
    let bestColumn = 0
    let bestY = Number.POSITIVE_INFINITY

    for (let column = 0; column <= totalColumns - shape.columnSpan; column += 1) {
      const y = Math.max(...skyline.slice(column, column + shape.columnSpan))
      if (y < bestY) {
        bestY = y
        bestColumn = column
      }
    }

    const x = bestColumn * (cellSize + gap)
    const width = pixelsForSpan(shape.columnSpan, cellSize, gap)
    const height = pixelsForSpan(shape.rowSpan, cellSize, gap)
    const positionedCards = shape.cards.map((card) => ({
      id: card.id,
      clusterKey: card.clusterKey,
      aspectRatio: card.aspectRatio,
      x: x + card.column * (cellSize + gap),
      y: bestY + card.row * (cellSize + gap),
      width: pixelsForSpan(card.columnSpan, cellSize, gap),
      height: pixelsForSpan(card.rowSpan, cellSize, gap),
    }))

    clusters.push({ key, x, y: bestY, width, height, cards: positionedCards })

    const bottom = bestY + height + gap
    for (let column = bestColumn; column < bestColumn + shape.columnSpan; column += 1) {
      skyline[column] = bottom
    }
  }

  return {
    clusters,
    height: Math.max(0, ...clusters.map((cluster) => cluster.y + cluster.height)),
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

  // Missing the available page is conspicuous, while a little vertical overflow is harmless.
  // EmptyFraction also steers the skyline toward densities that use the full page width.
  return underfill * 7 + overflow * 1.15 + undersized * 5 + emptyFraction * 2.5
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
  let best = calculatePhotoMasonryAtDensity(cards, containerWidth, minimumColumns, gap)
  let bestScore = masonryScore(best, containerWidth, targetHeight, preferredShortEdge)

  for (let columns = minimumColumns + 1; columns <= maximumColumns; columns += 1) {
    const candidate = calculatePhotoMasonryAtDensity(cards, containerWidth, columns, gap)
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

  return best
}
