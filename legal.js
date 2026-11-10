// Local privacy controls: clearing saved settings. Analytics lives in consent.js / analytics.js (only after consent).
(()=>{'use strict';
 const obsolete=['bmw.analytics.vid','bmw.analytics.s2','bmw.analytics.optout','bmw.analytics.me','bmw.stats.key','bmw.stats.days'];
 const KEY='bmw.storage-notice.v1';
 for(const button of document.querySelectorAll('[data-clear-local]'))button.addEventListener('click',()=>{
  const keys=['bmw.studio.v2','bmw.studio.favorites','bmw.studio.compare','bmw.builder.v1',KEY,'bmw.consent.v1',...obsolete];
  try{for(const key of keys){localStorage.removeItem(key);sessionStorage.removeItem(key);}const status=document.querySelector('[data-clear-status]');if(status)status.textContent='Сохранённые настройки и избранное удалены с этого устройства. На серверы ничего не отправлено.';}catch{const status=document.querySelector('[data-clear-status]');if(status)status.textContent='Браузер не разрешил очистку. Удалите данные сайта в настройках браузера.';}
 });
})();
