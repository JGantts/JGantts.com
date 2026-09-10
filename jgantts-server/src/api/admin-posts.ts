import express from 'express';
import type { AuthorPostChanges, AuthorPostInput, PostService } from '../posts/post-service';
import type { MediaService } from '../media/media-service';
import type { MastodonSyndicationService } from '../syndication/mastodon-syndication-service';
import type { FacebookSyndicationService } from '../syndication/facebook-syndication-service';
import type { FacebookClientLike } from '../syndication/facebook-client';
import { resolvePostPreview } from '../site/post-preview';
import { revisionedPostPath } from '../site/revision-url';

const AUTHOR_FIELDS = new Set(['bodyMarkdown', 'location', 'date', 'time', 'title', 'slug']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseBody(value: unknown, partial: boolean): AuthorPostInput | AuthorPostChanges {
  if (!isRecord(value)) throw Object.assign(new Error('Request body must be an object.'), { status: 400 });
  const unknownField = Object.keys(value).find((field) => !AUTHOR_FIELDS.has(field));
  if (unknownField) throw Object.assign(new Error(`Unknown post field: ${unknownField}`), { status: 400 });
  return value as unknown as AuthorPostInput | AuthorPostChanges;
}

function validateEmptySyndicationBody(value: unknown): void {
  if (value === undefined) return;
  if (!isRecord(value)) throw Object.assign(new Error('Request body must be an object.'), { status: 400 });
  const field = Object.keys(value)[0];
  if (field) throw Object.assign(new Error(`Unknown syndication field: ${field}`), { status: 400 });
}

export function createAdminPostsRouter(
  posts: PostService,
  media?: MediaService,
  mastodon?: MastodonSyndicationService,
  facebook?: FacebookSyndicationService,
  facebookClient?: FacebookClientLike,
): express.Router {
  const router = express.Router();
  const responsePost = (post: NonNullable<ReturnType<PostService['findById']>>) => {
    const postMedia = media?.listForPost(post.id) ?? [];
    const preview = resolvePostPreview(post, postMedia).token;
    const revision = posts.currentRevision(post.id);
    const versioned = posts.hasMultiplePublishedRevisions(post.id);
    return {
      ...post,
      canonicalUrl: revisionedPostPath(post.slug, revision, versioned),
      preview,
      shareUrl: revisionedPostPath(post.slug, revision, versioned, preview),
      ...(versioned ? { revision } : {}),
      media: postMedia,
    };
  };

  router.get('/', (_req, res) => {
    res.set('Cache-Control', 'no-store').json({
      items: posts.listAll().map(responsePost),
    });
  });

  router.post('/preview', (req, res, next) => {
    try {
      if (!isRecord(req.body) || Object.keys(req.body).some((field) => field !== 'bodyMarkdown')) {
        throw Object.assign(new Error('Preview requires only bodyMarkdown.'), { status: 400 });
      }
      res.set('Cache-Control', 'no-store').json(posts.preview(req.body.bodyMarkdown));
    } catch (error) {
      next(error);
    }
  });

  router.post('/empty', (req, res, next) => {
    try {
      if (req.body !== undefined && (!isRecord(req.body) || Object.keys(req.body).length > 0)) {
        throw Object.assign(new Error('Empty draft creation does not accept fields.'), { status: 400 });
      }
      const post = posts.createEmptyDraft();
      res.status(201).set('Location', `/api/admin/posts/${post.id}`).json(responsePost(post));
    } catch (error) {
      next(error);
    }
  });

  router.post('/', (req, res, next) => {
    try {
      const post = posts.createDraft(parseBody(req.body, false) as AuthorPostInput);
      res.status(201).set('Location', `/api/admin/posts/${post.id}`).json(responsePost(post));
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:id', (req, res, next) => {
    try {
      const post = posts.updateFromAuthor(req.params.id, parseBody(req.body, true));
      if (!post) {
        res.status(404).json({ error: { code: 'not_found', message: 'Post not found.' } });
        return;
      }
      res.json(responsePost(post));
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/publish', (req, res, next) => {
    try {
      const post = posts.publish(req.params.id);
      if (!post) {
        res.status(404).json({ error: { code: 'not_found', message: 'Post not found.' } });
        return;
      }
      res.json(responsePost(post));
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/archive', (req, res, next) => {
    try {
      const post = posts.archive(req.params.id);
      if (!post) {
        res.status(404).json({ error: { code: 'not_found', message: 'Post not found.' } });
        return;
      }
      res.json(responsePost(post));
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/unpublish', (req, res, next) => {
    try {
      const post = posts.unpublish(req.params.id);
      if (!post) {
        res.status(404).json({ error: { code: 'not_found', message: 'Post not found.' } });
        return;
      }
      res.set('Cache-Control', 'no-store').json(responsePost(post));
    } catch (error) {
      next(error);
    }
  });

  router.put('/:id/media/order', (req, res, next) => {
    try {
      if (!media) throw Object.assign(new Error('Media service is unavailable.'), { status: 503 });
      const ordered = media.reorder(req.params.id, req.body?.mediaIds);
      res.set('Cache-Control', 'no-store').json({ media: ordered });
    } catch (error) {
      next(error);
    }
  });

  router.put('/:id/media/hero', (req, res, next) => {
    try {
      if (!media) throw Object.assign(new Error('Media service is unavailable.'), { status: 503 });
      media.selectHero(req.params.id, req.body?.mediaId);
      const post = posts.findById(req.params.id);
      if (!post) {
        res.status(404).json({ error: { code: 'not_found', message: 'Post not found.' } });
        return;
      }
      res.set('Cache-Control', 'no-store').json(responsePost(post));
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', (req, res) => {
    const post = posts.findById(req.params.id);
    if (!post) {
      res.status(404).json({ error: { code: 'not_found', message: 'Post not found.' } });
      return;
    }
    res.set('Cache-Control', 'no-store').json(responsePost(post));
  });

  router.get('/:id/history', (req, res) => {
    const post = posts.findById(req.params.id);
    if (!post) { res.status(404).json({ error: { code: 'not_found', message: 'Post not found.' } }); return; }
    res.set('Cache-Control', 'no-store').json({
      revisions: posts.publishedRevisions(post.id),
      syndications: mastodon?.listForPost(post.id) ?? [],
      publicationHistory: [...(mastodon?.listPublicationHistory(post.id) ?? []), ...(facebook?.listPublicationHistory(post.id) ?? [])],
    });
  });

  if (mastodon) {
    router.get('/:id/syndications/mastodon', (req, res) => {
      const syndication = mastodon.getForPost(req.params.id);
      if (!syndication) {
        res.status(404).json({ error: { code: 'not_found', message: 'Post has not been syndicated.' } });
        return;
      }
      res.set('Cache-Control', 'no-store').json(syndication);
    });

    router.post('/:id/syndications/mastodon', (req, res, next) => {
      try {
        validateEmptySyndicationBody(req.body);
        const result = mastodon.queue(req.params.id);
        res.status(result.queued ? 202 : 200).set('Cache-Control', 'no-store').json(result.syndication);
      } catch (error) {
        next(error);
      }
    });

    router.patch('/:id/syndications/mastodon', (req, res, next) => {
      try {
        validateEmptySyndicationBody(req.body);
        const result = mastodon.queueEdit(req.params.id);
        res.status(202).set('Cache-Control', 'no-store').json(result);
      } catch (error) {
        next(error);
      }
    });

    router.post('/:id/syndications/mastodon/retry', (req, res, next) => {
      try {
        const result = mastodon.retry(req.params.id);
        res.status(202).set('Cache-Control', 'no-store').json(result);
      } catch (error) {
        next(error);
      }
    });
  }
  if (facebook) {
    router.get('/:id/syndications/facebook', (req, res) => { const item = facebook.getForPost(req.params.id); if (!item) { res.status(404).json({ error: { code: 'not_found', message: 'Post has not been syndicated.' } }); return; } res.set('Cache-Control', 'no-store').json(item); });
    router.post('/:id/syndications/facebook', (req, res, next) => { try { validateEmptySyndicationBody(req.body); const result = facebook.queue(req.params.id); res.status(result.queued ? 202 : 200).set('Cache-Control', 'no-store').json(result.syndication); } catch (error) { next(error); } });
    router.post('/:id/syndications/facebook/retry', (req, res, next) => { try { res.status(202).json(facebook.retry(req.params.id)); } catch (error) { next(error); } });
    router.post('/:id/syndications/facebook/reconcile', async (req, res, next) => { try { if (!facebookClient) throw Object.assign(new Error('Facebook syndication is not configured.'), { status: 503 }); const result = await facebook.reconcile(req.params.id, facebookClient); res.status(200).json(result); } catch (error) { next(error); } });
    router.post('/:id/syndications/facebook/resolve', (req, res, next) => { try { if (!isRecord(req.body) || typeof req.body.id !== 'string' || typeof req.body.url !== 'string' || Object.keys(req.body).some((key) => !['id', 'url'].includes(key))) throw Object.assign(new Error('Resolution requires only id and url.'), { status: 400 }); res.status(200).json(facebook.resolve(req.params.id, { id: req.body.id, url: req.body.url })); } catch (error) { next(error); } });
  }

  return router;
}
