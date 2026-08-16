const ymd=date=>date.toISOString().slice(0,10).replaceAll('-','');
const displayDate=value=>value&&value.length===8?`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6)}`:'';

export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({message:'Method not allowed'});
  const storedKey=process.env.TOUR_API_KEY;
  const key=storedKey?(()=>{try{return decodeURIComponent(storedKey)}catch{return storedKey}})():'';
  if(!key)return res.status(503).json({message:'TourAPI key is not configured.',festivals:[]});
  const today=new Date(),from=new Date(today),to=new Date(today);
  from.setDate(from.getDate()-30);to.setDate(to.getDate()+90);
  const params=new URLSearchParams({
    serviceKey:key,
    MobileOS:'ETC',
    MobileApp:'witchMap',
    _type:'json',
    numOfRows:'200',
    pageNo:'1',
    arrange:'A',
    eventStartDate:ymd(from),
    eventEndDate:ymd(to)
  });
  try{
    const response=await fetch(`https://apis.data.go.kr/B551011/KorService2/searchFestival2?${params}`);
    if(!response.ok)throw new Error(`TourAPI ${response.status}`);
    const data=await response.json();
    const header=data?.response?.header;
    if(header?.resultCode&&header.resultCode!=='0000')throw new Error(`${header.resultCode}: ${header.resultMsg||'TourAPI error'}`);
    const raw=data?.response?.body?.items?.item||[];
    const items=Array.isArray(raw)?raw:raw?[raw]:[];
    const festivals=items.filter(item=>/^(서울|인천)/.test(item.addr1||'')&&Number(item.mapx)&&Number(item.mapy)).map(item=>({
      id:`tour-festival-${item.contentid}`,
      sourceId:String(item.contentid),
      kind:'festival',
      type:'festival',
      festival:true,
      name:item.title,
      area:[item.addr1,item.addr2].filter(Boolean).join(' '),
      lat:Number(item.mapy),
      lng:Number(item.mapx),
      image:item.firstimage||item.firstimage2||'',
      startDate:displayDate(item.eventstartdate),
      endDate:displayDate(item.eventenddate),
      desc:'한국관광공사 TourAPI 지역축제',
      source:'한국관광공사 TourAPI'
    }));
    res.setHeader('Cache-Control','s-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json({festivals,updatedAt:new Date().toISOString()});
  }catch(error){return res.status(502).json({message:'지역축제 정보를 불러오지 못했습니다.',detail:error.message,festivals:[]});}
}
