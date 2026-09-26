# Durable outbox

**Responsibility:** persist queued syndication and deliver remote work with retry/state tracking across process restarts.

**Entry points:** `SyndicationRepository` queue/claim/completion methods; `OutboxWorker.start`, `runOnce`, and `stop`.

**Dependencies:** SQLite transactions, destination clients, queued payloads, and structured logging.

**Consumers:** [destination services](destinations.md), startup/shutdown composition, admin status/history, and health reporting.

**Invariants:** claim work through the repository, not by reading pending rows directly. In-process worker runs do not overlap; each run can process two claimed jobs. Retryable failures use bounded backoff and an attempt limit; permanent failures stop retries. Facebook request uncertainty has a separate state, but [stale-job recovery and manual retry are defective](../../../reviews/2026-09-26-architecture-review.md). Shutdown awaits active work before database closure. Remote success and local bookkeeping must preserve publication identifiers and idempotency semantics.

**Source:** [repository](../../../../jgantts-server/src/syndication/syndication-repository.ts), [worker](../../../../jgantts-server/src/syndication/outbox-worker.ts), [job types](../../../../jgantts-server/src/syndication/types.ts), [startup](../../../../jgantts-server/src/server.ts).

[Syndication map](index.md)
