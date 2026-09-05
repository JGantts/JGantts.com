import express from 'express';
import type { AuthorPostChanges, AuthorPostInput, PostService } from '../posts/post-service';

const AUTHOR_FIELDS = new Set(['slug', 'bodyMarkdown', 'excerpt', 'contentWarning']);

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

export function createAdminPostsRouter(posts: PostService): express.Router {
  const router = express.Router();

  router.post('/', (req, res, next) => {
    try {
      const post = posts.createDraft(parseBody(req.body, false) as AuthorPostInput);
      res.status(201).set('Location', `/api/admin/posts/${post.id}`).json(post);
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
      res.json(post);
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
      res.json(post);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
