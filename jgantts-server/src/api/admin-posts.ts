import express from 'express';
import type { AuthorPostChanges, AuthorPostInput, PostService } from '../posts/post-service';
import type { MediaService } from '../media/media-service';
import type { MastodonSyndicationService } from '../syndication/mastodon-syndication-service';

const AUTHOR_FIELDS = new Set(['slug', 'title', 'bodyMarkdown', 'excerpt', 'contentWarning']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseBody(value: unknown, partial: boolean): AuthorPostInput | AuthorPostChanges {
  if (!isRecord(value)) throw Object.assign(new Error('Request body must be an object.'), { status: 400 });
  const unknownField = Object.keys(value).find((field) => !AUTHOR_FIELDS.has(field));
  if (unknownField) throw Object.assign(new Error(`Unknown post field: ${unknownField}`), { status: 400 });
  if (!partial && (!('slug' in value) || !('bodyMarkdown' in value))) {
    throw Object.assign(new Error('slug and bodyMarkdown are required.'), { status: 400 });
  }
  return value as unknown as AuthorPostInput | AuthorPostChanges;
}

function parseSyndicationBody(value: unknown): { teaser?: unknown } {
  if (value === undefined) return {};
  if (!isRecord(value)) throw Object.assign(new Error('Request body must be an object.'), { status: 400 });
  const unknownField = Object.keys(value).find((field) => field !== 'teaser');
  if (unknownField) throw Object.assign(new Error(`Unknown syndication field: ${unknownField}`), { status: 400 });
  return { teaser: value.teaser };
}

export function createAdminPostsRouter(
  posts: PostService,
  media?: MediaService,
  mastodon?: MastodonSyndicationService,
): express.Router {
  const router = express.Router();
  const responsePost = (post: NonNullable<ReturnType<PostService['findById']>>) => ({
    ...post,
    media: media?.listForPost(post.id) ?? [],
  });

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

  router.get('/:id', (req, res) => {
    const post = posts.findById(req.params.id);
    if (!post) {
      res.status(404).json({ error: { code: 'not_found', message: 'Post not found.' } });
      return;
    }
    res.set('Cache-Control', 'no-store').json(responsePost(post));
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
        const input = parseSyndicationBody(req.body);
        const result = mastodon.queue(req.params.id, input.teaser);
        res.status(result.queued ? 202 : 200).set('Cache-Control', 'no-store').json(result.syndication);
      } catch (error) {
        next(error);
      }
    });

    router.patch('/:id/syndications/mastodon', (req, res, next) => {
      try {
        const input = parseSyndicationBody(req.body);
        const result = mastodon.queueEdit(req.params.id, input.teaser);
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

  return router;
}
