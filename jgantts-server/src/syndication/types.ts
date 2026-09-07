export type SyndicationDestination = 'mastodon' | 'facebook';
export type SyndicationState = 'pending' | 'published' | 'failed' | 'uncertain';
export type OutboxJobState = 'pending' | 'processing' | 'completed' | 'failed';
export type MastodonJobKind = 'mastodon.publish_status' | 'mastodon.edit_status';
export type FacebookJobKind = 'facebook.publish_link';
export type SyndicationJobKind = MastodonJobKind | FacebookJobKind;

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

export interface FacebookJobPayload {
  canonicalUrl: string;
  idempotencyKey: string;
  syndicationId: number;
  teaser: string;
}

export interface OutboxJob {
  id: number;
  kind: SyndicationJobKind;
  aggregateId: string;
  payload: MastodonJobPayload | FacebookJobPayload;
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
