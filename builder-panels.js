// Native disclosure panels keep the preview visible without a long wall of options.
const GROUPS=[
 ['materials','Материалы',['side','sideColor','top','topColor']],
 ['stitching','Строчка обода',['sideStitch','topStitch']],
 ['trim','Накладки и вставки',['trim','insert','strips']],
 ['airbag','Подушка',['airbag','airbagColor','airbagStitch']],
 ['marker','Метка',['markerMode','marker']],
 ['equipment','Функции и оснащение',['paddles','led','heat','vibration','acc']]
];
export function enhancePanels(form){
 for(const [id,title,names] of GROUPS){
  const fields=[...form.children].filter(el=>el.tagName==='FIELDSET'&&[...el.querySelectorAll('input')].some(i=>names.includes(i.name)));
  // Fixed black colours have no inputs. Keep them with their material controls.
  if(id==='materials')for(const el of [...form.children])if(el.tagName==='FIELDSET'&&/Цвет зоны хвата|Цвет верха и низа/.test(el.querySelector('legend')?.textContent))fields.push(el);
  if(id==='airbag')for(const el of [...form.children])if(el.tagName==='FIELDSET'&&/Цвет подушки/.test(el.querySelector('legend')?.textContent))fields.push(el);
  if(!fields.length)continue;
  const ordered=[...form.children].filter(el=>fields.includes(el));
  const details=document.createElement('details');details.className='option-panel';details.dataset.panel=id;details.open=true;
  const summary=document.createElement('summary'),label=document.createElement('span'),value=document.createElement('small');label.textContent=title;value.dataset.panelValue='';summary.append(label,value);details.append(summary);
  ordered[0].before(details);const body=document.createElement('div');body.className='option-panel-body';details.append(body);for(const field of ordered)body.append(field);
 }
 refreshPanels(form);
}
export function refreshPanels(form){
 for(const panel of form.querySelectorAll('.option-panel')){
  const values=[...panel.querySelectorAll('input:checked')].filter(i=>!i.closest('fieldset[hidden]')&&!i.closest('[hidden]')).map(i=>i.getAttribute('aria-label')||i.closest('label')?.querySelector('span')?.textContent||'').filter(Boolean);
  panel.querySelector('[data-panel-value]').textContent=[...new Set(values)].join(' · ');
 }
}
