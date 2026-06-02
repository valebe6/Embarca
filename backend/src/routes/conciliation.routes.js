import express from 'express';
import multer from 'multer';
import { uploadFiles, conciliate, analyze } from '../controllers/conciliation.controller.js';

const router = express.Router();

// Configuración de multer en memoria
const upload = multer({ storage: multer.memoryStorage() });

const uploadFields = upload.fields([
  { name: 'pedidos', maxCount: 1 },
  { name: 'pagos', maxCount: 1 }
]);

router.post('/upload', uploadFields, uploadFiles);
router.post('/conciliate', conciliate);
router.post('/analyze', analyze);

export default router;
