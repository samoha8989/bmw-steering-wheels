import {configurationLink,readConfiguration,requestText,telegramLink,bindRequest} from '../builder-request.js?v=155';
import {enhancePanels,refreshPanels} from '../builder-panels.js?v=153';
import {renderMaterial} from '../g-builder/material-renderer.js?v=153';
import {RU,MRU} from './labels.js?v=153';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BASE=new URL('./',import.meta.url),SIZE=1254;
const MATERIALS=[['perforated','Перфорированная кожа'],['alcantara','Алькантара'],['smooth','Гладкая кожа']],CARBONS=[['forged','Кованый карбон'],['glossy','Глянцевый карбон'],['matte','Матовый карбон']],AIRBAGS=[['original','Штатная подушка'],['alcantara','Алькантара'],['smooth','Гладкая кожа']],SHAPES=[['round','Круглый'],['yoke','Открытый сверху'],['flat-flat','Плоский сверху и снизу'],['flat-round','Анатомия']];
let models=[],palette,model,catalog=[],state,serial=0,ready=false;
const images=new Map(),renders=new Map();
const name=(list,id)=>list.find(o=>o[0]===id)?.[1]||id;
const color=id=>palette.leathers.find(c=>c.code===id),stitch=id=>palette.stitches.find(c=>c.key===id),marker=id=>palette.markers.find(c=>c.code===id),ru=c=>MRU[c.name]||c.name;
const shape=()=>model.shapes[state.shape],isCarbon=()=>CARBONS.some(([id])=>id===state.top);
const defaults=()=>{const thread=model?.series==='F'?'black':'white';return {shape:'round',side:'smooth',sideColor:'9860',sideStitch:thread,top:'smooth',topColor:'9861',topStitch:thread,trim:'original',airbag:'original',airbagColor:'9860',airbagStitch:thread,paddles:'none',marker:'none',led:'no',heat:'no',vibration:'no',acc:'no'};};
function asset(path){return new URL(`assets/${model.img}/${path}`,BASE);}
function field(n,title,body,id=''){return `<fieldset ${id?`id="${id}"`:''}><legend><span>${String(n).padStart(2,'0')}</span>${title}</legend>${body}</fieldset>`;}
function choices(key,options){return `<div class="choices">${options.map(([v,label])=>`<label class="choice"><input type="radio" name="${key}" value="${v}" ${state[key]===v?'checked':''}><span>${esc(label)}</span></label>`).join('')}</div>`;}
function swatches(key,colors,type='stitch'){return `${type!=='stitch'?`<input class="palette-search" data-search="${key}" type="search" placeholder="Найти оттенок" aria-label="Найти оттенок: ${key==='marker'?'метка':key==='sideColor'?'зона хвата':key==='topColor'?'верх и низ':'подушка'}">`:''}<div class="swatches" data-palette="${key}">${colors.map(c=>{const id=type==='stitch'?c.key:c.code,label=type==='stitch'?RU[id]||c.name:ru(c);return `<label class="swatch" style="--sw:${c.hex}" title="${esc(label)}${type==='stitch'?'':' · '+id}" data-color-name="${esc(label.toLowerCase())} ${id}"><input type="radio" name="${key}" value="${id}" aria-label="${esc(label)}${type==='stitch'?'':' · '+id}" ${state[key]===id?'checked':''}><i></i></label>`;}).join('')}</div><div class="picked" data-picked="${key}"></div>`;}
function fixedColor(code){return `<div class="fixed" data-color-code="${code}"><span>${esc(ru(color(code)))} · ${code}</span><span>Выбрано ✓</span></div>`;}
function controls(){let n=0;const section=(title,html,id='')=>field(++n,title,html,id);const sh=shape();
 $('#options').innerHTML=section('Форма руля',`<div class="shapes">${SHAPES.filter(([id])=>model.shapes[id]).map(([id,label])=>`<label class="choice shape-choice"><input type="radio" name="shape" value="${id}" ${state.shape===id?'checked':''}><img src="${asset(id+'.webp')}" alt="${esc(label)}" loading="lazy"><span>${label}</span></label>`).join('')}</div>`)+
 section('Материал в зоне хвата',choices('side',MATERIALS.filter(([id])=>sh.zones.side.includes(id))))+
 section('Цвет зоны хвата',swatches('sideColor',palette.leathers,'color'))+
 section('Строчка обода',swatches('sideStitch',palette.stitches))+
 section(state.shape==='yoke'?'Материал снизу':'Материал сверху и снизу',choices('top',[...MATERIALS.filter(([id])=>sh.zones[sh.tbToken].includes(id)),...CARBONS.filter(([id])=>sh.carbons.includes(id))]))+
 section('Цвет верха и низа',swatches('topColor',palette.leathers,'color'),'top-color-field')+
 (model.lowerTrim?section('Накладка на спицы',choices('trim',[['original','Штатная вставка'],...CARBONS])):'')+
 (model.airbag?section('Обивка подушки',choices('airbag',AIRBAGS.filter(([id])=>id==='original'||model.airbag.materials.includes(id))))+section('Цвет подушки',model.series==='F'?fixedColor('9860'):swatches('airbagColor',palette.airbagColors,'color'),'bag-color-field')+section('Строчка на подушке',swatches('airbagStitch',palette.stitches),'bag-stitch-field'):'')+
 (sh.marker?section('Метка на 12 часов',choices('markerMode',[['none','Без метки'],['yes','Добавить метку']])+`<div id="marker-colors">${swatches('marker',palette.markers,'marker')}</div>`):'')+
 (sh.led?section('LED-дисплей',choices('led',[['no','Без дисплея'],['yes','С дисплеем']])):'')+
 section('Подогрев',choices('heat',[['no','Без подогрева'],['yes','С подогревом']]))+
 section('Вибро',choices('vibration',[['no','Без вибро'],['yes','С вибро']]))+
 section('Адаптивный круиз-контроль',choices('acc',[['no','Без адаптивного круиза'],['yes','С адаптивным круизом']])+'<p class="picked">Работу функций проверим по Вашему автомобилю.</p>');
 enhancePanels($('#options'));if($('#options').elements.markerMode)$('#options').elements.markerMode.value=state.marker==='none'?'none':'yes';sync();
}
function rows(){return [['Руль',model.title],['Форма',name(SHAPES,state.shape)],['Зона хвата',name(MATERIALS,state.side)],['Цвет зоны хвата',ru(color(state.sideColor))],['Строчка обода',RU[state.sideStitch]],['Верх и низ',name([...MATERIALS,...CARBONS],state.top)],...(!isCarbon()?[['Цвет верха и низа',ru(color(state.topColor))]]:[]),...(model.lowerTrim?[['Накладка на спицы',name([['original','Штатная вставка'],...CARBONS],state.trim)]]:[]),...(model.airbag?[['Подушка',name(AIRBAGS,state.airbag)],...(state.airbag!=='original'?[['Цвет подушки',ru(color(state.airbagColor))],['Строчка подушки',RU[state.airbagStitch]]]:[])]:[]),...(shape().marker?[['Метка',state.marker==='none'?'Без метки':ru(marker(state.marker))]]:[]),...(shape().led?[['LED-дисплей',state.led==='yes'?'С дисплеем':'Без дисплея']]:[]),['Подогрев',state.heat==='yes'?'С подогревом':'Без подогрева'],['Вибро',state.vibration==='yes'?'С вибро':'Без вибро'],['Адаптивный круиз-контроль',state.acc==='yes'?'С адаптивным круизом':'Без адаптивного круиза']];}
function price(){if(model.series==='F'){const nums=catalog.filter(p=>p.series==='F').flatMap(p=>Object.values(p.prices||{})).map(p=>state.heat==='yes'?p.heated:p.unheated).filter(Number.isFinite);return nums.length?Math.min(...nums):null;}
 const nums=catalog.filter(p=>p.series==='Mercedes'&&Number.isFinite(p.optBase)).map(p=>{if(state.heat!=='yes')return p.optBase;const extra=p.opts?.find(o=>o.k==='heat'&&!o.l)?.price;return Number.isFinite(extra)?p.optBase+extra:null;}).filter(Number.isFinite);return nums.length?Math.min(...nums):null;}
function sync(){for(const input of $('#options').querySelectorAll('input[type=radio]')){const value=input.name==='markerMode'?(state.marker==='none'?'none':'yes'):state[input.name];input.checked=input.value===value;}
for(const id of ['top-color-field'])$('#'+id).hidden=isCarbon();for(const id of ['bag-color-field','bag-stitch-field'])if($('#'+id))$('#'+id).hidden=state.airbag==='original';if($('#marker-colors'))$('#marker-colors').hidden=state.marker==='none';
 for(const el of document.querySelectorAll('[data-picked]')){const key=el.dataset.picked;el.textContent=key==='marker'?(state.marker==='none'?'':`${ru(marker(state.marker))} · ${state.marker}`):key.endsWith('Color')?`${ru(color(state[key]))} · ${state[key]}`:RU[state[key]];}
 refreshPanels($('#options'));$('#summary').innerHTML=rows().map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');const p=price();$('#price').textContent=p==null?'Уточним стоимость':'от '+new Intl.NumberFormat('ru-RU').format(p)+' ₽';$('#model-name').textContent=model.title+' · '+name(SHAPES,state.shape).toLowerCase();
 $('#order').href=telegramLink(currentRequest().message);}
async function load(path,optional=false){const url=asset(path).href;if(!images.has(url))images.set(url,(async()=>{const im=new Image();im.src=url;await im.decode();return im;})().catch(e=>{images.delete(url);throw e;}));try{return await images.get(url);}catch(e){if(optional)return null;throw e;}}
function canvas(){const c=document.createElement('canvas');c.width=c.height=SIZE;return c;}
function draw(ctx,im){if(!im)return;const ratio=im.width/im.height;let w=SIZE,h=SIZE;if(ratio>1)h=SIZE/ratio;else w=SIZE*ratio;ctx.drawImage(im,(SIZE-w)/2,(SIZE-h)/2,w,h);}
function remember(key,c){renders.set(key,c);if(renders.size>20)renders.delete(renders.keys().next().value);return c;}
async function material(key,colorCode,stitchKey,car=model){const cache=car.id+':'+key+':'+colorCode+':'+stitchKey;if(renders.has(cache))return renders.get(cache);const mapFile=car.series==='F'&&key==='airbag-smooth'?'airbag-smooth-photo':key;const im=await load(`grips/${mapFile}-map.webp`),c=canvas(),ctx=c.getContext('2d',{willReadFrequently:true}),calib=car.calibration[key];if(!calib)throw Error('Нет калибровки: '+car.id+'/'+key);draw(ctx,im);ctx.putImageData(renderMaterial(ctx.getImageData(0,0,SIZE,SIZE),calib,color(colorCode).hex,stitch(stitchKey).hex),0,0);return remember(cache,c);}
function recolor(im,hex,kind){const key=im.src+hex+kind;if(renders.has(key))return renders.get(key);const c=canvas(),ctx=c.getContext('2d',{willReadFrequently:true});draw(ctx,im);const p=ctx.getImageData(0,0,SIZE,SIZE),d=p.data,rgb=hex.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16));for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;const b=(.2126*d[i]+.7152*d[i+1]+.0722*d[i+2])/255,g=kind==='marker'?Math.min(1.15,.38+b*1.35):.22+.78*b,H=kind==='marker'?Math.max(0,(b-.58)/.42)*.22:0;for(let k=0;k<3;k++)d[i+k]=Math.min(255,rgb[k]*g+255*H);}ctx.putImageData(p,0,0);return remember(key,c);}
async function zone(s,id,car){
 const token=id==='side'?'side':car.shapes[s.shape].tbToken,mat=id==='side'?s.side:s.top,key=`${s.shape}-${token}-${mat}`;
 if(id!=='side'&&CARBONS.some(([v])=>v===mat))return load(`cf/${s.shape}-${mat}.webp`);
 const col=id==='side'?s.sideColor:s.topColor,st=id==='side'?s.sideStitch:s.topStitch;
 const fallback=car.fallbackPre?.includes(key);
 const materialImage=fallback?await load(`pre/${key}-${col}.webp`):await material(key,col,st,car);
 // Mercedes stores the rim stitching in a separate photographic layer.
 if(car.series!=='Mercedes'||!car.shapes[s.shape].stitched?.includes(token))return materialImage;
 const seams=await load(`stitch/${s.shape}-${token}.webp`),c=canvas(),ctx=c.getContext('2d'),clip=canvas(),cc=clip.getContext('2d');
 draw(ctx,materialImage);draw(cc,recolor(seams,stitch(st).hex,'stitch'));cc.globalCompositeOperation='destination-in';draw(cc,materialImage);draw(ctx,clip);return c;
}
async function render(){const id=++serial,s={...state},car=model,sh=car.shapes[s.shape];ready=false;requestSharing.invalidate();$('#save').disabled=true;$('#order').setAttribute('aria-disabled','true');$('#status').textContent='Обновляем превью…';try{
 const base=await load(s.shape+'.webp');const [side,top]=await Promise.all([zone(s,'side',car),zone(s,'top',car)]);let bag=null,logo=null;if(s.airbag!=='original'&&car.airbag){const key=car.airbag.perShape?`airbag-${s.shape}-${s.airbag}`:`airbag-${s.airbag}`;bag=await material(key,s.airbagColor,s.airbagStitch,car);logo=await load(`neutral/${key}-logo.webp`,true);}
 const trim=car.lowerTrim&&s.trim!=='original'?await load(`trims/${s.trim}.webp`):null;
 const mark=sh.marker&&s.led!=='yes'&&s.marker!=='none'?recolor(await load(`marker/${sh.marker}.webp`),marker(s.marker).hex,'marker'):null;
 const led=sh.led&&s.led==='yes'?await load(`led/${sh.led}.webp`):null,over=sh.over?await load(`over/${sh.over}.webp`):null;
 if(id!==serial)return;const c=canvas(),ctx=c.getContext('2d');draw(ctx,base);draw(ctx,side);draw(ctx,top);draw(ctx,trim);draw(ctx,bag);draw(ctx,logo);draw(ctx,mark);draw(ctx,led);draw(ctx,over);const output=$('#wheel').getContext('2d');output.clearRect(0,0,1254,1254);output.drawImage(c,0,0);ready=true;$('#order').setAttribute('aria-disabled','false');$('#status').textContent='';
 }catch(e){if(id===serial){$('#status').textContent='Не удалось загрузить превью. Выберите вариант ещё раз.';console.error(e);}}finally{if(id===serial){$('#save').disabled=!ready;if(ready)requestSharing.preparePhoto();}}}
function currentRequest(){const summary=rows(),link=configurationLink(model.id,state);return {modelId:model.id,rows:summary,link,message:requestText(summary,link)};}
function allowedOption(key,s){
 const sh=model.shapes[s.shape];if(key==='shape')return Object.keys(model.shapes);if(!sh)return [];
 if(key==='side')return sh.zones.side;
 if(key==='top')return [...sh.zones[sh.tbToken],...sh.carbons];
 if(key==='trim')return model.lowerTrim?['original',...CARBONS.map(([id])=>id)]:['original'];
 if(key==='airbag')return ['original',...(model.airbag?.materials||[])];
 if(key==='airbagColor')return model.series==='F'?['9860']:palette.airbagColors.map(c=>c.code);
 if(key.endsWith('Color'))return palette.leathers.map(c=>c.code);
 if(key.endsWith('Stitch'))return palette.stitches.map(c=>c.key);
 if(key==='marker')return ['none',...(sh.marker?palette.markers.map(c=>c.code):[])];
 if(key==='led')return sh.led?['no','yes']:['no'];
 return ['no','yes'];
}
const requestSharing=bindRequest({canvas:$('#wheel'),order:$('#order'),shareButton:$('#share-photo'),note:$('#share-note'),getRequest:currentRequest,isReady:()=>ready});
$('#options').addEventListener('submit',e=>e.preventDefault());
$('#options').addEventListener('change',e=>{
 const {name,value}=e.target;
 if(name==='markerMode'){state.marker=value==='none'?'none':'white';if(value==='yes')state.led='no';}
 else if(name in state)state[name]=value;else return;
 if(name==='sideStitch')state.topStitch=value;
 if(name==='marker'&&value!=='none')state.led='no';
 if(name==='led'&&value==='yes')state.marker='none';
 if(name==='shape'){
  const sh=shape();state.side='smooth';state.top='smooth';
  if(!sh.marker)state.marker='none';if(!sh.led)state.led='no';controls();
 }else sync();render();
});
$('#options').addEventListener('input',e=>{if(!e.target.matches('.palette-search'))return;const q=e.target.value.trim().toLowerCase(),key=e.target.dataset.search;for(const el of document.querySelectorAll(`[data-palette="${key}"] label`))el.hidden=!el.dataset.colorName.includes(q);});
$('#reset').addEventListener('click',()=>{state=defaults();history.replaceState(null,'',location.pathname+location.search);$('#shared-note').textContent='';controls();render();});
$('#model-select').addEventListener('change',e=>{location.href='wheel-builder.html?model='+encodeURIComponent(e.target.value)+'&v=155';});
$('#save').addEventListener('click',()=>{if(!ready)return;$('#wheel').toBlob(blob=>{if(!blob)return;const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=model.id+'-моя-конфигурация.png';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);},'image/png');});
function compact(){document.body.classList.toggle('is-compact',matchMedia('(max-width:760px)').matches&&window.scrollY>80);}window.addEventListener('scroll',compact,{passive:true});window.addEventListener('resize',compact);
try{const responses=await Promise.all([fetch(new URL('models.json?v=153',BASE)),fetch(new URL('palette.json?v=164',BASE)),fetch('catalog.json?v=153')]);for(const r of responses)if(!r.ok)throw Error('Не удалось загрузить данные конструктора');[models,palette,catalog]=await Promise.all(responses.map(r=>r.json()));const requested=new URLSearchParams(location.search).get('model')||'bmw-fseries';model=models.find(m=>m.id===requested)||models[0];const restored=readConfiguration(location.hash,model.id,defaults(),allowedOption);state=restored.state;$('#shared-note').textContent=restored.error?'Ссылка на конфигурацию повреждена. Показаны начальные параметры.':restored.shared?'Открыта конфигурация по ссылке.':'';$('#model-select').innerHTML=models.map(m=>`<option value="${m.id}" ${m.id===model.id?'selected':''}>${esc(m.title)}</option>`).join('');document.title=model.title+' — конструктор BMW Steering Wheels';controls();compact();await render();}catch(e){$('#status').textContent='Не удалось загрузить конструктор. Обновите страницу.';console.error(e);}
