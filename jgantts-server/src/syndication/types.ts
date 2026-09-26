export type SyndicationDestination = 'mastodon';
export type SyndicationState = 'pending' | 'published' | 'failed';
export type OutboxJobState = 'pending' | 'processing' | 'completed' | 'failed';
export type MastodonJobKind = 'mastodon.publish_status' | 'mastodon.edit_status';
export type SyndicationJobKind = MastodonJobKind;

export interface Syndication {
  id: number;
  postId: string;
  destination: SyndicationDestination;
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
  kind: SyndicationJobKind;
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

export interface MastodonStatusContext {
  ancestors: unknown[];
  descendants: unknown[];
}
