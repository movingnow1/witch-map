import crypto from 'node:crypto';
import { ObjectId } from 'mongodb';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../lib/auth.js';
import { database } from '../lib/mongodb.js';

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({message:'Method not allowed'});
  const session=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});
  if(!session?.user)return res.status(401).json({message:'로그인이 필요합니다.'});
  const supplied=String(req.body?.code||''),expected=String(process.env.ADMIN_SIGNUP_CODE||'');
  if(!expected||supplied.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return res.status(403).json({message:'관리자 초대코드가 올바르지 않습니다.'});
  if(await database.collection('user').findOne({role:'admin'}))return res.status(409).json({message:'첫 관리자 등록이 이미 완료됐습니다.'});
  const id=session.user.id,filter=ObjectId.isValid(id)?{_id:new ObjectId(id)}:{id};
  await database.collection('user').updateOne(filter,{$set:{role:'admin'}});
  return res.status(200).json({ok:true});
}
