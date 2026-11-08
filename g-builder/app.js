import {configurationLink,readConfiguration,requestText,telegramLink,bindRequest} from '../builder-request.js?v=167';
import {enhancePanels,refreshPanels} from '../builder-panels.js?v=153';
import {renderMaterial} from './material-renderer.js?v=153';
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ASSET=new URL('./',import.meta.url),imgCache=new Map(),tintCache=new Map();
const MATERIALS=[['perforated','Перфорированная кожа'],['alcantara','Алькантара'],['smooth','Гладкая кожа']];
const CARBONS=[['forged','Кованый карбон'],['glossy','Глянцевый карбон'],['matte','Матовый карбон']];
const TRIMS=[['original','Штатная вставка'],...CARBONS];
const AIRBAGS=[['original','Штатная подушка'],['alcantara','Алькантара'],['smooth','Гладкая кожа']];
const RU={black:'Чёрная',white:'Белая',charcoal:'Тёмно-серая',light_gray:'Светло-серая',tan:'Бежевая',red:'Красная',burgundy:'Бордовая',hot_pink:'Ярко-розовая',royal_blue:'Синяя',navy:'Тёмно-синяя',baby_blue:'Голубая',racing_green:'Тёмно-зелёная',lime:'Лаймовая',teal:'Бирюзовая',yellow:'Жёлтая',orange:'Оранжевая',brown:'Коричневая',chocolate:'Шоколадная',gold:'Золотая'};
const MRU={'White':'Белый','Piano Black':'Чёрный глянец','Jet Black':'Чёрный','Raven':'Вороново крыло','Carbon Black':'Угольно-чёрный','Shadow Grey':'Теневой серый','Charcoal':'Угольный','Slate':'Сланцевый','Onyx':'Оникс','Gunmetal':'Оружейный серый','Steel':'Стальной','Anthracite':'Антрацит','Iron':'Железный','Graphite':'Графитовый','Slate Grey':'Сланцево-серый','Storm Grey':'Грозовой серый','Ash':'Пепельный','Basalt Grey':'Базальтовый','Pewter':'Оловянный','Smoke':'Дымчатый','Granite':'Гранитный','Silver Grey':'Серебристо-серый','Mist Grey':'Туманный серый','Moonlight White':'Лунный белый','Ivory':'Слоновая кость','Alpine White':'Альпийский белый','Cream':'Кремовый','Arctic White':'Арктический белый','Azalea':'Азалия','Almond':'Миндальный','Sand':'Песочный','Oat':'Овсяный','Wheat':'Пшеничный','Stone':'Каменный','Greige':'Серо-бежевый','China Red':'Китайский красный','Flame Red':'Огненно-красный','Rust Red':'Кирпично-красный','Ruby Red':'Рубиновый','Bordeaux':'Бордо','Wine':'Винный','Saffron':'Оранжевый','Mustard':'Горчичный','Gold':'Золотой','Ochre':'Охра','Earth Brown':'Землисто-коричневый','Khaki Brown':'Хаки','Cognac':'Коньячный','Signal Brown':'Сигнально-коричневый','Caramel':'Карамельный','Tobacco':'Табачный','Dark Brown':'Тёмно-коричневый','Walnut':'Ореховый','Bitter Brown':'Горький шоколад','Bark':'Древесный','Espresso':'Эспрессо','Taupe':'Тауп','Coffee':'Кофейный','Chocolate':'Шоколадный','Aqua Blue':'Аквамариновый','Azure':'Лазурный','Sky Blue':'Небесно-голубой','Steel Blue':'Стальной синий','Petrol':'Петроль','Violet Blue':'Сине-фиолетовый','Imperial Blue':'Королевский синий','Midnight Blue':'Полуночный синий','Grey Blue':'Серо-голубой','Ink Teal':'Чернильно-бирюзовый','Deep Blue':'Глубокий синий','Diamond Blue':'Бриллиантовый голубой','Navy':'Тёмно-синий','Aqua':'Морская волна','Turquoise':'Бирюзовый','Sage':'Шалфейный','Emerald':'Изумрудный','Plum':'Сливовый'};
const defaults=()=>({side:'smooth',sideColor:'9860',topColor:'9861',sideStitch:'black',top:'smooth',topStitch:'black',trim:'original',airbag:'original',airbagStitch:'black',marker:'none',heat:'no',vibration:'no',acc:'no'});
let state=defaults(),data,catalog=[],serial=0,ready=false,rendering=false;
const label=(options,id)=>options.find(o=>o[0]===id)?.[1]||id;
const color=id=>data.leathers.find(c=>c.code===id),colorLabel=id=>MRU[color(id).name]||color(id).name;
const stitch=id=>data.stitches.find(c=>c.key===id),marker=id=>data.markers.find(c=>c.code===id);
function field(n,title,body,id=''){return `<fieldset ${id?`id="${id}"`:''}><legend><span>${n}</span>${title}</legend>${body}</fieldset>`;}
function choices(key,options){return `<div class="choices">${options.map(([value,name])=>`<label class="choice"><input type="radio" name="${key}" value="${value}" ${state[key]===value?'checked':''}><span>${esc(name)}</span></label>`).join('')}</div>`;}
function palette(key,colors,isMarker=false){return `${isMarker?`<input class="palette-search" data-search="${key}" type="search" placeholder="Найти оттенок" aria-label="Найти оттенок: ${key==='marker'?'метка':key==='sideColor'?'зона хвата':'верх и низ'}">`:''}<div class="swatches" data-palette="${key}">${colors.map(c=>{const id=isMarker?c.code:c.key,name=isMarker?MRU[c.name]||c.name:RU[c.key]||c.name;return `<label class="swatch" style="--sw:${c.hex}" title="${esc(name)}${isMarker?' · '+id:''}" data-color-name="${esc(name.toLowerCase())} ${id}"><input type="radio" name="${key}" value="${id}" aria-label="${esc(name)}${isMarker?' · '+id:''}" ${state[key]===id?'checked':''}><i></i></label>`;}).join('')}</div><div class="picked" data-picked="${key}"></div>`;}
function controls(){
 $('#options').innerHTML=field('01','Форма руля','<div class="fixed">Круглый руль <span>Выбрано ✓</span></div>')+
 field('02','Материал в зоне хвата',choices('side',MATERIALS))+
 field('03','Цвет зоны хвата',palette('sideColor',data.leathers,true))+
 field('04','Строчка обода',palette('sideStitch',data.stitches))+
 field('05','Материал сверху и снизу',choices('top',[...MATERIALS,...CARBONS]))+
 field('06','Цвет верха и низа',palette('topColor',data.leathers,true),'top-color-field')+
 field('08','Накладка на спицы',choices('trim',TRIMS))+
 field('09','Обивка подушки',choices('airbag',AIRBAGS)+'<p class="picked">Цвет обивки — чёрный глянец</p>')+
 field('10','Строчка на подушке',`<div id="airbag-stitch">${palette('airbagStitch',data.stitches)}</div><div id="original-note" class="fixed">Штатная отделка подушки</div>`)+
 field('11','Метка на 12 часов',choices('markerMode',[['none','Без метки'],['yes','Добавить метку']])+`<div id="marker-colors" hidden>${palette('marker',data.markers,true)}</div>`)+
 field('12','Подогрев',choices('heat',[['no','Без подогрева'],['yes','С подогревом']]))+
 field('13','Вибро',choices('vibration',[['no','Без вибро'],['yes','С вибро']]))+
 field('14','Адаптивный круиз-контроль',choices('acc',[['no','Без адаптивного круиза'],['yes','С адаптивным круизом']])+'<p class="picked">Работу функций проверим по Вашему автомобилю.</p>');
 $('#options').elements.markerMode.value=state.marker==='none'?'none':'yes';enhancePanels($('#options'));sync();
}
function rows(){return [['Автомобиль','BMW G'],['Форма','Круглый'],['Зона хвата',label(MATERIALS,state.side)],['Цвет зоны хвата',colorLabel(state.sideColor)],['Строчка обода',RU[state.sideStitch]],['Верх и низ',label([...MATERIALS,...CARBONS],state.top)],...(!isCarbon()?[['Цвет верха и низа',colorLabel(state.topColor)]]:[]),['Накладка на спицы',label(TRIMS,state.trim)],['Подушка',label(AIRBAGS,state.airbag)],...(state.airbag!=='original'?[['Цвет подушки','Чёрный глянец · 9860'],['Строчка на подушке',RU[state.airbagStitch]]]:[]),['Метка на 12 часов',state.marker==='none'?'Без метки':MRU[marker(state.marker).name]||marker(state.marker).name],['Подогрев',state.heat==='yes'?'С подогревом':'Без подогрева'],['Вибро',state.vibration==='yes'?'С вибро':'Без вибро'],['Адаптивный круиз-контроль',state.acc==='yes'?'С адаптивным круизом':'Без адаптивного круиза']];}
function isCarbon(){return CARBONS.some(([id])=>id===state.top);}
function sync(){
 $('#top-color-field').hidden=isCarbon();
 $('#airbag-stitch').hidden=state.airbag==='original';$('#original-note').hidden=state.airbag!=='original';$('#marker-colors').hidden=state.marker==='none';
 for(const el of document.querySelectorAll('[data-picked]')){const key=el.dataset.picked;el.textContent=key==='marker'?(state.marker==='none'?'':`${MRU[marker(state.marker).name]||marker(state.marker).name} · ${state.marker}`):key.endsWith('Color')?`${colorLabel(state[key])} · ${state[key]}`:RU[state[key]];}
 refreshPanels($('#options'));$('#summary').innerHTML=rows().map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
 const prices=catalog.filter(p=>p.series==='G').flatMap(p=>Object.values(p.prices||{})).map(p=>state.heat==='yes'?p.heated:p.unheated).filter(n=>typeof n==='number'&&Number.isFinite(n));
 $('#price').textContent=prices.length?'от '+new Intl.NumberFormat('ru-RU').format(Math.min(...prices))+' ₽':'Уточним стоимость';
 $('#order').href=telegramLink(currentRequest().message);
}
async function load(path){if(!imgCache.has(path))imgCache.set(path,(async()=>{const im=new Image();im.src=new URL(path,ASSET);await im.decode();return im;})().catch(e=>{imgCache.delete(path);throw e;}));return imgCache.get(path);}
function draw(ctx,im,size=1254){const ratio=im.width/im.height;let w=size,h=size;if(ratio>1)h=size/ratio;else w=size*ratio;ctx.drawImage(im,(size-w)/2,(size-h)/2,w,h);}
function recolor(im,hex,kind){const key=im.src+hex+kind;if(tintCache.has(key))return tintCache.get(key);const c=document.createElement('canvas');c.width=c.height=1254;const ctx=c.getContext('2d',{willReadFrequently:true});draw(ctx,im);const pixels=ctx.getImageData(0,0,1254,1254),d=pixels.data,RGB=hex.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16));for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;const b=(.2126*d[i]+.7152*d[i+1]+.0722*d[i+2])/255,g=kind==='marker'?Math.min(1.15,.38+b*1.35):.22+.78*b,H=kind==='marker'?Math.max(0,(b-.58)/.42)*.22:0;for(let k=0;k<3;k++)d[i+k]=Math.min(255,RGB[k]*g+255*H);}ctx.putImageData(pixels,0,0);tintCache.set(key,c);if(tintCache.size>14)tintCache.delete(tintCache.keys().next().value);return c;}
function stitchLayer(im,hex,material){const c=document.createElement('canvas');c.width=c.height=1254;const ctx=c.getContext('2d');draw(ctx,recolor(im,hex,'stitch'));ctx.globalCompositeOperation='destination-in';draw(ctx,material);return c;}
async function grip(s){const key='grip:'+s.side+':'+s.sideColor+':'+s.sideStitch;if(tintCache.has(key))return tintCache.get(key);const im=await load(`grips/round-side-${s.side}-map.webp`),c=document.createElement('canvas');c.width=c.height=1254;const ctx=c.getContext('2d',{willReadFrequently:true});draw(ctx,im);ctx.putImageData(renderMaterial(ctx.getImageData(0,0,1254,1254),data.calibration[`round-side-${s.side}`],color(s.sideColor).hex,stitch(s.sideStitch).hex),0,0);tintCache.set(key,c);if(tintCache.size>14)tintCache.delete(tintCache.keys().next().value);return c;}
async function topMaterial(s){const key='top:'+s.top+':'+s.topColor+':'+s.topStitch;if(tintCache.has(key))return tintCache.get(key);const im=await load(`grips/round-tb-${s.top}-map.webp`),c=document.createElement('canvas');c.width=c.height=1254;const ctx=c.getContext('2d',{willReadFrequently:true});draw(ctx,im);ctx.putImageData(renderMaterial(ctx.getImageData(0,0,1254,1254),data.calibration[`round-tb-${s.top}`],color(s.topColor).hex,stitch(s.topStitch).hex),0,0);tintCache.set(key,c);if(tintCache.size>14)tintCache.delete(tintCache.keys().next().value);return c;}
async function airbag(s){const key=s.airbag+s.airbagStitch;if(tintCache.has(key))return tintCache.get(key);const im=await load(`grips/airbag-${s.airbag}-map.webp`),c=document.createElement('canvas');c.width=c.height=1254;const ctx=c.getContext('2d',{willReadFrequently:true});draw(ctx,im);const out=renderMaterial(ctx.getImageData(0,0,1254,1254),data.calibration[`airbag-${s.airbag}`],data.black.hex,stitch(s.airbagStitch).hex);ctx.putImageData(out,0,0);tintCache.set(key,c);if(tintCache.size>14)tintCache.delete(tintCache.keys().next().value);return c;}
async function render(){const id=++serial,s={...state};rendering=true;ready=false;requestSharing.invalidate();$('#save').disabled=true;$('#order').setAttribute('aria-disabled','true');$('#status').textContent='Обновляем превью…';try{
 const paths=['round.webp',`grips/round-side-${s.side}-map.webp`,'stitch/round-side.webp',CARBONS.some(([v])=>v===s.top)?`cf/round-${s.top}.webp`:`grips/round-tb-${s.top}-map.webp`];
 if(!CARBONS.some(([v])=>v===s.top))paths.push('stitch/round-tb.webp');if(s.trim!=='original')paths.push(`trims/${s.trim}.webp`);
 if(s.airbag!=='original')paths.push(`neutral/airbag-${s.airbag}-logo.webp`);if(s.marker!=='none')paths.push('marker/round.webp');
 await Promise.all(paths.map(load));const [side,top,bag]=await Promise.all([grip(s),CARBONS.some(([v])=>v===s.top)?load(paths[3]):topMaterial(s),s.airbag!=='original'?airbag(s):null]);if(id!==serial)return;
 const c=document.createElement('canvas');c.width=c.height=1254;const ctx=c.getContext('2d');
 draw(ctx,await load(paths[0]));draw(ctx,side);draw(ctx,top);

 if(s.trim!=='original')draw(ctx,await load(`trims/${s.trim}.webp`));if(bag){draw(ctx,bag);draw(ctx,await load(`neutral/airbag-${s.airbag}-logo.webp`));}
 if(s.marker!=='none')draw(ctx,recolor(await load('marker/round.webp'),marker(s.marker).hex,'marker'));
 if(id!==serial)return;const output=$('#wheel').getContext('2d');output.clearRect(0,0,1254,1254);output.drawImage(c,0,0);ready=true;$('#order').setAttribute('aria-disabled','false');$('#status').textContent='';
 }catch(e){if(id===serial){$('#status').textContent='Не удалось обновить превью. Выберите вариант ещё раз.';console.error(e);}}finally{if(id===serial){rendering=false;$('#save').disabled=!ready;if(ready)requestSharing.preparePhoto();}}}
function currentRequest(){const summary=rows(),link=configurationLink('bmw-gseries',state);return {modelId:'bmw-gseries',rows:summary,link,message:requestText(summary,link)};}
function allowedOption(key){
 if(key==='side')return MATERIALS.map(([id])=>id);
 if(key==='top')return [...MATERIALS,...CARBONS].map(([id])=>id);
 if(key==='trim')return TRIMS.map(([id])=>id);
 if(key==='airbag')return AIRBAGS.map(([id])=>id);
 if(key.endsWith('Color'))return data.leathers.map(c=>c.code);
 if(key.endsWith('Stitch'))return data.stitches.map(c=>c.key);
 if(key==='marker')return ['none',...data.markers.map(c=>c.code)];
 return ['no','yes'];
}
const requestSharing=bindRequest({canvas:$('#wheel'),order:$('#order'),shareButton:$('#share-photo'),note:$('#share-note'),getRequest:currentRequest,isReady:()=>ready&&!rendering});
$('#options').addEventListener('submit',e=>e.preventDefault());
$('#options').addEventListener('change',e=>{const {name,value}=e.target;if(name==='sideStitch')state.topStitch=value;if(name==='markerMode'){state.marker=value==='none'?'none':'white';if(value!=='none')$('#options').querySelector('input[name="marker"][value="white"]').checked=true;}else if(name in state)state[name]=value;else return;sync();render();});
$('#options').addEventListener('input',e=>{if(!e.target.matches('.palette-search'))return;const q=e.target.value.trim().toLowerCase(),key=e.target.dataset.search;for(const c of document.querySelectorAll(`[data-palette="${key}"] label`))c.hidden=!c.dataset.colorName.includes(q);});
$('#reset').addEventListener('click',()=>{state=defaults();history.replaceState(null,'',location.pathname+location.search);$('#shared-note').textContent='';controls();render();});
$('#save').addEventListener('click',()=>{if(!ready||rendering)return;$('#wheel').toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='BMW-G-моя-конфигурация.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},'image/png');});
try{const response=await fetch(new URL('options.json?v=164',ASSET));if(!response.ok)throw Error('Options missing');data=await response.json();try{const r=await fetch('catalog.json?v=153');if(r.ok)catalog=await r.json();}catch{}const restored=readConfiguration(location.hash,'bmw-gseries',defaults(),allowedOption);state=restored.state;$('#shared-note').textContent=restored.error?'Ссылка на конфигурацию повреждена. Показаны начальные параметры.':restored.shared?'Открыта конфигурация по ссылке.':'';controls();await render();}catch(e){$('#status').textContent='Не удалось загрузить конструктор. Обновите страницу.';$('#options').innerHTML='<p>Варианты временно недоступны.</p>';console.error(e);}
// Like the reference, give the option panel more room once the visitor scrolls.
function compactPreview(){document.body.classList.toggle('is-compact',matchMedia('(max-width:760px)').matches&&window.scrollY>80);}
window.addEventListener('scroll',compactPreview,{passive:true});window.addEventListener('resize',compactPreview);compactPreview();
