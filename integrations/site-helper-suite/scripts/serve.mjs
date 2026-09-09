import http from 'node:http';
import {readFile, realpath, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const siteRoot = fileURLToPath(new URL('../site/', import.meta.url));
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.md':'text/plain; charset=utf-8'};
export function createServer(root = siteRoot, mountPath = '') {
  if (mountPath && !/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(mountPath)) throw new Error('Mount path must use plain directory names and no trailing slash.');
  return http.createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options','nosniff');
    response.setHeader('Cache-Control','no-store');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
    if (!['GET','HEAD'].includes(request.method)) { response.writeHead(405); response.end('Read-only static server'); return; }
    try {
      let urlPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (mountPath && urlPath === mountPath) {response.writeHead(308,{'Location':mountPath+'/'});response.end();return;}
      if (mountPath && !urlPath.startsWith(mountPath+'/')) throw new Error('Outside mount path');
      urlPath = urlPath.slice(mountPath.length);
      if (urlPath.includes('\\') || urlPath.includes('\0') || urlPath.split('/').some(p => p.startsWith('.') && p !== '')) throw new Error('Invalid path');
      const candidate = path.resolve(root, '.' + (urlPath.endsWith('/') ? urlPath + 'index.html' : urlPath));
      const actual = await realpath(candidate);
      const rootReal = await realpath(root);
      const relative = path.relative(rootReal, actual);
      if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || !(await stat(actual)).isFile()) throw new Error('Invalid path');
      const bytes = await readFile(actual);
      response.writeHead(200, {'Content-Type':types[path.extname(actual)] || 'application/octet-stream'});
      response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch { response.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}); response.end('Not found in the public site.'); }
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2] || 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Choose a port from 1 to 65535.');
  const mountPath = process.argv[3] || '';
  const server = createServer(siteRoot, mountPath);
  server.on('error', error => { console.error(error.code || error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`GenomeAtlas local preview: http://127.0.0.1:${port}${mountPath}/ (public site/ only)`));
}
