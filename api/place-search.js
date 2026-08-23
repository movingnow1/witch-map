export default async function handler(req,res){
  const key=process.env.KAKAO_REST_API_KEY,query=String(req.query?.query||'').trim();
  if(!key)return res.status(503).json({message:'Kakao Local API key is not configured.'});
  if(!query)return res.status(400).json({message:'검색어가 필요합니다.'});
  try{
    const params=new URLSearchParams({query,size:'10'}),x=Number(req.query?.x),y=Number(req.query?.y),radius=Math.min(20000,Math.max(1000,Number(req.query?.radius)||8000));if(Number.isFinite(x)&&Number.isFinite(y)){params.set('x',String(x));params.set('y',String(y));params.set('radius',String(radius));params.set('sort','distance')}
    const response=await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${params}`,{headers:{Authorization:`KakaoAK ${key}`}});
    if(!response.ok)throw new Error(`Kakao Local ${response.status}`);
    const data=await response.json(),places=(data.documents||[]).map(p=>({id:p.id,name:p.place_name,address:p.road_address_name||p.address_name,lat:+p.y,lng:+p.x,category:p.category_name}));
    return res.status(200).json({places});
  }catch(error){return res.status(502).json({message:'장소를 검색하지 못했습니다.',detail:error.message});}
}
