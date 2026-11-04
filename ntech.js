document.addEventListener('click',e=>{
  const t=e.target.closest('[data-nt-tab]');if(!t)return;
  const i=t.dataset.ntTab,box=t.closest('.nt-faq');
  box.querySelectorAll('[data-nt-tab]').forEach(b=>{const on=b===t;b.classList.toggle('on',on);b.setAttribute('aria-selected',on)});
  box.querySelectorAll('[data-nt-pane]').forEach(p=>p.classList.toggle('on',p.dataset.ntPane===i));
});
