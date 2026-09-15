export type PhotoCommentsAccount = {
  acct: string
  avatar: string
  display_name: string
  url: string
  username: string
}

export type PhotoCommentsAttachment = {
  blurhash?: string | null
  description?: string | null
  preview_url: string
  meta?: {
    original?: { aspect?: number; height?: number; width?: number }
  } | null
  remote_url?: string | null
  type: 'audio' | 'gifv' | 'image' | 'unknown' | 'video'
  url: string
}

export type PhotoCommentsMention = {
  acct: string
  id: string
  url: string
  username: string
}

export type PhotoCommentsPollOption = {
  title: string
  votes_count: number | null
}

export type PhotoCommentsPoll = {
  expired: boolean
  multiple: boolean
  options: PhotoCommentsPollOption[]
  voters_count: number | null
  votes_count: number | null
}

export type PhotoCommentsStatus = {
  account: PhotoCommentsAccount
  application?: { name: string; website: string | null } | null
  card?: {
    author_name?: string
    description?: string
    image?: string
    provider_name?: string
    title: string
    url: string
  } | null
  content: string
  created_at: string
  favourites_count: number
  id: string
  in_reply_to_id: string | null
  media_attachments: PhotoCommentsAttachment[]
  mentions: PhotoCommentsMention[]
  poll?: PhotoCommentsPoll | null
  reblogs_count: number
  replies_count: number
  sensitive: boolean
  spoiler_text: string
  tags: { name: string; url: string }[]
  uri: string
  url: string | null
  visibility: 'direct' | 'private' | 'public' | 'unlisted'
}

export type ThreadedPhotoComment = PhotoCommentsStatus & {
  replies: ThreadedPhotoComment[]
}

export type DisplayPhotoComment = ThreadedPhotoComment & {
  depth: number
}

export type PhotoCommentsThread = {
  comments: ThreadedPhotoComment[]
  discussionState: 'available' | 'loading' | 'not_syndicated' | 'unavailable'
  post: PhotoCommentsStatus
  remoteUrl: string | null
  stale: boolean
  truncated: boolean
}
