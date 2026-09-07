export function revisionedPath(pathname: string, revision: number, versioned: boolean): string {
  return versioned ? `${pathname}?rev=${revision}` : pathname;
}

export function revisionedPostPath(slug: string, revision: number, versioned: boolean): string {
  return revisionedPath(`/photos/${encodeURIComponent(slug)}`, revision, versioned);
}
