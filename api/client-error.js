const allowedOrigins=new Set(['https://witch-map.vercel.app','http://localhost:3000']);
export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({message:'Method not allowed'});
  const origin=String(req.headers.origin||'');if(origin&&!allowedOrigins.has(origin)&&!/^https:\/\/witch-map-[a-z0-9-]+\.vercel\.app$/.test(origin))return res.status(403).json({message:'Forbidden'});
  const raw=JSON.stringify(req.body||{});if(raw.length>16000)return res.status(413).json({message:'Payload too large'});
  const event={type:String(req.body?.type||'client').slice(0,40),message:String(req.body?.message||'Unknown client error').slice(0,1000),stack:String(req.body?.stack||'').slice(0,6000),source:String(req.body?.source||'').slice(0,500),line:Number(req.body?.line)||0,column:Number(req.body?.column)||0,url:String(req.headers.referer||'').split('?')[0],userAgent:String(req.headers['user-agent']||'').slice(0,500),at:new Date().toISOString()};
  console.error('CLIENT_ERROR',event);
  const dsn=process.env.SENTRY_DSN;
  if(dsn)try{const parsed=new URL(dsn),projectId=parsed.pathname.replace(/^\//,''),endpoint=`${parsed.protocol}//${parsed.host}/api/${projectId}/envelope/`,eventId=crypto.randomUUID().replaceAll('-',''),payload={event_id:eventId,timestamp:event.at,platform:'javascript',level:'error',logger:'witch-map.client',message:event.message,exception:{values:[{type:event.type,value:event.message,stacktrace:{frames:[]}}]},request:{url:event.url,headers:{'User-Agent':event.userAgent}},extra:{stack:event.stack,source:event.source,line:event.line,column:event.column}};await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-sentry-envelope'},body:`${JSON.stringify({event_id:eventId,dsn,sent_at:event.at})}\n${JSON.stringify({type:'event'})}\n${JSON.stringify(payload)}`})}catch(error){console.error('SENTRY_FORWARD_FAILED',error?.message)}
  return res.status(202).json({ok:true});
}