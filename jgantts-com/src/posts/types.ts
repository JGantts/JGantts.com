export type PostMedia = {
  altText: string
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
  bodyHtml: string
  contentWarning: string | null
  excerpt: string | null
  id: string
  media: PostMedia[]
  publishedAt: string
  slug: string
  title: string | null
  updatedAt: string
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
