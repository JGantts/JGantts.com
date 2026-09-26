import express from 'express';
import type { MediaService } from '../media/media-service';
import type { MediaVariant } from '../media/types';
import type { SocialPreviewService } from '../social-preview/social-preview-service';

const namedVariants = new Set<MediaVariant>(['original', 'large', 'thumbnail', 'placeholder']);

export function createMediaRouter(media: MediaService, socialPreviews?: SocialPreviewService): express.Router {
  const router = express.Router();

  router.get('/social/:postId/:file', (req, res, next) => {
    const match = /^([a-f0-9]{32})\.jpg$/.exec(req.params.file);
    const file = match && socialPreviews?.getFile(req.params.postId, match[1]);
    if (!file) { res.sendStatus(404); return; }
    res.set({
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Type': file.mimeType,
      'X-Content-Type-Options': 'nosniff',
    }).sendFile(file.path, (error) => { if (error) next(error); });
  });

  router.get('/:id/:variant', (req, res, next) => {
    const variant = req.params.variant as MediaVariant;
    if (!namedVariants.has(variant)
      && !/^(?:(?:avif-|jpeg-|png-)?w-\d{1,5}|placeholder)-v-[a-f0-9]{8}$/.test(variant)
      && !/^(?:avif-|jpeg-|png-)?w-\d{1,5}$/.test(variant)) {
      res.sendStatus(404);
      return;
    }
    const file = media.getFile(req.params.id, variant);
    if (!file) {
      res.sendStatus(404);
      return;
    }
    const currentRevision = media.currentRevisionForMedia(req.params.id);
    if (typeof req.query.rev === 'string' && !media.hasMultiplePublishedRevisionsForMedia(req.params.id)) {
      res.redirect(308, `/media${req.path}`);
      return;
    }
    if (typeof req.query.rev === 'string' && Number(req.query.rev) !== currentRevision) {
      res.redirect(308, `/media${req.path}?rev=${currentRevision}`);
      return;
    }
    res.set({
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Type': file.mimeType,
      'X-Content-Type-Options': 'nosniff',
    }).sendFile(file.path, (error) => {
      if (error) next(error);
    });
  });

  return router;
}
