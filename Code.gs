/* Called by the page: sends the app code (file App) together with the login screen data. */
function bootApp(i) {
  const names = ['App1', 'App2'];
  const html = HtmlService.createHtmlOutputFromFile(names[i]).getContent();
  const js = html.replace(/^\s*<script[^>]*>/i, '').replace(/<\/script>\s*$/i, '');
  return {js: js, n: js.length, pub: i === 0 ? api('', 'pub', {}) : null, last: i === names.length - 1};
}

/* Orphanage Manager - server code (bind this script to a Google Sheet) */
const H = {
  Users:   ['id','name','role','salt','hash','on'],
  Records: ['id','type','cat','amount','date','desc','photoId','sec','status','by','ts'],
  Plans:   ['id','title','date','note','sec','status'],
  Changes: ['id','recId','action','reason','diff','by','sec','ts','q','a','aseen','prev','n'],
  Logs: ['id','ts','user','role','action','target','detail','prev','hash'],
  Opening: ['sec','amount','by','ts'],
  Transfers: ['id','sec','eur','date','note','status','rate','mwk','rdate','rnote','by','rby','recId','ts','edits']
};
const TYPES = ['income','expense','inkind'];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(cfg().org)
    .addMetaTag('viewport', 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover')
    .addMetaTag('apple-mobile-web-app-capable', 'yes')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* Run this once from the editor. */
function setup() {
  const P0 = PropertiesService.getScriptProperties();
  let ss = SpreadsheetApp.getActive();
  if (!ss) {
    const sid = P0.getProperty('ssid');
    ss = sid ? SpreadsheetApp.openById(sid) : SpreadsheetApp.create('Orphanage Manager Data');
    P0.setProperty('ssid', ss.getId());
  }
  Object.keys(H).forEach(n => {
    const s = ss.getSheetByName(n) || ss.insertSheet(n);
    s.getRange(1, 1, s.getMaxRows(), H[n].length).setNumberFormat('@');
    s.getRange(1, 1, 1, H[n].length).setValues([H[n]]).setFontWeight('bold');
    s.setFrozenRows(1);
  });
  const P = PropertiesService.getScriptProperties();
  if (!P.getProperty('folder')) P.setProperty('folder', DriveApp.createFolder('Orphanage Photos').getId());
  if (rows('Users').length === 0) {
    [['Admin','Admin','admin123'],['Girls Manager','Girls','girls123'],['Boys Manager','Boys','boys123']].forEach((x, i) => {
      const salt = Utilities.getUuid();
      put('Users', {id: 'U' + (i + 1), name: x[0], role: x[1], salt: salt, hash: hash(x[2], salt), on: '1'});
    });
  }
  const d = ss.getSheetByName('Sheet1');
  if (d && ss.getSheets().length > 1) ss.deleteSheet(d);
}

/* ---------- sheet helpers ---------- */
let _ss = null;
function SS() {
  if (_ss) return _ss;
  const a = SpreadsheetApp.getActive();
  if (a) return (_ss = a);
  const sid = PropertiesService.getScriptProperties().getProperty('ssid');
  if (!sid) throw new Error('Run setup first');
  return (_ss = SpreadsheetApp.openById(sid));
}
function cell(x) {
  if (x instanceof Date) {
    return Utilities.formatDate(x, TZ(), (x.getHours() || x.getMinutes()) ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd');
  }
  return String(x);
}
const _chk = {};
const _shs = {};
function sh(n) { return _shs[n] || (_shs[n] = sh0(n)); }
function sh0(n) {
  const ss = SS();
  if (!_fmt) { _fmt = 1; if (PropertiesService.getScriptProperties().getProperty('fmtv') !== '2') migrateFmt(); }
  let s = ss.getSheetByName(n);
  if (!s) {
    s = ss.insertSheet(n);
    s.getRange(1, 1, s.getMaxRows(), H[n].length).setNumberFormat('@');
    s.getRange(1, 1, 1, H[n].length).setValues([H[n]]).setFontWeight('bold');
    s.setFrozenRows(1);
    if (n === 'Logs') protectLogs(s);
    applyFmt(n, s);
    _chk[n] = 1;
  } else if (!_chk[n]) {
    _chk[n] = 1;
    const k = H[n].length;
    if (s.getRange(1, k).getValue() !== H[n][k - 1]) {
      s.getRange(1, k, s.getMaxRows(), 1).setNumberFormat('@');
      s.getRange(1, 1, 1, k).setValues([H[n]]).setFontWeight('bold');
    }
  }
  return s;
}
const _rc = {};
function rows(n) {
  if (_rc[n]) return _rc[n];
  const v = sh(n).getDataRange().getValues(), h = v.shift();
  return (_rc[n] = v.filter(r => r[0] !== '').map((r, i) => { const o = {_row: i + 2}; h.forEach((k, j) => o[k] = cell(r[j])); return o; }));
}
let _ver = '', _dirty = 0;
const getVer = () => PropertiesService.getScriptProperties().getProperty('ver') || '0';
const FMT = {
  Records: {amount: '#,##0.00', date: 'yyyy-mm-dd'},
  Transfers: {eur: '#,##0.00', rate: '#,##0.0000', mwk: '#,##0.00', date: 'yyyy-mm-dd', rdate: 'yyyy-mm-dd'},
  Opening: {amount: '#,##0.00'}
};
const NUMC = {Records: ['amount'], Transfers: ['eur', 'rate', 'mwk', 'edits'], Opening: ['amount']};
let _tz = '', _fmt = 0;
const TZ = () => _tz || (_tz = SpreadsheetApp.getActive() ? SpreadsheetApp.getActive().getSpreadsheetTimeZone() : SS().getSpreadsheetTimeZone());
function applyFmt(n, s) {
  const f = FMT[n];
  if (!f) return;
  Object.keys(f).forEach(k => s.getRange(2, H[n].indexOf(k) + 1, Math.max(s.getMaxRows() - 1, 1), 1).setNumberFormat(f[k]));
}
function migrateFmt() {
  const ss = SS();
  Object.keys(FMT).forEach(n => { const s = ss.getSheetByName(n); if (s) applyFmt(n, s); });
  PropertiesService.getScriptProperties().setProperty('fmtv', '2');
}
function vals(n, o) {
  return H[n].map(k => {
    let v = o[k];
    if (v === undefined) return '';
    if (v !== '' && (NUMC[n] || []).indexOf(k) >= 0) v = Number(v);
    return v;
  });
}
function put(n, o) {
  const v = vals(n, o);
  sh(n).appendRow(v);
  _dirty = 1;
  if (_rc[n]) { const ob = {_row: _rc[n].length + 2}; H[n].forEach((k, j) => { ob[k] = cell(v[j]); }); _rc[n].push(ob); }
}
function upd(n, o) {
  sh(n).getRange(o._row, 1, 1, H[n].length).setValues([vals(n, o)]);
  _dirty = 1;
  if (_rc[n]) { const t = _rc[n].find(x => x._row === o._row); if (t && t !== o) H[n].forEach(k => { if (o[k] !== undefined) t[k] = String(o[k]); }); }
}
function del(n, o) { sh(n).deleteRow(o._row); _dirty = 1; delete _rc[n]; }
function nid(p) {
  const P = PropertiesService.getScriptProperties(), n = Number(P.getProperty('seq_' + p) || 0) + 1;
  P.setProperty('seq_' + p, n);
  return p + '-' + ('0000' + n).slice(-4);
}
const now = () => Utilities.formatDate(new Date(), TZ(), 'yyyy-MM-dd HH:mm');
const hash = (s, salt) => Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + s));
const clean = o => { const c = {}; Object.keys(o).forEach(k => { if (k[0] !== '_') c[k] = o[k]; }); return c; };

/* ---------- auth ---------- */
function who(tok) {
  const uid = CacheService.getScriptCache().get('s_' + tok);
  const u = uid && rows('Users').find(x => x.id === uid && x.on === '1');
  if (!u) throw new Error('Session expired');
  return u;
}
function adminOnly(u) { if (u.role !== 'Admin') throw new Error('Admin only'); }
function snap(u) {
  const adm = u.role === 'Admin', sc = r => adm || r.sec === u.role;
  return {
    me: {id: u.id, name: u.name, role: u.role},
    seen: Number(PropertiesService.getScriptProperties().getProperty('seen_' + u.id) || 0),
    cfg: cfg(),
    ver: _ver || getVer(),
    open: (o => adm ? o : {[u.role]: o[u.role]})(readOpen()),
    users: adm ? rows('Users').map(x => ({id: x.id, name: x.name, role: x.role, on: x.on === '1' ? 1 : 0})) : [],
    rec: rows('Records').filter(sc).map(clean),
    plan: rows('Plans').filter(sc).map(clean),
    chg: rows('Changes').filter(sc).map(clean).reverse(),
    trf: rows('Transfers').filter(r => sc(r) && (adm || r.status !== 'draft')).map(clean).reverse()
  };
}
function ok(u, msg) {
  if (_dirty) { _dirty = 0; _ver = String(Date.now()); PropertiesService.getScriptProperties().setProperty('ver', _ver); }
  return {ok: 1, msg: msg || '', data: snap(u)};
}

/* ---------- single entry point ---------- */
const RO = {pub: 1, sync: 1, photo: 1, logs: 1};
function api(tok, a, p) {
  const L = LockService.getScriptLock(), ro = RO[a];
  if (!ro) L.waitLock(25000);
  try {
    if (!A[a]) throw new Error('Unknown action');
    return A[a](tok, p || {});
  } catch (e) {
    return {ok: 0, err: e.message};
  } finally {
    if (!ro) L.releaseLock();
  }
}

function ownTrf(u, id) {
  const x = rows('Transfers').find(y => y.id === id);
  if (x && x.status === 'draft' && u.role !== 'Admin') throw new Error('Transfer not found');
  if (!x) throw new Error('Transfer not found');
  if (u.role !== 'Admin' && x.sec !== u.role) throw new Error('Not allowed');
  return x;
}
function protectLogs(s) {
  try {
    const p = s.protect().setDescription('Audit log - append only');
    const me = Session.getEffectiveUser().getEmail();
    p.removeEditors(p.getEditors().filter(e => e.getEmail() !== me));
    if (p.canDomainEdit()) p.setDomainEdit(false);
  } catch (e) {}
}
function logEv(u, action, target, detail) {
  const P = PropertiesService.getScriptProperties(), s = sh('Logs'), last = P.getProperty('logLast');
  let n, prev;
  if (last) { const x = last.split('|'); n = Number(x[0].slice(4)) + 1; prev = x[1]; }
  else { n = s.getLastRow(); prev = n > 1 ? String(s.getRange(n, 9).getValue()) : ''; }
  const id = 'LOG-' + ('00000' + n).slice(-5);
  const row = [id, now(), u.name, u.role, action, String(target || ''), String(detail || '').slice(0, 500), prev];
  const h = hash(row.join('|'), prev);
  if (n + 1 > s.getMaxRows()) { const m = s.getMaxRows(); s.insertRowsAfter(m, 500); s.getRange(m + 1, 1, 500, 9).setNumberFormat('@'); }
  s.getRange(n + 1, 1, 1, 9).setValues([row.concat([h])]);
  P.setProperty('logLast', id + '|' + h);
}
function verifyLogs() {
  const v = sh('Logs').getDataRange().getValues();
  let prev = '';
  for (let i = 1; i < v.length; i++) {
    const r = v[i].map(String);
    if (r[7] !== prev || hash(r.slice(0, 8).join('|'), prev) !== r[8]) return 'entry ' + r[0] + ' was altered';
    prev = r[8];
  }
  const last = v.length > 1 ? v[v.length - 1][0] + '|' + prev : '';
  const a = PropertiesService.getScriptProperties().getProperty('logLast') || '';
  return last === a ? '' : 'entries were removed or added outside the app';
}
function readOpen() {
  const m = {Girls: 0, Boys: 0};
  rows('Opening').forEach(r => { m[r.sec] = Number(r.amount) || 0; });
  return m;
}
function writeOpen(u, o, why) {
  const cur = rows('Opening'), list = [];
  ['Girls', 'Boys'].forEach(k => {
    const n = Math.round(Number(o && o[k] && o[k].amount || 0) * 100) / 100;
    if (!(n >= 0)) throw new Error('Opening balance cannot be negative.');
    const ex = cur.find(r => r.sec === k), old = ex ? Number(ex.amount) || 0 : 0;
    if (old !== n) list.push({k: k, n: n, old: old, ex: ex});
  });
  list.forEach(x => {
    const row = {sec: x.k, amount: x.n, by: u.name, ts: now()};
    if (x.ex) { row._row = x.ex._row; upd('Opening', row); } else put('Opening', row);
    addChg({id: 'OPEN-' + x.k, sec: 'Admin'}, 'opening', why, 'Opening balance ' + x.k + ': ' + x.old + ' → ' + x.n, u);
  });
}
let _cfgc = null;
function cfg() {
  if (_cfgc) return _cfgc;
  const raw = PropertiesService.getScriptProperties().getProperty('cfg');
  const d = {org: 'Orphanage Manager', logoId: '', setup: false,
    local: {code: 'MWK', sym: '', name: 'Malawian kwacha'}, donor: {code: 'EUR', sym: '€', name: 'Euro'},
    sec: {Girls: 'Girls', Boys: 'Boys'},
    cats: {income: ['Donation', 'Sponsorship', 'Other income'],
      expense: ['Food', 'School fees', 'Health', 'Utilities', 'Salary', 'Construction', 'Other expense'],
      inkind: ['Qurbani', 'Vow sacrifice', 'Meal', 'Clothes', 'Other gift']}};
  return (_cfgc = raw ? Object.assign(d, JSON.parse(raw)) : d);
}
const LC = () => cfg().local.code, DC = () => cfg().donor.code;
function logoData(id) {
  if (!id) return '';
  const C = CacheService.getScriptCache(), k = 'logo_' + id, hit = C.get(k);
  if (hit) return hit;
  try {
    const b = DriveApp.getFileById(id).getBlob();
    const d = 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes());
    if (d.length < 95000) C.put(k, d, 21600);
    return d;
  } catch (e) { return ''; }
}
function addChg(r, action, reason, diff, u) {
  logEv(u, action, r.id, (reason ? 'Reason: ' + reason + (diff ? ' | ' : '') : '') + (diff || ''));
  const id = nid('CHG');
  const same = rows('Changes').filter(x => x.recId === r.id);
  put('Changes', {id: id, recId: r.id, action: action, reason: reason, diff: diff, by: u.name, sec: r.sec, ts: now(), q: '', a: '', aseen: '', prev: same.length ? same[same.length - 1].id : '', n: same.length + 1});
  return id;
}
function savePhoto(d) {
  const m = /^data:(image\/\w+);base64,(.+)$/.exec(d);
  if (!m) throw new Error('Bad image');
  const b = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], 'photo_' + Date.now() + '.jpg');
  return DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('folder')).createFile(b).getId();
}
function ownRec(u, id) {
  const r = rows('Records').find(x => x.id === id);
  if (!r) throw new Error('Record not found');
  if (u.role !== 'Admin' && r.sec !== u.role) throw new Error('Not allowed');
  if (/\(TRF-\d+\)/.test(r.desc)) throw new Error('This income comes from a fund transfer. Change it in the Funds tab.');
  return r;
}

const A = {
  pub() {
    const c = cfg();
    return {ok: 1, data: rows('Users').filter(x => x.on === '1').map(x => ({id: x.id, name: x.name, role: x.role})),
      cfg: {org: c.org, sec: c.sec, local: c.local, donor: c.donor, setup: c.setup, cats: c.cats}, logo: logoData(c.logoId)};
  },
  setOpen(t, p) {
    const u = who(t); adminOnly(u);
    if (hash(String(p.pass || ''), u.salt) !== u.hash) { logEv(u, 'wrong password', '', 'Opening balance'); Utilities.sleep(800); throw new Error('Wrong admin password.'); }
    const had = readOpen(), why = String(p.reason || '').trim();
    if ((had.Girls || had.Boys) && !why) throw new Error('Please enter the reason for the change.');
    writeOpen(u, p.open, why);
    return ok(u, 'Opening balances saved.');
  },
  saveCfg(t, p) {
    const u = who(t); adminOnly(u);
    const c = cfg(), first = !c.setup;
    const txt = (s, n) => String(s || '').trim().slice(0, n);
    if (first) {
      if (hash(String(p.pass || ''), u.salt) !== u.hash) { logEv(u, 'wrong password', '', 'Setup'); Utilities.sleep(800); throw new Error('Wrong admin password.'); }
      const good = x => x && /^[A-Z]{3}$/.test(x.code);
      if (!good(p.local) || !good(p.donor) || p.local.code === p.donor.code) throw new Error('Choose two different currencies.');
      c.local = {code: p.local.code, sym: txt(p.local.sym, 5), name: txt(p.local.name, 60)};
      c.donor = {code: p.donor.code, sym: txt(p.donor.sym, 5), name: txt(p.donor.name, 60)};
      c.setup = true;
    }
    c.org = txt(p.org, 60) || c.org;
    const a = txt(p.sec && p.sec.Girls, 40), b = txt(p.sec && p.sec.Boys, 40);
    if (!a || !b || a.toLowerCase() === b.toLowerCase()) throw new Error('Give the two sections different names.');
    c.sec = {Girls: a, Boys: b};
    if (p.cats) {
      ['income', 'expense', 'inkind'].forEach(k => {
        const l = Array.from(new Set((p.cats[k] || []).map(x => txt(x, 40)).filter(Boolean))).slice(0, 30);
        if (!l.length) throw new Error('Each category list needs at least one item.');
        c.cats[k] = l;
      });
    }
    if (first) writeOpen(u, p.open, '');
    if (p.logo) c.logoId = savePhoto(p.logo);
    PropertiesService.getScriptProperties().setProperty('cfg', JSON.stringify(c));
    addChg({id: 'SETTINGS', sec: 'Admin'}, 'settings', '', first
      ? 'Setup completed · ' + c.local.code + ' (local) / ' + c.donor.code + ' (donor) · ' + c.org
      : 'Settings updated · ' + c.org + ' · sections: ' + a + ', ' + b, u);
    return Object.assign(ok(u, first ? 'Setup finished.' : 'Settings saved.'), {logo: logoData(c.logoId)});
  },

  login(t, p) {
    const u = rows('Users').find(x => x.id === p.uid && x.on === '1');
    if (!u || hash(String(p.pass || ''), u.salt) !== u.hash) { if (u) logEv(u, 'login failed', u.id, 'Wrong password'); Utilities.sleep(800); throw new Error('Wrong password.'); }
    const tok = Utilities.getUuid();
    logEv(u, 'login', u.id, '');
    CacheService.getScriptCache().put('s_' + tok, u.id, 21600);
    return {ok: 1, token: tok, data: snap(u)};
  },
  logout(t) {
    const uid = CacheService.getScriptCache().get('s_' + t), u = uid && rows('Users').find(x => x.id === uid);
    if (u) logEv(u, 'logout', u.id, '');
    CacheService.getScriptCache().remove('s_' + t);
    return {ok: 1};
  },
  sync(t, p) {
    if (!CacheService.getScriptCache().get('s_' + t)) throw new Error('Session expired');
    if (p.ver && String(p.ver) === getVer()) return {ok: 1, same: 1};
    return ok(who(t));
  },
  seenChg(t) {
    const u = who(t), adm = u.role === 'Admin';
    const list = rows('Changes').filter(c => adm || c.sec === u.role);
    let mx = 0;
    list.forEach(c => { mx = Math.max(mx, Number(c.id.slice(4))); });
    PropertiesService.getScriptProperties().setProperty('seen_' + u.id, String(mx));
    if (adm) list.filter(c => c.a && c.aseen !== '1').forEach(c => { c.aseen = '1'; upd('Changes', c); });
    return ok(u);
  },
  logs(t) {
    const u = who(t); adminOnly(u);
    const v = rows('Logs');
    return {ok: 1, total: v.length, bad: verifyLogs(), data: v.slice(-500).reverse().map(clean)};
  },

  photo(t, p) {
    const u = who(t), r = rows('Records').find(x => (',' + x.photoId + ',').indexOf(',' + p.id + ',') >= 0);
    if (!r || (u.role !== 'Admin' && r.sec !== u.role)) throw new Error('Not allowed');
    return {ok: 1, data: 'data:image/jpeg;base64,' + Utilities.base64Encode(DriveApp.getFileById(p.id).getBlob().getBytes())};
  },

  saveRec(t, p) {
    const u = who(t), v = p.v || {};
    if (TYPES.indexOf(v.type) < 0) throw new Error('Bad type');
    v.amount = Math.round(Number(v.amount || 0) * 100) / 100;
    if (v.type !== 'inkind' && !(v.amount > 0)) throw new Error('Enter an amount.');
    if ((p.photos || []).length > 12) throw new Error('Max 12 photos per save.');
    const nw = (p.photos || []).map(d => savePhoto(d));
    if (p.id) {
      const r = ownRec(u, p.id), why = String(p.reason || '').trim();
      if (r.status !== 'active') throw new Error('This record is cancelled.');
      if (!why) throw new Error('Reason required.');
      const old = Object.assign({}, r);
      r.type = v.type; r.cat = v.cat; r.amount = v.amount; r.date = v.date; r.desc = v.desc;
      const have = r.photoId ? r.photoId.split(',') : [];
      r.photoId = (p.keep || []).filter(x => have.indexOf(x) >= 0).concat(nw).join(',');
      const diff = ['type','cat','amount','date','desc','photoId'].filter(k => String(old[k]) !== String(r[k]))
        .map(k => k === 'photoId' ? 'photo: changed' : k + ': ' + old[k] + ' → ' + r[k]).join('; ');
      if (!diff) throw new Error('Nothing was changed.');
      upd('Records', r);
      return ok(u, 'Saved. Change ID: ' + addChg(r, 'edit', why, diff, u));
    }
    const sec = u.role === 'Admin' ? v.sec : u.role;
    if (sec !== 'Girls' && sec !== 'Boys') throw new Error('Choose a section.');
    const nr = {id: nid('REC'), type: v.type, cat: v.cat, amount: v.amount, date: v.date, desc: v.desc,
      photoId: nw.join(','), sec: sec, status: 'active', by: u.name, ts: now()};
    put('Records', nr);
    addChg(nr, 'create', '', v.type + ' · ' + v.cat + (v.type !== 'inkind' ? ' · ' + LC() + ' ' + v.amount : '') + ' · ' + v.date, u);
    return ok(u);
  },

  cancelRec(t, p) {
    const u = who(t), r = ownRec(u, p.id), why = String(p.reason || '').trim();
    if (r.status !== 'active') throw new Error('Already cancelled.');
    if (!why) throw new Error('Reason required.');
    r.status = 'cancelled'; upd('Records', r);
    return ok(u, 'Cancelled. Change ID: ' + addChg(r, 'cancel', why, '', u));
  },

  askChg(t, p) {
    const u = who(t); adminOnly(u);
    const c = rows('Changes').find(x => x.id === p.id);
    if (!c) throw new Error('Not found');
    if (c.a) throw new Error('Already answered.');
    c.q = String(p.q || '').trim(); upd('Changes', c);
    logEv(u, 'question', c.id, c.q);
    return ok(u);
  },
  ansChg(t, p) {
    const u = who(t), c = rows('Changes').find(x => x.id === p.id);
    if (!c || c.sec !== u.role || !c.q) throw new Error('Not allowed');
    c.a = String(p.a || '').trim(); upd('Changes', c);
    logEv(u, 'answer', c.id, c.a);
    return ok(u);
  },

  savePlan(t, p) {
    const u = who(t), sec = u.role === 'Admin' ? p.sec : u.role;
    if (sec !== 'Girls' && sec !== 'Boys') throw new Error('Choose a section.');
    const np = {id: nid('PLN'), title: p.title, date: p.date, note: p.note, sec: sec, status: 'open'};
    put('Plans', np);
    addChg(np, 'create', '', np.title + ' · ' + np.date, u);
    return ok(u);
  },
  togglePlan(t, p) {
    const u = who(t), r = rows('Plans').find(x => x.id === p.id);
    if (!r || (u.role !== 'Admin' && r.sec !== u.role)) throw new Error('Not allowed');
    if (r.status === 'cancelled') throw new Error('Plan is cancelled.');
    r.status = r.status === 'done' ? 'open' : 'done'; upd('Plans', r);
    addChg(r, r.status === 'done' ? 'done' : 'reopen', '', r.title, u);
    return ok(u);
  },
  delPlan(t, p) {
    const u = who(t), r = rows('Plans').find(x => x.id === p.id);
    if (!r || (u.role !== 'Admin' && r.sec !== u.role)) throw new Error('Not allowed');
    const why = String(p.reason || '').trim();
    if (!why) throw new Error('Reason required.');
    if (r.status === 'cancelled') throw new Error('Already cancelled.');
    r.status = 'cancelled'; upd('Plans', r);
    addChg(r, 'cancel', why, r.title, u);
    return ok(u);
  },

  newTrf(t, p) {
    const u = who(t); adminOnly(u);
    const eur = Number(p.eur);
    if (!(eur > 0) || (p.sec !== 'Girls' && p.sec !== 'Boys')) throw new Error('Choose a section and enter the amount.');
    const x = {id: nid('TRF'), sec: p.sec, eur: eur, date: p.date, note: String(p.note || ''), status: 'draft',
      rate: '', mwk: '', rdate: '', rnote: '', by: u.name, rby: '', recId: '', ts: now(), edits: 0};
    put('Transfers', x);
    addChg({id: x.id, sec: 'Admin'}, 'draft', '', 'Draft created · ' + DC() + ' ' + eur + ' for ' + p.sec + ' · ' + p.date, u);
    return ok(u, 'Draft saved: ' + x.id);
  },
  editDraft(t, p) {
    const u = who(t); adminOnly(u);
    const x = ownTrf(u, p.id), eur = Number(p.eur);
    if (x.status !== 'draft') throw new Error('Only drafts can be edited.');
    if (!(eur > 0) || (p.sec !== 'Girls' && p.sec !== 'Boys')) throw new Error('Choose a section and enter the amount.');
    const old = Object.assign({}, x);
    x.sec = p.sec; x.eur = eur; x.date = p.date; x.note = String(p.note || '');
    const diff = ['sec', 'eur', 'date', 'note'].filter(k => String(old[k]) !== String(x[k])).map(k => k + ': ' + old[k] + ' → ' + x[k]).join('; ');
    if (!diff) throw new Error('Nothing was changed.');
    upd('Transfers', x);
    addChg({id: x.id, sec: 'Admin'}, 'draft', '', 'Draft edited · ' + diff, u);
    return ok(u, 'Draft saved.');
  },
  sendTrf(t, p) {
    const u = who(t); adminOnly(u);
    const x = ownTrf(u, p.id);
    if (x.status !== 'draft') throw new Error('Already sent.');
    x.status = 'pending'; upd('Transfers', x);
    addChg(x, 'create', '', DC() + ' ' + x.eur + ' sent to ' + x.sec + ' · ' + x.date, u);
    return ok(u, 'Sent to the ' + x.sec + ' manager.');
  },
  delDraft(t, p) {
    const u = who(t); adminOnly(u);
    const x = ownTrf(u, p.id);
    if (x.status !== 'draft') throw new Error('Only drafts can be deleted.');
    del('Transfers', x);
    addChg({id: x.id, sec: 'Admin'}, 'draft', '', 'Draft deleted · ' + DC() + ' ' + x.eur + ' for ' + x.sec, u);
    return ok(u, 'Draft deleted.');
  },
  recvTrf(t, p) {
    const u = who(t), x = ownTrf(u, p.id), rate = Number(p.rate);
    if (u.role !== x.sec) throw new Error('Only the ' + x.sec + ' manager can confirm receipt.');
    if (x.status !== 'pending') throw new Error('Already confirmed or cancelled.');
    if (!(rate > 0)) throw new Error('Enter the exchange rate.');
    x.rate = rate; x.mwk = Math.round(Number(x.eur) * rate * 100) / 100;
    x.rdate = p.rdate || now().slice(0, 10); x.rnote = String(p.rnote || ''); x.rby = u.name; x.status = 'received';
    const nr = {id: nid('REC'), type: 'income', cat: 'Funds received', amount: x.mwk, date: x.rdate,
      desc: DC() + ' ' + x.eur + ' @ ' + rate + ' (' + x.id + ')', photoId: '', sec: x.sec, status: 'active', by: u.name, ts: now()};
    put('Records', nr); x.recId = nr.id; upd('Transfers', x);
    addChg(x, 'receive', '', DC() + ' ' + x.eur + ' × ' + rate + ' = ' + LC() + ' ' + x.mwk + ' → ' + nr.id, u);
    return ok(u, 'Confirmed. ' + LC() + ' ' + x.mwk + ' added to income.');
  },
  editRate(t, p) {
    const u = who(t), x = ownTrf(u, p.id), rate = Number(p.rate), why = String(p.reason || '').trim();
    if (u.role !== x.sec) throw new Error('Only the ' + x.sec + ' manager can change the rate.');
    if (x.status !== 'received') throw new Error('Not received yet.');
    if (Number(x.edits || 0) >= 1) throw new Error('The rate can only be changed once.');
    if (!(rate > 0)) throw new Error('Enter the exchange rate.');
    if (!why) throw new Error('Reason required.');
    if (String(rate) === String(x.rate)) throw new Error('Nothing was changed.');
    const r = rows('Records').find(y => y.id === x.recId);
    if (!r || r.status !== 'active') throw new Error('The linked income record is cancelled.');
    const oldRate = x.rate, oldMwk = x.mwk;
    x.rate = rate; x.mwk = Math.round(Number(x.eur) * rate * 100) / 100; x.edits = 1; upd('Transfers', x);
    r.amount = x.mwk; r.desc = DC() + ' ' + x.eur + ' @ ' + rate + ' (' + x.id + ')'; upd('Records', r);
    return ok(u, 'Rate changed. Change ID: ' + addChg(x, 'rate', why, 'rate: ' + oldRate + ' → ' + rate + '; ' + LC() + ': ' + oldMwk + ' → ' + x.mwk, u));
  },
  cancelTrf(t, p) {
    const u = who(t); adminOnly(u);
    if (hash(String(p.pass || ''), u.salt) !== u.hash) { logEv(u, 'wrong password', p.id, 'Cancel transfer'); Utilities.sleep(800); throw new Error('Wrong admin password.'); }
    const x = ownTrf(u, p.id), why = String(p.reason || '').trim();
    if (x.status === 'draft') throw new Error('Delete the draft instead.');
    if (x.status === 'cancelled') throw new Error('Already cancelled.');
    if (!why) throw new Error('Reason required.');
    if (x.status === 'received') {
      const r = rows('Records').find(y => y.id === x.recId);
      if (r) { r.status = 'cancelled'; upd('Records', r); }
    }
    x.status = 'cancelled'; upd('Transfers', x);
    return ok(u, 'Cancelled. Change ID: ' + addChg(x, 'cancel', why, DC() + ' ' + x.eur, u));
  },

  addUser(t, p) {
    const u = who(t); adminOnly(u);
    if (['Admin','Girls','Boys'].indexOf(p.role) < 0 || !p.name || String(p.pass).length < 6) throw new Error('Invalid data');
    const salt = Utilities.getUuid();
    const nu = 'U' + Date.now();
    put('Users', {id: nu, name: p.name, role: p.role, salt: salt, hash: hash(String(p.pass), salt), on: '1'});
    addChg({id: nu, sec: 'Admin'}, 'user', '', 'User added: ' + p.name + ' (' + p.role + ')', u);
    return ok(u);
  },
  setPw(t, p) {
    const u = who(t); adminOnly(u);
    const x = rows('Users').find(r => r.id === p.id);
    if (!x || String(p.pass).length < 6) throw new Error('Invalid data');
    x.salt = Utilities.getUuid(); x.hash = hash(String(p.pass), x.salt); upd('Users', x);
    addChg({id: x.id, sec: 'Admin'}, 'user', '', 'Password reset for ' + x.name, u);
    return ok(u);
  },
  toggleUser(t, p) {
    const u = who(t); adminOnly(u);
    const x = rows('Users').find(r => r.id === p.id);
    if (!x || x.id === u.id) throw new Error('Not allowed');
    x.on = x.on === '1' ? '0' : '1'; upd('Users', x);
    addChg({id: x.id, sec: 'Admin'}, 'user', '', 'User ' + (x.on === '1' ? 'enabled' : 'disabled') + ': ' + x.name, u);
    return ok(u);
  },
  delUser(t, p) {
    const u = who(t); adminOnly(u);
    const x = rows('Users').find(r => r.id === p.id);
    if (!x || x.id === u.id) throw new Error('Not allowed');
    del('Users', x);
    addChg({id: x.id, sec: 'Admin'}, 'user', '', 'User removed: ' + x.name, u);
    return ok(u);
  }
};

/* ---------- RESET (run from the editor, only before going live) ---------- */
const CONFIRM_RESET = '';   // type RESET EVERYTHING between the quotes, save, run resetEverything, then clear it again
const RESET_USERS = true;   // true: users are recreated with the default passwords
const RESET_PHOTOS = true;  // true: every photo and the logo in the photo folder goes to the Drive trash

function seedUsers() {
  [['Admin', 'Admin', 'admin123'], ['Girls Manager', 'Girls', 'girls123'], ['Boys Manager', 'Boys', 'boys123']].forEach((x, i) => {
    const salt = Utilities.getUuid();
    put('Users', {id: 'U' + (i + 1), name: x[0], role: x[1], salt: salt, hash: hash(x[2], salt), on: '1'});
  });
}

function resetEverything() {
  const P = PropertiesService.getScriptProperties();
  if (P.getProperty('live') === '1') throw new Error('This system is live. Reset is disabled.');
  if (CONFIRM_RESET !== 'RESET EVERYTHING') throw new Error('Type RESET EVERYTHING into CONFIRM_RESET at the top of the reset section first.');
  const names = ['Records', 'Plans', 'Transfers', 'Changes', 'Logs', 'Opening'];
  if (RESET_USERS) names.push('Users');
  names.forEach(n => {
    const s = sh(n), r = s.getMaxRows() - 1;
    if (r > 0) s.getRange(2, 1, r, H[n].length).clearContent();
  });
  const keep = {ssid: 1, folder: 1, fmtv: 1};
  Object.keys(P.getProperties()).forEach(k => { if (!keep[k]) P.deleteProperty(k); });
  if (RESET_PHOTOS && P.getProperty('folder')) {
    const f = DriveApp.getFolderById(P.getProperty('folder')).getFiles();
    while (f.hasNext()) f.next().setTrashed(true);
  }
  if (RESET_USERS) { _rc.Users = null; delete _rc.Users; seedUsers(); }
  Logger.log('Reset finished. Open the app: the setup wizard will start again.');
}

/* Run once when the real organisation starts. After this, resetEverything refuses to run. */
function goLive() {
  PropertiesService.getScriptProperties().setProperty('live', '1');
  logEv({name: 'System', role: 'Admin'}, 'go live', '', 'Reset has been disabled');
  Logger.log('The system is now marked live.');
}

/* Quick health check: run this from the editor and read the Execution log. */
function testPub() {
  const t = Date.now();
  const r = api('', 'pub', {});
  Logger.log('pub ok=' + r.ok + (r.err ? ' error=' + r.err : '') + ' users=' + (r.data ? r.data.length : 0) + ' time=' + (Date.now() - t) + 'ms');
}
