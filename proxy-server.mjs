// ====== Kids Vocab 开发代理服务器 ======
// 同时提供静态文件服务和 API 代理，让浏览器也能测试 LLM/TTS 功能
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATIC_DIR = path.join(__dirname, 'src');
const PORT = 1420;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
  '.mp3':  'audio/mpeg',
  '.wav':  'audio/wav',
};

// ====== 静态文件服务 ======
function serveStatic(req, res) {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.normalize(path.join(STATIC_DIR, urlPath));
  if (!filePath.startsWith(STATIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // SPA fallback
        fs.readFile(path.join(STATIC_DIR, 'index.html'), (e2, d2) => {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(e2 ? 'Not Found' : d2);
        });
        return;
      }
      res.writeHead(500);
      res.end('Internal Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

// ====== API 代理（转发到外部 AI/LLM/TTS 服务） ======
async function handleProxy(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const { url, method, headers: reqHeaders, body: reqBody } = JSON.parse(body);

      const fetchOptions = {
        method: method || 'POST',
        headers: reqHeaders || {},
      };
      if (reqBody !== undefined) {
        fetchOptions.body = typeof reqBody === 'string' ? reqBody : JSON.stringify(reqBody);
      }

      const upstreamResp = await fetch(url, fetchOptions);
      const respBuffer = Buffer.from(await upstreamResp.arrayBuffer());
      const respContentType = upstreamResp.headers.get('content-type') || 'application/octet-stream';

      res.writeHead(upstreamResp.status, {
        'Content-Type': respContentType,
        'Access-Control-Allow-Origin': '*',
      });
      res.end(respBuffer);
    } catch (e) {
      res.writeHead(500, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
}

// ====== 启动服务器 ======
const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  // API 代理路由
  if (req.url === '/api/proxy' && req.method === 'POST') {
    handleProxy(req, res);
    return;
  }

  // 静态文件
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log('');
  console.log('  Kids Vocab Dev Server');
  console.log('  http://localhost:' + PORT);
  console.log('  Proxy: enabled (LLM + TTS browser testing)');
  console.log('');
});
