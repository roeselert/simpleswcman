/**
 * secman HTTP server
 *
 * Serves the REST API for all three business domains and the static
 * browser client (index.html, app.js, rest_client.js) from this folder.
 *
 * Run directly:   npm start
 * Use in tests:   import { createServer } from './server.js'
 */

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { initDb } from './db.js';
import { createRouter } from './router.js';
import { strukturanalyseRoutes } from './strukturanalyse/rest_routes.js';
import { schutzbedarfRoutes } from './schutzbedarfsfeststellung/rest_routes.js';
import { modellierungRoutes } from './modellierung/rest_routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Whitelisted static files (kept tight so backend code is never exposed).
const STATIC_FILES = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/app.js': 'app.js',
  '/rest_client.js': 'rest_client.js',
};
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

/**
 * Builds an http.Server bound to a PGlite db instance.
 * The db is injected so tests can use a fresh in-memory instance.
 */
export function createServer(db) {
  const router = createRouter();
  router.addAll(strukturanalyseRoutes(db));
  router.addAll(schutzbedarfRoutes(db));
  router.addAll(modellierungRoutes(db));

  return http.createServer(async (req, res) => {
    try {
      await handle(req, res, router);
    } catch (e) {
      sendJson(res, 500, { error: e.message });
    }
  });
}

async function handle(req, res, router) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const method = req.method || 'GET';

  // Permissive CORS – this is a single-tenant local PWA backend.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API
  if (url.pathname.startsWith('/api/')) {
    const matched = router.match(method, url.pathname);
    if (!matched) {
      sendJson(res, 404, { error: `Route not found: ${method} ${url.pathname}` });
      return;
    }
    const body = await readJsonBody(req);
    const query = Object.fromEntries(url.searchParams);
    try {
      const result = await matched.handler({ body, params: matched.params, query });
      sendJson(res, 200, result === undefined ? null : result);
    } catch (e) {
      const status = /nicht gefunden/i.test(e.message) ? 404 : 400;
      sendJson(res, status, { error: e.message });
    }
    return;
  }

  // Static
  if (method === 'GET' && Object.prototype.hasOwnProperty.call(STATIC_FILES, url.pathname)) {
    const fileName = STATIC_FILES[url.pathname];
    const filePath = path.join(__dirname, fileName);
    const content = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fileName)] || 'application/octet-stream' });
    res.end(content);
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

async function readJsonBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return null;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return null;
  const text = Buffer.concat(chunks).toString('utf-8');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// CLI entry point
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const port = Number(process.env.PORT) || 3000;
  const db = new PGlite();
  await initDb(db);
  const server = createServer(db);
  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`secman server listening on http://localhost:${port}`);
  });
}
