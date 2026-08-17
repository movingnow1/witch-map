import { ObjectId } from 'mongodb';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../lib/auth.js';
import { database } from '../lib/mongodb.js';

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({message:'지원하지 않는 요청입니다.'});
  const session=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});
  if(!session?.user)return res.status(401).json({message:'로그인이 필요합니다.'});
  const userType=String(req.body?.userType||'user');
  if(!['user','owner'].includes(userType))return res.status(400).json({message:'가입 유형을 확인해주세요.'});
  const id=session.user.id;
  if(!ObjectId.isValid(id))return res.status(400).json({message:'계정 정보를 확인하지 못했습니다.'});
  await database.collection('user').updateOne({_id:new ObjectId(id)},{$set:{userType,updatedAt:new Date()}});
  return res.status(200).json({ok:true,userType});
}