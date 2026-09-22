import assert from 'node:assert/strict';
import http from 'node:http';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {sessions,confirmSession,closeSession,scan,discover} from '../src/scanner.js';
const out=new URL('../validation-output/authenticated-suite/',import.meta.url);await mkdir(out,{recursive:true});
const records=[],requests=[];let base,other;
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="100" height="80"><rect width="100" height="80" fill="green"/></svg>';
const image=(id,src='/good.svg',alt='Private graphic')=>`<img id="${id}" src="${src}" alt="${alt}" width="100" height="80">`;
const login='<h1>Sign in</h1><input name="username" autocomplete="username"><button>Continue</button>';
const server=http.createServer((req,res)=>{requests.push({path:req.url,method:req.method});const send=(status,body,type='text/html')=>{res.writeHead(status,{'Content-Type':type});res.end(type==='text/html'?`<!doctype html><html lang="en"><title>Authenticated ImageLens fixture</title><body>${body}</body></html>`:body)};
if(req.url==='/good.svg')return send(200,svg,'image/svg+xml');
if(req.url==='/private.svg')return send(req.headers.cookie?.includes('auth=yes')?200:401,req.headers.cookie?.includes('auth=yes')?svg:'Unauthorized','image/svg+xml');
if(req.url==='/missing.svg')return send(404,'Missing');
if(req.url==='/login')return send(200,login);
if(req.url==='/password-login')return send(200,'<h1>Sign in</h1><input type="password"><button>Sign in</button>');
if(req.url==='/challenge')return send(200,'<h1>Verify your identity</h1><input autocomplete="one-time-code">');
if(req.url==='/account'){res.setHeader('Set-Cookie','auth=yes; Path=/; HttpOnly');return send(200,'<h1 data-authenticated="true">Account</h1>'+image('account'));}
if(req.url==='/cookie')return send(200,req.headers.cookie?.includes('auth=yes')?image('cookie','/private.svg'):login);
if(req.url==='/session'||req.url==='/local')return send(200,`<main></main><script>document.querySelector('main').innerHTML=${req.url==='/session'?'sessionStorage':'localStorage'}.getItem('token')==='demo'?${JSON.stringify(image('stored'))}:${JSON.stringify(login)}</script>`);
if(req.url==='/token-api')return send(req.headers.authorization==='Bearer demo'?200:401,svg,'image/svg+xml');
if(req.url==='/token')return send(200,`<main></main><script>fetch('/token-api',{headers:{Authorization:'Bearer '+sessionStorage.getItem('token')}}).then(r=>r.ok?r.blob():Promise.reject()).then(b=>document.querySelector('main').innerHTML='<img id="bearer" src="'+URL.createObjectURL(b)+'" alt="Private graphic" width="100" height="80">').catch(()=>document.querySelector('main').innerHTML=${JSON.stringify(login)})</script>`);
if(req.url==='/render404')return send(404,'<h1 data-authenticated="true">Working account</h1>'+image('rendered'));
if(req.url==='/real404')return send(404,'<h1>404 Not found</h1>');
if(req.url==='/denied')return send(403,'<h1>Access denied</h1>');
if(req.url==='/redirect-login'){res.writeHead(302,{location:'/login'});return res.end()}
if(req.url==='/redirect-action'){res.writeHead(302,{location:'/logout'});return res.end()}
if(req.url==='/logout')return send(200,'Unexpected action');
if(req.url==='/responsive')return send(200,`<main></main><script>document.querySelector('main').innerHTML=innerWidth<600?${JSON.stringify(image('mobile','/missing.svg'))}:${JSON.stringify(image('desktop'))}</script>`);
if(req.url==='/settings')return send(200,'<h1 data-authenticated="true">Account settings</h1><a href="/logout">Sign out</a><input type="password" autocomplete="new-password"><button>Save changes</button>'+image('settings'));
if(req.url==='/hidden-name')return send(200,'<a id="image-link" href="/account"><span aria-hidden="true">ICON</span>'+image('unnamed','/good.svg','')+'</a>');
if(req.url==='/scripted')return send(200,'<h1>Catalog</h1><a href="#" onclick="location.href=\'/product\'">Product details</a>'+image('catalog'));
if(req.url==='/product')return send(200,'<h1>Product detail</h1>'+image('product'));
return send(404,'Not found');});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;other=base.replace('127.0.0.1','localhost');
let browser,context,page;const id='imagelens-auth-matrix';
async function record(name,fn){try{const evidence=await fn();records.push({name,status:'passed',evidence})}catch(e){records.push({name,status:'observed failure',error:e.message})}await writeFile(new URL('results.json',out),JSON.stringify(records,null,2));console.log(records.at(-1).status+': '+name)}
const job=()=>({signal:new AbortController().signal,gaps:[]});
async function result(path){const r=await scan({url:base+'/account',pages:[base+path],sessionId:id},job());await writeFile(new URL(path.slice(1)+'.json',out),JSON.stringify(r,null,2));return r}
try{browser=await chromium.launch();context=await browser.newContext();page=await context.newPage();await page.goto(base+'/password-login');sessions.set(id,{id,browser,context,page,url:base+'/password-login',busy:false,confirmed:false,lastUsed:Date.now()});
await record('Incomplete password sign-in rejected',async()=>{await assert.rejects(()=>confirmSession(id),/sign-in/i);return 'Rejected visible login form'});
await record('Username-only sign-in rejected',async()=>{await page.goto(base+'/login');await assert.rejects(()=>confirmSession(id),/sign-in/i);return 'Rejected username step'});
await record('MFA confirmation rejected',async()=>{await page.goto(base+'/challenge');await assert.rejects(()=>confirmSession(id),/verification/i);return 'Rejected challenge'});
await page.goto(base+'/account');await record('Same-origin login confirmation',async()=>{const r=await confirmSession(id);assert.equal(r.url,base+'/account');return r});await page.evaluate(()=>{sessionStorage.setItem('token','demo');localStorage.setItem('token','demo')});
for(const [path,selector]of[['/cookie','#cookie'],['/session','#stored'],['/local','#stored'],['/token','#bearer']])await record(path.slice(1)+' authenticated image loading',async()=>{const r=await result(path);for(const v of['Desktop','Mobile'])assert.ok(r.assets.some(a=>a.selector===selector&&a.viewport===v&&a.loaded),v+' private image absent');return{observations:r.assets.length,viewports:r.pageResults}});
await record('Rendered authenticated HTTP 404 remains inspectable',async()=>{const r=await result('/render404');assert.ok(r.assets.some(a=>a.selector==='#rendered'),'Working rendered image was discarded; '+JSON.stringify(r.coverage.gaps));return{observations:r.assets.length}});
for(const path of['/real404','/denied','/redirect-login'])await record(path.slice(1)+' not presented as checked authenticated content',async()=>{const r=await result(path);assert.ok(r.pageResults.every(p=>p.status==='unverified'),'Page incorrectly marked checked: '+JSON.stringify(r.pageResults));return r.pageResults});
await record('Guard blocks redirected logout action',async()=>{await result('/redirect-action');assert.ok(!requests.some(r=>r.path==='/logout'));return 'No logout request sent'});
await record('Signed-in password settings remain auditable',async()=>{const r=await result('/settings');assert.ok(r.assets.some(a=>a.selector==='#settings'),'Settings page mistaken for sign-in: '+JSON.stringify(r.coverage.gaps));return{observations:r.assets.length}});
await record('Fresh mobile initialization captures mobile-only broken image',async()=>{const oracle=await context.newPage();await oracle.setViewportSize({width:390,height:844});await oracle.goto(base+'/responsive');assert.equal(await oracle.locator('#mobile').count(),1);await oracle.close();const r=await result('/responsive');assert.ok(r.assets.some(a=>a.selector==='#mobile'&&a.viewport==='Mobile'&&a.status==='broken'),'Fresh mobile image absent; recorded: '+r.assets.map(a=>a.viewport+':'+a.selector).join(', '));return{observations:r.assets.length}});
await record('Hidden decorative text cannot name an image link',async()=>{const r=await result('/hidden-name');assert.ok(r.assets.filter(a=>a.selector==='#unnamed').every(a=>a.issues.some(i=>i.code==='unnamed-image-control')),'Unnamed image link passed with parentName '+JSON.stringify(r.assets.map(a=>a.parentName)));return 'Unnamed controls flagged'});
await record('Scripted product discovery is covered or explicitly disclosed',async()=>{const r=await discover({url:base+'/scripted',sessionId:id},job());await writeFile(new URL('discovery.json',out),JSON.stringify(r,null,2));assert.ok(r.pages.some(p=>p.url===base+'/product')||r.gaps.some(g=>/script|navigation|interaction/i.test(g.reason+' '+g.detail)),'Product route omitted without a specific coverage note');return r});
await record('Changed sign-in origin offers application selection',async()=>{sessions.get(id).confirmed=false;await context.unroute('**/*');await page.goto(other+'/account');const choice=await confirmSession(id);assert.ok(choice.chooseApplication&&choice.pages.length,'Expected explicit origin selection');return choice});
await record('Signed-in popup is found while original login tab remains',async()=>{await page.goto(base+'/password-login');const popup=await context.newPage();await popup.goto(base+'/account');try{const connected=await confirmSession(id);assert.equal(connected.url,base+'/account');return connected}finally{await popup.close()}});
await record('Signed-in popup survives closure of original login tab',async()=>{const popup=await context.newPage();await popup.goto(base+'/account');await page.close();const connected=await confirmSession(id);assert.equal(connected.url,base+'/account');return connected});
}finally{await closeSession(id);await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
console.log(JSON.stringify({passed:records.filter(r=>r.status==='passed').length,failed:records.filter(r=>r.status==='observed failure').length,total:records.length}));
if(records.some(r=>r.status==='observed failure'))process.exitCode=1;
