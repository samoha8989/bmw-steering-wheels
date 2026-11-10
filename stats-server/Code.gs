/**
 * Статистика сайта BMW Steering Wheels.
 * Хранилище: эта Google Таблица (лист «events»). Сайт присылает события POST-запросом,
 * админка stats.html забирает сводку GET-запросом с паролем ADMIN_KEY.
 * Личные данные не хранятся: только случайный id посетителя, источник перехода, тип устройства и клики.
 *
 * ПАРОЛЬ в коде не хранится. Задайте его в Apps Script: «Настройки проекта» (шестерёнка) → «Свойства скрипта»
 * → «Добавить свойство»: имя ADMIN_KEY, значение — длинный пароль (12+ символов). Не вписывайте пароль в этот файл.
 */
function adminKey_() { return PropertiesService.getScriptProperties().getProperty('ADMIN_KEY') || ''; }
var SHEET = 'events';
var TZ = 'Europe/Moscow';
var HEAD = ['Время', 'Дата', 'Час', 'Посетитель', 'Визит', 'Источник', 'Устройство', 'Новый', 'Событие', 'Группа', 'Кнопка', 'Руль', 'Серия', 'Режим', 'Страница'];

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET);
    sh.appendRow(HEAD);
    sh.setFrozenRows(1);
  }
  return sh;
}

function str_(v, n) {
  if (v === null || v === undefined) return '';
  v = String(v).replace(/[\r\n\t]+/g, ' ').trim();
  if (/^[=+\-@]/.test(v)) v = "'" + v;           // не даём строке стать формулой
  return v.slice(0, n || 60);
}

var KINDS = { page_view: 1, product_view: 1, click: 1, photo_open: 1, photo_change: 1, photo_zoom: 1, builder_pick: 1 };
var MAX_PER_HOUR = 400;   // защита от мусора: не больше столько событий в час от одного посетителя

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var ev = Array.isArray(body.e) ? body.e.slice(0, 30) : [];
    var v = str_(body.v, 24), s = str_(body.s, 24);
    if (!v || !s || !ev.length) return json_({ ok: false });
    var cache = CacheService.getScriptCache(), ck = 'r_' + v, used = Number(cache.get(ck) || 0);
    if (used + ev.length > MAX_PER_HOUR) return json_({ ok: false, error: 'rate' });
    cache.put(ck, String(used + ev.length), 3600);
    var now = new Date();
    var time = Utilities.formatDate(now, TZ, 'yyyy-MM-dd HH:mm:ss');
    var day = time.slice(0, 10), hour = Number(time.slice(11, 13));
    var rows = [];
    ev.forEach(function (x, i) {
      if (!x || !KINDS[x.k]) return;
      rows.push([time, day, hour, v, s, str_(body.src, 40), str_(body.dev, 12), body.n && i === 0 ? 1 : 0,
        x.k, str_(x.g, 12), str_(x.l, 60), str_(x.p, 40), str_(x.se, 12), str_(x.m, 8), str_(x.r, 60)]);
    });
    if (!rows.length) return json_({ ok: false });
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var sh = sheet_();
      sh.getRange(sh.getLastRow() + 1, 1, rows.length, HEAD.length).setValues(rows);
    } finally { lock.releaseLock(); }
    return json_({ ok: true, saved: rows.length });
  } catch (err) {
    return json_({ ok: false, error: String(err).slice(0, 200) });
  }
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.ping) return json_({ ok: true, ping: 1 });
  var key = adminKey_();
  if (!key || p.key !== key) { Utilities.sleep(1500); return json_({ ok: false, error: 'wrong_key' }); }
  return json_(stats_(Number(p.days) || 0));
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function inc_(map, k, n) { if (k === '' || k === undefined || k === null) return; map[k] = (map[k] || 0) + (n || 1); }
function addSet_(map, k, v) { if (k === '' || k === undefined) return; (map[k] = map[k] || {})[v] = 1; }
function size_(o) { return o ? Object.keys(o).length : 0; }
function top_(map, n) { return Object.keys(map).map(function (k) { return [k, map[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, n || 50); }

function stats_(days) {
  var sh = sheet_();
  var last = sh.getLastRow();
  var data = last > 1 ? sh.getRange(2, 1, last - 1, HEAD.length).getValues() : [];
  var today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  var from = days > 0 ? Utilities.formatDate(new Date(Date.now() - (days - 1) * 864e5), TZ, 'yyyy-MM-dd') : '';
  var firstSeen = {};
  var dayV = {}, dayS = {}, dayViews = {}, dayProd = {};
  var visitors = {}, sessions = {}, sessSrc = {}, sessV = {}, devV = {};
  var views = 0, prodViews = 0, clicks = 0, photos = 0;
  var prod = {}, prodVis = {}, prodBuy = {}, prodFav = {};
  var groups = {}, groupVis = {}, routes = {}, builder = {}, hours = [], recent = [];
  for (var h = 0; h < 24; h++) hours.push(0);

  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    var d = r[1] instanceof Date ? Utilities.formatDate(r[1], TZ, 'yyyy-MM-dd') : String(r[1]);
    var v = String(r[3]), s = String(r[4]);
    if (!(v in firstSeen)) firstSeen[v] = d;
    if (from && d < from) continue;
    var kind = r[8], g = r[9], label = r[10], pr = String(r[11] || '');
    addSet_(dayV, d, v); addSet_(dayS, d, s);
    visitors[v] = 1; sessions[s] = 1; sessV[s] = v;
    if (!(s in sessSrc)) sessSrc[s] = String(r[5] || 'direct');
    devV[v] = String(r[6] || '');
    hours[Number(r[2]) || 0]++;
    if (kind === 'page_view') { views++; inc_(dayViews, d); inc_(routes, String(r[14] || '/').replace(/^wheel\/.*/, 'wheel/…').replace(/^rul\/.*/, 'rul/…')); }
    else if (kind === 'builder_pick') { inc_(builder, pr); }
    else if (kind === 'product_view') { prodViews++; inc_(dayProd, d); inc_(prod, pr); addSet_(prodVis, pr, v); }
    else if (kind === 'click') {
      clicks++;
      var gk = g + '|' + label;
      inc_(groups, gk); addSet_(groupVis, gk, v);
      if (g === 'buy') inc_(prodBuy, pr);
      if (g === 'fav' && label === 'В избранное') inc_(prodFav, pr);
    } else photos++;
    recent.push([String(r[0]), v.slice(0, 6), String(r[5]), String(r[6]), kind, label || pr || String(r[14] || '')]);
    if (recent.length > 60) recent.shift();
  }

  var dayList = [];
  var start = from || (Object.keys(dayV).sort()[0] || today);
  for (var t = new Date(start + 'T12:00:00Z'); ; t = new Date(t.getTime() + 864e5)) {
    var ds = Utilities.formatDate(t, 'UTC', 'yyyy-MM-dd');
    if (ds > today) break;
    dayList.push({ d: ds, visitors: size_(dayV[ds]), sessions: size_(dayS[ds]), views: dayViews[ds] || 0, products: dayProd[ds] || 0 });
    if (dayList.length > 800) break;
  }
  var srcS = {}, srcV = {};
  Object.keys(sessSrc).forEach(function (s) { inc_(srcS, sessSrc[s]); addSet_(srcV, sessSrc[s], sessV[s]); });
  var dev = {}; Object.keys(devV).forEach(function (v) { inc_(dev, devV[v] || '—'); });
  var newV = 0; Object.keys(visitors).forEach(function (v) { if (!from || firstSeen[v] >= from) newV++; });

  var allProd = {}; [prod, prodBuy, prodFav].forEach(function (m) { Object.keys(m).forEach(function (k) { allProd[k] = 1; }); });
  var products = Object.keys(allProd).map(function (k) { return { id: k, views: prod[k] || 0, visitors: size_(prodVis[k]), buy: prodBuy[k] || 0, fav: prodFav[k] || 0 }; })
    .sort(function (a, b) { return b.views - a.views || b.buy - a.buy; });
  var buttons = Object.keys(groups).map(function (k) { var x = k.split('|'); return { g: x[0], label: x.slice(1).join('|'), clicks: groups[k], visitors: size_(groupVis[k]) }; })
    .sort(function (a, b) { return b.clicks - a.clicks; });

  return {
    ok: true, from: from || start, to: today, rows: data.length,
    totals: { visitors: size_(visitors), newVisitors: newV, sessions: size_(sessions), views: views, productViews: prodViews, clicks: clicks, photos: photos },
    days: dayList,
    sources: Object.keys(srcS).map(function (k) { return { name: k, sessions: srcS[k], visitors: size_(srcV[k]) }; }).sort(function (a, b) { return b.sessions - a.sessions; }),
    devices: top_(dev, 10), hours: hours, routes: top_(routes, 80), builder: top_(builder, 60),
    products: products, buttons: buttons, recent: recent.reverse()
  };
}
