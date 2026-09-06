import express from 'express';
import multer from 'multer';
import type { MediaService } from '../media/media-service';
import { PostInputError } from '../posts/errors';

const MAX_BATCH_BYTES = 250 * 1024 * 1024;
const batchBytes = new WeakMap<express.Request, number>();
// Count streamed bytes, including chunked requests, before retaining each chunk.
const batchUpload = multer({
  limits: { fileSize: 100 * 1024 * 1024, files: 10, fields: 2, fieldSize: 32 * 1024, parts: 13 },
  storage: {
    _handleFile(req, file, callback) {
      const chunks: Buffer[] = [];
      let size = 0;
      let failed = false;
      file.stream.on('data', (chunk: Buffer) => {
        if (failed) return;
        const total = (batchBytes.get(req) ?? 0) + chunk.length;
        batchBytes.set(req, total);
        if (total > MAX_BATCH_BYTES) {
          failed = true;
          chunks.length = 0;
          callback(Object.assign(new Error('Batch exceeds 250 MiB.'), { status: 413 }));
          return;
        }
        chunks.push(chunk);
        size += chunk.length;
      });
      file.stream.on('error', (error) => {
        if (!failed) { failed = true; callback(error); }
      });
      file.stream.on('end', () => {
        if (!failed) callback(null, { buffer: Buffer.concat(chunks), size });
      });
    },
    _removeFile(_req, file, callback) {
      delete (file as Partial<Express.Multer.File>).buffer;
      callback(null);
    },
  },
});

const upload = multer({
  limits: { fileSize: 100 * 1024 * 1024, files: 1, fields: 3 },
  storage: multer.memoryStorage(),
});

export function createAdminMediaRouter(media: MediaService): express.Router {
  const router = express.Router();

  router.post('/batch', (req, res, next) => {
    batchUpload.array('files', 10)(req, res, (error) => {
      if (error) {
        next(Object.assign(error, { status: error.status ?? (error instanceof multer.MulterError ? 413 : 400) }));
        return;
      }
      void (async () => {
        const files = req.files as Express.Multer.File[] | undefined;
        if (!files?.length) throw new PostInputError('At least one image is required.');
        let altTexts: unknown;
        try { altTexts = JSON.parse(req.body.altTexts); }
        catch { throw new PostInputError('altTexts must be a JSON array.'); }
        if (!Array.isArray(altTexts) || altTexts.length !== files.length) {
          throw new PostInputError('Provide one altTexts entry per file.');
        }
        const results = await media.uploadBatch(req.body.postId, files.map((file, index) => ({
          buffer: file.buffer, altText: altTexts[index],
        })));
        res.status(200).set('Cache-Control', 'no-store').json({ results });
      })().catch(next);
    });
  });

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
      const allowed = new Set(['altText', 'caption', 'location', 'date', 'focalX', 'focalY']);
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
