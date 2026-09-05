import type { ContentDatabase } from '../db/database';
import { inTransaction } from '../db/database';
import type {
  NewPost,
  Post,
  PostChanges,
  PostStatus,
  PublishedPostCursor,
  PublishedPostPage,
} from './types';

interface PostRow {
  id: string;
  title: string | null;
  slug: string;
  body_markdown: string;
  body_html: string;
  excerpt: string | null;
  content_warning: string | null;
  status: PostStatus;
  hero_media_id: string | null;
  created_at: string;
  published_at: string | null;
  updated_at: string;
}

function mapPost(row: PostRow): Post {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    bodyMarkdown: row.body_markdown,
    bodyHtml: row.body_html,
    excerpt: row.excerpt,
    contentWarning: row.content_warning,
    status: row.status,
    heroMediaId: row.hero_media_id,
    createdAt: row.created_at,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

export class PostRepository {
  constructor(private readonly database: ContentDatabase) {}

  create(input: NewPost): Post {
    const createdAt = input.createdAt ?? new Date().toISOString();
    const status = input.status ?? 'draft';
    const publishedAt = input.publishedAt ?? (status === 'published' ? createdAt : null);

    return inTransaction(this.database, () => {
      this.database.prepare(`
        INSERT INTO posts (
          id, title, slug, body_markdown, body_html, excerpt, content_warning, status,
          hero_media_id, created_at, published_at, updated_at
        ) VALUES (
          @id, @title, @slug, @bodyMarkdown, @bodyHtml, @excerpt, @contentWarning, @status,
          @heroMediaId, @createdAt, @publishedAt, @updatedAt
        )
      `).run({
        ...input,
        title: input.title ?? null,
        excerpt: input.excerpt ?? null,
        contentWarning: input.contentWarning ?? null,
        heroMediaId: input.heroMediaId ?? null,
        status,
        createdAt,
        publishedAt,
        updatedAt: createdAt,
      });
      this.insertRevision(input.id, 1, createdAt);
      return this.getById(input.id) as Post;
    });
  }

  getById(id: string): Post | null {
    const row = this.database.prepare('SELECT * FROM posts WHERE id = ?').get(id) as PostRow | undefined;
    return row ? mapPost(row) : null;
  }

  getBySlug(slug: string): Post | null {
    const row = this.database.prepare(`
      SELECT posts.*
      FROM posts
      LEFT JOIN slug_redirects ON slug_redirects.post_id = posts.id
      WHERE posts.slug = ? OR slug_redirects.slug = ?
      ORDER BY CASE WHEN posts.slug = ? THEN 0 ELSE 1 END
      LIMIT 1
    `).get(slug, slug, slug) as PostRow | undefined;
    return row ? mapPost(row) : null;
  }

  listPublished(limit: number, cursor: PublishedPostCursor | null = null): PublishedPostPage {
    const rows = this.database.prepare(`
      SELECT * FROM posts
      WHERE status = 'published'
        AND published_at IS NOT NULL
        AND (
          @publishedAt IS NULL
          OR published_at < @publishedAt
          OR (published_at = @publishedAt AND id < @cursorId)
        )
      ORDER BY published_at DESC, id DESC
      LIMIT @queryLimit
    `).all({
      publishedAt: cursor?.publishedAt ?? null,
      cursorId: cursor?.id ?? null,
      queryLimit: limit + 1,
    }) as PostRow[];
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(mapPost);
    const last = items.at(-1);

    return {
      items,
      nextCursor: hasMore && last?.publishedAt
        ? { id: last.id, publishedAt: last.publishedAt }
        : null,
    };
  }

  listAllPublished(): Post[] {
    return (this.database.prepare(`
      SELECT * FROM posts
      WHERE status = 'published' AND published_at IS NOT NULL
      ORDER BY published_at DESC, id DESC
    `).all() as PostRow[]).map(mapPost);
  }

  listAll(): Post[] {
    return (this.database.prepare(`
      SELECT * FROM posts
      ORDER BY created_at DESC, id DESC
    `).all() as PostRow[]).map(mapPost);
  }

  update(id: string, changes: PostChanges, updatedAt = new Date().toISOString()): Post | null {
    return inTransaction(this.database, () => {
      const current = this.getById(id);
      if (!current) return null;
      const next = { ...current, ...changes, updatedAt };

      if (changes.slug && changes.slug !== current.slug) {
        this.database.prepare(`
          INSERT INTO slug_redirects (slug, post_id, created_at) VALUES (?, ?, ?)
        `).run(current.slug, id, updatedAt);
      }

      this.database.prepare(`
        UPDATE posts SET
          title = @title,
          slug = @slug,
          body_markdown = @bodyMarkdown,
          body_html = @bodyHtml,
          excerpt = @excerpt,
          content_warning = @contentWarning,
          status = @status,
          hero_media_id = @heroMediaId,
          published_at = @publishedAt,
          updated_at = @updatedAt
        WHERE id = @id
      `).run(next);
      const revision = (this.database.prepare(`
        SELECT COALESCE(MAX(revision_number), 0) + 1 AS number
        FROM post_revisions WHERE post_id = ?
      `).get(id) as { number: number }).number;
      this.insertRevision(id, revision, updatedAt);
      return this.getById(id);
    });
  }

  private insertRevision(postId: string, revisionNumber: number, createdAt: string): void {
    this.database.prepare(`
      INSERT INTO post_revisions (
        post_id, revision_number, title, slug, body_markdown, body_html, excerpt,
        content_warning, status, created_at
      )
      SELECT id, ?, title, slug, body_markdown, body_html, excerpt, content_warning, status, ?
      FROM posts WHERE id = ?
    `).run(revisionNumber, createdAt, postId);
  }
}
