import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../lib/auth.js';
import { database } from '../lib/mongodb.js';

export default async function handler(req,res){
  const session=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});
  if(!session?.user)return res.status(401).json({message:'로그인이 필요합니다.'});
  const userId=session.user.id,collection=database.collection('userState');
  if(req.method==='GET')return res.status(200).json({state:await collection.findOne({userId})||{userId,visited:[],contributionCount:0}});
  if(req.method==='PATCH'){
    const update={updatedAt:new Date()};
    if(Array.isArray(req.body?.visited))update.visited=[...new Set(req.body.visited.map(String))].slice(0,2000);
    if(Number.isFinite(Number(req.body?.contributionCount)))update.contributionCount=Math.max(0,Math.floor(Number(req.body.contributionCount)));
    await collection.updateOne({userId},{$set:update,$setOnInsert:{createdAt:new Date()}},{upsert:true});
    return res.status(200).json({ok:true});
  }
  return res.status(405).json({message:'Method not allowed'});
}