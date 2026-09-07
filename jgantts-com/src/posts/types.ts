export type PostMedia = {
  title: string | null
  location: string | null
  date: number | null
  time: string | null
  altText: string
  byteSize: number
  caption: string | null
  checksumSha256: string
  createdAt: string
  displayOrder: number
  focalX: number | null
  focalY: number | null
  postId: string
  placeholder: {
    byteSize: number
    colorSpace: 'srgb'
    format: 'webp'
    height: number
    privateMetadataStripped: true
    purpose: 'placeholder'
    url: string
    variant: string
    width: number
  } | null
  processingState: 'processing' | 'ready' | 'failed'
  renditions: Array<{
    byteSize: number
    colorSpace: 'srgb'
    format: 'avif' | 'jpeg' | 'png' | 'webp'
    height: number
    url: string
    variant: string
    width: number
    privateMetadataStripped: true
    purpose: 'responsive'
  }>
  updatedAt: string
  height: number | null
  id: string
  mimeType: string
  urls: {
    large: string
    original: string
    thumbnail: string
  }
  width: number | null
}

export type CanonicalPost = {
  title: string | null
  location: string | null
  date: number | null
  time: string | null
  bodyHtml: string
  heroMediaId: string | null
  id: string
  media: PostMedia[]
  publishedAt: string
  slug: string
  updatedAt: string
  revision?: number
}

export type PostPage = {
  items: CanonicalPost[]
  nextCursor: string | null
}

export type MastodonComment = {
  account: {
    avatarUrl: string | null
    displayName: string
    handle: string
    url: string
  }
  attachments: Array<{
    description: string | null
    previewUrl: string
    url: string
  }>
  contentHtml: string
  createdAt: string
  id: string
  orphaned: boolean
  parentId: string | null
  url: string
}

export type MastodonCommentNode = MastodonComment & {
  children: MastodonCommentNode[]
}

export type MastodonCommentsResponse = {
  comments: MastodonComment[]
  fetchedAt: string | null
  remoteUrl: string | null
  stale: boolean
  state: 'available' | 'not_syndicated' | 'unavailable'
  truncated: boolean
}
