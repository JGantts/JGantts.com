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
  date?: number | null;
  time?: string | null;
  location?: string | null;
  title?: string | null;
  slug?: string;
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

function slugifyPost(title: string | null | undefined, bodyMarkdown: string): string {
  const plainText = (title?.trim() || bodyMarkdown)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>|[`*_~>#]/g, ' ')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 80)
    .replace(/-+$/g, '');
  return plainText || 'post';
}

function validateDate(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 10000101 || value > 99991231) {
    throw new PostInputError('date must be a valid YYYYMMDD integer or null.');
  }
  const text = String(value);
  const year = Number(text.slice(0, 4));
  const month = Number(text.slice(4, 6));
  const day = Number(text.slice(6, 8));
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new PostInputError('date must be a valid YYYYMMDD integer or null.');
  }
  return value as number;
}

function validateTime(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):(?:00|15|20|30|40|45)$/.test(value)) {
    throw new PostInputError('time must use 24-hour HH:mm format at an allowed minute interval (:00, :15, :20, :30, :40, or :45), or be null.');
  }
  return value;
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
    const bodyMarkdown = validateText(input.bodyMarkdown, 'bodyMarkdown', 100_000, true) as string;
    const title = validateText(input.title ?? null, 'title', 200, false);
    const baseSlug = input.slug ? validateSlug(input.slug) : slugifyPost(title, bodyMarkdown);
    let slug = baseSlug;
    for (let suffix = 2; this.posts.getBySlug(slug); suffix += 1) slug = `${baseSlug}-${suffix}`;
    return this.posts.create({
      id: randomUUID(),
      location: validateText(input.location ?? null, 'location', 500, false),
      date: validateDate(input.date),
      time: validateTime(input.time),
      title,
      slug,
      bodyMarkdown,
      bodyHtml: renderPostMarkdown(bodyMarkdown),
    });
  }

  createEmptyDraft(): Post {
    const id = randomUUID();
    return this.posts.create({
      id,
      slug: id,
      bodyMarkdown: '',
      bodyHtml: '',
    });
  }

  findById(id: string): Post | null {
    return this.posts.getById(id);
  }

  currentRevision(id: string): number {
    return this.posts.getCurrentRevision(id);
  }

  hasMultiplePublishedRevisions(id: string): boolean {
    return this.posts.getPublishedRevisionCount(id) > 1;
  }

  publishedRevisions(id: string) {
    return this.posts.listPublishedRevisions(id);
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
    if ('location' in changes) repositoryChanges.location = validateText(changes.location, 'location', 500, false);
    if ('date' in changes) repositoryChanges.date = validateDate(changes.date);
    if ('time' in changes) repositoryChanges.time = validateTime(changes.time);
    if ('title' in changes) repositoryChanges.title = validateText(changes.title, 'title', 200, false);
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
      const current = this.posts.getById(id);
      if (current && current.slug === current.id) {
        const baseSlug = slugifyPost(repositoryChanges.title ?? current.title, bodyMarkdown);
        let slug = baseSlug;
        for (let suffix = 2; this.posts.getBySlug(slug); suffix += 1) slug = `${baseSlug}-${suffix}`;
        repositoryChanges.slug = slug;
      }
    }
    return this.posts.update(id, repositoryChanges);
  }

  publish(id: string, publishedAt = new Date().toISOString()): Post | null {
    const post = this.posts.getById(id);
    if (!post || post.status === 'archived') return null;
    if (post.status === 'published') return post;
    return this.posts.update(id, { status: 'published', publishedAt }, publishedAt);
  }

  unpublish(id: string, updatedAt = new Date().toISOString()): Post | null {
    const post = this.posts.getById(id);
    if (!post || post.status !== 'published') return post;
    return this.posts.update(id, { status: 'draft', publishedAt: null }, updatedAt);
  }

  archive(id: string, archivedAt = new Date().toISOString()): Post | null {
    const post = this.posts.getById(id);
    if (!post) return null;
    if (post.status === 'archived') return post;
    return this.posts.update(id, { status: 'archived' }, archivedAt);
  }
}
