import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif', '.webp':'image/webp', '.woff':'font/woff', '.woff2':'font/woff2', '.wasm':'application/wasm', '.txt':'text/plain; charset=utf-8' };
export function resolvePublicRoute(rawUrl, accept='', {sourceModules=false}={}) {
  let pathname;
  try { pathname=decodeURIComponent(new URL(rawUrl,'http://localhost').pathname); } catch { return {status:400}; }
  if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(s=>s==='.' || s==='..' || s.startsWith('.'))) return {status:400};
  if(pathname==='/api'||pathname.startsWith('/api/')) return {status:501,file:'api-unavailable.json'};
  if(pathname==='/' || pathname==='/index.html') return {status:200,file:'index.html'};
  if(pathname==='/version.json'||pathname==='/api-unavailable.json') return {status:200,file:pathname.slice(1)};
  if(pathname.startsWith('/assets/')||pathname.startsWith('/scripts/')||(sourceModules&&pathname.startsWith('/modules/')&&pathname.endsWith('.js'))) return {status:200,file:pathname.slice(1)};

  if(accept.includes('text/html')&&!extname(pathname)) return {status:200,file:'index.html'};
  return {status:404};
}
export async function createStaticHandler(directory) {
  const root=await realpath(directory);
  await stat(resolve(root,'index.html'));
  const sourceModules=await stat(resolve(root,'modules/app/entry.js')).then(s=>s.isFile(),()=>false);
  const universalHeaders={};

  const policy=await readFile(resolve(root,'_headers'),'utf8');
  const lines=policy.split(/\r?\n/); let universal=false;
  for(const line of lines){if(!line.trim()||line.trim().startsWith('#'))continue;if(!/^\s/.test(line)){universal=line.trim()==='/*';continue;}if(universal){const i=line.indexOf(':');if(i>0)universalHeaders[line.slice(0,i).trim()]=line.slice(i+1).trim();}}
  return async (req,res) => {
    const finish=(status,body,headers={})=>{res.writeHead(status,{...universalHeaders,...headers,'Content-Length':Buffer.byteLength(body)});res.end(req.method==='HEAD'?undefined:body);};
    if(req.method!=='GET'&&req.method!=='HEAD')return finish(405,'Method not allowed',{'Allow':'GET, HEAD','Content-Type':'text/plain; charset=utf-8'});
    const route=resolvePublicRoute(req.url,req.headers?.accept||'',{sourceModules});
    if(!route.file)return finish(route.status,route.status===400?'Bad request':'Not found',{'Content-Type':'text/plain; charset=utf-8'});
    try {
      const file=await realpath(resolve(root,route.file));
      if(!file.startsWith(root+sep)||!(await stat(file)).isFile())return finish(404,'Not found');
      const body=await readFile(file);
      finish(route.status,body,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':route.file==='version.json'?'no-store':'public, max-age=0, must-revalidate'});
    } catch(error) { if(['ENOENT','ENOTDIR','EACCES'].includes(error.code))finish(404,'Not found');else finish(500,'Unable to serve file'); }
  };
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const mode=process.argv.includes('--dist-source')?'dist-source':process.argv.includes('--dist-npm')?'dist-npm':'dist';
  const dist=fileURLToPath(new URL('./'+mode+'/',import.meta.url));
  const handler=await createStaticHandler(dist).catch(error=>{throw Error(`Build ${mode} is required before starting the server.`,{cause:error});});
  const port=Number(process.env.PORT||3000);
  createServer(handler).listen(port,'0.0.0.0',()=>console.log(`Serving ${mode} application on port ${port}`));
}
