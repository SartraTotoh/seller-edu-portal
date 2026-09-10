const fs=require('fs');
const path=require('path');
const cp=require('child_process');

const ROOT=path.resolve(process.argv[2]||'C:\\SEDU_r7');
const RELEASE='v8.0.0r8-R2';
const FIREBASE_PROJECT='seller-edu-os-260902-vjzn6';
const FIREBASE_SITE='selleredu-portal';
const PORTAL_URL='https://selleredu-portal.web.app/';
const CONNECTOR_SCRIPT_ID='1OiK0bf1iqVb6iBH9mwj5SXbLAJ9AdNRO_37AD99eO3sroCrd6FJOw1Em';
const CONNECTOR_DEPLOYMENT_ID='AKfycbxqtts9l7Pf62150DfqXpzL-3TlcyIHaHOw2pfVGiX1Wyh8oQjLWspNk_jdEncqhP7nMA';
const GATEWAY_DEPLOYMENT_ID='AKfycbwh2XMrfHxT0dA7z-35Wvpvu_j9jh0d_dDURxdB0xXdgfUiVtICXgVW_2WYEAgqo1siDw';
const REPORT=path.join(ROOT,'SELLEREDU_V800R8_X_PHASE1_3_R2_REPORT.json');
const state={release:RELEASE,status:'STARTED',startedAt:new Date().toISOString(),stages:[]};

function stamp(){return new Date().toISOString().replace(/[:.]/g,'-')}
function exists(p){return fs.existsSync(p)}
function mkdir(p){fs.mkdirSync(p,{recursive:true})}
function read(p){return fs.readFileSync(p,'utf8')}
function write(p,s){mkdir(path.dirname(p));fs.writeFileSync(p,s,'utf8')}
function copy(src,dst){mkdir(path.dirname(dst));fs.copyFileSync(src,dst)}
function writeReport(){try{write(REPORT,JSON.stringify(state,null,2))}catch{}}
function stage(name,status,detail){state.stages.push({name,status,detail,at:new Date().toISOString()});writeReport();console.log(`[${status}] ${name}${detail?' - '+detail:''}`)}
function fail(msg){state.status='STOPPED_SAFELY';state.error=msg;writeReport();throw new Error(msg)}
function run(bin,args,cwd){console.log('> '+bin+' '+args.join(' '));const r=cp.spawnSync(bin,args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe'],shell:process.platform==='win32'});if(r.stdout)process.stdout.write(r.stdout);if(r.stderr)process.stderr.write(r.stderr);return r}
function command(name){const r=run(process.platform==='win32'?'where':'which',[name],ROOT);return r.status===0?name:null}
function firstExisting(arr){for(const p of arr)if(exists(p))return p;return null}
function findBase(dir,base){return firstExisting([path.join(dir,base+'.js'),path.join(dir,base+'.gs')])}

try{
  if(!exists(ROOT))fail('Root not found: '+ROOT);
  for(const rel of ['public','firebase.json','.firebaserc'])if(!exists(path.join(ROOT,rel)))fail('Required production path missing: '+path.join(ROOT,rel));
  const connectorLocal=firstExisting([path.join(ROOT,'workspace','connector'),path.join(ROOT,'connector'),path.join(ROOT,'workspace-connector')]);
  if(!connectorLocal)fail('Canonical Connector source directory not found under C:\\SEDU_r7.');
  for(const rel of ['XRoleRegistry.gs','PortalAuth.gs','PortalBridge.html'])if(!exists(path.join(connectorLocal,rel)))fail('Phase 1-3 local patch missing: '+path.join(connectorLocal,rel)+'. Do not rerun the old package; attach the R2 report.');
  for(const rel of ['x-role-shell.js','x-role-shell.css','index.html'])if(!exists(path.join(ROOT,'public',rel)))fail('Phase 2 Hosting patch missing: '+path.join(ROOT,'public',rel));
  stage('R2 preflight','PASS','Previous run reached Connector binding only; production Hosting remains unchanged');

  const keep=path.join(ROOT,'Keep to backup');mkdir(keep);
  const backup=path.join(keep,'X_PHASES_1_3_R2_BEFORE_'+stamp());mkdir(backup);
  for(const rel of ['XRoleRegistry.gs','PortalAuth.gs','PortalBridge.html','appsscript.json']){const s=path.join(connectorLocal,rel);if(exists(s))copy(s,path.join(backup,'connector-local',rel));}
  for(const rel of ['index.html','x-role-shell.js','x-role-shell.css'])copy(path.join(ROOT,'public',rel),path.join(backup,'public',rel));
  stage('R2 backup','PASS',backup);

  const clasp=command('clasp');
  const firebase=command('firebase');
  if(!clasp)fail('clasp CLI not found. No deployment attempted.');
  if(!firebase)fail('firebase CLI not found. No deployment attempted.');

  const work=path.join(ROOT,'.r8-connector-recovery',stamp());mkdir(work);
  write(path.join(work,'.clasp.json'),JSON.stringify({scriptId:CONNECTOR_SCRIPT_ID,rootDir:'.'},null,2));
  stage('Connector project binding','PASS',CONNECTOR_SCRIPT_ID);

  let r=run(clasp,['pull'],work);
  if(r.status!==0)fail('Connector pull by explicit Script ID failed. Firebase Hosting was NOT deployed.');
  const remoteManifest=path.join(work,'appsscript.json');
  const remoteWeb=findBase(work,'WebApp');
  if(!exists(remoteManifest))fail('Remote Connector manifest was not returned by clasp pull.');
  if(!remoteWeb)fail('Remote Connector WebApp.js/.gs was not returned by clasp pull.');
  stage('Remote Connector source','PASS',path.basename(remoteWeb)+' + appsscript.json');

  for(const rel of ['XRoleRegistry.gs','PortalAuth.gs','PortalBridge.html'])copy(path.join(connectorLocal,rel),path.join(work,rel));

  let web=read(remoteWeb);
  if(!web.includes("mode === 'portalBridge'")&&!web.includes('mode==="portalBridge"')&&!web.includes("mode=='portalBridge'")){
    const re=/function\s+doGet\s*\(\s*e\s*\)\s*\{/;
    if(!re.test(web))fail('Could not safely locate Connector doGet(e) in CURRENT remote source.');
    web=web.replace(re,m=>m+"\n  if (e && e.parameter && e.parameter.mode === 'portalBridge') return portalBridgePage_(e);");
    write(remoteWeb,web);
  }

  const manifest=JSON.parse(read(remoteManifest));
  manifest.webapp=manifest.webapp||{};
  manifest.webapp.access='DOMAIN';
  manifest.webapp.executeAs='USER_ACCESSING';
  manifest.oauthScopes=Array.from(new Set([...(manifest.oauthScopes||[]),'https://www.googleapis.com/auth/script.external_request','openid','https://www.googleapis.com/auth/userinfo.email']));
  write(remoteManifest,JSON.stringify(manifest,null,2));
  stage('Connector merge','PASS','Pulled remote source preserved; X files merged; DOMAIN + USER_ACCESSING preserved');

  r=run(clasp,['push','--force'],work);
  if(r.status!==0)fail('Connector clasp push still failed after explicit Script ID recovery. Firebase Hosting was NOT deployed.');
  stage('Connector push','PASS',CONNECTOR_SCRIPT_ID);

  r=run(clasp,['create-deployment','--deploymentId',CONNECTOR_DEPLOYMENT_ID,'--description',`${RELEASE} X Phase 1-3 Connector recovery`],work);
  if(r.status!==0)r=run(clasp,['update-deployment',CONNECTOR_DEPLOYMENT_ID,'--description',`${RELEASE} X Phase 1-3 Connector recovery`],work);
  if(r.status!==0)fail('Connector deployment update failed. Existing deployment ID was not replaced; Hosting was NOT deployed.');
  const list=run(clasp,['list-deployments'],work);
  if(list.status!==0||!(list.stdout||'').includes(CONNECTOR_DEPLOYMENT_ID))fail('Connector deployment ID verification failed: '+CONNECTOR_DEPLOYMENT_ID);
  stage('Connector deployment in-place','PASS',CONNECTOR_DEPLOYMENT_ID);

  const frc=read(path.join(ROOT,'.firebaserc'));
  if(!frc.includes(FIREBASE_PROJECT))fail('Firebase project lock mismatch. Hosting was NOT deployed.');
  const firebaseJson=JSON.parse(read(path.join(ROOT,'firebase.json')));
  const hs=Array.isArray(firebaseJson.hosting)?firebaseJson.hosting:[firebaseJson.hosting];
  if(!hs.some(h=>h&&(h.site===FIREBASE_SITE||!h.site)))fail('Firebase Hosting site lock mismatch. Hosting was NOT deployed.');
  stage('Firebase target lock','PASS',FIREBASE_PROJECT+' / '+FIREBASE_SITE);

  r=run(firebase,['deploy','--only','hosting','--project',FIREBASE_PROJECT],ROOT);
  if(r.status!==0)fail('Firebase Hosting deploy failed after Connector recovery. Check report; Apps Script updates may already be live.');
  stage('Firebase Hosting','PASS',PORTAL_URL);

  state.status='DEPLOYED_AWAITING_PHASE4_LIVE_ACCEPTANCE';
  state.completedAt=new Date().toISOString();
  state.backup=backup;
  state.connectorScriptId=CONNECTOR_SCRIPT_ID;
  state.connectorDeploymentId=CONNECTOR_DEPLOYMENT_ID;
  state.gatewayDeploymentId=GATEWAY_DEPLOYMENT_ID;
  writeReport();
  console.log('\n[DEPLOYED] X Phase 1-3 R2 finalized.');
  console.log('[NEXT] Open '+PORTAL_URL+' and complete Phase 4 browser acceptance.');
}catch(err){console.error('\n[STOPPED SAFELY] '+err.message);process.exitCode=1}
