export function effectiveHeroMediaId(
  post: { heroMediaId: string | null; media: Array<{ id: string }> } | null,
): string | null {
  if (!post) return null
  return post.heroMediaId ?? (post.media.length === 1 ? post.media[0]!.id : null)
}
