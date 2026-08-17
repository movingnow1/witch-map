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
    const storeRequest=req.body?.kind==='store',ownerStore=session.user.userType==='owner'&&storeRequest;
    if(session.user.role!=='admin'&&!storeRequest)return res.status(403).json({message:'가게 외 공용 콘텐츠는 관리자만 등록할 수 있습니다.'});
    const item={...req.body,createdAt:new Date(),createdBy:session.user.id};delete item.id;delete item._id;
    if(ownerStore){item.ownerId=session.user.id;item.claimable=false}else if(storeRequest&&session.user.role!=='admin'){delete item.ownerId;item.claimable=true}
    const result=await collection.insertOne(item);return res.status(201).json({item:{...item,id:String(result.insertedId)}})
  }
  if(req.method==='PATCH'){
    const id=String(req.body?.id||''),item=ObjectId.isValid(id)?await collection.findOne({_id:new ObjectId(id)}):null;if(!item)return res.status(404).json({message:'가게를 찾지 못했습니다.'});
    if(req.body?.action==='claim'){
      if(session.user.userType!=='owner')return res.status(403).json({message:'점주 계정만 내 가게로 연결할 수 있습니다.'});
      if(item.kind!=='store'||item.ownerId)return res.status(409).json({message:'연결할 수 없는 가게입니다.'});
      await collection.updateOne({_id:item._id},{$set:{ownerId:session.user.id,claimedAt:new Date()}});return res.status(200).json({ok:true,ownerId:session.user.id})
    }
    if(req.body?.action==='updatePosition'){
      const isStore=item.kind==='store',isFestival=item.kind==='festival';
      const allowed=session.user.role==='admin'||(isStore&&(item.createdBy===session.user.id||item.ownerId===session.user.id));
      if((!isStore&&!isFestival)||!allowed)return res.status(403).json({message:'해당 점주·등록자 또는 관리자만 위치를 수정할 수 있습니다.'});
      const lat=Number(req.body.lat),lng=Number(req.body.lng);
      if(!Number.isFinite(lat)||!Number.isFinite(lng))return res.status(400).json({message:'올바른 지도 위치가 아닙니다.'});
      await collection.updateOne({_id:item._id},{$set:{lat,lng,positionCorrectedBy:session.user.id,positionCorrectedAt:new Date()}});
      return res.status(200).json({ok:true,lat,lng});
    }
    if(req.body?.action==='updateStore'){
      const allowed=session.user.role==='admin'||item.createdBy===session.user.id||item.ownerId===session.user.id;
      if(item.kind!=='store'||!allowed)return res.status(403).json({message:'해당 점주와 관리자만 가게 정보를 수정할 수 있습니다.'});
      const source=req.body.store||{},fields=['name','type','area','hours','phone','desc','image','menuBoard','ownerGallery','menus','businessStatus','closedDate','parking','publicParking','cozy','quiet','open24','solo','groupFriendly','pet','splitRoom'];
      const update=Object.fromEntries(fields.filter(key=>source[key]!==undefined).map(key=>[key,source[key]]));
      update.updatedAt=new Date();update.updatedBy=session.user.id;
      await collection.updateOne({_id:item._id},{$set:update});
      return res.status(200).json({ok:true});
    }
    if(req.body?.action==='updateNotice'){
      if(item.kind!=='notice'||session.user.role!=='admin')return res.status(403).json({message:'관리자만 공지를 수정할 수 있습니다.'});
      const source=req.body.notice||{},update={};
      if(source.title!==undefined)update.title=String(source.title).slice(0,120);
      if(source.noticeDate!==undefined)update.noticeDate=String(source.noticeDate).slice(0,10);
      if(source.text!==undefined)update.text=String(source.text).slice(0,3000);
      if(Array.isArray(source.images))update.images=source.images.slice(0,10);
      update.updatedAt=new Date();update.updatedBy=session.user.id;
      await collection.updateOne({_id:item._id},{$set:update});
      return res.status(200).json({ok:true});
    }
    if(req.body?.action==='updateFestival'){
      if(item.kind!=='festival'||session.user.role!=='admin')return res.status(403).json({message:'관리자만 지역축제를 수정할 수 있습니다.'});
      const source=req.body.festival||{},fields=['name','area','hours','desc','eventContent','startDate','endDate','externalUrl','image'];
      const update=Object.fromEntries(fields.filter(key=>source[key]!==undefined).map(key=>[key,source[key]]));
      if(update.desc!==undefined)update.eventContent=update.desc;
      update.updatedAt=new Date();update.updatedBy=session.user.id;
      await collection.updateOne({_id:item._id},{$set:update});
      return res.status(200).json({ok:true});
    }
  }
  if(req.method==='DELETE'){
    const id=String(req.query?.id||req.body?.id||'');
    if(!ObjectId.isValid(id))return res.status(400).json({message:'삭제할 항목을 확인해주세요.'});
    const item=await collection.findOne({_id:new ObjectId(id)});
    if(!item)return res.status(404).json({message:'삭제할 항목을 찾지 못했습니다.'});
    const allowed=session.user.role==='admin'||(item.kind==='store'&&(item.createdBy===session.user.id||item.ownerId===session.user.id));
    if(!allowed)return res.status(403).json({message:'등록한 이용자·해당 점주·관리자만 삭제할 수 있습니다.'});
    const result=await collection.deleteOne({_id:item._id});
    if(!result.deletedCount)return res.status(404).json({message:'삭제할 항목을 찾지 못했습니다.'});
    return res.status(200).json({ok:true});
  }
  return res.status(405).json({message:'Method not allowed'});
}
