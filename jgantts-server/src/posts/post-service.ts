import { randomUUID } from 'node:crypto';
import { renderPostMarkdown } from './content';
import { PostConflictError, PostInputError } from './errors';
import type { NewPost, Post, PostChanges, PublishedPostCursor } from './types';
import { PostRepository } from './post-repository';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export interface PublicPostPage {
  items: Post[];
  nextCursor: string | null;
}

export interface AuthorPostInput {
  bodyMarkdown: string;
  contentWarning?: string | null;
  excerpt?: string | null;
  slug: string;
  title?: string | null;
}

export type AuthorPostChanges = Partial<AuthorPostInput>;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validateText(value: unknown, field: string, maximum: number, required: boolean): string | null {
  if (value === null && !required) return null;
  if (typeof value !== 'string') throw new PostInputError(`${field} must be a string.`);
  if (required && value.trim().length === 0) throw new PostInputError(`${field} cannot be empty.`);
  if (value.length > maximum) throw new PostInputError(`${field} is too long.`);
  return value;
}

function validateSlug(value: unknown): string {
  const slug = validateText(value, 'slug', 100, true) as string;
  if (!SLUG_PATTERN.test(slug)) {
    throw new PostInputError('slug must contain lowercase letters, numbers, and single hyphens only.');
  }
  return slug;
}

function encodeCursor(cursor: PublishedPostCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

function decodeCursor(value: string): PublishedPostCursor {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch {
    throw new TypeError('Invalid post cursor.');
  }
  if (
    !parsed
    || typeof parsed !== 'object'
    || typeof (parsed as PublishedPostCursor).id !== 'string'
    || typeof (parsed as PublishedPostCursor).publishedAt !== 'string'
    || Number.isNaN(Date.parse((parsed as PublishedPostCursor).publishedAt))
  ) {
    throw new TypeError('Invalid post cursor.');
  }
  return parsed as PublishedPostCursor;
}

export class PostService {
  constructor(private readonly posts: PostRepository) {}

  create(input: NewPost): Post {
    return this.posts.create(input);
  }

  createDraft(input: AuthorPostInput): Post {
    const slug = validateSlug(input.slug);
    if (this.posts.getBySlug(slug)) throw new PostConflictError('That post slug is already in use.');
    const bodyMarkdown = validateText(input.bodyMarkdown, 'bodyMarkdown', 100_000, true) as string;
    return this.posts.create({
      id: randomUUID(),
      title: validateText(input.title ?? null, 'title', 200, false),
      slug,
      bodyMarkdown,
      bodyHtml: renderPostMarkdown(bodyMarkdown),
      excerpt: validateText(input.excerpt ?? null, 'excerpt', 5_000, false),
      contentWarning: validateText(input.contentWarning ?? null, 'contentWarning', 500, false),
    });
  }

  findById(id: string): Post | null {
    return this.posts.getById(id);
  }

  findBySlug(slug: string): Post | null {
    const post = this.posts.getBySlug(slug);
    return post?.status === 'published' ? post : null;
  }

  findAnyBySlug(slug: string): Post | null {
    return this.posts.getBySlug(slug);
  }

  listAllPublished(): Post[] {
    return this.posts.listAllPublished();
  }

  listAll(): Post[] {
    return this.posts.listAll();
  }

  preview(bodyMarkdown: unknown): { bodyHtml: string } {
    const markdown = validateText(bodyMarkdown, 'bodyMarkdown', 100_000, true) as string;
    return { bodyHtml: renderPostMarkdown(markdown) };
  }

  listPublished(options: { cursor?: string; limit?: number } = {}): PublicPostPage {
    const limit = options.limit ?? DEFAULT_PAGE_SIZE;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
      throw new RangeError(`Post page limit must be between 1 and ${MAX_PAGE_SIZE}.`);
    }
    const page = this.posts.listPublished(limit, options.cursor ? decodeCursor(options.cursor) : null);
    return {
      items: page.items,
      nextCursor: page.nextCursor ? encodeCursor(page.nextCursor) : null,
    };
  }

  update(id: string, changes: PostChanges): Post | null {
    return this.posts.update(id, changes);
  }

  updateFromAuthor(id: string, changes: AuthorPostChanges): Post | null {
    if (Object.keys(changes).length === 0) throw new PostInputError('At least one post field is required.');
    const repositoryChanges: PostChanges = {};
    if ('title' in changes) {
      repositoryChanges.title = validateText(changes.title, 'title', 200, false);
    }
    if ('slug' in changes) {
      const slug = validateSlug(changes.slug);
      const existing = this.posts.getBySlug(slug);
      if (existing && existing.id !== id) throw new PostConflictError('That post slug is already in use.');
      repositoryChanges.slug = slug;
    }
    if ('bodyMarkdown' in changes) {
      const bodyMarkdown = validateText(changes.bodyMarkdown, 'bodyMarkdown', 100_000, true) as string;
      repositoryChanges.bodyMarkdown = bodyMarkdown;
      repositoryChanges.bodyHtml = renderPostMarkdown(bodyMarkdown);
    }
    if ('excerpt' in changes) {
      repositoryChanges.excerpt = validateText(changes.excerpt, 'excerpt', 5_000, false);
    }
    if ('contentWarning' in changes) {
      repositoryChanges.contentWarning = validateText(
        changes.contentWarning,
        'contentWarning',
        500,
        false,
      );
    }
    return this.posts.update(id, repositoryChanges);
  }

  publish(id: string, publishedAt = new Date().toISOString()): Post | null {
    const post = this.posts.getById(id);
    if (!post || post.status === 'archived') return null;
    if (post.status === 'published') return post;
    return this.posts.update(id, { status: 'published', publishedAt }, publishedAt);
  }

  archive(id: string, archivedAt = new Date().toISOString()): Post | null {
    const post = this.posts.getById(id);
    if (!post) return null;
    if (post.status === 'archived') return post;
    return this.posts.update(id, { status: 'archived' }, archivedAt);
  }
}
