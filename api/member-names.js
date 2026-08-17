import { ObjectId } from 'mongodb';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../lib/auth.js';
import { database } from '../lib/mongodb.js';

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({message:'Method not allowed'});
  const session=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});
  if(!session?.user)return res.status(401).json({message:'로그인이 필요합니다.'});
  const ids=[...new Set((Array.isArray(req.body?.ids)?req.body.ids:[]).map(String))].slice(0,100);
  const objectIds=ids.filter(ObjectId.isValid).map(id=>new ObjectId(id));
  if(!objectIds.length)return res.status(200).json({names:{},users:{}});
  const users=await database.collection('user').find({_id:{$in:objectIds}},{projection:{name:1,userType:1,role:1}}).toArray();
  return res.status(200).json({names:Object.fromEntries(users.map(user=>[String(user._id),user.name||'이용자'])),users:Object.fromEntries(users.map(user=>[String(user._id),{name:user.name||'이용자',userType:user.userType||'user',role:user.role||'user'}]))});
}
