import { ObjectId } from 'mongodb';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../lib/auth.js';
import { database } from '../lib/mongodb.js';

async function sessionFor(req){return auth.api.getSession({headers:fromNodeHeaders(req.headers)})}
export default async function handler(req,res){
  const collection=database.collection('mapContent');
  if(req.method==='GET'){const items=await collection.find({}).sort({createdAt:-1}).limit(500).toArray();return res.status(200).json({items:items.map(x=>({...x,id:String(x._id),_id:undefined}))})}
  const session=await sessionFor(req);if(!session?.user)return res.status(401).json({message:'로그인이 필요합니다.'});
  if(req.method==='POST'){
    const ownerStore=session.user.userType==='owner'&&req.body?.kind==='store';
    if(session.user.role!=='admin'&&!ownerStore)return res.status(403).json({message:'관리자만 등록할 수 있습니다.'});
    const item={...req.body,createdAt:new Date(),createdBy:session.user.id};delete item.id;delete item._id;
    if(ownerStore){item.ownerId=session.user.id;item.claimable=false}
    const result=await collection.insertOne(item);return res.status(201).json({item:{...item,id:String(result.insertedId)}})
  }
  if(req.method==='PATCH'){
    const id=String(req.body?.id||''),item=ObjectId.isValid(id)?await collection.findOne({_id:new ObjectId(id)}):null;if(!item)return res.status(404).json({message:'가게를 찾지 못했습니다.'});
    if(req.body?.action==='claim'){
      if(session.user.userType!=='owner')return res.status(403).json({message:'점주 계정만 내 가게로 연결할 수 있습니다.'});
      if(item.kind!=='store'||item.ownerId)return res.status(409).json({message:'연결할 수 없는 가게입니다.'});
      await collection.updateOne({_id:item._id},{$set:{ownerId:session.user.id,claimedAt:new Date()}});return res.status(200).json({ok:true,ownerId:session.user.id})
    }
  }
  if(req.method==='DELETE'){
    if(session.user.role!=='admin')return res.status(403).json({message:'관리자만 삭제할 수 있습니다.'});
    const id=String(req.query?.id||req.body?.id||'');
    if(!ObjectId.isValid(id))return res.status(400).json({message:'삭제할 항목을 확인해주세요.'});
    const result=await collection.deleteOne({_id:new ObjectId(id),kind:'ad'});
    if(!result.deletedCount)return res.status(404).json({message:'광고 배너를 찾지 못했습니다.'});
    return res.status(200).json({ok:true});
  }
  return res.status(405).json({message:'Method not allowed'});
}
