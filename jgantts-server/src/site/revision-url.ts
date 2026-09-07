export function revisionedPath(
  pathname: string,
  revision: number,
  versioned: boolean,
  preview?: string,
): string {
  const query = new URLSearchParams();
  if (versioned) query.set('rev', String(revision));
  if (preview) query.set('preview', preview);
  const suffix = query.toString();
  return suffix ? `${pathname}?${suffix}` : pathname;
}

export function revisionedPostPath(slug: string, revision: number, versioned: boolean, preview?: string): string {
  return revisionedPath(`/photos/${encodeURIComponent(slug)}`, revision, versioned, preview);
}
