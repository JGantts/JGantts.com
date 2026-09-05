export type SyndicationState = 'pending' | 'published' | 'failed';
export type OutboxJobState = 'pending' | 'processing' | 'completed' | 'failed';
export type MastodonJobKind = 'mastodon.publish_status' | 'mastodon.edit_status';

export interface Syndication {
  id: number;
  postId: string;
  destination: 'mastodon';
  remoteInstance: string;
  remoteStatusId: string | null;
  remoteUrl: string | null;
  state: SyndicationState;
  publicationRevision: number;
  idempotencyKey: string;
  attemptCount: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MastodonJobPayload {
  canonicalUrl: string;
  idempotencyKey: string;
  syndicationId: number;
  teaser: string;
}

export interface OutboxJob {
  id: number;
  kind: MastodonJobKind;
  aggregateId: string;
  payload: MastodonJobPayload;
  state: OutboxJobState;
  attemptCount: number;
  availableAt: string;
  lockedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MastodonStatusResult {
  id: string;
  url: string;
}
