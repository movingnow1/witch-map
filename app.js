const seedPlaces = [
  {id:'p1',name:'모래내 로스터스',type:'cafe',area:'인천 남동구 구월동',lat:37.4492,lng:126.7128,parking:true,publicParking:false,cozy:true,quiet:true,quietTimes:['평일 낮'],desc:'큰 소파와 낮은 조명이 있는 동네 로스터리',reservable:true},
  {id:'p2',name:'개항로 고요',type:'cafe',area:'인천 중구 개항로',lat:37.4739,lng:126.6216,parking:false,publicParking:true,cozy:true,quiet:false,quietTimes:[],desc:'오래된 건물을 살린 작은 방 형태의 카페',reservable:false},
  {id:'p3',name:'송도 테이블',type:'food',area:'인천 연수구 송도동',lat:37.3928,lng:126.6389,parking:true,publicParking:false,cozy:false,quiet:true,quietTimes:['평일 저녁'],desc:'주차가 편하고 좌석 간격이 넓은 다이닝',reservable:true},
  {id:'p4',name:'연남 느린정원',type:'cafe',area:'서울 마포구 연남동',lat:37.5627,lng:126.9257,parking:false,publicParking:true,cozy:true,quiet:true,quietTimes:['평일 낮'],desc:'안쪽 분리 좌석에서 오래 머물기 좋은 공간',reservable:true},
  {id:'p5',name:'성수 담소식당',type:'food',area:'서울 성동구 성수동',lat:37.5446,lng:127.0558,parking:true,publicParking:false,cozy:true,quiet:false,quietTimes:[],desc:'예약 가능한 반분리 룸이 있는 한식당',reservable:true},
  {id:'p6',name:'서촌 구름상점',type:'cafe',area:'서울 종로구 서촌',lat:37.5792,lng:126.9701,parking:false,publicParking:true,cozy:false,quiet:true,quietTimes:['토·일'],desc:'주말 아침이 특히 고요한 작은 찻집',reservable:false},
  {id:'p7',name:'을지로 한상',type:'food',area:'서울 중구 을지로',lat:37.5661,lng:126.9912,parking:false,publicParking:true,cozy:false,quiet:false,quietTimes:[],desc:'계절 메뉴를 내는 캐주얼 한식당',reservable:true},
  {id:'p8',name:'부평 오프화이트',type:'cafe',area:'인천 부평구 부평동',lat:37.4938,lng:126.723,parking:true,publicParking:false,cozy:true,quiet:true,quietTimes:['평일 낮','평일 저녁'],desc:'건물 주차와 푹신한 소파가 있는 대형 카페',reservable:true}
];
const store = {
  get:(key,fallback)=>JSON.parse(localStorage.getItem(`masil_${key}`)||JSON.stringify(fallback)),
  set:(key,value)=>localStorage.setItem(`masil_${key}`,JSON.stringify(value))
};
let places=store.get('places',seedPlaces), visited=new Set(store.get('visited',[])), coupons=store.get('coupons',[]), bookings=store.get('bookings',[]), activeFilter='all', search='';
const map=L.map('map',{zoomControl:false}).setView([37.52,126.89],10); L.control.zoom({position:'bottomright'}).addTo(map);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);
let markerLayer=L.layerGroup().addTo(map);
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function filtered(){return places.filter(p=>{const match=!search||`${p.name} ${p.area} ${p.desc}`.toLowerCase().includes(search); if(!match)return false; return activeFilter==='all'||(activeFilter==='visited'?visited.has(p.id):p[activeFilter]);});}
function color(p){return visited.has(p.id)?'#40a987':p.type==='cafe'?'#ed744f':'#5387b8'}
function markerIcon(p){return L.divIcon({className:'',html:`<div class="custom-marker" style="background:${color(p)}"><span>${p.type==='cafe'?'☕':'⌂'}</span></div>`,iconSize:[35,35],iconAnchor:[17,34]})}
function tags(p){return [p.parking&&'건물 주차',p.publicParking&&'공용주차장',p.cozy&&'편안해요',p.quiet&&`한적해요${p.quietTimes.length?' · '+p.quietTimes[0]:''}`,visited.has(p.id)&&'탐험 완료'].filter(Boolean)}
function render(){const data=filtered(); markerLayer.clearLayers(); data.forEach(p=>L.marker([p.lat,p.lng],{icon:markerIcon(p)}).addTo(markerLayer).bindTooltip(p.name).on('click',()=>openDetail(p.id)));
  $('#placeList').innerHTML=data.map(p=>`<article class="place-card ${visited.has(p.id)?'visited-card':''}" data-id="${p.id}"><div class="place-thumb">${p.type==='cafe'?'☕':'♨'}</div><div><p>${p.area}</p><h3>${p.name}</h3><p>${p.desc}</p><div class="tags">${tags(p).map(t=>`<span class="tag">${t}</span>`).join('')}</div></div></article>`).join('')||'<p>조건에 맞는 장소가 없어요.</p>';
  $('#resultCount').textContent=`${data.length}곳`; $('#resultTitle').innerHTML=activeFilter==='all'?'오늘 어디로<br>마실 갈까요?':`${$('.filter.active').textContent}<br>장소 모아보기`;
  const count=visited.size; $('#progressText').textContent=`${count}곳 완료`; $('#progressBar').style.width=`${Math.min(100,count/places.length*100)}%`; $$('.place-card').forEach(el=>el.onclick=()=>openDetail(el.dataset.id));
}
function openDetail(id){const p=places.find(x=>x.id===id), pc=coupons.filter(c=>c.placeId===id); map.flyTo([p.lat,p.lng],14); $('#detailContent').innerHTML=`<div class="detail-hero"><button class="close" style="color:white" onclick="detailDialog.close()">×</button><p>${p.area}</p><h2>${p.name}</h2><span>${p.type==='cafe'?'카페':'식당'} · ${p.desc}</span></div><div class="detail-body"><div class="feature-grid"><div class="feature">🚙<br>${p.parking?'건물 내 주차':'주차 없음'}</div><div class="feature">🛋<br>${p.cozy?'편안한 좌석':'일반 좌석'}</div><div class="feature">☁<br>${p.quiet?p.quietTimes.join(' · ')||'한적함':'보통 붐빔'}</div></div>${pc.map(c=>`<div class="coupon"><b>🎟 ${c.title}</b><br><small>${c.condition} · ${c.expires}까지</small></div>`).join('')}<div class="actions"><button class="secondary" onclick="toggleVisited('${p.id}')">${visited.has(p.id)?'✓ 탐험 완료 취소':'✓ 다녀왔어요'}</button>${p.reservable?`<button class="primary" onclick="openBooking('${p.id}')">예약하기</button>`:'<button class="primary" disabled>예약 미지원</button>'}</div></div>`; $('#detailDialog').showModal();}
function toggleVisited(id){visited.has(id)?visited.delete(id):visited.add(id);store.set('visited',[...visited]);$('#detailDialog').close();toast(visited.has(id)?'탐험 완료! 지도에 내 영토가 생겼어요.':'탐험 기록을 취소했어요.');render()}
function openBooking(id){$('#detailDialog').close();$('#bookingForm [name=placeId]').value=id;$('#bookingDialog').showModal()}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
$$('.filter').forEach(btn=>btn.onclick=()=>{$$('.filter').forEach(b=>b.classList.remove('active'));btn.classList.add('active');activeFilter=btn.dataset.filter;render()});
$('#searchInput').oninput=e=>{search=e.target.value.trim().toLowerCase();render()}; $('#homeBtn').onclick=()=>{map.setView([37.52,126.89],10);search='';$('#searchInput').value='';render()};
function populatePlaces(){$('#reportPlace').innerHTML=places.map(p=>`<option value="${p.id}">${p.name} · ${p.area}</option>`).join('');$$('.ownerPlace').forEach(s=>s.innerHTML=places.map(p=>`<option value="${p.id}">${p.name}</option>`).join(''))}
$('#openReport').onclick=()=>$('#reportDialog').showModal();$('#openOwner').onclick=()=>{renderBookings();$('#ownerDialog').showModal()}; $$('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$('#reportForm').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.target),p=places.find(x=>x.id===$('#reportPlace').value);['parking','cozy','quiet'].forEach(k=>{if(fd.get(k))p[k]=true});if(fd.get('quietTime')&&!p.quietTimes.includes(fd.get('quietTime')))p.quietTimes.push(fd.get('quietTime'));store.set('places',places);e.target.reset();$('#reportDialog').close();render();toast('제보가 지도 필터에 반영됐어요. 고마워요!')};
$$('.tab').forEach(t=>t.onclick=()=>{$$('.tab,.tab-pane').forEach(x=>x.classList.remove('active'));t.classList.add('active');$(`[data-pane="${t.dataset.tab}"]`).classList.add('active')});
$('#couponForm').onsubmit=e=>{e.preventDefault();const fd=Object.fromEntries(new FormData(e.target));coupons.push({...fd,id:crypto.randomUUID()});store.set('coupons',coupons);e.target.reset();$('#ownerDialog').close();toast('쿠폰이 발행되어 장소 상세에 표시돼요.')};
$('#bookingForm').onsubmit=e=>{e.preventDefault();const fd=Object.fromEntries(new FormData(e.target));bookings.push({...fd,id:crypto.randomUUID(),status:'대기'});store.set('bookings',bookings);e.target.reset();$('#bookingDialog').close();toast('예약 요청을 보냈어요. 점주 확인을 기다려주세요.')};
function renderBookings(){$('#bookingList').innerHTML=bookings.length?bookings.map(b=>{const p=places.find(x=>x.id===b.placeId);return `<div class="booking-row"><button onclick="confirmBooking('${b.id}')">${b.status}</button><b>${p?.name}</b><br>${b.name} · ${b.party}명 · ${b.date.replace('T',' ')}</div>`}).join(''):'<p>아직 들어온 예약이 없어요.</p>'}
function confirmBooking(id){const b=bookings.find(x=>x.id===id);b.status=b.status==='대기'?'확정':'대기';store.set('bookings',bookings);renderBookings();toast(`예약을 ${b.status} 상태로 변경했어요.`)}
window.toggleVisited=toggleVisited;window.openBooking=openBooking;window.confirmBooking=confirmBooking;window.detailDialog=$('#detailDialog');populatePlaces();render();

