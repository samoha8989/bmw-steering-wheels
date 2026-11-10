/* Закрытая страница статистики. Пароль проверяет сервер (Apps Script), в репозитории паролей нет. */
(()=>{'use strict';
const app=document.getElementById('app');
const store={get(k){try{return localStorage.getItem(k)}catch{return null}},set(k,v){try{localStorage.setItem(k,v)}catch{}},del(k){try{localStorage.removeItem(k)}catch{}}};
const ENDPOINT=window.BMW_STATS_ENDPOINT||'';
/* пароль хранится только в сессии вкладки и пропадает при её закрытии */
const ss={get(k){try{return sessionStorage.getItem(k)}catch{return null}},set(k,v){try{sessionStorage.setItem(k,v)}catch{}},del(k){try{sessionStorage.removeItem(k)}catch{}}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>new Intl.NumberFormat('ru-RU').format(n||0);
const PERIODS=[[1,'Сегодня'],[7,'7 дней'],[30,'30 дней'],[90,'90 дней'],[0,'Всё время']];
let days=Number(store.get('bmw.stats.days')||7),catalog=null,data=null;
const SRC={direct:'Прямой заход / закладка',instagram:'Instagram',telegram:'Telegram','telegram (мини-приложение)':'Telegram мини-приложение',tiktok:'TikTok',youtube:'YouTube',avito:'Авито',google:'Google',yandex:'Яндекс',vk:'ВКонтакте',whatsapp:'WhatsApp',facebook:'Facebook'};
const routeLabel=r=>ROUTE[r]||(r==='ruli'?'Хаб «Рули по кузовам»':r.startsWith('ruli/')?'Страница кузова/серии: '+r.slice(5):r==='rul/…'?'Страницы рулей (/rul/)':r);
const ROUTE={'/':'Главная (подбор)','pick':'Выбор кузова','configure/functions':'Функции','car':'Автомобиль','catalog':'Каталог','results':'Результаты подбора','wheel/…':'Карточка руля','favorites':'Избранное','compare':'Сравнение'};
const GROUP={body:'Кузов',mode:'Наличие',brand:'Марка',buy:'Заказать',contact:'Связь',feature:'Функции',fav:'Избранное',compare:'Сравнение',nav:'Меню',link:'Ссылка',other:'Прочее'};

function login(msg=''){
 app.innerHTML=`<form class="login" id="f"><h1>Статистика сайта</h1><p class="muted">Введите пароль администратора.</p>
 <input type="password" id="k" autocomplete="current-password" placeholder="Пароль" required>
 <div class="err">${esc(msg)}</div><button class="btn primary" style="width:100%">Войти</button>
 ${ENDPOINT?'':'<p class="note">Сборщик статистики ещё не подключён (stats-config.js пуст).</p>'}</form>`;
 document.getElementById('f').onsubmit=e=>{e.preventDefault();ss.set('bmw.stats.key',document.getElementById('k').value.trim());store.set('bmw.analytics.me','1');load()};
}
async function getCatalog(){if(catalog)return catalog;try{const r=await fetch('catalog.json?v=110');const list=await r.json();catalog={};list.forEach(p=>{catalog[p.id]=p})}catch{catalog={}}return catalog}
async function load(){
 const key=ss.get('bmw.stats.key');if(!key)return login();
 if(!ENDPOINT)return login('Сборщик статистики не подключён.');
 app.innerHTML='<p class="muted">Загружаю статистику…</p>';
 try{
  const [res]=await Promise.all([fetch(ENDPOINT+(ENDPOINT.includes('?')?'&':'?')+'key='+encodeURIComponent(key)+'&days='+days+'&_='+Date.now()),getCatalog()]);
  const j=await res.json();
  if(!j.ok){if(j.error==='wrong_key'){ss.del('bmw.stats.key');return login('Неверный пароль.')}throw Error(j.error||'ошибка')}
  data=j;render();
 }catch(e){app.innerHTML=`<div class="login"><h1>Не удалось загрузить</h1><p class="err">${esc(e.message||e)}</p><button class="btn primary" id="retry">Повторить</button></div>`;document.getElementById('retry').onclick=load}
}
function barRow(label,val,max,extra=''){return `<tr><td>${label}</td><td style="width:38%"><div class="bar"><i style="width:${max?Math.max(2,val/max*100):0}%"></i></div></td><td class="n">${fmt(val)}</td>${extra}</tr>`}
function chart(list){
 if(!list.length)return '<p class="muted">Нет данных.</p>';
 const W=Math.max(300,Math.round(app.clientWidth-34)),H=220,P=28,max=Math.max(1,...list.map(d=>Math.max(d.views,d.visitors))),bw=(W-P)/list.length;
 const y=v=>H-20-(v/max)*(H-40);
 let bars='',line='',labels='';const step=Math.ceil(list.length/Math.max(3,Math.floor(W/70)));
 list.forEach((d,i)=>{const x=P+i*bw;bars+=`<rect x="${x+bw*.15}" y="${y(d.views)}" width="${Math.max(1,bw*.7)}" height="${H-20-y(d.views)}" rx="2" fill="#2f4a99"><title>${d.d}: просмотров ${d.views}</title></rect>`;
  line+=(i?'L':'M')+(x+bw/2)+' '+y(d.visitors);
  if(i%step===0)labels+=`<text x="${x+bw/2}" y="${H-4}" fill="#9ca2ad" font-size="11" text-anchor="middle">${d.d.slice(8)}.${d.d.slice(5,7)}</text>`});
 const dots=list.map((d,i)=>`<circle cx="${P+i*bw+bw/2}" cy="${y(d.visitors)}" r="3" fill="#c6f432"><title>${d.d}: посетителей ${d.visitors}</title></circle>`).join('');
 return `<div class="legend"><span><i style="background:#c6f432"></i>Уникальные посетители</span><span><i style="background:#2f4a99"></i>Просмотры страниц</span></div>
 <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Посещения по дням">
 <line x1="${P}" x2="${W}" y1="${H-20}" y2="${H-20}" stroke="#2a2f37"/><text x="2" y="${y(max)+4}" fill="#9ca2ad" font-size="11">${max}</text>${bars}<path d="${line}" fill="none" stroke="#c6f432" stroke-width="2"/>${dots}${labels}</svg>`;
}
function render(){
 const d=data,t=d.totals,btn=d.buttons||[];
 const sum=(g,pred=()=>true)=>btn.filter(b=>b.g===g&&pred(b)).reduce((a,b)=>a+b.clicks,0);
 const modeStock=sum('mode',b=>b.label==='В наличии'),modeOrder=sum('mode',b=>b.label==='Под заказ'),modeAll=sum('mode',b=>b.label==='Все');
 const bodies=['E','F','G','U'].map(s=>[s,sum('body',b=>b.label==='Кузов '+s)]);const otherBodies=btn.filter(b=>b.g==='body'&&!/^Кузов [EFGU]$/.test(b.label));
 const contacts=btn.filter(b=>b.g==='contact'||b.g==='buy');const maxC=Math.max(1,...contacts.map(b=>b.clicks));
 const srcMax=Math.max(1,...d.sources.map(s=>s.sessions));
 const prodRows=d.products.slice(0,300).map(p=>{const c=catalog[p.id]||{};const img=c.id?(c.thumb||`thumbs/${c.availability}-${c.id}.webp`):'';
  return `<tr><td>${img?`<img class="thumb" loading="lazy" src="${esc(img)}" alt="" onerror="this.style.visibility='hidden'">`:''}</td><td><b>№ ${esc(c.displayNumber||p.id)}</b><br><span class="muted" style="font-size:12px">${esc(c.series||'')} ${c.availability?`<span class="tag ${c.availability==='stock'?'stock':''}">${c.availability==='stock'?'в наличии':'под заказ'}</span>`:''}</span></td><td class="n">${fmt(p.views)}</td><td class="n hide-m">${fmt(p.visitors)}</td><td class="n">${fmt(p.buy)}</td><td class="n hide-m">${fmt(p.fav)}</td></tr>`}).join('');
 const hmax=Math.max(1,...d.hours);
 app.innerHTML=`<header><div><h1>Статистика сайта</h1><div class="muted" style="font-size:13px">${esc(d.from)} — ${esc(d.to)} · время московское · обновлено ${new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</div></div>
 <div class="tabs">${PERIODS.map(([v,l])=>`<button data-days="${v}" aria-pressed="${v===days}">${l}</button>`).join('')}<button id="refresh" title="Обновить">↻</button></div></header>
 <section class="grid kpis">
  <div class="kpi"><span>Уникальные посетители</span><b>${fmt(t.visitors)}</b></div>
  <div class="kpi"><span>Из них новые</span><b>${fmt(t.newVisitors)}</b></div>
  <div class="kpi"><span>Визиты</span><b>${fmt(t.sessions)}</b></div>
  <div class="kpi"><span>Просмотры страниц</span><b>${fmt(t.views)}</b></div>
  <div class="kpi"><span>Открытия рулей</span><b>${fmt(t.productViews)}</b></div>
  <div class="kpi"><span>Нажатия «Заказать» и связь</span><b>${fmt(contacts.reduce((a,b)=>a+b.clicks,0))}</b></div>
 </section>
 <section class="card" style="margin-bottom:12px"><h2>По дням</h2>${chart(d.days)}</section>
 <section class="grid two">
  <div class="card"><h2>Откуда пришли</h2><table><tr><th>Источник</th><th></th><th class="n">Визиты</th><th class="n">Люди</th></tr>${d.sources.map(s=>barRow(esc(SRC[s.name]||s.name),s.sessions,srcMax,`<td class="n">${fmt(s.visitors)}</td>`)).join('')||'<tr><td class="muted">Нет данных</td></tr>'}</table></div>
  <div class="card"><h2>«В наличии» / «Под заказ»</h2><div class="big2"><div><span class="muted">В наличии</span><b>${fmt(modeStock)}</b></div><div><span class="muted">Под заказ</span><b>${fmt(modeOrder)}</b></div></div><p class="note">Нажатия кнопок выбора. «Все»: ${fmt(modeAll)}.</p>
   <h2 style="margin-top:16px">Кнопки кузовов</h2><div class="chips">${bodies.map(([s,n])=>`<div><span class="muted">${s}</span><b>${fmt(n)}</b></div>`).join('')}</div>
   ${otherBodies.length?`<p class="note">Другие: ${otherBodies.map(b=>esc(b.label)+' — '+fmt(b.clicks)).join(', ')}</p>`:''}</div>
 </section>
 <section class="grid two">
  <div class="card"><h2>Заказать и связь</h2><table><tr><th>Кнопка</th><th></th><th class="n">Нажатий</th><th class="n">Людей</th></tr>${contacts.map(b=>barRow(esc(b.label),b.clicks,maxC,`<td class="n">${fmt(b.visitors)}</td>`)).join('')||'<tr><td class="muted">Пока нет нажатий</td></tr>'}</table></div>
  <div class="card"><h2>Устройства и время</h2><table>${d.devices.map(([k,v])=>barRow(esc(k),v,Math.max(...d.devices.map(x=>x[1]))) ).join('')}</table>
   <p class="note" style="margin:14px 0 6px">События по часам (Москва)</p><div class="hours">${d.hours.map((v,i)=>`<i style="height:${v/hmax*100}%" title="${i}:00 — ${v}"></i>`).join('')}</div><div class="hlab"><span>0</span><span>6</span><span>12</span><span>18</span><span>23</span></div></div>
 </section>
 <section class="card" style="margin-bottom:12px"><h2>Какие рули открывают</h2><div class="scroll"><table><tr><th></th><th>Руль</th><th class="n">Открытий</th><th class="n hide-m">Людей</th><th class="n">«Заказать»</th><th class="n hide-m">В избранное</th></tr>${prodRows||'<tr><td colspan="6" class="muted">Пока никто не открывал рули</td></tr>'}</table></div></section>
 <section class="grid two">
  <div class="card"><h2>Все кнопки</h2><div class="scroll"><table><tr><th>Группа</th><th>Кнопка</th><th class="n">Нажатий</th><th class="n">Людей</th></tr>${btn.map(b=>`<tr><td><span class="tag">${esc(GROUP[b.g]||b.g)}</span></td><td>${esc(b.label)}</td><td class="n">${fmt(b.clicks)}</td><td class="n">${fmt(b.visitors)}</td></tr>`).join('')||'<tr><td class="muted">Нет данных</td></tr>'}</table></div></div>
  <div class="card"><h2>Конструктор: что выбирают</h2><table>${(d.builder||[]).map(([k,n])=>barRow(esc(k),n,Math.max(...d.builder.map(x=>x[1])))).join('')||'<tr><td class="muted">Пока нет выборов</td></tr>'}</table></div>
  <div class="card"><h2>Страницы</h2><table>${d.routes.map(([r,n])=>barRow(esc(routeLabel(r)),n,Math.max(...d.routes.map(x=>x[1])))).join('')||'<tr><td class="muted">Нет данных</td></tr>'}</table>
   <h2 style="margin-top:16px">По дням — таблица</h2><div class="scroll" style="max-height:260px"><table><tr><th>Дата</th><th class="n">Люди</th><th class="n">Визиты</th><th class="n">Просмотры</th><th class="n">Рули</th></tr>${d.days.slice().reverse().map(x=>`<tr><td>${x.d}</td><td class="n">${x.visitors}</td><td class="n">${x.sessions}</td><td class="n">${x.views}</td><td class="n">${x.products}</td></tr>`).join('')}</table></div></div>
 </section>
 <section class="card"><h2>Последние события</h2><div class="scroll" style="max-height:340px"><table><tr><th>Время</th><th class="hide-m">Посетитель</th><th>Источник</th><th>Событие</th></tr>${d.recent.map(r=>`<tr><td style="white-space:nowrap">${esc(r[0].slice(5,16))}</td><td class="hide-m muted">${esc(r[1])}</td><td>${esc(SRC[r[2]]||r[2])}</td><td>${esc({page_view:'Страница',product_view:'Открыл руль',click:'Нажал',photo_open:'Открыл фото',photo_change:'Листал фото',photo_zoom:'Увеличил фото'}[r[4]]||r[4])}: ${esc(r[4]==='product_view'&&catalog[r[5]]?'№ '+catalog[r[5]].displayNumber:r[5])}</td></tr>`).join('')}</table></div></section>
 <p class="note">Посетитель — одно устройство/браузер (случайный номер, без имён и IP). Визит — заход, после 30 минут бездействия начинается новый. Ваши заходы с этого устройства не учитываются. Всего записей в таблице: ${fmt(d.rows)}.
 <button class="btn" id="logout" style="margin-left:8px">Выйти</button></p>`;
 app.querySelectorAll('[data-days]').forEach(b=>b.onclick=()=>{days=Number(b.dataset.days);store.set('bmw.stats.days',days);load()});
 document.getElementById('refresh').onclick=load;
 document.getElementById('logout').onclick=()=>{ss.del('bmw.stats.key');login()};
}
load();
})();
