import { handler as worksheetHandler } from './netlify/functions/worksheets.mjs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import {viteSingleFile} from 'vite-plugin-singlefile';

// LINT.IfChange(aistudio_media_plugin)
function aistudioMediaPlugin(): Plugin {
  return {
    name: 'vite-plugin-aistudio-media',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || '/', 'http://localhost');
        if (url.pathname !== '/api/worksheets') return next();
        const result = await worksheetHandler({ httpMethod: req.method || 'GET', queryStringParameters: { sheet: url.searchParams.get('sheet') || '' } });
        res.statusCode = result.statusCode;
        for (const [name, value] of Object.entries(result.headers)) res.setHeader(name, value);
        res.end(result.body);
      });
      server.middlewares.use((req, res, next) => {
        // Direct download endpoint for single-file HTML
        if (req.url && req.url.startsWith('/api/download-singlefile')) {
          const distIndexPath = path.resolve(__dirname, 'dist', 'index.html');
          if (!fs.existsSync(distIndexPath)) {
            try {
              execSync('npx vite build', { stdio: 'ignore' });
            } catch (err) {
              console.error('Failed to build singlefile on demand:', err);
            }
          }
          if (fs.existsSync(distIndexPath)) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader(
              'Content-Disposition',
              'attachment; filename="dashboard-visit-offline.html"'
            );
            fs.createReadStream(distIndexPath).pipe(res);
            return;
          } else {
            res.statusCode = 500;
            res.end('File dist/index.html could not be generated.');
            return;
          }
        }

        if (req.url && req.url.startsWith('/assets/aistudio/')) {
          const rawPath = req.url.split('?')[0].split('#')[0];
          try {
            const decodedPath = decodeURIComponent(rawPath);
            const relativePath = decodedPath.replace(/^\//, '');
            const aistudioDir = path.resolve(
              __dirname,
              'public',
              'assets',
              'aistudio',
            );
            const filePath = path.resolve(__dirname, 'public', relativePath);
            if (
              filePath.startsWith(aistudioDir + path.sep) &&
              fs.existsSync(filePath) &&
              fs.statSync(filePath).isFile()
            ) {
              const ext = path.extname(filePath).toLowerCase();
              const mimeMap: Record<string, string> = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.svg': 'image/svg+xml',
                '.bmp': 'image/bmp',
                '.ico': 'image/x-icon',
                '.mp4': 'video/mp4',
                '.webm': 'video/webm',
                '.ogv': 'video/ogg',
                '.mp3': 'audio/mpeg',
                '.wav': 'audio/wav',
                '.ogg': 'audio/ogg',
                '.pdf': 'application/pdf',
              };
              res.setHeader(
                'Content-Type',
                mimeMap[ext] || 'application/octet-stream',
              );
              res.setHeader('Cache-Control', 'no-cache');
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          } catch {
            // Fall through if URI decoding or file access fails
          }
        }
        next();
      });
    },
  };
}
// LINT.ThenChange(//depot/google3/java/com/google/alkali/boq/makersuite/applet_dev_service/templates/initializers/react_theme/vite.config.ts:aistudio_media_plugin)

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), aistudioMediaPlugin(), viteSingleFile()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
