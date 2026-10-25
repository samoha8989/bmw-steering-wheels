export const defaults = {heating:'unknown',vibration:'unknown',cruise:'unknown',brand:'',series:'',branch:'',model:'',year:'',availability:'all',sort:'recommended',budget:'',q:''};
export const featureLabels = {
 heating:{yes:'С подогревом',no:'Без подогрева',unknown:'Подогрев — уточнить'},
 vibration:{yes:'Нужна вибрация',no:'Вибрация не нужна',unknown:'Вибрация — уточнить'},
 cruise:{yes:'Нужен круиз',no:'Круиз не нужен',unknown:'Круиз — уточнить'}
};
export const keyOf = p => p.availability+':'+p.id;
export const BRANDS=['Mercedes','Porsche','Toyota','Audi'];
export const ONE = b => BRANDS.includes(b)
export const brandName = b => b==='Mercedes'?'Mercedes-Benz':b
export const brandKey = p => ONE(p.series)?p.series:'BMW'
export const brandOf = p => p.series==='Mercedes'?'Mercedes-Benz':ONE(p.series)?p.series:'BMW';
export function cleanState(value={}){
 const s={...defaults};
 for(const k of ['heating','vibration','cruise'])if(Object.hasOwn(featureLabels[k],value[k]))s[k]=value[k];
 if(['BMW',...BRANDS].includes(value.brand))s.brand=value.brand;
 if(['E','F','G',...BRANDS].includes(value.series))s.series=value.series;
 if(['E60','Eother','Fsmall','Flarge','E','F','G',...BRANDS].includes(value.branch))s.branch=value.branch;
 for(const k of ['model','year','q'])if(typeof value[k]==='string')s[k]=value[k].slice(0,k==='year'?4:100);
 if(['all','order','stock'].includes(value.availability))s.availability=value.availability;
 if(['recommended','price-asc','price-desc','photos'].includes(value.sort))s.sort=value.sort;
 if(['','20000','30000','40000','50000','70000'].includes(value.budget))s.budget=value.budget;
 if(ONE(s.brand)){s.series=s.brand;s.branch=s.brand;s.availability='order';}
 if(s.series==='E')s.availability='order';
 return s;
}
export function priceInfo(p,s={},branchOverride){
 const matchesCar = (!s.brand || s.brand===brandKey(p)) && (!s.series || (p.compatibleSeries||[p.series]).includes(s.series));
 const branch=branchOverride || (matchesCar?s.branch:'');
 const options = p.prices[branch] ? [p.prices[branch]] : p.prices.default ? [p.prices.default] : Object.values(p.prices);
 const packageRequired=p.series==='Mercedes'&&(s.heating==='yes'||s.vibration==='yes');
 const selected=packageRequired?'heated':s.heating==='yes'?'heated':s.heating==='no'?'unheated':null;
 const values=[];let unknown=false;
 for(const option of options){
  if(Number.isFinite(option.single)){values.push(option.single);unknown=true;}
  else if(selected){if(Number.isFinite(option[selected]))values.push(option[selected]);else unknown=true;}
  else for(const k of ['unheated','heated'])if(Number.isFinite(option[k]))values.push(option[k]);
 }
 const min=values.length?Math.min(...values):null,max=values.length?Math.max(...values):null;
 let caption=unknown?'Кузов и комплектацию уточним':selected==='heated'?(p.series==='Mercedes'?'Подогрев + вибрация':'С подогревом'):selected==='unheated'?'Без подогрева':options.every(o=>!Number.isFinite(o.heated))?'Без подогрева':options.every(o=>!Number.isFinite(o.unheated))?'С подогревом':'Без подогрева / с подогревом';
 if(options.length>1)caption='Цена зависит от кузова'+(s.heating==='yes'?' · подогрев уточним':'');
 return {min,max,range:min!==null&&min!==max,unknown,caption,selected};
}
export function filterProducts(catalog,s){
 const q=(s.q||'').trim().toLowerCase().replace(/^[№#\s]+/,'');
 const result=catalog.filter(p=>{
  if(s.brand&&((p.series==='Mercedes')!==(s.brand==='Mercedes')))return false;
  if(s.series&&!(p.compatibleSeries||[p.series]).includes(s.series))return false;
  if(p.groups&&['Fsmall','Flarge'].includes(s.branch)&&!p.groups.includes(s.branch))return false;
  if(s.availability&&s.availability!=='all'&&p.availability!==s.availability)return false;
  if(q&&!`${p.displayNumber} ${p.material||''} ${brandOf(p)} ${p.series}`.toLowerCase().includes(q))return false;
  const info=priceInfo(p,s);
  if(s.budget&&(info.min==null||info.min>Number(s.budget)))return false;
  return true;
 });
 return result.sort((a,b)=>s.sort==='price-asc'?(priceInfo(a,s).min??Infinity)-(priceInfo(b,s).min??Infinity):s.sort==='price-desc'?(priceInfo(b,s).min??-1)-(priceInfo(a,s).min??-1):s.sort==='photos'?b.photos.length-a.photos.length:Number(b.availability==='stock')-Number(a.availability==='stock'));
}
export function requestedFeatures(s){return ['heating','vibration','cruise'].map(k=>featureLabels[k][s[k]]).filter(Boolean);}
export function buildRequest(products,s,origin,branches={}){
 const lines=[products.length>1?'Здравствуйте! Помогите выбрать между этими рулями:':products.length?'Здравствуйте! Хочу заказать руль:':'Здравствуйте! Помогите подобрать руль.'];
 for(const p of products){
  const price=priceInfo(p,s,branches[keyOf(p)]); const amount=price.min==null?'уточнить':new Intl.NumberFormat('ru-RU').format(price.min)+(price.range?'–'+new Intl.NumberFormat('ru-RU').format(price.max):'')+' ₽';
  lines.push(`${brandOf(p)} № ${p.displayNumber} · ${p.availability==='stock'?'В наличии':'Под заказ'}`,`Цена в каталоге: ${amount} (${price.caption})`);
  if(p.photos?.[0])lines.push(`Фото: ${origin}/${p.photos[0]}`);
  lines.push(`${origin}/#/wheel/${p.availability}/${encodeURIComponent(p.id)}/${branches[keyOf(p)]||(p.series==='E'?(['E60','Eother'].includes(s.branch)?s.branch:'E'):p.series)}`);
 }
 lines.push('');
 for(const k of ['heating','vibration','cruise'])lines.push(({heating:'Подогрев',vibration:'Вибрация',cruise:'Круиз-контроль'})[k]+': '+(featureLabels[k][s[k]]||'помогите определить'));
 return lines.join('\n');
}
