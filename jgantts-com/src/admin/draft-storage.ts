export type AdminPostDraft = {
  bodyMarkdown: string
  date: string
  location: string
  slug: string
  time: string
  title: string
}

export type StoredAdminPostDraft = {
  draft: AdminPostDraft
  savedAt: number
  serverUpdatedAt: string
  version: 1
}

const STORAGE_PREFIX = 'jgantts:admin-post-draft:'
const draftFields: Array<keyof AdminPostDraft> = [
  'bodyMarkdown',
  'date',
  'location',
  'slug',
  'time',
  'title',
]

function storageKey(postId: string): string {
  return `${STORAGE_PREFIX}${postId}`
}

function isAdminPostDraft(value: unknown): value is AdminPostDraft {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return draftFields.every((field) => typeof record[field] === 'string')
}

export function loadAdminPostDraft(postId: string): StoredAdminPostDraft | null {
  try {
    const raw = localStorage.getItem(storageKey(postId))
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<StoredAdminPostDraft>
    if (
      value.version !== 1
      || !isAdminPostDraft(value.draft)
      || typeof value.savedAt !== 'number'
      || !Number.isFinite(value.savedAt)
      || typeof value.serverUpdatedAt !== 'string'
    ) return null
    return value as StoredAdminPostDraft
  } catch {
    return null
  }
}

export function saveAdminPostDraft(
  postId: string,
  draft: AdminPostDraft,
  serverUpdatedAt: string,
  savedAt = Date.now(),
): boolean {
  try {
    const value: StoredAdminPostDraft = {
      draft: { ...draft },
      savedAt,
      serverUpdatedAt,
      version: 1,
    }
    localStorage.setItem(storageKey(postId), JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function removeAdminPostDraft(postId: string): void {
  try {
    localStorage.removeItem(storageKey(postId))
  } catch {
    // Browsers with storage disabled simply skip local recovery.
  }
}
