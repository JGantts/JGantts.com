import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

const allowedTags = [
  'a', 'blockquote', 'br', 'code', 'del', 'em', 'h1', 'h2', 'h3', 'h4',
  'h5', 'h6', 'hr', 'li', 'ol', 'p', 'pre', 'strong', 'table', 'tbody',
  'td', 'th', 'thead', 'tr', 'ul',
];

export function renderPostMarkdown(markdown: string): string {
  const rendered = marked.parse(markdown, {
    async: false,
    gfm: true,
  });

  return sanitizeHtml(rendered, {
    allowedTags,
    allowedAttributes: {
      a: ['href', 'title'],
      code: ['class'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    disallowedTagsMode: 'discard',
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', {
        rel: 'nofollow noopener noreferrer',
      }),
    },
  });
}
