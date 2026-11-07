// Конструктор руля: покупатель по шагам выбирает детали, в конце отправляет заявку в Telegram.
// Варианты — только подтверждённые владельцем (03.11.2026) и из voice.md / kb.yaml.
// Цены — из catalog.json («от» минимальной цены выбранного кузова), ничего не придумываем.

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => new Intl.NumberFormat('ru-RU').format(n) + ' ₽';
const KEY = 'bmw.builder.v1';
// Выбор живёт только в текущем заходе (вкладке): при новом заходе на сайт руль собирается с нуля.
try { localStorage.removeItem(KEY); } catch {}
const read = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) || {}; } catch { return {}; } };
const write = v => { try { sessionStorage.setItem(KEY, JSON.stringify(v)); } catch {} };

let st = read();
if (st.paddles === 'yes') st.paddles = 'std'; // старые значения
st.rim = { leather: 'smooth', alcantara: 'alcgrip' }[st.rim] || st.rim;
let stepIndex = 0;

// Живое превью (BMW): основа — настоящие фото E01 (круглый) и E04 (анатомия), вырезка локальной BiRefNet.
// Детали — с рулей каталога: хром E02/E05, крашеные вставки F30/F31/F51/F78/F28, накладка карбон F11 и кованый F55,
// метки E10/F17/F36/F14/F20/E11, строчка — перекрашенные настоящие стежки, лепестки — материал F70/F62/F65/F78 на форме родного.
// Координаты слоёв: x, y, w, h в кадре 900×900 (site_clone/builder_tools, layers.json).
const PV = 'builder/', PV_V = '13';
const LAYERS = {"round":{"chrome":[275,391,360,440],"emblem-bw":[425,425,66,67],"paint-blue":[281,399,348,426],"paint-red":[281,399,348,426],"paint-yellow":[281,399,348,426],"paint-purple":[281,399,348,426],"paint-tricolor":[281,399,348,426],"cover-carbon":[257,407,396,469],"cover-forged":[257,407,395,457],"stitch-red":[102,93,701,705],"stitch-blue":[102,93,701,705],"stitch-white":[102,93,701,705],"stitch-grey":[102,93,701,705],"stitch-yellow":[102,93,701,705],"stitch-tricolor":[102,93,701,705],"mark-red":[429,16,42,93],"mark-blue":[429,16,42,93],"mark-lightblue":[429,16,42,93],"mark-white":[429,16,42,93],"mark-yellow":[429,16,42,93],"mark-tricolor":[429,16,41,87],"paddle-std":[149,346,606,79],"paddle-silver":[149,346,606,79],"paddle-carbon":[149,346,606,79],"paddle-red":[149,346,606,79],"paddle-forged-blue":[149,346,606,79],"paddle-purple":[149,346,606,79],"paddle-black-long":[149,300,607,126],"paddle-carbon-long":[149,300,607,126],"paddle-forged-blue-long":[149,300,607,126],"paddle-forged-red-long":[149,300,607,126],"paddle-purple-long":[149,300,607,126],"rim-alcgrip":[15,133,870,675],"rim-alcfull":[15,16,870,864],"rim-carbon-grip":[15,133,870,675],"rim-perf":[15,133,870,675],"rimtop-carbon":[154,16,619,864]},"anatomy":{"chrome":[268,398,365,436],"emblem-bw":[418,443,69,69],"paint-blue":[273,404,355,424],"paint-red":[273,404,355,424],"paint-yellow":[273,404,355,424],"paint-purple":[273,404,355,424],"paint-tricolor":[273,404,355,424],"cover-carbon":[256,422,391,451],"cover-forged":[256,422,391,439],"stitch-red":[93,96,713,699],"stitch-blue":[93,96,713,699],"stitch-white":[93,96,713,699],"stitch-grey":[93,96,713,699],"stitch-yellow":[93,96,713,699],"stitch-tricolor":[93,96,713,699],"mark-red":[431,21,40,88],"mark-blue":[431,21,40,88],"mark-lightblue":[431,21,40,88],"mark-white":[431,21,40,88],"mark-yellow":[431,21,40,88],"mark-tricolor":[431,21,39,83],"paddle-std":[140,351,627,86],"paddle-silver":[140,351,627,86],"paddle-carbon":[140,351,627,86],"paddle-red":[140,351,627,86],"paddle-forged-blue":[140,351,627,86],"paddle-purple":[140,351,627,86],"paddle-black-long":[140,298,627,139],"paddle-carbon-long":[140,298,627,139],"paddle-forged-blue-long":[140,298,627,139],"paddle-forged-red-long":[140,298,627,139],"paddle-purple-long":[140,298,627,139],"rim-alcgrip":[15,267,871,558],"rim-alcfull":[15,21,871,857],"rim-carbon-grip":[15,267,871,558],"rim-smooth":[15,267,871,558],"rimtop-carbon":[59,21,782,857]},"g-a":{"insert-carbon-g11":[407,628,95,186],"insert-carbon-g10":[403,620,96,194],"insert-silver-g07":[405,621,94,193],"trim-l":[82,371,223,204],"trim-r":[616,390,209,181],"mbutton-l":[208,356,73,42],"mbutton-r":[630,367,67,34],"rim-alcgrip":[15,252,872,550],"rim-alcfull":[13,28,875,844],"rim-carbon":[81,31,743,837],"mark-red":[453,29,24,67],"mark-tricolor":[446,29,37,67],"stitch-red":[100,104,701,690],"stitch-blue":[100,104,701,690],"stitch-white":[100,104,701,690],"stitch-grey":[100,104,701,690],"stitch-yellow":[100,104,701,690],"stitch-tricolor":[100,104,701,690],"paddle-std-l":[154,342,76,78],"paddle-std-r":[671,352,68,62],"paddle-carbonred-l":[159,330,66,85],"paddle-carbonred-r":[682,340,57,74],"paddle-silver-l":[164,345,72,75],"paddle-silver-r":[670,350,69,64],"trim-wide-carbon":[312,599,255,230],"trim-wide-chrome":[344,602,266,253],"trim-slim-chrome":[405,619,92,220],"rim-leather":[14,29,872,842],"buttons-grey-l":[96,349,209,222],"buttons-grey-r":[596,356,212,219],"buttons-black-l":[73,358,202,195],"buttons-black-r":[624,367,198,190],"mark-blue":[428,29,58,90],"mbutton-blue-l":[168,341,113,66],"mbutton-blue-r":[626,355,111,62],"insert-carbon-forged":[408,628,93,185]},"g-c":{"rim-carbon":[67,674,764,181],"rim-alcantara":[43,285,831,150],"mark-blue":[442,29,25,86],"mark-tricolor":[449,29,24,86],"mark-white":[458,29,19,87],"paddle-std-l":[178,358,108,78],"paddle-std-r":[657,365,82,55]}};

const CARS = [
  ['BMW-E', 'BMW · E-кузов'],
  ['BMW-F', 'BMW · F-кузов'],
  ['BMW-G', 'BMW · G-кузов'],
  ['BMW-U', 'BMW · U-кузов'],
  ['Mercedes', 'Mercedes-Benz'],
];
const isBMW = () => String(st.car || '').startsWith('BMW');
const isE = () => st.car === 'BMW-E';
const isG = () => st.car === 'BMW-G' || st.car === 'BMW-U';
const gShape = () => st.shape === 'g-c' ? 'g-c' : 'g-a';

const SWATCH = { red: '#d3302f', blue: '#2f6fe0', white: '#f4f4f4', grey: '#8d9299', yellow: '#f2c230', black: '#111', chrome: 'linear-gradient(135deg,#f6f7f9,#9aa0a8 45%,#eef0f2 60%,#7d838b)', gloss: 'linear-gradient(135deg,#3a3d42,#050506 50%,#2a2c30)', tricolor: 'linear-gradient(90deg,#4aa3ff 0 33%,#1b3a8a 33% 66%,#e2231a 66%)', purple: '#5b3d9e', lightblue: '#3fb4f0', bluered: 'linear-gradient(90deg,#1e4fd0 0 50%,#d6262a 50%)', carbon: 'repeating-linear-gradient(45deg,#2a2c30 0 3px,#121315 3px 6px)', forged: 'radial-gradient(circle at 30% 30%,#9aa3b0 0 12%,transparent 13%),radial-gradient(circle at 70% 60%,#5f6b80 0 15%,transparent 16%),#16181c', forgedred: 'radial-gradient(circle at 30% 30%,#c0393b 0 12%,transparent 13%),radial-gradient(circle at 70% 60%,#7d2a2b 0 15%,transparent 16%),#16181c', perf: 'radial-gradient(circle,#5a5d63 1px,transparent 1.5px) 0 0/5px 5px,#16181c', alc: 'repeating-linear-gradient(90deg,#3a3d42 0 1px,#34373c 1px 2px),#36393e' };

const STEPS = [
  { key: 'car', title: 'Для какой машины?', sub: 'От кузова зависят эмблема, функции и цена.', options: () => CARS.map(([v, l]) => ({ v, l })) },
  { key: 'shape', title: 'Форма руля', sub: 'Круглый или анатомия — на выбор.', options: () => isG() ? [
    { v: 'g-a', l: 'M-руль, U-прорезь', thumb: 'g-a' },
    { v: 'g-c', l: 'Со значком BMW', thumb: 'g-c' },
  ] : [
    { v: 'round', l: 'Круглый', thumb: 'round' },
    { v: 'anatomy', l: 'Анатомия', thumb: 'anatomy' },
  ] },
  { key: 'insert', title: 'Цвет вставки', sub: 'Кольцо вокруг подушки и полоски на нижней спице.', show: () => !isG() || gShape() === 'g-a', options: () => isG() ? [
    { v: 'carbon-g11', l: 'Карбон', thumb: 'g-a-insert-carbon-g11' },
    { v: 'carbon-g10', l: 'Карбон, другая плетёнка', thumb: 'g-a-insert-carbon-g10' },
    { v: 'carbon-forged', l: 'Карбон, кручёный (forged)', thumb: 'g-a-insert-carbon-forged' },
    { v: 'silver-g07', l: 'Серебро', thumb: 'g-a-insert-silver-g07' },
  ] : [
    { v: 'gloss', l: 'Чёрный глянец', sw: 'gloss' },
    { v: 'chrome', l: 'Хром', sw: 'chrome' },
    { v: 'blue', l: 'Синяя', sw: 'blue' },
    { v: 'red', l: 'Красная', sw: 'red' },
    { v: 'yellow', l: 'Жёлтая', sw: 'yellow' },
    { v: 'purple', l: 'Фиолетовая', sw: 'purple' },
    { v: 'tricolor', l: 'Синяя + красная', sw: 'bluered' },
  ].filter(o => isBMW() || ['gloss', 'chrome'].includes(o.v)) },
  { key: 'cover', title: 'Накладка спицы', sub: 'Деталь вокруг вставки и на нижней спице.', show: () => !isG(), options: () => [
    { v: 'leather', l: 'Чёрная, как на фото', sw: 'black' },
    { v: 'carbon', l: 'Карбон', sw: 'carbon' },
  ] },
  { key: 'trim', title: 'Накладка на спицах', sub: 'Форма и материал накладки вокруг кнопок — настоящие варианты из разных рулей.', show: () => isG() && gShape() === 'g-a', options: () => [
    { v: 'none', l: 'Без накладки' },
    { v: 'carbon', l: 'Узкая карбоновая полоска', sw: 'carbon' },
    { v: 'carbon-m', l: 'Узкая + красные M1/M2', sw: 'carbon', note: 'Кнопки запоминания настроек подвески/руля' },
    { v: 'carbon-m-blue', l: 'Узкая + синие M1/M2', sw: 'carbon', note: 'Кнопки запоминания настроек подвески/руля' },
    { v: 'wide-carbon', l: 'Широкая, кручёный карбон', sw: 'carbon' },
    { v: 'wide-chrome', l: 'Широкая, хром', sw: 'chrome' },
    { v: 'slim-chrome', l: 'Узкая хромированная', sw: 'chrome' },
  ] },
  { key: 'buttons', title: 'Цвет кнопок на спицах', sub: 'Рамка вокруг кнопок RESUME/CANCEL и громкости.', show: () => isG() && gShape() === 'g-a', options: () => [
    { v: 'black', l: 'Чёрная (как на фото)' },
    { v: 'grey', l: 'Серая/серебристая', sw: 'silver' },
  ] },
  { key: 'rim', title: 'Отделка обода', sub: 'Кожа — чёрная Напа. Алькантара и карбон настоящие.', options: () => isG() ? (gShape() === 'g-a' ? [
    { v: 'carbon', l: 'Карбон, как на фото', sw: 'carbon' },
    { v: 'leather', l: 'Гладкая кожа (без карбона)', sw: 'black' },
    { v: 'alcgrip', l: 'Алькантара на хвате', sw: 'alc' },
    { v: 'alcfull', l: 'Вся алькантара (чёрная)', sw: 'alc' },
  ] : [
    { v: 'leather', l: 'Кожа, как на фото', sw: 'black' },
    { v: 'alcantara', l: 'Алькантара на хвате (коричневая)', sw: 'alc' },
  ]) : [
    { v: 'smooth', l: 'Гладкая кожа', sw: 'black' },
    { v: 'perf', l: 'Перфорированная кожа на хвате', sw: 'perf' },
    { v: 'alcgrip', l: 'Алькантара на хвате', sw: 'alc' },
    { v: 'alcfull', l: 'Вся алькантара (чёрная)', sw: 'alc' },
    { v: 'carbon', l: 'Карбоновый обод, кожа на хвате', note: 'На карбоне подогрев не греет', sw: 'carbon' },
  ] },
  { key: 'stitch', title: 'Цвет строчки', sub: 'Нитки по ободу руля. Меняем бесплатно.', show: () => !isG() || gShape() === 'g-a', options: () => [
    { v: 'red', l: 'Красная', sw: 'red' },
    { v: 'blue', l: 'Синяя', sw: 'blue' },
    { v: 'white', l: 'Белая', sw: 'white' },
    { v: 'grey', l: 'Серая', sw: 'grey' },
    { v: 'yellow', l: 'Жёлтая', sw: 'yellow' },
    { v: 'tricolor', l: 'М-строчка (триколор)', sw: 'tricolor' },
  ].filter(o => isBMW() || o.v !== 'tricolor') },
  { key: 'emblem', title: 'Эмблема', sub: 'Меняем бесплатно. Шильдик приходит в защитной плёнке.', show: () => !isG(), options: () => isBMW() ? [
    { v: 'bmw-std', l: 'Обычная BMW' },
    { v: 'bmw-bw', l: 'Чёрно-белая BMW' },
  ] : [
    { v: 'mb-silver', l: 'Серебряная звезда', sw: 'chrome' },
    { v: 'mb-black', l: 'Чёрная звезда', sw: 'gloss' },
  ] },
  { key: 'mark', title: 'Метка на 12 часов', sub: 'Полоса сверху на ободе. Меняем бесплатно.', options: () => isG() ? (gShape() === 'g-a' ? [
    { v: 'none', l: 'Без метки' },
    { v: 'red', l: 'Красная', sw: 'red' },
    { v: 'blue', l: 'Синяя', sw: 'blue' },
    { v: 'tricolor', l: 'M-метка (триколор)', sw: 'tricolor' },
  ] : [
    { v: 'none', l: 'Без метки' },
    { v: 'blue', l: 'Синяя', sw: 'blue' },
    { v: 'white', l: 'Белая', sw: 'white' },
    { v: 'tricolor', l: 'M-метка (триколор)', sw: 'tricolor' },
  ]) : [
    { v: 'none', l: 'Без метки' },
    { v: 'red', l: 'Красная', sw: 'red' },
    { v: 'blue', l: 'Синяя', sw: 'blue' },
    { v: 'lightblue', l: 'Голубая', sw: 'lightblue' },
    { v: 'white', l: 'Белая', sw: 'white' },
    { v: 'yellow', l: 'Жёлтая', sw: 'yellow' },
    { v: 'tricolor', l: 'M-метка (триколор)', sw: 'tricolor', note: 'Только на карбоновом ободе' },
  ].filter(o => o.v !== 'tricolor' || (isBMW() && st.rim === 'carbon')) },
  { key: 'paddles', title: 'Лепестки', sub: 'Лепестки работают. Если их не было с завода — нужно закодировать.', options: () => isG() ? (gShape() === 'g-a' ? [
    { v: 'std', l: 'Стандартные', sw: 'black' },
    { v: 'carbonred', l: 'Карбон, красный «+»', sw: 'carbon' },
    { v: 'silver', l: 'Серебристые', sw: 'chrome' },
    { v: 'no', l: 'Без лепестков', note: 'Цена не меняется' },
  ] : [
    { v: 'std', l: 'Стандартные', sw: 'black' },
    { v: 'no', l: 'Без лепестков', note: 'Цена не меняется' },
  ]) : [
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
  { k: 'acc', l: 'Адаптивный круиз-контроль', note: () => 'Совместимость уточним по Вашему автомобилю' },
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
  const extra = [f.vib && 'вибромотор', f.cruise && 'круиз', f.acc && 'адаптивный круиз',
    st.rim && !['smooth', 'perf', 'leather'].includes(st.rim) && 'обод: ' + LABEL('rim', st.rim).toLowerCase(),
    !isG() && (st.cover === 'carbon' || st.cover === 'forged') && 'накладка: ' + LABEL('cover', st.cover).toLowerCase(),
    isG() && st.trim && st.trim !== 'none' && 'накладка кнопок: ' + LABEL('trim', st.trim).toLowerCase(),
  ].filter(Boolean);
  return { sum: Math.min(...pick), extra: extra.length ? extra.join(', ') + ' — цену уточним' : '' };
}

const SUMLABEL = { car: 'Машина', shape: 'Форма', insert: 'Вставка', cover: 'Накладка', trim: 'Накладка кнопок', buttons: 'Цвет кнопок', stitch: 'Строчка', emblem: 'Эмблема', mark: 'Метка', rim: 'Обод', paddles: 'Лепестки' };
function summaryRows() {
  const rows = [];
  for (const s of STEPS) {
    if (s.key === 'done') continue;
    if (s.show && !s.show()) continue;
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
  const lines = ['Хочу узнать цену руля из конструктора', 'Под заказ', 'Машина: ' + L('car'), 'Форма: ' + l('shape')];
  if (isG()) {
    if (gShape() === 'g-a') {
      lines.push('Вставка: ' + l('insert'), 'Накладка кнопок: ' + l('trim'), 'Строчка: ' + l('stitch'));
    }
    lines.push('Обод: ' + l('rim'), 'Метка на 12 часов: ' + l('mark'), 'Лепестки: ' + l('paddles'));
  } else {
    lines.push('Вставка: ' + l('insert'), 'Накладка спицы: ' + l('cover'), 'Строчка: ' + l('stitch'), 'Эмблема: ' + l('emblem'),
      'Метка на 12 часов: ' + l('mark'), 'Обод: ' + l('rim'), 'Кожа: чёрная', 'Лепестки: ' + l('paddles'));
  }
  if (!isE()) lines.push('Подогрев: ' + yes('heat'));
  lines.push('Вибромотор: ' + yes('vib'), 'Кнопка круиза: ' + yes('cruise', 'нужна', 'не нужна'), 'Адаптивный круиз-контроль: ' + yes('acc'));
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
const hasPreview = () => !st.car || isBMW();
const shapeNow = () => isG() ? gShape() : (st.shape || 'round');
function activeLayers() {
  const on = new Set();
  if (isG()) {
    if (gShape() === 'g-a') {
      if (st.insert) on.add('insert-' + st.insert);
      if (st.trim === 'carbon' || st.trim === 'carbon-m' || st.trim === 'carbon-m-blue') { on.add('trim-l'); on.add('trim-r'); }
      if (st.trim === 'carbon-m') { on.add('mbutton-l'); on.add('mbutton-r'); }
      if (st.trim === 'carbon-m-blue') { on.add('mbutton-blue-l'); on.add('mbutton-blue-r'); }
      if (st.trim === 'wide-carbon' || st.trim === 'wide-chrome' || st.trim === 'slim-chrome') on.add('trim-' + st.trim);
      if (st.rim === 'alcgrip') on.add('rim-alcgrip');
      else if (st.rim === 'alcfull') on.add('rim-alcfull');
      else if (st.rim === 'leather') on.add('rim-leather');
      if (st.buttons === 'grey') { on.add('buttons-grey-l'); on.add('buttons-grey-r'); }
      else if (st.buttons === 'black') { on.add('buttons-black-l'); on.add('buttons-black-r'); }
      if (st.stitch) on.add('stitch-' + st.stitch);
      const pd = st.paddles || 'std';
      if (pd !== 'no') { on.add('paddle-' + pd + '-l'); on.add('paddle-' + pd + '-r'); }
    } else {
      if (st.rim === 'alcantara') on.add('rim-alcantara');
      const pd = st.paddles || 'std';
      if (pd !== 'no') { on.add('paddle-std-l'); on.add('paddle-std-r'); }
    }
    if (st.mark && st.mark !== 'none') on.add('mark-' + st.mark);
    return on;
  }
  if (st.insert === 'chrome') on.add('chrome');
  else if (st.insert && st.insert !== 'gloss') on.add('paint-' + st.insert);
  if (st.cover === 'carbon' || st.cover === 'forged') on.add('cover-' + st.cover);
  const rim = st.rim, sh = shapeNow();
  if (rim === 'carbon') { on.add('rim-carbon-grip'); on.add('rimtop-carbon'); }
  else if (rim && LAYERS[sh]['rim-' + rim]) on.add('rim-' + rim);
  const pd = st.paddles || 'std';
  if (pd !== 'no') on.add('paddle-' + (LAYERS.round['paddle-' + pd] ? pd : 'std'));
  if (st.mark && st.mark !== 'none') on.add('mark-' + st.mark);
  if (st.stitch) on.add('stitch-' + st.stitch);
  if (st.emblem === 'bmw-bw') on.add('emblem-bw');
  return on;
}
// Порядок слоёв: руль → лепестки → накладка → вставка → обод → строчка → карбон обода → метка → эмблема
const ORDER = k => k.startsWith('paddle') ? 0 : k.startsWith('cover') ? 0.5 : (k === 'chrome' || k.startsWith('paint')) ? 1 : k.startsWith('rimtop') ? 3.5 : k.startsWith('rim') ? 1.5 : k.startsWith('stitch') ? 3 : k.startsWith('mark') ? 4 : 5;
function wheelHTML() {
  const sh = shapeNow(), on = activeLayers();
  const layers = Object.entries(LAYERS[sh]).sort((a, b) => ORDER(a[0]) - ORDER(b[0]));
  const pct = n => (n / 9).toFixed(3) + '%';
  return `<figure class="bd-wheel" id="bd-wheel" data-shape="${sh}">
    <div class="bd-wheel-img"><img class="bd-base" src="${PV}${sh}.webp?v=${PV_V}" alt="Руль: ${esc(LABEL('shape', sh) || '')}" decoding="async">
    ${layers.map(([k, [x, y, w, h]]) => `<img class="bd-layer ${on.has(k) ? 'on' : ''}" data-layer="${k}" src="${PV}${sh}-${k}.webp?v=${PV_V}" alt="" decoding="async" style="left:${pct(x)};top:${pct(y)};width:${pct(w)};height:${pct(h)}">`).join('')}</div>
  </figure>`;
}
export function syncWheel() {
  const el = document.getElementById('bd-wheel');
  if (!el) return;
  const on = activeLayers();
  el.querySelectorAll('.bd-layer').forEach(img => img.classList.toggle('on', on.has(img.dataset.layer)));
  markWheelReady(el);
}
function markWheelReady(wheelEl) {
  const img = wheelEl && wheelEl.querySelector('.bd-base');
  if (!img) return;
  const mark = () => img.parentNode.classList.add('ready');
  if (img.complete) mark(); else img.addEventListener('load', mark, { once: true });
}

function stepBody(catalog, s) {
  if (s.key === 'functions') {
    const f = funcs();
    return `<div class="bd-options bd-list">${FUNCS.map(x => { const off = x.off && x.off(); return `<button type="button" class="bd-opt bd-switch" data-bd-func="${x.k}" role="switch" aria-checked="${!!f[x.k] && !off}" ${off ? 'disabled' : ''}><span class="bd-opt-text"><b>${x.l}</b><small>${esc(x.note())}</small></span><span class="bd-toggle" aria-hidden="true"></span></button>`; }).join('')}</div>`;
  }
  const opts = s.options();
  return `<div class="bd-options ${opts.some(o => o.thumb) ? 'bd-photos' : ''}">${opts.map(o => optionCard(s, o)).join('')}</div>`;
}

const secs = () => STEPS.filter(x => x.key !== 'done' && (!x.show || x.show()));
function panelHTML(catalog) {
  return secs().map((s, i) => `<section class="bd-sec" id="bd-sec-${s.key}"><div class="bd-sec-h"><span>${String(i + 1).padStart(2, '0')}</span><h2>${esc(s.title)}</h2></div><p class="bd-sub">${esc(s.sub)}</p>${stepBody(catalog, s)}</section>`).join('');
}
function barHTML(catalog) {
  const pr = st.car ? priceFrom(catalog) : null;
  return `<div class="bd-bar-price"><span>Цена</span><b>${pr ? 'от ' + money(pr.sum) : 'выберите машину'}</b>${pr && pr.extra ? `<small>${esc(pr.extra)}</small>` : ''}</div>
    <a class="nt-btn red bd-send" href="${esc(message(catalog))}" target="_blank" rel="noopener" data-telegram>Узнать цену в Telegram <i>→</i></a>`;
}
export function builderPage(catalog) {
  if (!st.car) {
    const brand=location.hash.split('?')[0].split('/')[2];
    const card=(title,desc,img,url)=>`<a class="bd-model-card" href="${url}"><img src="${img}" alt="${esc(title)}"><div><h2>${esc(title)}</h2><p>${esc(desc)}</p><span>Выбрать →</span></div></a>`;
    let title='Выберите марку автомобиля',cards='';
    if(brand==='bmw'){
      title='Выберите кузов BMW';
      cards=card('BMW · E / F кузов','Дизайн M Performance','wheel-builder/assets/bmw/card.webp','wheel-builder.html?model=bmw-fseries&v=163')+card('BMW · G / U кузов','Дизайн BMW G','g-builder/round.webp','g-builder.html?v=163');
    }else if(brand==='mercedes'){
      title='Выберите руль Mercedes-Benz';
      cards=[['AMG Performance','Исполнение «Перформанс»','mercedes-amg'],['Mercedes-Benz · 2024+','C · E · S · GLC · GLE · GLS · G · CLS','mercedes-2015'],['Mercedes-Benz · 2019+','C · E · S · GLC · GLE','mercedes-2019']].map(([name,desc,id])=>card(name,desc,'wheel-builder/assets/'+id+'/card.webp','wheel-builder.html?model='+id+'&v=155')).join('');
    }else cards=card('BMW','E · F · G · U','wheel-builder/assets/bmw/card.webp','#/build/bmw')+card('Mercedes-Benz','Выбрать исполнение','wheel-builder/assets/mercedes-amg/card.webp','#/build/mercedes');
    return `<section class="bd-model-picker" id="bd-root">${brand?'<a class="back-link" href="#/build">← Выбрать марку</a>':''}<span class="nt-kick">Конструктор руля</span><h1>${title}</h1><div class="bd-model-grid">${cards}</div></section>`;
  }

  return `<div class="bd-page" id="bd-root">
    <div class="bd-wrap"><div class="bd-head"><div><span class="nt-kick">Конструктор руля</span><h1>Соберите свой руль</h1></div><button type="button" class="nt-btn line bd-reset-top" data-bd-reset>Сбросить</button></div>
    <div class="bd-layout has-preview">
      <div class="bd-preview">${hasPreview() ? wheelHTML() : '<div class="bd-nopv"><b>Превью пока для BMW</b><span>Для Mercedes выберите опции справа: цену и сообщение соберём так же.</span></div>'}</div>
      <div class="bd-panel" id="bd-panel">${panelHTML(catalog)}</div>
    </div></div>
    <div class="bd-bar" id="bd-bar"><div class="bd-bar-in">${barHTML(catalog)}</div></div>
  </div>`;
}

function repaint(catalog) {
  const root = document.getElementById('bd-root');
  if (!root) return;
  const y = window.scrollY;
  const pv = root.querySelector('.bd-preview'), old = document.getElementById('bd-wheel');
  if (hasPreview()) {
    if (!old) pv.innerHTML = wheelHTML();
    else if (old.dataset.shape !== shapeNow()) pv.innerHTML = wheelHTML();
  } else pv.innerHTML = '<div class="bd-nopv"><b>Превью пока для BMW</b><span>Для Mercedes выберите опции справа: цену и сообщение соберём так же.</span></div>';
  document.getElementById('bd-panel').innerHTML = panelHTML(catalog);
  root.querySelector('.bd-bar-in').innerHTML = barHTML(catalog);
  syncWheel();
  window.scrollTo(0, y);
}

export function builderClick(event, catalog) {
  const t = event.target.closest('[data-bd-key],[data-bd-func],[data-bd-reset]');
  if (!t || !t.closest('#bd-root')) return false;
  if (t.dataset.bdKey) {
    const k = t.dataset.bdKey, v = t.dataset.bdVal;
    if (k === 'car' && ['BMW-F','BMW-G','Mercedes'].includes(v)) { const url = v === 'BMW-G' ? 'g-builder.html?v=155' : 'wheel-builder.html?model=' + (v === 'BMW-F' ? 'bmw-fseries' : 'mercedes-amg'); const target = new URL(url, location.href); target.searchParams.set('v', '148'); location.href = target.href; return true; }
    if (k === 'rim' && v !== 'carbon' && st.mark === 'tricolor') delete st.mark; // триколор только на карбоне
    if (k === 'car' && st.car !== v) {
      // смена кузова — у G своя форма и свой набор деталей, у остальных своя: начинаем шаги заново
      for (const x of ['shape', 'insert', 'cover', 'trim', 'buttons', 'rim', 'stitch', 'emblem', 'mark', 'paddles']) delete st[x];
    }
    st[k] = v; write(st);
    window.BMWAnalytics?.track?.('builder_pick', { mode: null, series: st.car || null, product: k + ':' + v });
    if (!document.querySelector('#bd-root .bd-preview')) { document.getElementById('bd-root').outerHTML = builderPage(catalog); syncWheel(); } else repaint(catalog);
  } else if (t.dataset.bdFunc) {
    st.functions = { ...funcs(), [t.dataset.bdFunc]: !funcs()[t.dataset.bdFunc] }; write(st); repaint(catalog);
  } else if ('bdReset' in t.dataset) {
    st = {}; write(st); repaint(catalog);
  }
  return true;
}

export function builderEnter() { stepIndex = 0; st = {}; write(st); }
