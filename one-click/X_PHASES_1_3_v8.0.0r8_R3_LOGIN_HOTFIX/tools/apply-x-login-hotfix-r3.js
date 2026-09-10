const fs=require('fs');
const path=require('path');
const cp=require('child_process');

const ROOT=path.resolve(process.argv[2]||'C:\\SEDU_r7');
const FIREBASE_PROJECT='seller-edu-os-260902-vjzn6';
const FIREBASE_SITE='selleredu-portal';
const CONNECTOR_DEPLOYMENT_ID='AKfycbxqtts9l7Pf62150DfqXpzL-3TlcyIHaHOw2pfVGiX1Wyh8oQjLWspNk_jdEncqhP7nMA';
const GENERIC='https://script.google.com/macros/s/'+CONNECTOR_DEPLOYMENT_ID+'/exec';
const DOMAIN='https://script.google.com/a/macros/shopee.com/s/'+CONNECTOR_DEPLOYMENT_ID+'/exec';
const REPORT=path.join(ROOT,'SELLEREDU_V800R8_X_LOGIN_HOTFIX_R3_REPORT.json');
const state={release:'v8.0.0r8-R3',status:'STARTED',startedAt:new Date().toISOString(),stages:[]};
function write(p,s){fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s,'utf8')}
function read(p){return fs.readFileSync(p,'utf8')}
function exists(p){return fs.existsSync(p)}
function report(){try{write(REPORT,JSON.stringify(state,null,2))}catch{}}
function stage(name,status,detail){state.stages.push({name,status,detail,at:new Date().toISOString()});report();console.log(`[${status}] ${name}${detail?' - '+detail:''}`)}
function fail(msg){state.status='STOPPED_SAFELY';state.error=msg;report();throw new Error(msg)}
function run(bin,args,cwd){console.log('> '+bin+' '+args.join(' '));const r=cp.spawnSync(bin,args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe'],shell:process.platform==='win32'});if(r.stdout)process.stdout.write(r.stdout);if(r.stderr)process.stderr.write(r.stderr);return r}
function cmd(name){const r=run(process.platform==='win32'?'where':'which',[name],ROOT);return r.status===0?name:null}
function stamp(){return new Date().toISOString().replace(/[:.]/g,'-')}
try{
 if(!exists(ROOT))fail('Root not found: '+ROOT);
 const pub=path.join(ROOT,'public');
 const jsPath=path.join(pub,'x-role-shell.js');
 const cssPath=path.join(pub,'x-role-shell.css');
 const indexPath=path.join(pub,'index.html');
 const firebasePath=path.join(ROOT,'firebase.json');
 for(const p of [jsPath,cssPath,indexPath,firebasePath,path.join(ROOT,'.firebaserc')])if(!exists(p))fail('Required file missing: '+p);
 const backup=path.join(ROOT,'Keep to backup','X_LOGIN_HOTFIX_R3_BEFORE_'+stamp());fs.mkdirSync(backup,{recursive:true});
 for(const p of [jsPath,cssPath,indexPath,firebasePath])fs.copyFileSync(p,path.join(backup,path.basename(p)));
 stage('Backup','PASS',backup);

 let js=read(jsPath);
 if(!js.includes(CONNECTOR_DEPLOYMENT_ID))fail('x-role-shell.js does not contain expected Connector deployment ID.');
 js=js.split(GENERIC).join(DOMAIN);
 js=js.replace(/bridge\.style\.cssText='[^']*';/g,"bridge.className='sedu-secure-bridge';");
 write(jsPath,js);
 let css=read(cssPath);
 if(!css.includes('.sedu-secure-bridge'))css+='\n.sedu-secure-bridge{position:fixed!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important;border:0!important;left:-20px!important;top:-20px!important}\n';
 write(cssPath,css);
 stage('Login route','PASS','Browser bridge now uses domain-scoped Apps Script URL; inline iframe style removed');

 let index=read(indexPath);
 index=index.replace(/frame-src\s+'self'([^;]*);/gi,(m,rest)=>{
   const extra=' https://script.google.com https://script.googleusercontent.com';
   return "frame-src 'self'"+(rest.includes('script.google.com')?rest:rest+extra)+';';
 });
 index=index.replace(/child-src\s+'self'([^;]*);/gi,(m,rest)=>{
   const extra=' https://script.google.com https://script.googleusercontent.com';
   return "child-src 'self'"+(rest.includes('script.google.com')?rest:rest+extra)+';';
 });
 write(indexPath,index);

 let fj=JSON.parse(read(firebasePath));
 const blocks=Array.isArray(fj.hosting)?fj.hosting:[fj.hosting];
 for(const h of blocks){if(!h)continue;h.headers=h.headers||[];for(const rule of h.headers){if(!Array.isArray(rule.headers))continue;for(const kv of rule.headers){if(String(kv.key||'').toLowerCase()==='content-security-policy'){
   let v=String(kv.value||'');
   v=v.replace(/frame-src\s+'self'([^;]*);/gi,(m,rest)=>"frame-src 'self'"+(rest.includes('script.google.com')?rest:rest+' https://script.google.com https://script.googleusercontent.com')+';');
   v=v.replace(/child-src\s+'self'([^;]*);/gi,(m,rest)=>"child-src 'self'"+(rest.includes('script.google.com')?rest:rest+' https://script.google.com https://script.googleusercontent.com')+';');
   kv.value=v;
 }}}
 }
 write(firebasePath,JSON.stringify(fj,null,2));
 stage('CSP','PASS','Allowed only Apps Script frame origins required by the login bridge');

 const frc=read(path.join(ROOT,'.firebaserc'));if(!frc.includes(FIREBASE_PROJECT))fail('Firebase project lock mismatch. Hosting was NOT deployed.');
 const hs=Array.isArray(fj.hosting)?fj.hosting:[fj.hosting];if(!hs.some(h=>h&&(h.site===FIREBASE_SITE||!h.site)))fail('Firebase Hosting site lock mismatch.');
 const firebase=cmd('firebase');if(!firebase)fail('firebase CLI not found. Local hotfix is backed up but Hosting was NOT deployed.');
 const r=run(firebase,['deploy','--only','hosting','--project',FIREBASE_PROJECT],ROOT);if(r.status!==0)fail('Firebase Hosting deploy failed.');
 stage('Firebase Hosting','PASS','https://selleredu-portal.web.app/');
 state.status='DEPLOYED_AWAITING_LOGIN_ACCEPTANCE';state.completedAt=new Date().toISOString();state.backup=backup;state.domainBridgeUrl=DOMAIN;report();
 console.log('\n[DEPLOYED] R3 login hotfix is live.');
 console.log('[TEST] Open https://selleredu-portal.web.app/ in a fresh tab and use Continue with Google Workspace.');
}catch(err){console.error('\n[STOPPED SAFELY] '+err.message);process.exitCode=1}
