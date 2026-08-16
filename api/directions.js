export default async function handler(req,res){
  res.setHeader('Cache-Control','s-maxage=60, stale-while-revalidate=300');
  const {start,goal}=req.query;
  if(!/^\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(start||'')||!/^\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(goal||''))return res.status(400).json({message:'출발지 또는 도착지 좌표가 올바르지 않습니다.'});
  const clientId=process.env.NAVER_MAP_CLIENT_ID,clientSecret=process.env.NAVER_MAP_CLIENT_SECRET;
  if(!clientId||!clientSecret)return res.status(503).json({message:'Vercel에 네이버 Directions 서버 키를 연결해야 합니다.'});
  try{
    const url=new URL('https://maps.apigw.ntruss.com/map-direction/v1/driving');url.searchParams.set('start',start);url.searchParams.set('goal',goal);url.searchParams.set('option','traoptimal');
    const response=await fetch(url,{headers:{'x-ncp-apigw-api-key-id':clientId,'x-ncp-apigw-api-key':clientSecret}}),data=await response.json(),route=data.route?.traoptimal?.[0];
    if(!response.ok||!route)return res.status(response.ok?422:response.status).json({message:data.message||'자동차 경로를 찾지 못했습니다.'});
    return res.status(200).json({path:route.path,distance:route.summary.distance,duration:route.summary.duration,tollFare:route.summary.tollFare,fuelPrice:route.summary.fuelPrice,taxiFare:route.summary.taxiFare});
  }catch{return res.status(502).json({message:'네이버 Directions 서버에 연결하지 못했습니다.'})}
}
