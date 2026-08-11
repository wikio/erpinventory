const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.webmanifest': 'application/manifest+json'
};

const server = http.createServer((req, res) => {
  // Allow cross-origin requests for preview environments
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  let filePath = req.url.split('?')[0];
  if (filePath === '/') {
    filePath = '/index.html';
  }

  const absolutePath = path.join(__dirname, filePath);

  fs.stat(absolutePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback for SPA or missing file -> serve index.html for non-asset routes
      if (!path.extname(filePath)) {
        const indexPath = path.join(__dirname, 'index.html');
        fs.readFile(indexPath, (readErr, content) => {
          if (readErr) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('500 Internal Server Error');
          } else {
            res.writeHead(200, { 'Content-Type': MIME_TYPES['.html'] });
            res.end(content);
          }
        });
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 File Not Found');
      return;
    }

    const ext = path.extname(absolutePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(absolutePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
        return;
      }

      // Add appropriate caching and service worker header
      if (filePath === '/sw.js') {
        res.setHeader('Service-Worker-Allowed', '/');
        res.setHeader('Cache-Control', 'no-cache');
      } else if (filePath === '/index.html') {
        res.setHeader('Cache-Control', 'no-cache');
      }

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`====================================================================`);
  console.log(`[SARI Système] Medical Equipment & Consumables ERP Dashboard Running`);
  console.log(`Server listening on http://${HOST}:${PORT}`);
  console.log(`Bilingual Support: Arabic (RTL) | French (LTR) | English (LTR)`);
  console.log(`Offline-First PWA Mode Active with IndexedDB Local Storage`);
  console.log(`====================================================================`);
});
