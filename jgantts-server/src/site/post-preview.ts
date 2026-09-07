import { createHash } from 'node:crypto';
import type { PublicMedia } from '../media/media-service';
import type { Post } from '../posts/types';

export const PREVIEW_SCHEMA_VERSION = 1;

export interface SocialImage {
  height: number | null;
  mimeType: string;
  url: string;
  width: number | null;
}

export interface PostPreview {
  cardType: 'summary' | 'summary_large_image';
  description: string;
  image: SocialImage | null;
  title: string;
  token: string;
}

export type PreviewModel = Omit<PostPreview, 'token'>;

export function previewTokenFor(model: PreviewModel, schema = PREVIEW_SCHEMA_VERSION): string {
  const serialized = JSON.stringify({
    schema,
    title: model.title,
    description: model.description,
    cardType: model.cardType,
    image: model.image,
  });
  return createHash('sha256').update(serialized, 'utf8').digest('hex').slice(0, 16);
}

function firstLine(value: string | null): string {
  return value?.split(/\r?\n/, 1)[0]?.trim() ?? '';
}

function editorialDateTimeFor(post: Post): string {
  let formatted = '';
  if (post.date) {
    const value = String(post.date);
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6));
    const day = Number(value.slice(6, 8));
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' })
      .format(new Date(Date.UTC(year, month - 1, day)));
    const remainder = day % 100;
    const suffix = remainder >= 11 && remainder <= 13
      ? 'th'
      : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10] ?? 'th';
    formatted = `${year}, ${monthName} ${day}${suffix}`;
  }
  if (post.time) {
    const hour = Number(post.time.slice(0, 2));
    let period = 'at night';
    if (hour === 0 || hour === 24) period = 'midnight';
    else if (hour < 5) period = 'at night';
    else if (hour < 12) period = 'in the morning';
    else if (hour === 12) period = 'noon';
    else if (hour < 17) period = 'in the afternoon';
    else if (hour < 21) period = 'in the evening';
    const formattedTime = `${post.time} ${period}`;
    formatted = formatted ? `${formatted}, ${formattedTime}` : formattedTime;
  }
  return formatted;
}

function socialImageFor(post: Post, media: PublicMedia[]): SocialImage | null {
  const hero = media.find((item) => item.id === post.heroMediaId) ?? media[0] ?? null;
  if (!hero) return null;
  const rendition = hero.renditions
    .filter((item) => item.format === 'jpeg' || item.format === 'png')
    .sort((left, right) => right.width - left.width)[0];
  if (rendition) {
    return {
      height: rendition.height,
      mimeType: rendition.format === 'png' ? 'image/png' : 'image/jpeg',
      url: rendition.url,
      width: rendition.width,
    };
  }
  return { height: hero.height, mimeType: hero.mimeType, url: hero.urls.original, width: hero.width };
}

export function resolvePostPreview(post: Post, media: PublicMedia[]): PostPreview {
  const image = socialImageFor(post, media);
  const title = post.title?.trim() || 'Post by Jacob Gantt';
  const description = [
    firstLine(post.title),
    firstLine(post.bodyMarkdown),
    firstLine(post.location),
    editorialDateTimeFor(post),
  ].filter(Boolean).join('\n') || 'A post from Jacob Gantt on JGantts.com.';
  const cardType = image ? 'summary_large_image' : 'summary';
  const model: PreviewModel = { cardType, description, image, title };
  return { ...model, token: previewTokenFor(model) };
}
