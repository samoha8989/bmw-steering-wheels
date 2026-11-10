/* Согласие на статистику. Без согласия сайт ничего не собирает и не отправляет.
   Решение хранится только на этом устройстве (localStorage). Плашка показывается, если подключён сборщик или Яндекс Метрика. */
(()=>{'use strict';
const KEY='bmw.consent.v1';
const store={get(){try{return localStorage.getItem(KEY)}catch{return null}},set(v){try{localStorage.setItem(KEY,v)}catch{}},del(){try{localStorage.removeItem(KEY)}catch{}}};
const active=()=>!!(window.BMW_STATS_ENDPOINT||window.BMW_METRIKA_ID);
const listeners=[];
const api={granted:()=>store.get()==='yes',decided:()=>store.get()!==null,onChange(f){listeners.push(f)},open:show};
window.BMWConsent=api;
function emit(){for(const f of listeners){try{f(api.granted())}catch{}}document.dispatchEvent(new CustomEvent('bmw-consent',{detail:api.granted()}))}
function wipe(){/* отзыв согласия: удаляем идентификаторы статистики и cookie Метрики */
 try{for(const k of ['bmw.analytics.vid','bmw.analytics.s2','bmw.analytics.optout','bmw.analytics.me'])localStorage.removeItem(k)}catch{}
 try{for(const c of document.cookie.split(';')){const n=c.split('=')[0].trim();if(/^_ym|^_ga|^_gid/.test(n)){document.cookie=n+'=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';document.cookie=n+'=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain='+location.hostname}}}catch{}}
const CSS='.consent-banner{position:fixed;left:12px;right:12px;bottom:12px;z-index:50;max-width:760px;margin:0 auto;background:#19191e;border:1px solid #ffffff30;border-radius:14px;padding:14px 16px;box-shadow:0 8px 30px #0008;font:13px/1.55 Manrope,system-ui,sans-serif;color:#e6e6ec}.consent-banner p{margin:0 0 10px}.consent-banner a{color:#fff}.consent-banner div{display:flex;gap:10px;flex-wrap:wrap}.consent-banner button{font:inherit;font-weight:700;min-height:44px;padding:8px 18px;border-radius:10px;border:1px solid #ffffff40;background:#29292f;color:#fff;cursor:pointer}.consent-banner button.yes{background:var(--blue,#4f7bff);border-color:var(--blue,#4f7bff)}';
function hide(){document.querySelector('.consent-banner')?.remove()}
function set(v){const was=api.granted();store.set(v);hide();if(v!=='yes'){wipe();if(was)location.reload();else emit()}else emit()}
function show(){
 hide();
 const priv=new URL('privacy.html',document.currentScript?.src||location.href).href;
 if(!document.getElementById('consent-css')){const st=document.createElement('style');st.id='consent-css';st.textContent=CSS;document.head.appendChild(st)}
 const b=document.createElement('div');b.className='consent-banner';b.setAttribute('role','dialog');b.setAttribute('aria-label','Согласие на статистику');
 b.innerHTML='<p>Сайт может собирать анонимную статистику (случайный номер посетителя, откуда пришли, какие страницы и руль смотрели, нажатия на «Заказать в Telegram») и использовать Яндекс Метрику, чтобы улучшать каталог. Имена, телефоны и IP мы не собираем. Без вашего согласия ничего не собирается. Подробности — в <a href="'+priv+'">политике конфиденциальности</a>.</p><div><button type="button" class="yes">Согласен</button><button type="button" class="no">Отказаться</button></div>';
 b.querySelector('.yes').onclick=()=>set('yes');b.querySelector('.no').onclick=()=>set('no');
 document.body.appendChild(b);b.querySelector('.yes').focus({preventScroll:true});
}
function init(){
 document.addEventListener('click',e=>{const t=e.target.closest('[data-consent-open]');if(t){e.preventDefault();show()}});
 if(active()&&!api.decided())show();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
