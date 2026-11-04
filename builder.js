// Конструктор руля: покупатель по шагам выбирает детали, в конце отправляет заявку в Telegram.
// Варианты — только подтверждённые владельцем (03.11.2026) и из voice.md / kb.yaml.
// Цены — из catalog.json («от» минимальной цены выбранного кузова), ничего не придумываем.

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => new Intl.NumberFormat('ru-RU').format(n) + ' ₽';
const KEY = 'bmw.builder.v1';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const write = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} };

let st = read();
if (st.paddles === 'yes') st.paddles = 'std'; // старое значение
let stepIndex = 0;

// Живое превью (BMW): основа — настоящие фото E01 (круглый) и E04 (анатомия), вырезка локальной BiRefNet.
// Детали — с рулей каталога: хром E02/E05, крашеные вставки F30/F31/F51/F78/F28, накладка карбон F11 и кованый F55,
// метки E10/F17/F36/F14/F20/E11, строчка — перекрашенные настоящие стежки, лепестки — материал F70/F62/F65/F78 на форме родного.
// Координаты слоёв: x, y, w, h в кадре 900×900 (site_clone/builder_tools, layers.json).
const PV = 'builder/', PV_V = '3';
const LAYERS = {"round":{"chrome":[275,391,360,440],"emblem-bw":[425,425,66,67],"paint-blue":[280,389,356,438],"paint-red":[281,389,352,437],"paint-yellow":[279,386,353,440],"paint-purple":[280,383,353,440],"paint-tricolor":[281,387,351,441],"cover-carbon":[258,409,394,458],"cover-forged":[258,409,394,454],"stitch-red":[102,93,701,705],"stitch-blue":[102,93,701,705],"stitch-white":[102,93,701,705],"stitch-grey":[102,93,701,705],"stitch-yellow":[102,93,701,705],"stitch-tricolor":[102,93,701,705],"mark-red":[429,16,42,93],"mark-blue":[426,16,46,92],"mark-lightblue":[422,16,55,93],"mark-white":[428,16,43,93],"mark-yellow":[427,16,48,93],"mark-tricolor":[429,16,41,87],"paddle-std":[149,346,606,79],"paddle-silver":[149,346,606,79],"paddle-carbon":[149,346,606,79],"paddle-red":[149,346,606,79],"paddle-forged-blue":[149,346,606,79],"paddle-purple":[149,346,606,79],"paddle-black-long":[149,300,607,126],"paddle-carbon-long":[149,300,607,126],"paddle-forged-blue-long":[149,300,607,126],"paddle-forged-red-long":[149,300,607,126],"paddle-purple-long":[149,300,607,126]},"anatomy":{"chrome":[268,398,365,436],"emblem-bw":[418,443,69,69],"paint-blue":[270,404,365,425],"paint-red":[270,403,362,425],"paint-yellow":[269,402,362,426],"paint-purple":[269,399,362,426],"paint-tricolor":[270,403,361,427],"cover-carbon":[256,423,391,441],"cover-forged":[256,423,391,438],"stitch-red":[93,96,713,699],"stitch-blue":[93,96,713,699],"stitch-white":[93,96,713,699],"stitch-grey":[93,96,713,699],"stitch-yellow":[93,96,713,699],"stitch-tricolor":[93,96,713,699],"mark-red":[431,21,40,88],"mark-blue":[428,21,44,88],"mark-lightblue":[423,21,56,88],"mark-white":[430,21,42,88],"mark-yellow":[429,21,46,88],"mark-tricolor":[431,21,39,83],"paddle-std":[140,351,627,86],"paddle-silver":[140,351,627,86],"paddle-carbon":[140,351,627,86],"paddle-red":[140,351,627,86],"paddle-forged-blue":[140,351,627,86],"paddle-purple":[140,351,627,86],"paddle-black-long":[140,298,627,139],"paddle-carbon-long":[140,298,627,139],"paddle-forged-blue-long":[140,298,627,139],"paddle-forged-red-long":[140,298,627,139],"paddle-purple-long":[140,298,627,139]}};

const CARS = [
  ['BMW-E', 'BMW · E-кузов'],
  ['BMW-F', 'BMW · F-кузов'],
  ['BMW-G', 'BMW · G-кузов'],
  ['BMW-U', 'BMW · U-кузов'],
  ['Mercedes', 'Mercedes-Benz'],
];
const isBMW = () => String(st.car || '').startsWith('BMW');
const isE = () => st.car === 'BMW-E';

const SWATCH = { red: '#d3302f', blue: '#2f6fe0', white: '#f4f4f4', grey: '#8d9299', yellow: '#f2c230', black: '#111', chrome: 'linear-gradient(135deg,#f6f7f9,#9aa0a8 45%,#eef0f2 60%,#7d838b)', gloss: 'linear-gradient(135deg,#3a3d42,#050506 50%,#2a2c30)', tricolor: 'linear-gradient(90deg,#4aa3ff 0 33%,#1b3a8a 33% 66%,#e2231a 66%)', purple: '#5b3d9e', lightblue: '#3fb4f0', bluered: 'linear-gradient(90deg,#1e4fd0 0 50%,#d6262a 50%)', carbon: 'repeating-linear-gradient(45deg,#2a2c30 0 3px,#121315 3px 6px)', forged: 'radial-gradient(circle at 30% 30%,#9aa3b0 0 12%,transparent 13%),radial-gradient(circle at 70% 60%,#5f6b80 0 15%,transparent 16%),#16181c', forgedred: 'radial-gradient(circle at 30% 30%,#c0393b 0 12%,transparent 13%),radial-gradient(circle at 70% 60%,#7d2a2b 0 15%,transparent 16%),#16181c' };

const STEPS = [
  { key: 'car', title: 'Для какой машины?', sub: 'От кузова зависят эмблема, функции и цена.', options: () => CARS.map(([v, l]) => ({ v, l })) },
  { key: 'shape', title: 'Форма руля', sub: 'Круглый или анатомия — на выбор.', options: () => [
    { v: 'round', l: 'Круглый', thumb: 'round' },
    { v: 'anatomy', l: 'Анатомия', thumb: 'anatomy' },
  ] },
  { key: 'insert', title: 'Цвет вставки', sub: 'Кольцо вокруг подушки и полоски на нижней спице.', options: () => [
    { v: 'gloss', l: 'Чёрный глянец', sw: 'gloss' },
    { v: 'chrome', l: 'Хром', sw: 'chrome' },
    { v: 'blue', l: 'Синяя', sw: 'blue' },
    { v: 'red', l: 'Красная', sw: 'red' },
    { v: 'yellow', l: 'Жёлтая', sw: 'yellow' },
    { v: 'purple', l: 'Фиолетовая', sw: 'purple' },
    { v: 'tricolor', l: 'Синяя + красная', sw: 'bluered' },
  ].filter(o => isBMW() || ['gloss', 'chrome'].includes(o.v)) },
  { key: 'cover', title: 'Накладка спицы', sub: 'Деталь вокруг вставки и на нижней спице.', options: () => [
    { v: 'leather', l: 'Чёрная, как на фото', sw: 'black' },
    { v: 'carbon', l: 'Карбон', sw: 'carbon' },
    { v: 'forged', l: 'Кованый карбон', sw: 'forged' },
  ].filter(o => isBMW() || o.v !== 'forged') },
  { key: 'stitch', title: 'Цвет строчки', sub: 'Нитки по ободу руля. Меняем бесплатно.', options: () => [
    { v: 'red', l: 'Красная', sw: 'red' },
    { v: 'blue', l: 'Синяя', sw: 'blue' },
    { v: 'white', l: 'Белая', sw: 'white' },
    { v: 'grey', l: 'Серая', sw: 'grey' },
    { v: 'yellow', l: 'Жёлтая', sw: 'yellow' },
    { v: 'tricolor', l: 'М-строчка (триколор)', sw: 'tricolor' },
  ].filter(o => isBMW() || o.v !== 'tricolor') },
  { key: 'emblem', title: 'Эмблема', sub: 'Меняем бесплатно. Шильдик приходит в защитной плёнке.', options: () => isBMW() ? [
    { v: 'bmw-std', l: 'Обычная BMW' },
    { v: 'bmw-bw', l: 'Чёрно-белая BMW' },
  ] : [
    { v: 'mb-silver', l: 'Серебряная звезда', sw: 'chrome' },
    { v: 'mb-black', l: 'Чёрная звезда', sw: 'gloss' },
  ] },
  { key: 'mark', title: 'Метка на 12 часов', sub: 'Полоса сверху на ободе. Меняем бесплатно.', options: () => [
    { v: 'none', l: 'Без метки' },
    { v: 'red', l: 'Красная', sw: 'red' },
    { v: 'blue', l: 'Синяя', sw: 'blue' },
    { v: 'lightblue', l: 'Голубая', sw: 'lightblue' },
    { v: 'white', l: 'Белая', sw: 'white' },
    { v: 'yellow', l: 'Жёлтая', sw: 'yellow' },
    { v: 'tricolor', l: 'M-метка (триколор)', sw: 'tricolor' },
  ].filter(o => isBMW() || o.v !== 'tricolor') },
  { key: 'rim', title: 'Отделка обода', sub: 'Кожа — чёрная Напа. Алькантара и карбон настоящие.', options: () => [
    { v: 'leather', l: 'Чёрная кожа' },
    { v: 'alcantara', l: 'Кожа + алькантара' },
    { v: 'carbon', l: 'Кожа + карбон', note: 'На карбоне подогрев не греет' },
  ] },
  { key: 'paddles', title: 'Лепестки', sub: 'Лепестки работают. Если их не было с завода — нужно закодировать.', options: () => [
    { v: 'std', l: 'Стандартные', sw: 'black' },
    { v: 'silver', l: 'Серебристые', sw: 'chrome' },
    { v: 'carbon', l: 'Карбон, красный «+»', sw: 'carbon' },
    { v: 'red', l: 'Красные', sw: 'red' },
    { v: 'forged-blue', l: 'Кованый карбон', sw: 'forged' },
    { v: 'purple', l: 'Фиолетовые', sw: 'purple' },
    { v: 'black-long', l: 'Удлинённые чёрные', sw: 'black' },
    { v: 'carbon-long', l: 'Удлинённые карбон', sw: 'carbon' },
    { v: 'forged-blue-long', l: 'Удлинённые кованые, синие вкрапления', sw: 'forged' },
    { v: 'forged-red-long', l: 'Удлинённые кованые, красные вкрапления', sw: 'forgedred' },
    { v: 'purple-long', l: 'Удлинённые фиолетовые', sw: 'purple' },
    { v: 'no', l: 'Без лепестков', note: 'Цена не меняется' },
  ].filter(o => isBMW() || ['std', 'carbon', 'no'].includes(o.v)) },
  { key: 'functions', title: 'Функции', sub: 'Работают, если такая функция была в Вашей машине.', multi: true },
  { key: 'done', title: 'Ваш руль', sub: 'Проверьте выбор и отправьте — менеджер назовёт точную цену и срок.' },
];

const FUNCS = [
  { k: 'heat', l: 'Подогрев', note: () => isE() ? 'На E-кузова рули с подогревом не делаем' : 'Работает, если подогрев был в машине изначально', off: () => isE() },
  { k: 'vib', l: 'Вибромотор', note: () => 'Работает, если вибрация была в машине' },
  { k: 'cruise', l: 'Кнопка круиза', note: () => 'Работает, если круиз был в машине' },
];

const LABEL = (key, v) => {
  if (key === 'car') return CARS.find(c => c[0] === v)?.[1];
  const s = STEPS.find(x => x.key === key);
  return s?.options?.().find(o => o.v === v)?.l;
};

function funcs() { return st.functions || {}; }

// Цена «от»: минимальная цена в каталоге для выбранного кузова (как на карточках).
function priceFrom(catalog) {
  const f = funcs();
  if (st.car === 'Mercedes') {
    const list = catalog.filter(p => p.series === 'Mercedes' && p.optBase && p.opts);
    if (!list.length) return null;
    let best = null;
    for (const p of list) {
      const add = k => p.opts.find(o => o.k === k && !o.l)?.price;
      let sum = p.optBase, ok = true;
      if (f.heat) { const a = add('heat'); a == null ? ok = false : sum += a; }
      if (f.vib) { const a = add('vib'); a == null ? ok = false : sum += a; }
      if (st.rim === 'carbon') { const a = add('carbon'); a == null ? ok = false : sum += a; }
      if (ok && (best == null || sum < best)) best = sum;
    }
    return best == null ? null : { sum: best, extra: f.cruise ? 'круиз уточним' : '' };
  }
  if (!isBMW()) return null;
  const ser = st.car === 'BMW-U' ? 'G' : st.car.slice(4);
  const prices = catalog.filter(p => p.series === ser).flatMap(p => Object.values(p.prices || {}));
  const pick = prices.map(o => ser === 'E' ? o.single : f.heat ? o.heated : o.unheated).filter(n => typeof n === 'number');
  if (!pick.length) return null;
  const extra = [f.vib && 'вибромотор', f.cruise && 'круиз', st.rim && st.rim !== 'leather' && LABEL('rim', st.rim).toLowerCase(), (st.cover === 'carbon' || st.cover === 'forged') && 'накладка: ' + LABEL('cover', st.cover).toLowerCase()].filter(Boolean);
  return { sum: Math.min(...pick), extra: extra.length ? extra.join(', ') + ' — цену уточним' : '' };
}

const SUMLABEL = { car: 'Машина', shape: 'Форма', insert: 'Вставка', cover: 'Накладка', stitch: 'Строчка', emblem: 'Эмблема', mark: 'Метка', rim: 'Обод', paddles: 'Лепестки' };
function summaryRows() {
  const rows = [];
  for (const s of STEPS) {
    if (s.key === 'done') continue;
    if (s.key === 'functions') {
      const on = FUNCS.filter(x => funcs()[x.k] && !(x.off && x.off())).map(x => x.l);
      if (st.functions) rows.push(['Функции', on.length ? on.join(', ') : 'Не нужны']);
      continue;
    }
    if (st[s.key]) rows.push([SUMLABEL[s.key], LABEL(s.key, st[s.key])]);
  }
  if (st.car) rows.splice(1, 0, ['Кожа', 'Чёрная Напа']);
  return rows;
}

function message(catalog) {
  const L = k => LABEL(k, st[k]) || 'помогите выбрать';
  const l = k => L(k).replace(/^([А-ЯЁ])(?=[а-яё])/, c => c.toLowerCase()); // «Красная» → «красная», BMW/M не трогаем
  const f = funcs(), yes = (k, a = 'нужен', b = 'не нужен') => f[k] ? a : b;
  const lines = ['Хочу узнать цену руля из конструктора', 'Под заказ',
    'Машина: ' + L('car'), 'Форма: ' + l('shape'), 'Вставка: ' + l('insert'), 'Накладка спицы: ' + l('cover'),
    'Строчка: ' + l('stitch'), 'Эмблема: ' + l('emblem'), 'Метка на 12 часов: ' + l('mark'),
    'Обод: ' + l('rim'), 'Кожа: чёрная', 'Лепестки: ' + l('paddles')];
  if (!isE()) lines.push('Подогрев: ' + yes('heat'));
  lines.push('Вибромотор: ' + yes('vib'), 'Кнопка круиза: ' + yes('cruise', 'нужна', 'не нужна'));
  const pr = priceFrom(catalog);
  if (pr) lines.push('Цена в каталоге: от ' + money(pr.sum));
  lines.push('', 'Подписывайся на наш лайв-канал: @bmw_steeringwheels');
  return 'https://t.me/samoha8989?text=' + encodeURIComponent(lines.join('\n'));
}

function optionCard(s, o) {
  const on = st[s.key] === o.v;
  const media = o.thumb
    ? `<span class="bd-photo"><img src="${PV}${o.thumb}.webp?v=${PV_V}" alt="" loading="lazy"></span>`
    : o.sw ? `<span class="bd-swatch" style="background:${SWATCH[o.sw]}"></span>` : '';
  return `<button type="button" class="bd-opt ${o.thumb ? 'has-photo' : ''}" data-bd-key="${s.key}" data-bd-val="${esc(o.v)}" aria-pressed="${on}">${media}<span class="bd-opt-text"><b>${esc(o.l)}</b>${o.note ? `<small>${esc(o.note)}</small>` : ''}</span><span class="bd-check" aria-hidden="true"></span></button>`;
}

// ---- живое превью ----
const hasPreview = () => isBMW();
const shapeNow = () => st.shape || 'round';
function activeLayers() {
  const on = new Set();
  if (st.insert === 'chrome') on.add('chrome');
  else if (st.insert && st.insert !== 'gloss') on.add('paint-' + st.insert);
  if (st.cover === 'carbon' || st.cover === 'forged') on.add('cover-' + st.cover);
  const pd = st.paddles || 'std';
  if (pd !== 'no') on.add('paddle-' + (LAYERS.round['paddle-' + pd] ? pd : 'std'));
  if (st.mark && st.mark !== 'none') on.add('mark-' + st.mark);
  if (st.stitch) on.add('stitch-' + st.stitch);
  if (st.emblem === 'bmw-bw') on.add('emblem-bw');
  return on;
}
// Порядок слоёв: руль → лепестки → накладка → вставка → метка → строчка → эмблема
const ORDER = k => k.startsWith('paddle') ? 0 : k.startsWith('cover') ? 0.5 : (k === 'chrome' || k.startsWith('paint')) ? 1 : k.startsWith('mark') ? 2 : k.startsWith('stitch') ? 3 : 4;
function wheelHTML() {
  const sh = shapeNow(), on = activeLayers();
  const layers = Object.entries(LAYERS[sh]).sort((a, b) => ORDER(a[0]) - ORDER(b[0]));
  const pct = n => (n / 9).toFixed(3) + '%';
  return `<figure class="bd-wheel" id="bd-wheel" data-shape="${sh}">
    <div class="bd-wheel-img"><img class="bd-base" src="${PV}${sh}.webp?v=${PV_V}" alt="Руль: ${esc(LABEL('shape', sh) || '')}" decoding="async">
    ${layers.map(([k, [x, y, w, h]]) => `<img class="bd-layer ${on.has(k) ? 'on' : ''}" data-layer="${k}" src="${PV}${sh}-${k}.webp?v=${PV_V}" alt="" decoding="async" style="left:${pct(x)};top:${pct(y)};width:${pct(w)};height:${pct(h)}">`).join('')}</div>
  </figure>`;
}
function syncWheel() {
  const el = document.getElementById('bd-wheel');
  if (!el) return;
  const on = activeLayers();
  el.querySelectorAll('.bd-layer').forEach(img => img.classList.toggle('on', on.has(img.dataset.layer)));
}

function stepBody(catalog) {
  const s = STEPS[stepIndex];
  if (s.key === 'functions') {
    const f = funcs();
    return `<div class="bd-options bd-list">${FUNCS.map(x => { const off = x.off && x.off(); return `<button type="button" class="bd-opt bd-switch" data-bd-func="${x.k}" role="switch" aria-checked="${!!f[x.k] && !off}" ${off ? 'disabled' : ''}><span class="bd-opt-text"><b>${x.l}</b><small>${esc(x.note())}</small></span><span class="bd-toggle" aria-hidden="true"></span></button>`; }).join('')}</div>`;
  }
  if (s.key === 'done') {
    const pr = priceFrom(catalog);
    return `<div class="bd-final"><dl class="bd-sum">${summaryRows().map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl>
      ${pr ? `<div class="bd-price"><span>Цена в каталоге</span><b>от ${money(pr.sum)}</b>${pr.extra ? `<small>${esc(pr.extra)}</small>` : ''}</div>` : ''}
      <a class="btn blue bd-send" href="${esc(message(catalog))}" target="_blank" rel="noopener" data-telegram>Узнать цену</a>
      <p class="bd-hint">Откроется чат в Telegram: все детали уже будут в сообщении. Совместимость проверим по фото Вашего руля.</p></div>`;
  }
  const opts = s.options();
  return `<div class="bd-options ${opts.some(o => o.thumb) ? 'bd-photos' : ''}">${opts.map(o => optionCard(s, o)).join('')}</div>`;
}

function ready(i) {
  const s = STEPS[i];
  if (s.key === 'functions') return true;
  if (s.key === 'done') return STEPS.slice(0, -1).every((x, j) => j === i || ready(j));
  return !!st[s.key];
}

export function builderPage(catalog) {
  if (stepIndex >= STEPS.length) stepIndex = 0;
  const s = STEPS[stepIndex], total = STEPS.length - 1;
  const pr = st.car ? priceFrom(catalog) : null;
  const last = s.key === 'done';
  return `<div class="page-shell bd-page" id="bd-root">
    <div class="bd-head"><div class="eyebrow">Конструктор руля</div><h1>Соберите свой руль</h1></div>
    <div class="bd-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${Math.min(stepIndex, total)}"><span style="width:${Math.min(stepIndex, total) / total * 100}%"></span></div>
    <nav class="bd-dots" aria-label="Шаги">${STEPS.map((x, i) => `<button type="button" data-bd-go="${i}" class="${i === stepIndex ? 'active' : ''} ${i < stepIndex || (x.key !== 'done' && st[x.key]) ? 'done' : ''}" ${i > stepIndex && !STEPS.slice(0, i).every((_, j) => ready(j)) ? 'disabled' : ''} aria-label="Шаг ${i + 1}: ${esc(x.title)}">${i + 1}</button>`).join('')}</nav>
    <div class="bd-layout ${hasPreview() ? 'has-preview' : ''}">
      ${hasPreview() ? `<div class="bd-preview">${wheelHTML()}</div>` : ''}
      <section class="bd-step ${last ? 'bd-last' : ''}" aria-live="polite">
        <div class="bd-step-head"><span>${last ? 'Готово' : `Шаг ${stepIndex + 1} из ${total}`}</span><h2>${esc(s.title)}</h2><p>${esc(s.sub)}</p></div>
        ${stepBody(catalog)}
        <div class="bd-nav">${stepIndex ? '<button type="button" class="btn ghost bd-back" data-bd-prev>Назад</button>' : '<a class="btn ghost bd-back" href="#/">На главную</a>'}${last ? '<button type="button" class="btn ghost" data-bd-reset>Собрать заново</button>' : `<button type="button" class="btn blue" data-bd-next ${ready(stepIndex) ? '' : 'disabled'}>${stepIndex === total - 1 ? 'Посмотреть итог' : 'Далее'}</button>`}</div>
      </section>
      ${last ? '' : `<aside class="bd-side"><div class="eyebrow">Ваш выбор</div>${summaryRows().length ? `<dl class="bd-sum">${summaryRows().map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl>` : '<p class="bd-empty">Пока ничего не выбрано.</p>'}${pr ? `<div class="bd-price small"><span>Цена в каталоге</span><b>от ${money(pr.sum)}</b></div>` : ''}</aside>`}
    </div>
  </div>`;
}

function repaint(catalog, scroll) {
  const root = document.getElementById('bd-root');
  if (!root) return;
  const old = document.getElementById('bd-wheel');
  root.outerHTML = builderPage(catalog);
  // тот же руль — оставляем загруженные картинки, меняем только слои (без мигания)
  const neu = document.getElementById('bd-wheel');
  if (old && neu && old.dataset.shape === neu.dataset.shape) { neu.replaceWith(old); }
  syncWheel();
  if (scroll) {
    const target = window.matchMedia('(max-width:900px)').matches && document.getElementById('bd-wheel') ? document.querySelector('.bd-layout') : document.querySelector('.bd-step');
    target?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
}

export function builderClick(event, catalog) {
  const t = event.target.closest('[data-bd-key],[data-bd-func],[data-bd-next],[data-bd-prev],[data-bd-go],[data-bd-reset]');
  if (!t || !t.closest('#bd-root')) return false;
  if (t.dataset.bdKey) {
    const k = t.dataset.bdKey, v = t.dataset.bdVal;
    if (k === 'car' && st.car !== v) { delete st.emblem; if (v === 'Mercedes') for (const x of ['stitch', 'mark']) if (st[x] === 'tricolor') delete st[x]; } // эмблема и триколор зависят от марки
    st[k] = v; write(st);
    window.BMWAnalytics?.track?.('builder_pick', { mode: null, series: st.car || null, product: k + ':' + v });
    repaint(catalog);
  } else if (t.dataset.bdFunc) {
    st.functions = { ...funcs(), [t.dataset.bdFunc]: !funcs()[t.dataset.bdFunc] }; write(st); repaint(catalog);
  } else if ('bdNext' in t.dataset) {
    if (STEPS[stepIndex].key === 'functions' && !st.functions) { st.functions = {}; write(st); }
    if (ready(stepIndex)) { stepIndex++; repaint(catalog, true); }
  } else if ('bdPrev' in t.dataset) {
    stepIndex = Math.max(0, stepIndex - 1); repaint(catalog, true);
  } else if (t.dataset.bdGo) {
    stepIndex = Number(t.dataset.bdGo); repaint(catalog, true);
  } else if ('bdReset' in t.dataset) {
    st = {}; write(st); stepIndex = 0; repaint(catalog, true);
  }
  return true;
}

export function builderEnter() { stepIndex = 0; }
