const fs=require('fs');
const path=require('path');
const cp=require('child_process');

const ROOT=path.resolve(process.argv[2]||'C:\\SEDU_r7');
const RELEASE='v8.0.0r8-R4';
const FIREBASE_PROJECT='seller-edu-os-260902-vjzn6';
const FIREBASE_SITE='selleredu-portal';
const PORTAL_ORIGIN='https://selleredu-portal.web.app';
const CONNECTOR_SCRIPT_ID='1OiK0bf1iqVb6iBH9mwj5SXbLAJ9AdNRO_37AD99eO3sroCrd6FJOw1Em';
const CONNECTOR_DEPLOYMENT_ID='AKfycbxqtts9l7Pf62150DfqXpzL-3TlcyIHaHOw2pfVGiX1Wyh8oQjLWspNk_jdEncqhP7nMA';
const CONNECTOR_DOMAIN_URL='https://script.google.com/a/macros/shopee.com/s/'+CONNECTOR_DEPLOYMENT_ID+'/exec';
const REPORT=path.join(ROOT,'SELLEREDU_V800R8_X_LOGIN_R4_REPORT.json');
const state={release:RELEASE,status:'STARTED',startedAt:new Date().toISOString(),stages:[]};
function ex(p){return fs.existsSync(p)}
function mk(p){fs.mkdirSync(p,{recursive:true})}
function rd(p){return fs.readFileSync(p,'utf8')}
function wr(p,s){mk(path.dirname(p));fs.writeFileSync(p,s,'utf8')}
function cpfile(a,b){mk(path.dirname(b));fs.copyFileSync(a,b)}
function stamp(){return new Date().toISOString().replace(/[:.]/g,'-')}
function save(){try{wr(REPORT,JSON.stringify(state,null,2))}catch{}}
function stage(name,status,detail){state.stages.push({name,status,detail,at:new Date().toISOString()});save();console.log(`[${status}] ${name}${detail?' - '+detail:''}`)}
function fail(msg){state.status='STOPPED_SAFELY';state.error=msg;save();throw new Error(msg)}
function run(bin,args,cwd){console.log('> '+bin+' '+args.join(' '));const r=cp.spawnSync(bin,args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe'],shell:process.platform==='win32'});if(r.stdout)process.stdout.write(r.stdout);if(r.stderr)process.stderr.write(r.stderr);return r}
function command(name){const r=run(process.platform==='win32'?'where':'which',[name],ROOT);return r.status===0?name:null}
function first(arr){for(const p of arr)if(ex(p))return p;return null}
function findBase(dir,b){return first([path.join(dir,b+'.js'),path.join(dir,b+'.gs')])}
try{
 if(!ex(ROOT))fail('Root not found: '+ROOT);
 const pub=path.join(ROOT,'public'), roleJs=path.join(pub,'x-role-shell.js');
 const connectorLocal=first([path.join(ROOT,'workspace','connector'),path.join(ROOT,'connector'),path.join(ROOT,'workspace-connector')]);
 if(!connectorLocal)fail('Connector source directory not found.');
 for(const p of [roleJs,path.join(pub,'index.html'),path.join(ROOT,'firebase.json'),path.join(ROOT,'.firebaserc')])if(!ex(p))fail('Required file missing: '+p);
 for(const rel of ['XRoleRegistry.gs','PortalAuth.gs','PortalBridge.html'])if(!ex(path.join(connectorLocal,rel)))fail('Required Connector X file missing: '+path.join(connectorLocal,rel));
 const backup=path.join(ROOT,'Keep to backup','X_LOGIN_R4_BEFORE_'+stamp());mk(backup);
 for(const p of [roleJs,path.join(pub,'index.html'),path.join(ROOT,'firebase.json')])cpfile(p,path.join(backup,'public',path.basename(p)));
 for(const rel of ['XRoleRegistry.gs','PortalAuth.gs','PortalBridge.html'])cpfile(path.join(connectorLocal,rel),path.join(backup,'connector-local',rel));
 stage('Backup','PASS',backup);

 const clasp=command('clasp'), firebase=command('firebase');
 if(!clasp)fail('clasp CLI not found.'); if(!firebase)fail('firebase CLI not found.');
 const work=path.join(ROOT,'.r8-login-r4',stamp());mk(work);wr(path.join(work,'.clasp.json'),JSON.stringify({scriptId:CONNECTOR_SCRIPT_ID,rootDir:'.'},null,2));
 let r=run(clasp,['pull'],work);if(r.status!==0)fail('Connector pull failed. Hosting was NOT deployed.');
 const remoteWeb=findBase(work,'WebApp'), manifestPath=path.join(work,'appsscript.json');
 if(!remoteWeb||!ex(manifestPath))fail('Current Connector WebApp/appsscript.json not returned.');
 for(const rel of ['XRoleRegistry.gs','PortalAuth.gs','PortalBridge.html'])cpfile(path.join(connectorLocal,rel),path.join(work,rel));
 let web=rd(remoteWeb);
 web=web.replace(/\s*if\s*\(\s*e\s*&&\s*e\.parameter\s*&&\s*e\.parameter\.mode\s*===?\s*['\"]portalBridge['\"]\s*\)\s*return\s+portalBridgePage_\(e\)\s*;?/g,'');
 const re=/function\s+doGet\s*\(\s*e\s*\)\s*\{/;
 if(!re.test(web))fail('Could not locate Connector doGet(e) in current remote source.');
 web=web.replace(re,m=>m+"\n  if (e && e.parameter && String(e.parameter.mode || '') === 'portalBridge') return portalBridgePage_(e);");
 wr(remoteWeb,web);
 let manifest=JSON.parse(rd(manifestPath));manifest.webapp=manifest.webapp||{};manifest.webapp.access='DOMAIN';manifest.webapp.executeAs='USER_ACCESSING';manifest.oauthScopes=Array.from(new Set([...(manifest.oauthScopes||[]),'https://www.googleapis.com/auth/script.external_request','openid','https://www.googleapis.com/auth/userinfo.email']));wr(manifestPath,JSON.stringify(manifest,null,2));
 r=run(clasp,['push','--force'],work);if(r.status!==0)fail('Connector push failed. Hosting was NOT deployed.');
 r=run(clasp,['create-deployment','--deploymentId',CONNECTOR_DEPLOYMENT_ID,'--description',`${RELEASE} portalBridge priority route`],work);if(r.status!==0)r=run(clasp,['update-deployment',CONNECTOR_DEPLOYMENT_ID,'--description',`${RELEASE} portalBridge priority route`],work);if(r.status!==0)fail('Connector deployment update failed. Hosting was NOT deployed.');
 const dl=run(clasp,['list-deployments'],work);if(dl.status!==0||!(dl.stdout||'').includes(CONNECTOR_DEPLOYMENT_ID))fail('Connector deployment verification failed.');
 stage('Connector portalBridge route','PASS',CONNECTOR_DEPLOYMENT_ID);

 let js=rd(roleJs);
 js=js.replace(/const E='([^']+)',C='[^']+';/,(_,e)=>`const E='${e}',C='${CONNECTOR_DOMAIN_URL}';`);
 js=js.replace(/function ensureBridge\(\)\{[\s\S]*?\}function apply\(/,'function ensureBridge(){return null}function apply(');
 js=js.replace(/ensureBridge\(\)/g,'');
 js=js.replace(/function reqX\(filters\)\{[\s\S]*?\}function periods\(/,`function reqX(filters){return new Promise((resolve,reject)=>{const id='x'+Date.now()+Math.random();pending.set(id,{resolve,reject});const w=window.open(C+'?mode=portalBridge&x=1','seduXBridge','width=540,height=680,resizable=yes,scrollbars=yes');if(!w){pending.delete(id);return reject(new Error('POPUP_BLOCKED'))}const send=()=>{try{w.postMessage({type:'SEDU_X_REQUEST',requestId:id,filters,sessionToken},'*')}catch(e){}};setTimeout(send,1200);setTimeout(()=>{if(pending.has(id)){pending.delete(id);try{w.close()}catch{}reject(new Error('X_BRIDGE_TIMEOUT'))}},15000)})}function periods(`);
 wr(roleJs,js);
 stage('Portal login transport','PASS','Popup-only auth transport; hidden iframe removed');

 const frc=rd(path.join(ROOT,'.firebaserc'));if(!frc.includes(FIREBASE_PROJECT))fail('Firebase project lock mismatch.');
 const fj=JSON.parse(rd(path.join(ROOT,'firebase.json'))), hs=Array.isArray(fj.hosting)?fj.hosting:[fj.hosting];if(!hs.some(h=>h&&(h.site===FIREBASE_SITE||!h.site)))fail('Firebase Hosting site lock mismatch.');
 r=run(firebase,['deploy','--only','hosting','--project',FIREBASE_PROJECT],ROOT);if(r.status!==0)fail('Firebase Hosting deploy failed after Connector update.');
 stage('Firebase Hosting','PASS',PORTAL_ORIGIN+'/');
 state.status='DEPLOYED_AWAITING_LOGIN_ACCEPTANCE';state.completedAt=new Date().toISOString();state.backup=backup;state.connectorUrl=CONNECTOR_DOMAIN_URL;save();
 console.log('\n[DEPLOYED] R4 login transport fix is live.');
 console.log('[TEST] Open '+PORTAL_ORIGIN+'/ in a fresh tab and click Continue with Google Workspace.');
}catch(e){console.error('\n[STOPPED SAFELY] '+e.message);process.exitCode=1}
