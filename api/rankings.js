import { ObjectId } from 'mongodb';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../lib/auth.js';
import { database } from '../lib/mongodb.js';

export default async function handler(req,res){
  const session=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});
  if(!session?.user)return res.status(401).json({message:'로그인이 필요합니다.'});
  const states=await database.collection('userState').find({contributionCount:{$gt:0}}).sort({contributionCount:-1}).limit(30).toArray();
  const objectIds=states.map(x=>x.userId).filter(ObjectId.isValid).map(id=>new ObjectId(id));
  const users=await database.collection('user').find({_id:{$in:objectIds}},{projection:{name:1,userType:1,role:1}}).toArray();
  const userMap=Object.fromEntries(users.map(x=>[String(x._id),x]));
  const ranking=states.filter(x=>{const u=userMap[x.userId];return u&&(u.userType||'user')==='user'&&u.role!=='admin'&&!/codex|관리자|운영자/i.test(u.name||'')}).slice(0,3).map(x=>({id:x.userId,name:userMap[x.userId].name||'이용자',count:x.contributionCount}));
  return res.status(200).json({ranking});
}