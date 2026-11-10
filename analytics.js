/* Обезличенная статистика сайта. Работает ТОЛЬКО после согласия посетителя (consent.js).
   Не собираем: имена, телефоны, IP, точный браузер. Посетитель = случайный id в localStorage.
   События уходят на сборщик (BMW_STATS_ENDPOINT, Google Apps Script, только запись). Если сборщик недоступен, сайт работает как обычно:
   события копятся в памяти и отправляются позже, лишнее отбрасывается.
   Яндекс Метрика (BMW_METRIKA_ID) тоже подключается только после согласия. */
(()=>{'use strict';
const ENDPOINT=window.BMW_STATS_ENDPOINT||'';
const MID=String(window.BMW_METRIKA_ID||'').replace(/\D/g,'');
const store={get(k){try{return localStorage.getItem(k)}catch{return null}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};
const uid=()=>{try{return crypto.randomUUID().replace(/-/g,'').slice(0,16)}catch{return Math.random().toString(36).slice(2,10)+Date.now().toString(36)}};
const consent=()=>!!(window.BMWConsent&&window.BMWConsent.granted());
const off=()=>!consent()||store.get('bmw.analytics.optout')==='1'||store.get('bmw.analytics.me')==='1';
let visitor=null,isNew=false;
function vid(){if(visitor)return visitor;visitor=store.get('bmw.analytics.vid');if(!visitor){visitor=uid();isNew=true;store.set('bmw.analytics.vid',visitor)}return visitor}
function bucket(host){host=(host||'').replace(/^www\.|^m\.|^l\.|^lm\./,'');const map=[['instagram','instagram'],['t.me','telegram'],['telegram','telegram'],['tiktok','tiktok'],['youtube','youtube'],['youtu.be','youtube'],['avito','avito'],['google','google'],['yandex','yandex'],['ya.ru','yandex'],['vk.com','vk'],['vk.ru','vk'],['facebook','facebook'],['whatsapp','whatsapp'],['wa.me','whatsapp'],['drom','drom'],['drive2','drive2'],['bing','bing'],['mail.ru','mail.ru']];for(const [k,v] of map)if(host.includes(k))return v;return host||'direct'}
function detectSource(){try{const q=new URLSearchParams(location.search),utm=q.get('utm_source')||q.get('from');if(utm)return utm.toLowerCase().slice(0,40);if(window.Telegram?.WebApp?.initData)return 'telegram (мини-приложение)';if(!document.referrer)return 'direct';const h=new URL(document.referrer).hostname;return h===location.hostname?'direct':bucket(h)}catch{return 'direct'}}
let sess;function session(){let s;try{s=JSON.parse(store.get('bmw.analytics.s2')||'null')}catch{}s=s||sess;const now=Date.now();if(!s||!s.id||now-s.last>1800000){s={id:uid(),last:now,src:detectSource()}}s.last=now;sess=s;store.set('bmw.analytics.s2',JSON.stringify(s));return s}
const device=()=>matchMedia('(pointer:coarse)').matches||/Mobi|Android|iPhone/i.test(navigator.userAgent)?(Math.min(screen.width,screen.height)>=700?'планшет':'телефон'):'компьютер';
let queue=[],timer;
const cut=(v,n=60)=>v==null||v===''?undefined:String(v).replace(/\s+/g,' ').trim().slice(0,n);
const route=()=>document.documentElement.dataset.route||location.hash.slice(2)||'/';
function push(ev){if(off()||!ENDPOINT)return;queue.push(ev);if(queue.length>60)queue.shift();clearTimeout(timer);timer=setTimeout(flush,1500)}
const SKIP=new Set(['mode_select','series_select','buy_click']);
let lastView='',lastProduct='';
function track(kind,d={}){if(SKIP.has(kind))return;const r=route();if(kind==='page_view'){if(r===lastView)return;lastView=r;ymHit()}if(kind==='product_view'){if(r===lastProduct)return;lastProduct=r}push({k:kind,r,p:cut(d.product,40),se:cut(d.series,12),m:cut(d.mode,8)})}
function flush(beacon){if(!queue.length||off()||!ENDPOINT)return;const s=session(),v=vid();const batch=queue.splice(0,30);const body=JSON.stringify({v,s:s.id,src:s.src,dev:device(),n:isNew?1:0,e:batch});isNew=false;
 if(beacon===true&&navigator.sendBeacon){try{if(navigator.sendBeacon(ENDPOINT,new Blob([body],{type:'text/plain'})))return}catch{}}
 try{fetch(ENDPOINT,{method:'POST',mode:'no-cors',keepalive:true,headers:{'Content-Type':'text/plain;charset=utf-8'},body}).catch(()=>{queue=batch.concat(queue).slice(-60);clearTimeout(timer);timer=setTimeout(flush,30000)})}catch{}
 if(queue.length){clearTimeout(timer);timer=setTimeout(flush,1500)}}
const MODE={stock:'В наличии',order:'Под заказ',all:'Все'};
const FEAT={heating:'Подогрев',vibration:'Вибрация',cruise:'Круиз'},VAL={yes:'нужен',no:'не нужен',unknown:'не знаю'};
function describe(el){const d=el.dataset,text=cut(el.getAttribute('aria-label')||el.textContent,40);
 if(d.pickTab)return['body','Кузов '+d.pickTab];if(d.series)return['body','Кузов '+d.series];if(d.category)return['body','Кузов '+d.category];
 if(d.pickBrand)return['brand',d.pickBrand];if(d.brand)return['brand',d.brand];
 if(d.pickGo)return['mode',MODE[d.pickGo]||d.pickGo];if(d.homeMode)return['mode',MODE[d.homeMode]||d.homeMode];if(d.availability)return['mode',MODE[d.availability]||d.availability];
 if(d.buy)return['buy',d.buyLabel||'Заказать в Telegram'];if(d.feature)return['feature',(FEAT[d.feature]||d.feature)+': '+(VAL[d.value]||d.value)];
 if(d.fav)return['fav',el.classList.contains('active')?'Убрать из избранного':'В избранное'];if(d.compare)return['compare','Сравнить'];
 if(el.hasAttribute('data-share'))return['other','Поделиться'];if(d.nav)return['nav','Меню: '+text];if(el.hasAttribute('data-more'))return['other','Показать ещё'];
 if(el.hasAttribute('data-open-photo')||el.hasAttribute('data-thumb')||el.hasAttribute('data-photo-step'))return null;
 if(d.package)return['feature','Комплектация: '+text];if(d.opt)return['feature','Опция: '+text];
 const href=el.tagName==='A'?el.getAttribute('href')||'':'';
 if(/^(https?:|tg:|mailto:|tel:)/i.test(href)){let host='';try{host=new URL(el.href).hostname}catch{}const b=/^tel:/i.test(href)?'телефон':bucket(host);return['contact',b==='telegram'?'Telegram менеджеру'+(text?' · '+text:''):b+(text?' · '+text:'')]}
 if(href.startsWith('#/'))return['link',text||href];
 return['other',text||el.id||el.className||el.tagName]}
document.addEventListener('click',e=>{try{const el=e.target.closest('button,a,[role=button]');if(!el||off())return;const r=describe(el);if(!r)return;let key=el.dataset.buy||el.dataset.fav||el.dataset.compare||el.dataset.optKey;if(key&&key.includes(':'))key=key.slice(key.indexOf(':')+1);push({k:'click',g:r[0],l:cut(r[1]),p:cut(key,40),r:route()});if(r[0]==='buy')ymGoal('order_telegram')}catch{}},true);
/* Яндекс Метрика: только после согласия */
let ymOn=false;
function ymInit(){if(ymOn||!MID||!consent())return;ymOn=true;
 window.ym=window.ym||function(){(window.ym.a=window.ym.a||[]).push(arguments)};window.ym.l=+new Date();
 const s=document.createElement('script');s.async=true;s.src='https://mc.yandex.ru/metrika/tag.js';document.head.appendChild(s);
 window.ym(Number(MID),'init',{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:false})}
function ymHit(){if(ymOn&&window.ym&&location.hash)window.ym(Number(MID),'hit',location.pathname+location.search+location.hash)}
function ymGoal(n){try{if(ymOn&&window.ym)window.ym(Number(MID),'reachGoal',n)}catch{}}
/* автособытия для статических страниц (/ruli/, /rul/) */
function pageEvents(){const h=document.documentElement.dataset;if(!h.route)return;track('page_view');if(h.product)track('product_view',{product:h.product})}
function start(){ymInit();pageEvents()}
document.addEventListener('bmw-consent',e=>{if(e.detail)start()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{if(consent())start()});else if(consent())start();
window.addEventListener('hashchange',()=>{if(consent())ymHit()});
document.addEventListener('visibilitychange',()=>{if(document.hidden)flush(true)});window.addEventListener('pagehide',()=>flush(true));
window.BMWAnalytics={track,flush,optOut(){store.set('bmw.analytics.optout','1');queue=[]}};
})();
