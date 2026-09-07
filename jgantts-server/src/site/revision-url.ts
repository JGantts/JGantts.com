export function revisionedPath(
  pathname: string,
  revision: number,
  versioned: boolean,
  build?: string,
): string {
  const query = new URLSearchParams();
  if (versioned) query.set('rev', String(revision));
  if (build) query.set('build', build);
  const suffix = query.toString();
  return suffix ? `${pathname}?${suffix}` : pathname;
}

export function revisionedPostPath(slug: string, revision: number, versioned: boolean, build?: string): string {
  return revisionedPath(`/photos/${encodeURIComponent(slug)}`, revision, versioned, build);
}
