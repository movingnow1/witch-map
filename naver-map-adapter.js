(function(){
  const groups=new Set();
  const latLng=v=>v instanceof naver.maps.LatLng?v:new naver.maps.LatLng(+v[0],+v[1]);
  const point=v=>({lat:typeof v.lat==='function'?v.lat():+v.lat,lng:typeof v.lng==='function'?v.lng():+v.lng});
  class MapAdapter{
    constructor(id){this.raw=new naver.maps.Map(id,{center:new naver.maps.LatLng(37.52,126.89),zoom:10,mapTypeControl:false,scaleControl:true,logoControl:true});this._zoom=10}
    setView(v,z){this.raw.setCenter(latLng(v));if(z!=null){this.raw.setZoom(z);this._zoom=z}return this}
    flyTo(v,z){this.raw.morph(latLng(v),z??this.raw.getZoom());this._zoom=z??this._zoom;return this}
    getCenter(){return point(this.raw.getCenter())}
    distance(a,b){const p1=Array.isArray(a)?{lat:+a[0],lng:+a[1]}:point(a),p2=Array.isArray(b)?{lat:+b[0],lng:+b[1]}:point(b),r=6371000,dLat=(p2.lat-p1.lat)*Math.PI/180,dLng=(p2.lng-p1.lng)*Math.PI/180,x=Math.sin(dLat/2)**2+Math.cos(p1.lat*Math.PI/180)*Math.cos(p2.lat*Math.PI/180)*Math.sin(dLng/2)**2;return 2*r*Math.asin(Math.sqrt(x))}
  }
  class LayerGroup{
    constructor(){this.items=[];groups.add(this)}
    addTo(map){this.map=map;return this}
    add(marker){this.items.push(marker);marker._attach(this.map);return marker}
    clearLayers(){this.items.forEach(x=>x.remove());this.items=[]}
  }
  class MarkerAdapter{
    constructor(v,options={}){this.position=latLng(v);this.options=options;this.events={}}
    addTo(target){if(target instanceof LayerGroup)return target.add(this);this._attach(target);return this}
    _attach(map){this.map=map;this.raw=new naver.maps.Marker({map:map.raw,position:this.position,draggable:!!this.options.draggable,icon:this.options.icon?.html?{content:this.options.icon.html,anchor:new naver.maps.Point(17,34)}:undefined});Object.entries(this.events).forEach(([name,fn])=>this._listen(name,fn))}
    _listen(name,fn){if(!this.raw)return;naver.maps.Event.addListener(this.raw,name,e=>fn(name==='dragend'?{target:this}:e))}
    bindTooltip(text){this.tooltip=text;return this}
    on(name,fn){this.events[name]=fn;if(this.raw)this._listen(name,fn);return this}
    getLatLng(){return point(this.raw?.getPosition()||this.position)}
    remove(){if(this.raw)this.raw.setMap(null);this.raw=null}
  }
  window.L={
    map:id=>new MapAdapter(id),
    marker:(v,o)=>new MarkerAdapter(v,o),
    layerGroup:()=>new LayerGroup(),
    divIcon:o=>o,
    tileLayer:()=>({addTo:()=>{}}),
    control:{zoom:()=>({addTo:()=>{}})}
  };
})();
