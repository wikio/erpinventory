const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { ExternalDatabaseManager } = require('./external-db');
const { FileContentRepository } = require('./file-content');
const { AuthVault, securePassword } = require('./auth-vault');
const { SmtpService } = require('./smtp-service');

const PORT = process.env.PORT || 3000;
const STATIC_ROOT = fs.existsSync(path.join(__dirname, 'dist', 'index.html'))
  ? path.join(__dirname, 'dist')
  : __dirname;
const HOST = '0.0.0.0';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const CAPTCHA_TTL_MS = 5 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.eot': 'application/vnd.ms-fontobject',
  '.webmanifest': 'application/manifest+json'
};

// Authentication identities and password hashes live in the private runtime vault.
const sessions = new Map();
const captchas = new Map();
const loginAttempts = new Map();
const integrationTokens = new Map();
const integrationData = new Map(['products','customers','suppliers','sales','purchases'].map(name => [name, []]));
const integrationEndpointAliases = new Map(['products','customers','suppliers','sales','purchases'].map(name => [name,name]));
let integrationBasePath = '/api/v1';
const externalDB = new ExternalDatabaseManager(__dirname);
const fileContent = new FileContentRepository(__dirname);
const authVault = new AuthVault(__dirname);
const smtpService = new SmtpService(__dirname);

const TOKEN_FILE = path.join(__dirname,'.runtime','api-tokens.json');
try { for (const item of JSON.parse(fs.readFileSync(TOKEN_FILE,'utf8'))) integrationTokens.set(item.id,item); } catch (_) { /* first run */ }
function persistApiTokens(){try{fs.mkdirSync(path.dirname(TOKEN_FILE),{recursive:true});fs.writeFileSync(TOKEN_FILE,JSON.stringify([...integrationTokens.values()],null,2));}catch(error){console.warn('[API] Could not persist token metadata:',error.message);}}
function hashApiToken(token) { return crypto.createHash('sha256').update(String(token)).digest('hex'); }
function requireAdmin(req) { const auth=getSession(req); return auth?.session?.user?.role === 'admin' ? auth : null; }
function bearerToken(req) { const value=req.headers.authorization||''; return value.startsWith('Bearer ') ? value.slice(7).trim() : ''; }
function validApiToken(req) { const hash=hashApiToken(bearerToken(req)); return [...integrationTokens.values()].find(item => !item.revokedAt && item.tokenHash === hash); }
function revokeUserSessions(userId){for(const[token,session]of sessions)if(session.user?.id===userId)sessions.delete(token);}

function json(res, status, body) {
  const raw = Buffer.from(JSON.stringify(body));
  const accepted = String(res.req?.headers['accept-encoding'] || '');
  let payload = raw;
  const headers = { 'Content-Type': MIME_TYPES['.json'], 'Cache-Control': 'no-store' };
  if (raw.length > 1024 && accepted.includes('br')) {
    payload = zlib.brotliCompressSync(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 } });
    headers['Content-Encoding'] = 'br'; headers.Vary = 'Accept-Encoding';
  } else if (raw.length > 1024 && accepted.includes('gzip')) {
    payload = zlib.gzipSync(raw, { level: 5 });
    headers['Content-Encoding'] = 'gzip'; headers.Vary = 'Accept-Encoding';
  }
  headers['Content-Length'] = payload.length;
  res.writeHead(status, headers);
  res.end(payload);
}

function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(part => {
    const index = part.indexOf('=');
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }));
}

function publicUser(user) { return authVault.public(user); }

function getSession(req) {
  const token = parseCookies(req).sari_session;
  const session = token && sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }
  return { token, session };
}

function readJson(req, maxBytes = 10 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > maxBytes) req.destroy();
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch (error) { reject(error); }
    });
    req.on('error', reject);
  });
}

function setSessionCookie(req, res, token) {
  const forwardedHttps = (req.headers['x-forwarded-proto'] || '').split(',')[0] === 'https';
  const secure = forwardedHttps || req.socket.encrypted ? '; Secure' : '';
  res.setHeader('Set-Cookie', `sari_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_MS / 1000}${secure}`);
}

function clearSessionCookie(req, res) {
  const forwardedHttps = (req.headers['x-forwarded-proto'] || '').split(',')[0] === 'https';
  const secure = forwardedHttps || req.socket.encrypted ? '; Secure' : '';
  res.setHeader('Set-Cookie', `sari_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`);
}

async function handleApi(req, res, pathname) {
  if (pathname === '/api/content/reload' && req.method === 'POST') {
    if (!requireAdmin(req)) return json(res, 403, { error: 'Administrator access required' });
    try { return json(res, 200, { reloadedAt: new Date().toISOString(), content: fileContent.snapshot() }); }
    catch (error) { return json(res, 400, { error: error.message }); }
  }
  if (pathname.startsWith('/api/content/')) {
    if (!getSession(req)) return json(res, 401, { error: 'Authentication required' });
    const [, , , kind, ...fileParts] = pathname.split('/');
    const name = fileParts.join('/');
    try {
      if (req.method === 'GET' && !name) return json(res, 200, { kind, files: fileContent.list(kind) });
      if (req.method === 'GET') return json(res, 200, fileContent.read(kind, name));
      if (req.method === 'PUT') {
        if (!requireAdmin(req)) return json(res, 403, { error: 'Administrator access required' });
        const body = await readJson(req, 5 * 1024 * 1024);
        return json(res, 200, fileContent.write(kind, name, body.content));
      }
      return json(res, 405, { error: 'Method not allowed' });
    } catch (error) { return json(res, error.code === 'ENOENT' ? 404 : 400, { error: error.message }); }
  }
  if (pathname === '/api/db/config' && req.method === 'GET') { if(!requireAdmin(req))return json(res,403,{error:'Administrator access required'});return json(res,200,externalDB.publicConfig()); }
  if (pathname === '/api/db/diagnostics' && req.method === 'GET') { if(!requireAdmin(req))return json(res,403,{error:'Administrator access required'});const since=Number(new URL(req.url,'http://localhost').searchParams.get('since')||0);return json(res,200,{entries:externalDB.diagnosticLog(since)}); }
  if (pathname === '/api/db/diagnostics' && req.method === 'DELETE') { if(!requireAdmin(req))return json(res,403,{error:'Administrator access required'});return json(res,200,externalDB.clearDiagnostics()); }
  if (pathname === '/api/db/migration/preflight' && req.method === 'GET') { if(!requireAdmin(req))return json(res,403,{error:'Administrator access required'});try{return json(res,200,await externalDB.migrationPreflight());}catch(error){return json(res,400,{ready:false,error:error.message,code:error.code,target:error.target,hint:error.hint});} }
  if (pathname === '/api/db/status' && req.method === 'GET') { if(!getSession(req))return json(res,401,{error:'Authentication required'});const config=externalDB.publicConfig();return json(res,200,{active:config.active,type:config.type,configured:config.configured}); }
  if (pathname === '/api/db/test' && req.method === 'POST') { if(!requireAdmin(req))return json(res,403,{error:'Administrator access required'});try{return json(res,200,await externalDB.test(await readJson(req)));}catch(error){return json(res,400,{success:false,error:error.message,code:error.code,target:error.target,hint:error.hint});} }
  if (pathname === '/api/db/config' && req.method === 'POST') { if(!requireAdmin(req))return json(res,403,{error:'Administrator access required'});try{return json(res,200,await externalDB.configure(await readJson(req)));}catch(error){return json(res,400,{success:false,error:error.message,code:error.code,target:error.target,hint:error.hint});} }
  if (pathname === '/api/db/migrate-batch' && req.method === 'POST') { if(!getSession(req))return json(res,401,{error:'Authentication required'});try{const body=await readJson(req);return json(res,200,await externalDB.migrateBatch(body.storeName,body.records||[]));}catch(error){return json(res,400,{success:false,error:error.message,code:error.code,target:error.target,hint:error.hint});} }
  if (pathname === '/api/db/delete-record' && req.method === 'POST') { if(!getSession(req))return json(res,401,{error:'Authentication required'});try{const body=await readJson(req);return json(res,200,await externalDB.deleteRecord(body.storeName,body.numericId));}catch(error){return json(res,400,{success:false,error:error.message});} }
  if (pathname === '/api/integration/tokens' && req.method === 'GET') {
    if (!requireAdmin(req)) return json(res, 403, { error: 'Administrator access required' });
    return json(res, 200, { tokens: [...integrationTokens.values()].map(({tokenHash,...item}) => item) });
  }
  if (pathname === '/api/integration/tokens' && req.method === 'POST') {
    const auth=requireAdmin(req); if (!auth) return json(res,403,{error:'Administrator access required'});
    let body;try{body=await readJson(req);}catch(_){return json(res,400,{error:'Invalid JSON'});}
    const raw=`sari_${crypto.randomBytes(24).toString('base64url')}`,id=crypto.randomUUID();
    integrationTokens.set(id,{id,name:String(body.name||'Integration token'),prefix:raw.slice(0,12),tokenHash:hashApiToken(raw),createdAt:new Date().toISOString(),createdBy:auth.session.user.id,revokedAt:null});persistApiTokens();
    return json(res,201,{id,token:raw,message:'Copy this token now; it will not be displayed again.'});
  }
  if (pathname.startsWith('/api/integration/tokens/') && req.method === 'DELETE') {
    if (!requireAdmin(req)) return json(res,403,{error:'Administrator access required'});const id=pathname.split('/').pop(),token=integrationTokens.get(id);if(!token)return json(res,404,{error:'Token not found'});token.revokedAt=new Date().toISOString();persistApiTokens();return json(res,200,{revoked:true,id});
  }
  if (pathname === '/api/integration/endpoints' && req.method === 'GET') return json(res,200,{basePath:integrationBasePath,authentication:'Bearer token',endpoints:[...integrationEndpointAliases].map(([path,name])=>({name,path:`${integrationBasePath}/${path}`,methods:['GET','POST','PUT','DELETE']}))});
  if (pathname === '/api/integration/endpoints' && req.method === 'POST') { if(!requireAdmin(req))return json(res,403,{error:'Administrator access required'});let body;try{body=await readJson(req);}catch(_){return json(res,400,{error:'Invalid JSON'});}integrationBasePath=String(body.basePath||'/api/v1');if(!integrationBasePath.startsWith('/api/'))integrationBasePath='/api/'+integrationBasePath.replace(/^\/+/, '');integrationEndpointAliases.clear();for(const endpoint of body.endpoints||[])if(integrationData.has(endpoint.store||endpoint.name))integrationEndpointAliases.set(String(endpoint.path||endpoint.name).replace(/[^a-z0-9_-]/gi,''),endpoint.store||endpoint.name);return json(res,200,{configured:true,count:integrationEndpointAliases.size}); }
  if (pathname.startsWith(integrationBasePath + '/')) {
    const token=validApiToken(req);if(!token)return json(res,401,{error:'Invalid or revoked API token'});const parts=pathname.slice(integrationBasePath.length+1).split('/'),alias=parts[0],entity=integrationEndpointAliases.get(alias),id=parts[1],collection=integrationData.get(entity);if(!collection)return json(res,404,{error:'Unknown endpoint'});
    if(req.method==='GET')return json(res,200,id?(collection.find(x=>x.id===id)||null):{data:collection,count:collection.length});
    let body={};if(['POST','PUT'].includes(req.method))try{body=await readJson(req);}catch(_){return json(res,400,{error:'Invalid JSON'});}
    if(req.method==='POST'){const record={...body,id:body.id||crypto.randomUUID(),receivedAt:new Date().toISOString()};collection.push(record);return json(res,201,record);}
    if(req.method==='PUT'){const index=collection.findIndex(x=>x.id===id);if(index<0)return json(res,404,{error:'Record not found'});collection[index]={...collection[index],...body,id};return json(res,200,collection[index]);}
    if(req.method==='DELETE'){const index=collection.findIndex(x=>x.id===id);if(index<0)return json(res,404,{error:'Record not found'});collection.splice(index,1);return json(res,200,{deleted:true,id});}
    return json(res,405,{error:'Method not allowed'});
  }
  if (pathname === '/api/auth/public-settings' && req.method === 'GET') return json(res,200,authVault.settings());
  if (pathname === '/api/auth/password-reset-requests' && req.method === 'POST') { try{const body=await readJson(req);const result=authVault.requestReset(body.identifier||body.username||body.email,{ip:req.socket.remoteAddress||''});return json(res,202,{...result,message:'La demande a été ajoutée à la file Administrateur.'});}catch(error){return json(res,400,{error:error.message});} }
  if (pathname === '/api/auth/token/validate' && req.method === 'POST') { try{const body=await readJson(req);return json(res,200,authVault.validateToken(body.token));}catch(error){return json(res,400,{error:error.message});} }
  if (pathname === '/api/auth/token/consume' && req.method === 'POST') { try{const body=await readJson(req);if(String(body.password||'').length<10)return json(res,400,{error:'Le mot de passe doit contenir au moins 10 caractères.'});return json(res,200,{success:true,user:authVault.consumeToken(body.token,body.password)});}catch(error){return json(res,400,{error:error.message});} }
  if (pathname === '/api/admin/users' && req.method === 'GET') { if(!requireAdmin(req))return json(res,403,{error:'Administrator access required'});return json(res,200,{users:authVault.list(),settings:authVault.settings()}); }
  if (pathname === '/api/admin/users' && req.method === 'POST') { if(!requireAdmin(req))return json(res,403,{error:'Administrator access required'});try{const body=await readJson(req),result=authVault.create(body);return json(res,201,result);}catch(error){return json(res,400,{error:error.message});} }
  if (pathname === '/api/admin/auth-settings' && req.method === 'PUT') { if(!requireAdmin(req))return json(res,403,{error:'Administrator access required'});try{const settings=authVault.settings(await readJson(req));if(settings.demoAccountsEnabled===false)for(const user of authVault.data.users.filter(item=>item.isDemo))revokeUserSessions(user.id);return json(res,200,settings);}catch(error){return json(res,400,{error:error.message});} }
  if (pathname === '/api/admin/password-reset-requests' && req.method === 'GET') { if(!requireAdmin(req))return json(res,403,{error:'Administrator access required'});return json(res,200,{requests:authVault.requests()}); }
  if (pathname.startsWith('/api/admin/password-reset-requests/') && pathname.endsWith('/reject') && req.method === 'POST') { if(!requireAdmin(req))return json(res,403,{error:'Administrator access required'});try{return json(res,200,{request:authVault.rejectRequest(pathname.split('/')[4])});}catch(error){return json(res,400,{error:error.message});} }
  if (pathname.startsWith('/api/admin/password-reset-requests/') && pathname.endsWith('/approve') && req.method === 'POST') { if(!requireAdmin(req))return json(res,403,{error:'Administrator access required'});try{const id=pathname.split('/')[4],body=await readJson(req),proto=(req.headers['x-forwarded-proto']||'http').split(',')[0],base=`${proto}://${req.headers.host}`,result=authVault.approveRequest(id,base);let email=null;if(body.sendEmail&&result.request.email)email=await smtpService.send({to:result.request.email,subject:'Réinitialisation du mot de passe SARI',text:`Lien: ${result.link}`,html:`<p>Votre lien SARI:</p><p><a href="${result.link}">${result.link}</a></p>`});return json(res,200,{...result,email});}catch(error){return json(res,400,{error:error.message});} }
  if (pathname.startsWith('/api/admin/users/')) {
    const auth=requireAdmin(req);if(!auth)return json(res,403,{error:'Administrator access required'});const parts=pathname.split('/'),id=parts[4],action=parts[5];
    try{if(req.method==='GET'&&!action)return json(res,200,{user:authVault.public(authVault.find(id))});if(req.method==='PUT'&&!action){const user=authVault.update(id,await readJson(req));if(!user.isActive)revokeUserSessions(user.id);return json(res,200,{user});}if(req.method==='DELETE'&&!action){const result=authVault.delete(id);revokeUserSessions(result.id);return json(res,200,result);}if(req.method==='POST'&&action==='generate-password'){const password=securePassword();return json(res,200,{user:authVault.update(id,{password}),temporaryPassword:password});}if(req.method==='POST'&&action==='activation'){const proto=(req.headers['x-forwarded-proto']||'http').split(',')[0],base=`${proto}://${req.headers.host}`,result=authVault.issueActivation(id,base),body=await readJson(req);let email=null;const user=authVault.find(id);if(body.sendEmail&&user?.email)email=await smtpService.send({to:user.email,subject:'Activation du compte SARI',text:`Lien: ${result.link}`,html:`<p>Activez votre compte SARI:</p><p><a href="${result.link}">${result.link}</a></p>`});return json(res,200,{...result,email});}}catch(error){return json(res,400,{error:error.message});}
  }
  if (pathname === '/api/admin/smtp' && req.method === 'GET') { if(!requireAdmin(req))return json(res,403,{error:'Administrator access required'});return json(res,200,smtpService.public()); }
  if (pathname === '/api/admin/smtp' && req.method === 'PUT') { if(!requireAdmin(req))return json(res,403,{error:'Administrator access required'});try{return json(res,200,smtpService.save(await readJson(req)));}catch(error){return json(res,400,{error:error.message});} }
  if (pathname === '/api/admin/smtp/test' && req.method === 'POST') { if(!requireAdmin(req))return json(res,403,{error:'Administrator access required'});try{return json(res,200,{success:true,result:await smtpService.test()});}catch(error){return json(res,400,{success:false,error:error.message});} }
  if (pathname === '/api/auth/captcha' && req.method === 'GET') {
    const left = crypto.randomInt(2, 10);
    const right = crypto.randomInt(1, 10);
    const operation = crypto.randomInt(0, 2) ? '+' : '−';
    const answer = operation === '+' ? left + right : Math.max(left, right) - Math.min(left, right);
    const displayLeft = operation === '−' ? Math.max(left, right) : left;
    const displayRight = operation === '−' ? Math.min(left, right) : right;
    const id = crypto.randomUUID();
    captchas.set(id, { answer: String(answer), expiresAt: Date.now() + CAPTCHA_TTL_MS });
    return json(res, 200, { id, prompt: `${displayLeft} ${operation} ${displayRight} = ?`, expiresIn: CAPTCHA_TTL_MS / 1000 });
  }

  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const auth = getSession(req);
    if (!auth) return json(res, 401, { authenticated: false });
    return json(res, 200, { authenticated: true, user: publicUser(auth.session.user) });
  }

  if (pathname === '/api/auth/login' && req.method === 'POST') {
    let body;
    try { body = await readJson(req); } catch (_) { return json(res, 400, { error: 'Requête invalide.' }); }
    const username = String(body.username || '').trim().toLowerCase();
    const attemptKey = `${req.socket.remoteAddress || 'unknown'}:${username}`;
    const attempt = loginAttempts.get(attemptKey);
    if (attempt && attempt.lockedUntil > Date.now()) {
      return json(res, 429, { error: 'Trop de tentatives. Réessayez dans une minute.', retryAfter: Math.ceil((attempt.lockedUntil - Date.now()) / 1000) });
    }

    const captcha = captchas.get(String(body.captchaId || ''));
    captchas.delete(String(body.captchaId || '')); // CAPTCHA is always single-use.
    if (!captcha || captcha.expiresAt <= Date.now() || String(body.captchaAnswer || '').trim() !== captcha.answer) {
      return json(res, 400, { error: 'Le code CAPTCHA est incorrect ou a expiré.', code: 'CAPTCHA_INVALID' });
    }

    const user = authVault.verify(username, String(body.password || ''));
    if (!user) {
      const failures = (attempt && attempt.failures || 0) + 1;
      loginAttempts.set(attemptKey, { failures, lockedUntil: failures >= MAX_LOGIN_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0 });
      return json(res, 401, { error: 'Identifiant ou mot de passe incorrect.', attemptsRemaining: Math.max(0, MAX_LOGIN_ATTEMPTS - failures) });
    }

    loginAttempts.delete(attemptKey);
    const token = crypto.randomBytes(32).toString('base64url');
    sessions.set(token, { user, expiresAt: Date.now() + SESSION_TTL_MS });
    authVault.touchLogin(user.id);
    setSessionCookie(req, res, token);
    return json(res, 200, { authenticated: true, user: publicUser(user) });
  }

  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    const auth = getSession(req);
    if (auth) sessions.delete(auth.token);
    clearSessionCookie(req, res);
    return json(res, 200, { authenticated: false });
  }

  return json(res, 404, { error: 'API endpoint not found' });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  let pathname;
  try {
    pathname = decodeURIComponent(req.url.split('?')[0]);
  } catch (_) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    return res.end('400 Bad Request');
  }
  if (pathname.startsWith(integrationBasePath + '/') || pathname === '/api/integration/endpoints') {
    res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, DELETE, OPTIONS');
    if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
  }
  if (pathname.startsWith('/api/')) return handleApi(req, res, pathname);
  if (/^\/(?:\.runtime|auth-vault\.js|smtp-service\.js|server\.js|external-db\.js|file-content\.js|scripts\/|sql\/|secure\/)/i.test(pathname)) { res.writeHead(404,{'Content-Type':'text/plain'});return res.end('404 File Not Found'); }
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end();
  }

  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const absolutePath = path.resolve(STATIC_ROOT, requested);
  if (!absolutePath.startsWith(`${path.resolve(STATIC_ROOT)}${path.sep}`) && absolutePath !== path.resolve(STATIC_ROOT, 'index.html')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  fs.stat(absolutePath, (err, stats) => {
    let target = absolutePath;
    if (err || !stats.isFile()) {
      if (!path.extname(requested)) target = path.join(STATIC_ROOT, 'index.html');
      else { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('404 File Not Found'); }
    }
    fs.readFile(target, (readErr, content) => {
      if (readErr) { res.writeHead(500, { 'Content-Type': 'text/plain' }); return res.end('500 Internal Server Error'); }
      const ext = path.extname(target).toLowerCase();
      const basename = path.basename(target);
      const etag = `"${crypto.createHash('sha256').update(content).digest('base64url').slice(0, 24)}"`;
      const isHashedAsset = pathname.startsWith('/assets/') && /-[A-Za-z0-9_-]{8,}\.[^.]+$/.test(basename);
      const isRevalidated = basename === 'sw.js' || basename === 'index.html' || basename === 'manifest.json';
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', isHashedAsset
        ? 'public, max-age=31536000, immutable'
        : isRevalidated ? 'no-cache' : 'public, max-age=3600, stale-while-revalidate=86400');
      if (basename === 'sw.js') res.setHeader('Service-Worker-Allowed', '/');
      if (req.headers['if-none-match'] === etag) {
        res.writeHead(304);
        return res.end();
      }

      const type = MIME_TYPES[ext] || 'application/octet-stream';
      const compressible = /^(text\/|application\/(javascript|json|manifest\+json)|image\/svg\+xml)/.test(type);
      const accepted = String(req.headers['accept-encoding'] || '');
      let payload = content;
      if (compressible && content.length > 1024 && accepted.includes('br')) {
        payload = zlib.brotliCompressSync(content, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } });
        res.setHeader('Content-Encoding', 'br');
        res.setHeader('Vary', 'Accept-Encoding');
      } else if (compressible && content.length > 1024 && accepted.includes('gzip')) {
        payload = zlib.gzipSync(content, { level: 6 });
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Vary', 'Accept-Encoding');
      }
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': payload.length });
      res.end(req.method === 'HEAD' ? undefined : payload);
    });
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of sessions) if (value.expiresAt <= now) sessions.delete(key);
  for (const [key, value] of captchas) if (value.expiresAt <= now) captchas.delete(key);
  for (const [key, value] of loginAttempts) if (value.lockedUntil && value.lockedUntil <= now) loginAttempts.delete(key);
}, 60 * 1000).unref();

server.listen(PORT, HOST, () => {
  console.log(`[SARI Système] Secure ERP server listening on http://${HOST}:${PORT}`);
  console.log(`[Assets] Serving ${STATIC_ROOT} with ETag + Brotli/gzip caching`);
  console.log('[Auth] CAPTCHA, scrypt passwords, secure sessions and role-based access enabled');
});

async function shutdown(signal) {
  console.log(`[SARI Système] ${signal} received; draining database pools...`);
  server.close(async () => {
    try { await externalDB.close(); } finally { process.exit(0); }
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));
