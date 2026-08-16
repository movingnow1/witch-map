export default async function handler(req,res){
  res.setHeader('Cache-Control','s-maxage=900, stale-while-revalidate=3600');
  const key=process.env.KAKAO_REST_API_KEY;
  if(!key)return res.status(503).json({message:'Kakao Local API key is not configured.'});
  const x=Number(req.query.x),y=Number(req.query.y);
  if(!Number.isFinite(x)||!Number.isFinite(y))return res.status(400).json({message:'x and y are required.'});
  const keywords=['점핑 다이어트','클라이밍','폴댄스','줌바 댄스','댄스 학원','헬스장'];
  try{
    const groups=await Promise.all(keywords.map(async keyword=>{
      const q=new URLSearchParams({query:keyword,x:String(x),y:String(y),radius:'5000',sort:'distance',size:'10'});
      const response=await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${q}`,{headers:{Authorization:`KakaoAK ${key}`}});
      if(!response.ok)throw new Error(`Kakao Local ${response.status}`);
      const data=await response.json();
      return (data.documents||[]).map(place=>({...place,matchedKeyword:keyword}));
    }));
    const unique=new Map();
    groups.flat().forEach(place=>{if(!unique.has(place.id))unique.set(place.id,place)});
    return res.status(200).json({places:[...unique.values()].slice(0,50)});
  }catch(error){return res.status(502).json({message:'운동 업체를 불러오지 못했습니다.',detail:error.message});}
};
