import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';

/** Fixed loopback port — must match Clerk Allowed redirect URLs for packaged builds. */
export const STATIC_SERVER_PORT = 47821;
export const STATIC_SERVER_ORIGIN = `http://127.0.0.1:${STATIC_SERVER_PORT}`;

const HOST = '127.0.0.1';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

let server: http.Server | null = null;

function resolveSafePath(rendererDir: string, urlPath: string): string | null {
  const decoded = decodeURIComponent(urlPath.split('?')[0] || '/');
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\//, '');
  const filePath = path.normalize(path.join(rendererDir, relative));
  const rel = path.relative(rendererDir, filePath);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return null;
  }
  return filePath;
}

function serveFile(filePath: string, res: http.ServerResponse): void {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  fs.createReadStream(filePath).pipe(res);
}

/**
 * Serves the packaged renderer over http://127.0.0.1 so Clerk OAuth redirects
 * use a real http origin (same pattern as npm run dev).
 */
export function startStaticServer(rendererDir: string): Promise<string> {
  if (server) {
    return Promise.resolve(STATIC_SERVER_ORIGIN);
  }

  return new Promise((resolve, reject) => {
    const httpServer = http.createServer((req, res) => {
      try {
        let filePath = resolveSafePath(rendererDir, req.url ?? '/');
        if (!filePath) {
          res.writeHead(403, { 'Content-Type': 'text/plain' });
          res.end('Forbidden');
          return;
        }

        const exists = fs.existsSync(filePath);
        const isDir = exists && fs.statSync(filePath).isDirectory();
        if (!exists || isDir) {
          // HashRouter SPA: fall back to index.html when path has no real file
          const ext = path.extname(filePath);
          if (!ext || isDir) {
            filePath = path.join(rendererDir, 'index.html');
          } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found');
            return;
          }
        }

        if (!fs.existsSync(filePath)) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
          return;
        }

        serveFile(filePath, res);
      } catch {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal server error');
      }
    });

    httpServer.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        reject(
          new Error(
            `Port ${STATIC_SERVER_PORT} is already in use. Close the other process using ${STATIC_SERVER_ORIGIN} and try again.`,
          ),
        );
        return;
      }
      reject(err);
    });

    httpServer.listen(STATIC_SERVER_PORT, HOST, () => {
      server = httpServer;
      resolve(STATIC_SERVER_ORIGIN);
    });
  });
}

export function stopStaticServer(): void {
  if (!server) return;
  server.close();
  server = null;
}
