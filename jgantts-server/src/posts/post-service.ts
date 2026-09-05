import type { NewPost, Post, PostChanges, PublishedPostCursor } from './types';
import { PostRepository } from './post-repository';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export interface PublicPostPage {
  items: Post[];
  nextCursor: string | null;
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

  findById(id: string): Post | null {
    return this.posts.getById(id);
  }

  findBySlug(slug: string): Post | null {
    const post = this.posts.getBySlug(slug);
    return post?.status === 'published' ? post : null;
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
}
