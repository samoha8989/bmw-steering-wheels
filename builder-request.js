// Keep this v1 field order stable: already-sent links must restore the same wheel.
const FIELDS=['shape','side','sideColor','sideStitch','top','topColor','trim','airbag','airbagColor','airbagStitch','marker','led','heat','vibration','acc'];
const CHANNEL='Подписывайся на наш лайв-канал: https://t.me/bmw_steeringwheels';
export function configurationLink(modelId,state,base=location.href){
 const token=btoa(JSON.stringify([1,modelId,...FIELDS.map(k=>state[k]??null)])).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 const url=new URL(base);url.search='';if(modelId!=='bmw-gseries')url.searchParams.set('model',modelId);url.searchParams.set('v','155');url.hash='c='+token;return url.href;
}
export function readConfiguration(hash,modelId,defaults,allowed){
 if(!hash.startsWith('#c='))return {state:{...defaults},shared:false};
 try{
  const token=hash.slice(3);if(token.length>1800||!/^[-_a-zA-Z0-9]+$/.test(token))throw Error();
  const values=JSON.parse(atob(token.replace(/-/g,'+').replace(/_/g,'/')));
  if(!Array.isArray(values)||values.length!==FIELDS.length+2||values[0]!==1||values[1]!==modelId)throw Error();
  const state={...defaults};
  FIELDS.forEach((key,i)=>{const value=values[i+2];if(!(key in defaults)){if(value!==null)throw Error();return;}if(typeof value!=='string'||value.length>64)throw Error();state[key]=value;});
  for(const key of FIELDS)if(key in defaults&&!allowed(key,state).includes(state[key]))throw Error();
  if(state.led==='yes'&&state.marker!=='none')throw Error();
  state.topStitch=state.sideStitch;return {state,shared:true};
 }catch{return {state:{...defaults},shared:false,error:true};}
}
export function requestText(rows,link){return ['Здравствуйте! Подскажите цену этого руля:','',...rows.map(([k,v])=>`${k}: ${v}`),'','Посмотреть мой собранный руль:',link,'',CHANNEL].join('\n');}
export function telegramLink(message){return 'https://t.me/samoha8989?text='+encodeURIComponent(message);}
const ORDER_ENDPOINT='https://wheel-orders.vserul-wheels.workers.dev';
export function bindRequest({canvas,order,shareButton,note,getRequest,isReady}){
 let photo=null,generation=0,sending=false;
 // Пока клиент нажимает кнопку, фото руля и текст заявки уходят владельцу; затем открывается чат с готовым текстом.
 order.addEventListener('click',async event=>{
  if(!isReady()){event.preventDefault();return;}
  const request=getRequest(),href=telegramLink(request.message);order.href=href;
  if(!photo)return;
  event.preventDefault();if(sending)return;sending=true;
  try{
   const body=new FormData();body.set('photo',photo);body.set('text',request.message);
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
   try{await fetch(ORDER_ENDPOINT,{method:'POST',body,signal:controller.signal});}finally{clearTimeout(timer);}
  }catch{/* если отправка не удалась, клиент всё равно попадает в чат с готовым текстом */}
  sending=false;location.href=href;
 });
 function invalidate(){generation++;photo=null;shareButton.disabled=true;note.textContent='';}
 function preparePhoto(){
  const id=++generation,{modelId,rows}=getRequest();
  // The exported card includes its specification even when a messenger drops the caption.
  const sheet=document.createElement('canvas'),ctx=sheet.getContext('2d');
  const width=1254,lines=[];ctx.font='22px sans-serif';
  for(const [key,value] of rows){let line='';for(const word of `${key}: ${value}`.split(' ')){const next=line?line+' '+word:word;if(ctx.measureText(next).width>width-96&&line){lines.push(line);line=word;}else line=next;}lines.push(line);}
  sheet.width=width;sheet.height=1254+125+lines.length*34;ctx.fillStyle='#fff';ctx.fillRect(0,0,sheet.width,sheet.height);ctx.drawImage(canvas,0,0,1254,1254);
  ctx.fillStyle='#111';ctx.font='bold 32px sans-serif';ctx.fillText('Моя конфигурация руля',48,1302);ctx.font='22px sans-serif';lines.forEach((line,i)=>ctx.fillText(line,48,1352+i*34));
  sheet.toBlob(blob=>{if(id!==generation||!blob||!isReady())return;photo=new File([blob],modelId+'-конфигурация.jpg',{type:'image/jpeg'});shareButton.disabled=false;},'image/jpeg',.88);
 }
 shareButton.addEventListener('click',async()=>{
  if(!isReady()||!photo)return;
  const {message}=getRequest();
  if(navigator.share&&navigator.canShare?.({files:[photo]})){
   try{await navigator.share({files:[photo],text:message,title:'Моя конфигурация руля'});note.textContent='';}
   catch(error){if(error.name!=='AbortError')note.textContent='Не удалось открыть отправку. Нажмите «Фото ↓», сохраните снимок и прикрепите его в Telegram.';}
  }else{
   const url=URL.createObjectURL(photo),a=document.createElement('a');a.href=url;a.download=photo.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   note.textContent='Карточка руля сохранена. Прикрепите её к заявке в Telegram.';
  }
 });
 return {invalidate,preparePhoto};
}
