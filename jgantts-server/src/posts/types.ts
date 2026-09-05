export type PostStatus = 'draft' | 'published' | 'archived';

export interface Post {
  id: string;
  title: string | null;
  slug: string;
  bodyMarkdown: string;
  bodyHtml: string;
  excerpt: string | null;
  contentWarning: string | null;
  status: PostStatus;
  heroMediaId: string | null;
  createdAt: string;
  publishedAt: string | null;
  updatedAt: string;
}

export interface NewPost {
  id: string;
  title?: string | null;
  slug: string;
  bodyMarkdown: string;
  bodyHtml: string;
  excerpt?: string | null;
  contentWarning?: string | null;
  status?: PostStatus;
  heroMediaId?: string | null;
  createdAt?: string;
  publishedAt?: string | null;
}

export interface PostChanges {
  title?: string | null;
  slug?: string;
  bodyMarkdown?: string;
  bodyHtml?: string;
  excerpt?: string | null;
  contentWarning?: string | null;
  status?: PostStatus;
  heroMediaId?: string | null;
  publishedAt?: string | null;
}

export interface PublishedPostCursor {
  id: string;
  publishedAt: string;
}

export interface PublishedPostPage {
  items: Post[];
  nextCursor: PublishedPostCursor | null;
}
