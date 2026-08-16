export default async function handler(req,res){
  res.setHeader('Cache-Control','s-maxage=60, stale-while-revalidate=300');
  const split=value=>(value||'').split(',').map(Number),[sx,sy]=split(req.query.start),[ex,ey]=split(req.query.goal);
  if(![sx,sy,ex,ey].every(Number.isFinite))return res.status(400).json({message:'출발지 또는 도착지 좌표가 올바르지 않습니다.'});
  const key=process.env.KAKAO_REST_API_KEY;if(!key)return res.status(503).json({message:'카카오 대중교통 서버 키를 연결해야 합니다.'});
  try{
    const url=new URL('https://dapi.kakao.com/v2/routing/publictraffic');Object.entries({start_x:sx,start_y:sy,end_x:ex,end_y:ey,s_name:req.query.startName||'출발',e_name:req.query.endName||'도착',input_coord:'WGS84',output_coord:'WGS84'}).forEach(([k,v])=>url.searchParams.set(k,v));
    const response=await fetch(url,{headers:{Authorization:`KakaoAK ${key}`}}),data=await response.json(),route=data.routes?.[0];
    if(!response.ok||data.status!=='OK'||!route)return res.status(response.ok?422:response.status).json({message:data.message||`대중교통 경로 없음 (${data.status||response.status})`});
    const steps=route.steps.map(step=>({type:step.properties?.type||'',guidance:step.properties?.guidance||'',vehicles:(step.properties?.vehicles||[]).map(v=>v.name),stops:(step.properties?.stops||[]).map(v=>v.name),points:step.path?.points||[]}));
    return res.status(200).json({totalDistance:route.properties.totalDistance,totalTime:route.properties.totalTime,transfers:route.properties.transfers,fare:route.properties.fare?.value||route.properties.fare?.min||0,steps,path:steps.flatMap(s=>s.points),landingURL:data.properties?.landingURL||''});
  }catch{return res.status(502).json({message:'카카오 대중교통 서버에 연결하지 못했습니다.'})}
}
