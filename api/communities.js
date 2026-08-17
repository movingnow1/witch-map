import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../lib/auth.js';
import { database } from '../lib/mongodb.js';

const privateFields=['messages','notices','ownerPolls','memberNames','members'];
export default async function handler(req,res){
  const session=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});
  if(!session?.user)return res.status(401).json({message:'로그인이 필요합니다.'});
  const collection=database.collection('communities'),userId=session.user.id,isAdmin=session.user.role==='admin';
  if(req.method==='GET'){
    const items=await collection.find({}).sort({updatedAt:-1}).limit(200).toArray();
    return res.status(200).json({communities:items.map(item=>{const c={...item,_id:undefined,id:item.communityId,memberCount:(item.members||[]).length},member=isAdmin||c.ownerId===userId||(c.members||[]).includes(userId);if(!member)for(const key of privateFields)delete c[key];return c})});
  }
  if(req.method==='POST'&&req.body?.action==='join'){
    const communityId=String(req.body.id||''),old=await collection.findOne({communityId});if(!old)return res.status(404).json({message:'모임을 찾지 못했습니다.'});
    if((old.members||[]).length>=Number(old.headcount||999)&&!(old.members||[]).includes(userId))return res.status(409).json({message:'모집 인원이 마감됐습니다.'});
    await collection.updateOne({communityId},{$addToSet:{members:userId},$set:{[`memberNames.${userId}`]:session.user.name||'참여자',updatedAt:new Date()}});return res.status(200).json({ok:true});
  }
  if(req.method==='PUT'){
    const items=Array.isArray(req.body?.communities)?req.body.communities.slice(0,200):[];
    for(const source of items){const communityId=String(source.id||'');if(!communityId)continue;const old=await collection.findOne({communityId});const allowed=isAdmin||old?.ownerId===userId||(!old&&source.ownerId===userId);if(!allowed)continue;const clean={...source,communityId,updatedAt:new Date()};delete clean._id;delete clean.id;await collection.updateOne({communityId},{$set:clean,$setOnInsert:{createdAt:new Date()}},{upsert:true})}
    return res.status(200).json({ok:true});
  }
  return res.status(405).json({message:'Method not allowed'});
}