import express from 'express';
import multer from 'multer';
import type { MediaService } from '../media/media-service';

const upload = multer({
  limits: { fileSize: 25 * 1024 * 1024, files: 1, fields: 3 },
  storage: multer.memoryStorage(),
});

export function createAdminMediaRouter(media: MediaService): express.Router {
  const router = express.Router();

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

  return router;
}
