export interface MastodonCommentAttachment {
  description: string | null;
  previewUrl: string;
  url: string;
}

export interface MastodonComment {
  account: {
    avatarUrl: string | null;
    displayName: string;
    handle: string;
    url: string;
  };
  attachments: MastodonCommentAttachment[];
  contentHtml: string;
  createdAt: string;
  id: string;
  orphaned: boolean;
  parentId: string | null;
  url: string;
}

export interface MastodonCommentsResponse {
  comments: MastodonComment[];
  fetchedAt: string | null;
  remoteUrl: string | null;
  stale: boolean;
  state: 'available' | 'not_syndicated' | 'unavailable';
  truncated: boolean;
}
