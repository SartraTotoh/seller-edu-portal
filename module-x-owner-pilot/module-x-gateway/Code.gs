const OWNER_EMAIL = 'totoh.taponchai@shopee.com';
const MASTER_SPREADSHEET_ID = '1mEjZ63Ltcv_91ObtmkgwAUNeDOSM0Mj4Asmw6fqJY6E';

function normalizeEmail_(v) { return String(v || '').trim().toLowerCase(); }
function activeEmail_() { return normalizeEmail_(Session.getActiveUser().getEmail()); }
function ownerOnly_() {
  var email = activeEmail_();
  if (email !== OWNER_EMAIL) throw new Error('OWNER_ONLY');
  return email;
}

function doGet() {
  var email = activeEmail_();
  if (email !== OWNER_EMAIL) {
    var denied = HtmlService.createTemplateFromFile('Denied');
    denied.email = email || 'unknown';
    return denied.evaluate().setTitle('Seller Edu OS - Access denied')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  var page = HtmlService.createTemplateFromFile('Index');
  page.email = email;
  return page.evaluate().setTitle('Seller Edu OS - Module X')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getModuleXData() {
  ownerOnly_();
  var ss = SpreadsheetApp.openById(MASTER_SPREADSHEET_ID);
  var records = [];
  var sources = [];
  ss.getSheets().forEach(function(sh) {
    var values = sh.getDataRange().getDisplayValues();
    if (!values || values.length < 2) return;
    var hr = detectHeaderRow_(values);
    if (hr < 0) return;
    var headers = values[hr].map(clean_);
    var map = columnMap_(headers);
    if (map.task < 0 && map.owner < 0 && map.status < 0 && map.stage < 0) return;
    var count = 0;
    for (var r = hr + 1; r < values.length && records.length < 8000; r++) {
      var row = values[r];
      if (!row || row.every(function(v){ return !clean_(v); })) continue;
      var x = {
        sourceSheet: sh.getName(), rowNumber: r + 1,
        owner: val_(row,map.owner), email: val_(row,map.email), team: val_(row,map.team),
        task: val_(row,map.task) || '(Untitled work item)', taskType: val_(row,map.taskType),
        stage: val_(row,map.stage), status: val_(row,map.status), source: val_(row,map.source) || sh.getName(),
        quantity: number_(val_(row,map.quantity)), effortHours: number_(val_(row,map.effortHours)),
        startRaw: val_(row,map.start), endRaw: val_(row,map.end), dueRaw: val_(row,map.due), dateRaw: val_(row,map.date),
        outcome: val_(row,map.outcome)
      };
      x.start = parseDate_(x.startRaw); x.end = parseDate_(x.endRaw); x.due = parseDate_(x.dueRaw);
      x.activityDate = parseDate_(x.dateRaw) || x.end || x.start || x.due || '';
      x.elapsedHours = elapsedHours_(x.start,x.end);
      x.waitHours = (x.elapsedHours !== null && x.effortHours !== null) ? Math.max(0,x.elapsedHours-x.effortHours) : null;
      records.push(x); count++;
    }
    sources.push({sheet:sh.getName(),rows:count,headerRow:hr+1});
  });
  return {ok:true, owner:OWNER_EMAIL, generatedAt:new Date().toISOString(), spreadsheetId:MASTER_SPREADSHEET_ID, records:records, sources:sources};
}

function detectHeaderRow_(values) {
  var best=-1,bestScore=0,max=Math.min(values.length,12);
  for(var r=0;r<max;r++){
    var score=0;
    values[r].forEach(function(v){
      var h=clean_(v).toLowerCase();
      if(/task|งาน|topic|title|subject|activity|work/.test(h)) score+=3;
      if(/owner|assignee|pic|ผู้รับผิดชอบ|email|name/.test(h)) score+=2;
      if(/status|stage|สถานะ|ขั้น/.test(h)) score+=2;
      if(/date|start|end|due|complete|วันที่|เวลา/.test(h)) score+=1;
    });
    if(score>bestScore){bestScore=score;best=r;}
  }
  return bestScore>=3?best:-1;
}

function columnMap_(headers){
  function find(patterns){
    for(var i=0;i<headers.length;i++){
      var h=String(headers[i]||'').toLowerCase();
      for(var p=0;p<patterns.length;p++) if(patterns[p].test(h)) return i;
    }
    return -1;
  }
  return {
    owner:find([/^owner$/, /assignee/, /\bpic\b/, /person/, /ผู้รับผิดชอบ/]), email:find([/email/,/e-mail/]),
    team:find([/team/,/function/,/department/,/ทีม/]), task:find([/^task$/,/task name/,/work item/,/title/,/topic/,/subject/,/activity/,/ชื่องาน/,/หัวข้อ/]),
    taskType:find([/task type/,/work type/,/category/,/ประเภท/]), stage:find([/stage/,/step/,/ขั้นตอน/,/ขั้น/]), status:find([/status/,/สถานะ/]),
    source:find([/source/,/origin/,/channel/,/แหล่ง/]), quantity:find([/quantity/,/qty/,/volume/,/output/,/จำนวน/]),
    effortHours:find([/effort.*hour/,/hours? spent/,/working.*hour/,/active.*hour/,/man.?hour/,/ชั่วโมง/]),
    start:find([/start.*date/,/^start$/, /created.*date/,/เริ่ม/]), end:find([/end.*date/,/complete.*date/,/completed/,/finish/,/เสร็จ/]),
    due:find([/due.*date/,/deadline/,/eta/,/กำหนด/]), date:find([/^date$/, /activity.*date/,/live.*date/,/วันที่/]), outcome:find([/outcome/,/result/,/ผลลัพธ์/])
  };
}
function val_(row,i){return i>=0&&i<row.length?clean_(row[i]):'';}
function clean_(v){return String(v===null||v===undefined?'':v).trim();}
function number_(v){if(!clean_(v))return null;var n=Number(String(v).replace(/,/g,'').replace(/[^\d.\-]/g,''));return isFinite(n)?n:null;}
function parseDate_(v){
  var s=clean_(v); if(!s)return '';
  var d=new Date(s); if(!isNaN(d.getTime()))return d.toISOString();
  var m=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if(m){d=new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),Number(m[4]||0),Number(m[5]||0));if(!isNaN(d.getTime()))return d.toISOString();}
  return '';
}
function elapsedHours_(a,b){if(!a||!b)return null;var aa=new Date(a).getTime(),bb=new Date(b).getTime();if(!isFinite(aa)||!isFinite(bb)||bb<aa)return null;return Math.round(((bb-aa)/3600000)*100)/100;}
