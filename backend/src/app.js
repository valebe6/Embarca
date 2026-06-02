import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import conciliationRoutes from './routes/conciliation.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configuración de CORS y JSON
app.use(cors());
app.use(express.json());

// Rutas API
app.use('/api', conciliationRoutes);

// Ruta de diagnóstico
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'Servidor Embarca listo.' });
});

// Servir archivos estáticos del frontend compilar
const frontendBuildPath = path.join(__dirname, '../../frontend/dist/frontend/browser');
app.use(express.static(frontendBuildPath));

// Soporte de enrutamiento Angular SPA (fallback a index.html)
app.get('*', (req, res, next) => {
  if (req.url.startsWith('/api') || req.url === '/health') {
    return next();
  }
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

export default app;
