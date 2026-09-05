import express from 'express';
import multer from 'multer';
import type { MediaService } from '../media/media-service';

const upload = multer({
  limits: { fileSize: 25 * 1024 * 1024, files: 1, fields: 3 },
  storage: multer.memoryStorage(),
});

export function createAdminMediaRouter(media: MediaService): express.Router {
  const router = express.Router();

  router.delete('/:id', (req, res, next) => {
    try {
      media.deleteImage(req.params.id);
      res.status(204).set('Cache-Control', 'no-store').end();
    } catch (error) {
      next(error);
    }
  });

  router.post('/', (req, res, next) => {
    upload.single('file')(req, res, (uploadError) => {
      if (uploadError) {
        next(Object.assign(uploadError, { status: 400 }));
        return;
      }
      const displayOrder = req.body.displayOrder === undefined
        ? undefined
        : Number(req.body.displayOrder);
      void media.uploadImage({
        altText: req.body.altText ?? '',
        buffer: req.file?.buffer ?? Buffer.alloc(0),
        displayOrder,
        postId: req.body.postId,
      }).then((result) => {
        res.status(201).set('Location', result.urls.original).json(result);
      }, next);
    });
  });

  router.patch('/:id', (req, res, next) => {
    try {
      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        throw Object.assign(new Error('Request body must be an object.'), { status: 400 });
      }
      const allowed = new Set(['altText', 'caption', 'focalX', 'focalY']);
      const unknown = Object.keys(req.body).find((field) => !allowed.has(field));
      if (unknown) throw Object.assign(new Error(`Unknown media field: ${unknown}`), { status: 400 });
      const result = media.updateMetadata(req.params.id, req.body);
      if (!result) {
        res.status(404).json({ error: { code: 'not_found', message: 'Media not found.' } });
        return;
      }
      res.set('Cache-Control', 'no-store').json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
