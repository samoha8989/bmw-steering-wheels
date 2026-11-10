import {configurationLink,readConfiguration,requestText,telegramLink,bindRequest} from '../builder-request.js?v=171';
import {enhancePanels,refreshPanels} from '../builder-panels.js?v=154';
import {renderMaterial} from './material-renderer.js?v=153';
import {PRICES,badge,setBadge,addons,quote,priceRow,showPrice,money} from '../builder-prices.js?v=1';
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ASSET=new URL('./',import.meta.url),imgCache=new Map(),tintCache=new Map();
const MATERIALS=[['perforated','Перфорированная кожа'],['alcantara','Алькантара'],['smooth','Гладкая кожа']];
const CARBONS=[['forged','Кованый карбон'],['glossy','Глянцевый карбон'],['matte','Матовый карбон']];
const TRIMS=[['original','Штатная накладка'],...CARBONS];
const AIRBAGS=[['original','Штатная отделка'],['smooth','Натуральная кожа'],['alcantara','Алькантара']];
// Центральная вставка и накладки возле кнопок: реальные фото деталей с рулей BMW G (без слоя на превью).
const INSERTS=[['original','Штатная вставка'],['carbon1','Карбон, текстура №1','parts/insert-carbon1.webp'],['carbon2','Карбон, текстура №2','parts/insert-carbon2.webp'],['forged','Кованый карбон','parts/insert-forged.webp']];
const STRIPS=[['original','Штатные декоративные элементы'],['slim','Узкие карбоновые полоски','parts/strips-slim.webp'],['wide','Широкие вставки из кованого карбона','parts/strips-wide.webp']];
const RU={black:'Чёрная',white:'Белая',charcoal:'Тёмно-серая',light_gray:'Светло-серая',tan:'Бежевая',red:'Красная',burgundy:'Бордовая',hot_pink:'Ярко-розовая',royal_blue:'Синяя',navy:'Тёмно-синяя',baby_blue:'Голубая',racing_green:'Тёмно-зелёная',lime:'Лаймовая',teal:'Бирюзовая',yellow:'Жёлтая',orange:'Оранжевая',brown:'Коричневая',chocolate:'Шоколадная',gold:'Золотая'};
const MRU={'White':'Белый','Piano Black':'Чёрный глянец','Jet Black':'Чёрный','Raven':'Вороново крыло','Carbon Black':'Угольно-чёрный','Shadow Grey':'Теневой серый','Charcoal':'Угольный','Slate':'Сланцевый','Onyx':'Оникс','Gunmetal':'Оружейный серый','Steel':'Стальной','Anthracite':'Антрацит','Iron':'Железный','Graphite':'Графитовый','Slate Grey':'Сланцево-серый','Storm Grey':'Грозовой серый','Ash':'Пепельный','Basalt Grey':'Базальтовый','Pewter':'Оловянный','Smoke':'Дымчатый','Granite':'Гранитный','Silver Grey':'Серебристо-серый','Mist Grey':'Туманный серый','Moonlight White':'Лунный белый','Ivory':'Слоновая кость','Alpine White':'Альпийский белый','Cream':'Кремовый','Arctic White':'Арктический белый','Azalea':'Азалия','Almond':'Миндальный','Sand':'Песочный','Oat':'Овсяный','Wheat':'Пшеничный','Stone':'Каменный','Greige':'Серо-бежевый','China Red':'Китайский красный','Flame Red':'Огненно-красный','Rust Red':'Кирпично-красный','Ruby Red':'Рубиновый','Bordeaux':'Бордо','Wine':'Винный','Saffron':'Оранжевый','Mustard':'Горчичный','Gold':'Золотой','Ochre':'Охра','Earth Brown':'Землисто-коричневый','Khaki Brown':'Хаки','Cognac':'Коньячный','Signal Brown':'Сигнально-коричневый','Caramel':'Карамельный','Tobacco':'Табачный','Dark Brown':'Тёмно-коричневый','Walnut':'Ореховый','Bitter Brown':'Горький шоколад','Bark':'Древесный','Espresso':'Эспрессо','Taupe':'Тауп','Coffee':'Кофейный','Chocolate':'Шоколадный','Aqua Blue':'Аквамариновый','Azure':'Лазурный','Sky Blue':'Небесно-голубой','Steel Blue':'Стальной синий','Petrol':'Петроль','Violet Blue':'Сине-фиолетовый','Imperial Blue':'Королевский синий','Midnight Blue':'Полуночный синий','Grey Blue':'Серо-голубой','Ink Teal':'Чернильно-бирюзовый','Deep Blue':'Глубокий синий','Diamond Blue':'Бриллиантовый голубой','Navy':'Тёмно-синий','Aqua':'Морская волна','Turquoise':'Бирюзовый','Sage':'Шалфейный','Emerald':'Изумрудный','Plum':'Сливовый'};
const defaults=()=>({side:'smooth',sideColor:'9860',topColor:'9861',sideStitch:'black',top:'smooth',topStitch:'black',trim:'original',insert:'original',strips:'original',airbag:'original',airbagStitch:'black',marker:'none',heat:'no',vibration:'no',acc:'no'});
const HEAT_PRICE=PRICES.heat,VIB_PRICE=PRICES.vibration,HEAT_VIB_PRICE=PRICES.heatVibration;
const ALC_SIDE_PRICE=PRICES.alcantaraSide,ALC_FULL_PRICE=PRICES.alcantaraFull;
const freeNote='<p class="choice-price choice-price-free">+0 ₽</p>';
function heatVibGroup(){const both=state.heat==='yes'&&state.vibration==='yes';
 return `<div class="choices" id="heatvib-group">
  <button type="button" class="choice" data-hv="heat" aria-pressed="${state.heat==='yes'}" ${both?'hidden':''}><span>Подогрев<span class="hv-price">+${money(HEAT_PRICE)}</span></span></button>
  <button type="button" class="choice" data-hv="vib" aria-pressed="${state.vibration==='yes'}" ${both?'hidden':''}><span>Вибро<span class="hv-price">+${money(VIB_PRICE)}</span></span></button>
  <button type="button" class="choice" data-hv="both" aria-pressed="${both}" ${both?'':'hidden'}><span>Подогрев + вибро<span class="hv-price"><s>${money(HEAT_PRICE+VIB_PRICE)}</s> ${money(HEAT_VIB_PRICE)}</span></span></button>
 </div>`;}
function alcCount(){return (state.side==='alcantara'?1:0)+(state.top==='alcantara'?1:0);}
function alcSideBadge(){return state.top==='alcantara'?ALC_FULL_PRICE-ALC_SIDE_PRICE:ALC_SIDE_PRICE;}
function alcTopBadge(){return state.side==='alcantara'?ALC_FULL_PRICE-ALC_SIDE_PRICE:ALC_SIDE_PRICE;}
function choicesPriced(key,options,priceFor){return `<div class="choices">${options.map(([value,name,thumb])=>{const p=priceFor?priceFor(value):undefined;return `<label class="choice${thumb!==undefined?' part-choice':''}"><input type="radio" name="${key}" value="${value}" ${state[key]===value?'checked':''}>${thumb?`<img src="${new URL(thumb,ASSET).href}" alt="" loading="lazy">`:thumb===undefined?'':'<b class="part-none" aria-hidden="true">штатно</b>'}<span>${esc(name)}${badge(p,key+':'+value)}</span></label>`;}).join('')}</div>`;}
// Цены на карточках берутся из builder-prices.js; штатные варианты без бейджа.
function sidePriceFor(v){return v==='alcantara'?alcSideBadge():v==='perforated'?PRICES.perforated:undefined;}
function topPriceFor(v){return v==='alcantara'?alcTopBadge():v==='perforated'?PRICES.perforated:v in PRICES.topCarbon?PRICES.topCarbon[v]:undefined;}
function markerPriceFor(v){return v==='yes'?PRICES.marker:undefined;}
const tablePrice=table=>v=>v==='original'?undefined:(v in table?table[v]:null);
const NAMES={top:'Верх и низ',trim:'Накладка на спицы',insert:'Центральная вставка',strips:'Накладки возле кнопок',airbag:'Обшивка крышки подушки'};
function selection(){const s={...state};if(s.trim!=='original'){s.insert='original';s.strips='original';}return s;}
function currentQuote(){const prices=catalog.filter(p=>p.series==='G').flatMap(p=>Object.values(p.prices||{})).map(p=>p.unheated).filter(n=>typeof n==='number'&&Number.isFinite(n));return quote(prices.length?Math.min(...prices):null,addons(selection(),NAMES));}
let state=defaults(),data,catalog=[],serial=0,ready=false,rendering=false;
const label=(options,id)=>options.find(o=>o[0]===id)?.[1]||id;
const color=id=>data.leathers.find(c=>c.code===id),colorLabel=id=>MRU[color(id).name]||color(id).name;
const stitch=id=>data.stitches.find(c=>c.key===id),marker=id=>data.markers.find(c=>c.code===id);
function field(n,title,body,id=''){return `<fieldset ${id?`id="${id}"`:''}><legend><span>${n}</span>${title}</legend>${body}</fieldset>`;}
const partsNote='<p class="picked part-note" data-parts-note>На карточке — фото детали, на превью руля она пока не меняется. Для M-руля BMW G с U-образной прорезью: совместимость проверим по фото Вашего руля.</p>';
const partsLocked='<p class="picked part-note" data-parts-locked>С карбоновой накладкой на спицы эта деталь отдельно не выбирается. Чтобы выбрать её, верните штатную накладку.</p>';
function choices(key,options){return `<div class="choices">${options.map(([value,name])=>`<label class="choice"><input type="radio" name="${key}" value="${value}" ${state[key]===value?'checked':''}><span>${esc(name)}</span></label>`).join('')}</div>`;}
function palette(key,colors,isMarker=false){return `${isMarker?`<input class="palette-search" data-search="${key}" type="search" placeholder="Найти оттенок" aria-label="Найти оттенок: ${key==='marker'?'метка':key==='sideColor'?'зона хвата':'верх и низ'}">`:''}<div class="swatches" data-palette="${key}">${colors.map(c=>{const id=isMarker?c.code:c.key,name=isMarker?MRU[c.name]||c.name:RU[c.key]||c.name;return `<label class="swatch" style="--sw:${c.hex}" title="${esc(name)}${isMarker?' · '+id:''}" data-color-name="${esc(name.toLowerCase())} ${id}"><input type="radio" name="${key}" value="${id}" aria-label="${esc(name)}${isMarker?' · '+id:''}" ${state[key]===id?'checked':''}><i></i></label>`;}).join('')}</div><div class="picked" data-picked="${key}"></div>`;}
function controls(){
 $('#options').innerHTML=field('01','Форма руля','<div class="fixed">Круглый руль <span>Выбрано ✓</span></div>')+
 field('02','Материал в зоне хвата',choicesPriced('side',MATERIALS,sidePriceFor))+
 field('03','Цвет зоны хвата',palette('sideColor',data.leathers,true)+freeNote)+
 field('04','Строчка обода',palette('sideStitch',data.stitches)+freeNote)+
 field('05','Материал сверху и снизу',choicesPriced('top',[...MATERIALS,...CARBONS],topPriceFor))+
 field('06','Цвет верха и низа',palette('topColor',data.leathers,true)+freeNote,'top-color-field')+
 field('08','Накладка на спицы',choicesPriced('trim',TRIMS,tablePrice(PRICES.trim)))+
 field('08','Центральная вставка',`<div data-parts="insert">${choicesPriced('insert',INSERTS.map(([v,n,t])=>[v,n,t||'']),tablePrice(PRICES.insert))}</div>${partsLocked}${partsNote}`,'insert-field')+
 field('08','Накладки возле кнопок',`<div data-parts="strips">${choicesPriced('strips',STRIPS.map(([v,n,t])=>[v,n,t||'']),tablePrice(PRICES.strips))}</div>${partsLocked}`,'strips-field')+
 field('09','Обшивка крышки подушки',choicesPriced('airbag',AIRBAGS,tablePrice(PRICES.airbag))+'<p class="picked">Меняется только обшивка крышки, модуль подушки остаётся. Цвет обшивки — чёрный глянец</p>')+
 field('10','Строчка на подушке',`<div id="airbag-stitch">${palette('airbagStitch',data.stitches)}</div><div id="original-note" class="fixed">Штатная отделка подушки</div>`)+
 field('11','Метка на 12 часов',choicesPriced('markerMode',[['none','Без метки'],['yes','Добавить метку']],markerPriceFor)+`<div id="marker-colors" hidden>${palette('marker',data.markers,true)}</div>`)+
 field('12','Подогрев и вибро',heatVibGroup())+
 field('14','Адаптивный круиз-контроль',choices('acc',[['no','Без адаптивного круиза'],['yes','С адаптивным круизом']])+'<p class="picked">Бесплатно. Работу функций проверим по Вашему автомобилю.</p>');
 $('#options').elements.markerMode.value=state.marker==='none'?'none':'yes';enhancePanels($('#options'));sync();
}
function rows(){return [['Автомобиль','BMW G'],['Форма','Круглый'],['Зона хвата',label(MATERIALS,state.side)],['Цвет зоны хвата',colorLabel(state.sideColor)],['Строчка обода',RU[state.sideStitch]],['Верх и низ',label([...MATERIALS,...CARBONS],state.top)],...(!isCarbon()?[['Цвет верха и низа',colorLabel(state.topColor)]]:[]),['Накладка на спицы',label(TRIMS,state.trim)],...(state.trim==='original'?[['Центральная вставка',label(INSERTS,state.insert)],['Накладки возле кнопок',label(STRIPS,state.strips)]]:[]),['Обшивка крышки подушки',label(AIRBAGS,state.airbag)],...(state.airbag!=='original'?[['Цвет обшивки подушки','Чёрный глянец · 9860'],['Строчка на подушке',RU[state.airbagStitch]]]:[]),['Метка на 12 часов',state.marker==='none'?'Без метки':`${MRU[marker(state.marker).name]||marker(state.marker).name} · ${markerPlace()}`],['Подогрев',state.heat==='yes'?'С подогревом':'Без подогрева'],['Вибро',state.vibration==='yes'?'С вибро':'Без вибро'],['Адаптивный круиз-контроль',state.acc==='yes'?'С адаптивным круизом':'Без адаптивного круиза']];}
function isCarbon(){return CARBONS.some(([id])=>id===state.top);}
function markerPlace(){return isCarbon()?'на карбоне':state.top==='alcantara'?'на алькантаре':'на коже';}
function sync(){
 $('#top-color-field').hidden=isCarbon();
 $('#airbag-stitch').hidden=state.airbag==='original';$('#original-note').hidden=state.airbag!=='original';$('#marker-colors').hidden=state.marker==='none';
 if($('#heatvib-group'))$('#heatvib-group').outerHTML=heatVibGroup();
 setBadge($('[data-price-for="side:alcantara"]'),sidePriceFor('alcantara'));setBadge($('[data-price-for="top:alcantara"]'),topPriceFor('alcantara'));
 // Карбоновая накладка закрывает зону вставки и полосок: отдельно их не выбираем и не считаем дважды.
 {const locked=state.trim!=='original';for(const box of document.querySelectorAll('[data-parts]'))box.hidden=locked;for(const p of document.querySelectorAll('[data-parts-locked]'))p.hidden=!locked;const note=$('[data-parts-note]');if(note)note.hidden=locked;}
 for(const el of document.querySelectorAll('[data-picked]')){const key=el.dataset.picked;el.textContent=key==='marker'?(state.marker==='none'?'':`${MRU[marker(state.marker).name]||marker(state.marker).name} · ${state.marker}`):key.endsWith('Color')?`${colorLabel(state[key])} · ${state[key]}`:RU[state[key]];}
 refreshPanels($('#options'));$('#summary').innerHTML=rows().map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
 showPrice($('#price'),currentQuote());
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
function currentRequest(){const summary=[...rows(),priceRow(currentQuote())],link=configurationLink('bmw-gseries',state);return {modelId:'bmw-gseries',rows:summary,link,message:requestText(summary,link)};}
function allowedOption(key,s=state){
 if(key==='side')return MATERIALS.map(([id])=>id);
 if(key==='top')return [...MATERIALS,...CARBONS].map(([id])=>id);
 if(key==='trim')return TRIMS.map(([id])=>id);
 if(key==='insert')return s.trim==='original'?INSERTS.map(([id])=>id):['original'];
 if(key==='strips')return s.trim==='original'?STRIPS.map(([id])=>id):['original'];
 if(key==='airbag')return AIRBAGS.map(([id])=>id);
 if(key.endsWith('Color'))return data.leathers.map(c=>c.code);
 if(key.endsWith('Stitch'))return data.stitches.map(c=>c.key);
 if(key==='marker')return ['none',...data.markers.map(c=>c.code)];
 return ['no','yes'];
}
const requestSharing=bindRequest({canvas:$('#wheel'),order:$('#order'),shareButton:$('#share-photo'),note:$('#share-note'),getRequest:currentRequest,isReady:()=>ready&&!rendering});
$('#options').addEventListener('submit',e=>e.preventDefault());
$('#options').addEventListener('click',e=>{
 const hv=e.target.closest('[data-hv]');if(!hv)return;
 const v=hv.dataset.hv;
 if(v==='heat')state.heat=state.heat==='yes'?'no':'yes';
 else if(v==='vib')state.vibration=state.vibration==='yes'?'no':'yes';
 else if(v==='both'){state.heat='no';state.vibration='no';}
 sync();render();
});
$('#options').addEventListener('change',e=>{const {name,value}=e.target;if(name==='sideStitch')state.topStitch=value;if(name==='trim'&&value!=='original'){state.insert='original';state.strips='original';for(const k of ['insert','strips'])$(`input[name="${k}"][value="original"]`).checked=true;}if(name==='markerMode'){state.marker=value==='none'?'none':'white';if(value!=='none')$('#options').querySelector('input[name="marker"][value="white"]').checked=true;}else if(name in state)state[name]=value;else return;sync();render();});
$('#options').addEventListener('input',e=>{if(!e.target.matches('.palette-search'))return;const q=e.target.value.trim().toLowerCase(),key=e.target.dataset.search;for(const c of document.querySelectorAll(`[data-palette="${key}"] label`))c.hidden=!c.dataset.colorName.includes(q);});
$('#reset').addEventListener('click',()=>{state=defaults();history.replaceState(null,'',location.pathname+location.search);$('#shared-note').textContent='';controls();render();});
$('#save').addEventListener('click',()=>{if(!ready||rendering)return;$('#wheel').toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='BMW-G-моя-конфигурация.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},'image/png');});
try{const response=await fetch(new URL('options.json?v=164',ASSET));if(!response.ok)throw Error('Options missing');data=await response.json();try{const r=await fetch('catalog.json?v=153');if(r.ok)catalog=await r.json();}catch{}const restored=readConfiguration(location.hash,'bmw-gseries',defaults(),allowedOption);state=restored.state;$('#shared-note').textContent=restored.error?'Ссылка на конфигурацию повреждена. Показаны начальные параметры.':restored.shared?'Открыта конфигурация по ссылке.':'';controls();await render();}catch(e){$('#status').textContent='Не удалось загрузить конструктор. Обновите страницу.';$('#options').innerHTML='<p>Варианты временно недоступны.</p>';console.error(e);}
// Like the reference, give the option panel more room once the visitor scrolls.
function compactPreview(){document.body.classList.toggle('is-compact',matchMedia('(max-width:760px)').matches&&window.scrollY>80);}
window.addEventListener('scroll',compactPreview,{passive:true});window.addEventListener('resize',compactPreview);compactPreview();
