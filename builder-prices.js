// Розничные доплаты конструкторов BMW (F и G), только в рублях. Это единственное место, где они задаются.
// Число — утверждённая доплата (0 — входит в цену). null — цена ещё не утверждена: на сайте «цена уточняется»,
// итог показывается без этой опции с предупреждением. Закупочные цены и наценку сюда не писать: файл публичный.
export const PRICES={
 heat:7900,vibration:4900,heatVibration:11900,
 alcantaraSide:2500,alcantaraFull:8900, // бока / весь обод (бока + верх и низ)
 marker:3500,
 perforated:0,
 topCarbon:{glossy:0,matte:0,forged:null},
 airbag:{original:0,smooth:null,alcantara:null}, // обшивка крышки подушки, не замена модуля
 trim:{original:0,glossy:null,matte:null,forged:null}, // накладка на спицы
 insert:{original:0,carbon1:null,carbon2:null,forged:null}, // центральная вставка (BMW G)
 strips:{original:0,slim:null,wide:null} // накладки возле кнопок (BMW G)
};
const fmt=n=>new Intl.NumberFormat('ru-RU').format(n);
export const money=n=>fmt(n)+' ₽';
// Бейдж цены на карточке: undefined — без бейджа, null — «цена уточняется», число — «+N ₽».
export function badge(price,key=''){
 if(price===undefined)return '';
 const attr=key?` data-price-for="${key}"`:'';
 return price===null?`<span class="hv-price is-pending"${attr}>цена уточняется</span>`:`<span class="hv-price"${attr}>+${money(price)}</span>`;
}
export function setBadge(el,price){if(!el)return;if(price===undefined){el.hidden=true;return;}el.hidden=false;el.classList.toggle('is-pending',price===null);el.textContent=price===null?'цена уточняется':'+'+money(price);}
const pick=(table,id)=>id in table?table[id]:null;
// Выбранные отличия от штатной комплектации: [название, доплата|null]. Каждая деталь учитывается один раз.
export function addons(s,names={}){
 const P=PRICES,L=[];
 if(s.heat==='yes'&&s.vibration==='yes')L.push(['Подогрев + вибро',P.heatVibration]);
 else{if(s.heat==='yes')L.push(['Подогрев',P.heat]);if(s.vibration==='yes')L.push(['Вибро',P.vibration]);}
 const alc=(s.side==='alcantara')+(s.top==='alcantara');
 if(alc===1)L.push(['Алькантара',P.alcantaraSide]);else if(alc===2)L.push(['Алькантара на всём ободе',P.alcantaraFull]);
 if(s.side==='perforated'||s.top==='perforated')L.push(['Перфорированная кожа',P.perforated]);
 if(s.top in P.topCarbon)L.push([names.top||'Карбон верха и низа',P.topCarbon[s.top]]);
 if(s.trim&&s.trim!=='original')L.push([names.trim||'Накладка на спицы',pick(P.trim,s.trim)]);
 if(s.insert&&s.insert!=='original')L.push([names.insert||'Центральная вставка',pick(P.insert,s.insert)]);
 if(s.strips&&s.strips!=='original')L.push([names.strips||'Накладки возле кнопок',pick(P.strips,s.strips)]);
 if(s.airbag&&s.airbag!=='original')L.push([names.airbag||'Обшивка крышки подушки',pick(P.airbag,s.airbag)]);
 if(s.marker&&s.marker!=='none')L.push(['Метка на 12 часов',P.marker]);
 return L;
}
// base — каталожная цена «от» без опций (null, если в каталоге нет цены).
export function quote(base,lines){
 const pending=lines.filter(([,p])=>p===null).map(([n])=>n);
 const total=Number.isFinite(base)?base+lines.reduce((sum,[,p])=>sum+(p||0),0):null;
 return {total,pending};
}
export function priceRow(q){
 if(q.total==null)return ['Цена','уточнит менеджер'];
 return ['Цена',q.pending.length?`от ${money(q.total)} без учёта опций, стоимость которых уточняется: ${q.pending.join(', ')}`:`от ${money(q.total)}`];
}
// Нижняя панель: сумма и предупреждение. Неутверждённые доплаты в сумму не входят и не выдаются за бесплатные.
export function showPrice(priceEl,q){
 const box=priceEl.parentElement,head=box.querySelector('small'),note=priceEl.nextElementSibling;
 box.classList.toggle('is-pending',q.pending.length>0);
 if(q.total==null){priceEl.textContent='Уточним стоимость';head.textContent='Цена по каталогу';note.textContent='Итоговую стоимость выбранных деталей уточнит менеджер';return;}
 priceEl.textContent='от '+money(q.total);
 head.textContent=q.pending.length?'Цена без уточняемых опций':'Цена по каталогу';
 note.textContent=q.pending.length?'Стоимость выбранных дополнительных опций уточняется':'Итоговую стоимость выбранных деталей уточнит менеджер';
}
