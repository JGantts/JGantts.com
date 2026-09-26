import type { AdminPostDraft } from './draft-storage'

export type AuthorPostRequestBody = {
  bodyMarkdown?: string
  date: number | null
  location: string | null
  slug?: string
  time: string | null
  title: string | null
}

type AuthorPostBodyOptions = {
  existingPost: boolean
  includeSlug?: boolean
  preserveWhitespace?: boolean
}

export function storedDate(date: string): number | null {
  return date ? Number(date.replaceAll('-', '')) : null
}

export function authorPostBody(
  draft: AdminPostDraft,
  {
    existingPost,
    includeSlug = true,
    preserveWhitespace = false,
  }: AuthorPostBodyOptions,
): AuthorPostRequestBody {
  const fields = {
    location: preserveWhitespace ? draft.location : draft.location.trim() || null,
    title: preserveWhitespace ? draft.title : draft.title.trim() || null,
    date: storedDate(draft.date),
    time: draft.time || null,
    ...(includeSlug ? { slug: draft.slug.trim() } : {}),
  }

  // Existing posts always send the body so clearing it is persisted. New
  // photo-only posts can omit an empty body.
  return existingPost || draft.bodyMarkdown
    ? { ...fields, bodyMarkdown: draft.bodyMarkdown }
    : fields
}
