import { ObjectId } from 'mongodb';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../lib/auth.js';
import { database } from '../lib/mongodb.js';

const privateCommunityFields=['messages','notices','ownerPolls','memberNames','members'];
export async function handleSync(req,res){
  const resource=String(req.query?.resource||'');
  if(resource==='password-reset-requests'&&req.method==='POST'&&req.body?.action==='request'){
    const email=String(req.body?.email||'').trim().toLowerCase(),generic={ok:true,message:'계정이 확인되면 관리자에게 임시 비밀번호 요청이 전달됩니다.'};
    if(!email||email.length>254)return res.status(200).json(generic);
    const user=await database.collection('user').findOne({email});
    if(user){const userIdValue=String(user._id),credential=await database.collection('account').findOne({userId:{$in:[user._id,userIdValue]},providerId:'credential'});if(credential)await database.collection('passwordResetRequests').updateOne({userId:userIdValue,status:'pending'},{$set:{email,name:user.name||'이용자',requestedAt:new Date(),updatedAt:new Date()},$setOnInsert:{userId:userIdValue,status:'pending',createdAt:new Date()}},{upsert:true})}
    return res.status(200).json(generic);
  }
  const session=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});
  if(!session?.user)return res.status(401).json({message:'로그인이 필요합니다.'});
  const userId=session.user.id,isAdmin=session.user.role==='admin';
  if(resource==='password-reset-requests'){
    if(!isAdmin)return res.status(403).json({message:'관리자만 비밀번호 요청을 처리할 수 있습니다.'});
    const collection=database.collection('passwordResetRequests');
    if(req.method==='GET'){const requests=await collection.find({status:'pending'}).sort({requestedAt:-1}).limit(100).toArray();return res.status(200).json({requests:requests.map(x=>({...x,id:String(x._id),_id:undefined}))})}
    if(req.method==='POST'&&req.body?.action==='issue'){
      const id=String(req.body?.id||'');if(!ObjectId.isValid(id))return res.status(400).json({message:'요청 정보를 확인해주세요.'});
      const request=await collection.findOne({_id:new ObjectId(id),status:'pending'});if(!request)return res.status(404).json({message:'이미 처리됐거나 찾을 수 없는 요청입니다.'});
      const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789',bytes=crypto.getRandomValues(new Uint8Array(10));let temporaryPassword='';for(const byte of bytes)temporaryPassword+=alphabet[byte%alphabet.length];
      await auth.api.setUserPassword({headers:fromNodeHeaders(req.headers),body:{userId:request.userId,newPassword:temporaryPassword}});
      await collection.updateOne({_id:request._id},{$set:{status:'issued',issuedAt:new Date(),issuedBy:userId,updatedAt:new Date()}});
      return res.status(200).json({ok:true,temporaryPassword,email:request.email,name:request.name});
    }
  }
  if(resource==='oauth-role'&&req.method==='POST'){
    const userType=String(req.body?.userType||'user');
    if(!['user','owner'].includes(userType)||!ObjectId.isValid(userId))return res.status(400).json({message:'가입 유형을 확인해주세요.'});
    const user=await database.collection('user').findOne({_id:new ObjectId(userId)});if(!user)return res.status(404).json({message:'계정을 찾지 못했습니다.'});
    const currentType=user.userType||'user',age=Date.now()-new Date(user.createdAt||0).getTime(),firstOAuthSetup=!user.oauthRoleLocked&&age>=0&&age<120000;
    if(!firstOAuthSetup&&currentType!==userType){const labels={user:'일반 이용자',owner:'점주'};return res.status(409).json({message:`현재 로그인된 네이버 계정은 ${labels[currentType]}용입니다. 네이버에서 로그아웃한 뒤 다른 네이버 계정으로 ${labels[userType]} 가입·로그인해주세요.`})}
    await database.collection('user').updateOne({_id:user._id},{$set:{userType:firstOAuthSetup?userType:currentType,oauthRoleLocked:true,updatedAt:new Date()}});
    return res.status(200).json({ok:true,userType:firstOAuthSetup?userType:currentType});
  }
  if(resource==='state'){
    const collection=database.collection('userState');
    if(req.method==='GET')return res.status(200).json({state:await collection.findOne({userId})||{userId,visited:[],contributionCount:0}});
    if(req.method==='PATCH'){const update={updatedAt:new Date()};if(Array.isArray(req.body?.visited))update.visited=[...new Set(req.body.visited.map(String))].slice(0,2000);if(Number.isFinite(Number(req.body?.contributionCount)))update.contributionCount=Math.max(0,Math.floor(Number(req.body.contributionCount)));await collection.updateOne({userId},{$set:update,$setOnInsert:{createdAt:new Date()}},{upsert:true});return res.status(200).json({ok:true})}
  }
  if(resource==='rankings'&&req.method==='GET'){
    const states=await database.collection('userState').find({contributionCount:{$gt:0}}).sort({contributionCount:-1}).limit(30).toArray(),objectIds=states.map(x=>x.userId).filter(ObjectId.isValid).map(id=>new ObjectId(id)),users=await database.collection('user').find({_id:{$in:objectIds}},{projection:{name:1,userType:1,role:1}}).toArray(),userMap=Object.fromEntries(users.map(x=>[String(x._id),x]));
    const ranking=states.filter(x=>{const u=userMap[x.userId];return u&&(u.userType||'user')==='user'&&u.role!=='admin'&&!/codex|관리자|운영자/i.test(u.name||'')}).slice(0,3).map(x=>({id:x.userId,name:userMap[x.userId].name||'이용자',count:x.contributionCount}));return res.status(200).json({ranking});
  }
  if(resource==='communities'){
    const collection=database.collection('communities');
    if(req.method==='GET'){const items=await collection.find({}).sort({updatedAt:-1}).limit(200).toArray();return res.status(200).json({communities:items.map(item=>{const joined=!(item.leftMembers||[]).includes(userId)&&(item.ownerId===userId||(item.members||[]).includes(userId)),c={...item,_id:undefined,id:item.communityId,memberCount:(item.members||[]).length,joined},member=isAdmin||joined;if(!member)for(const key of privateCommunityFields)delete c[key];return c})})}
        if(req.method==='POST'&&req.body?.action==='legacyImport'){const source=req.body?.community||{},communityId=String(source.id||source.communityId||'').slice(0,120),name=String(source.name||'').trim().slice(0,120);if(!communityId||!name)return res.status(400).json({message:'이관할 모임 정보를 확인해주세요.'});const old=await collection.findOne({communityId}),joined=!!req.body?.joined,wasOwner=!!req.body?.wasOwner;if(old){if(joined&&!(old.leftMembers||[]).includes(userId))await collection.updateOne({communityId},{$addToSet:{members:userId},$set:{[`memberNames.${userId}`]:session.user.name||'참여자',updatedAt:new Date()}});return res.status(200).json({ok:true,existing:true})}const fields=['photo','description','cautions','always','start','end','headcount','price','messages','notices','ownerPolls'],clean={communityId,name,ownerId:wasOwner?userId:String(source.ownerId||`legacy-${userId}`),members:joined?[userId]:[],memberNames:joined?{[userId]:session.user.name||'참여자'}:{},createdAt:new Date(),updatedAt:new Date(),legacyImportedBy:userId};for(const key of fields)if(source[key]!==undefined)clean[key]=source[key];await collection.insertOne(clean);return res.status(201).json({ok:true,community:{id:communityId,name}})}if(req.method==='POST'&&req.body?.action==='join'){const communityId=String(req.body.id||''),old=await collection.findOne({communityId});if(!old)return res.status(404).json({message:'모임을 찾지 못했습니다.'});if((old.members||[]).length>=Number(old.headcount||999)&&!(old.members||[]).includes(userId))return res.status(409).json({message:'모집 인원이 마감됐습니다.'});await collection.updateOne({communityId},{$addToSet:{members:userId},$pull:{leftMembers:userId},$set:{[`memberNames.${userId}`]:session.user.name||'참여자',updatedAt:new Date()}});return res.status(200).json({ok:true})}
    if(req.method==='POST'&&req.body?.action==='leave'){const communityId=String(req.body.id||''),old=await collection.findOne({communityId});if(!old)return res.status(404).json({message:'모임을 찾지 못했습니다.'});const remaining=(old.members||[]).filter(id=>id!==userId);if(old.ownerId===userId&&!remaining.length){await collection.deleteOne({communityId});return res.status(200).json({ok:true,deleted:true})}const update={$pull:{members:userId},$addToSet:{leftMembers:userId},$unset:{[`memberNames.${userId}`]:''},$set:{updatedAt:new Date()}};if(old.ownerId===userId)update.$set.ownerId=remaining[0];await collection.updateOne({communityId},update);return res.status(200).json({ok:true,transferred:old.ownerId===userId})}
    if(req.method==='POST'&&req.body?.action==='message'){const communityId=String(req.body.id||''),text=String(req.body.text||'').trim().slice(0,300),old=await collection.findOne({communityId});if(!old||(old.ownerId!==userId&&!(old.members||[]).includes(userId)&&!isAdmin))return res.status(403).json({message:'참여 중인 모임에서만 대화할 수 있습니다.'});if(!text)return res.status(400).json({message:'메시지를 입력해주세요.'});const message={userId,userName:session.user.name||'참여자',text,at:new Date().toISOString()};await collection.updateOne({communityId},{$push:{messages:message},$set:{updatedAt:new Date()}});return res.status(200).json({ok:true,message})}
    if(req.method==='POST'&&req.body?.action==='vote'){const communityId=String(req.body.id||''),pollId=String(req.body.pollId||''),option=String(req.body.option||''),old=await collection.findOne({communityId});if(!old||(old.ownerId!==userId&&!(old.members||[]).includes(userId)&&!isAdmin))return res.status(403).json({message:'참여 중인 모임에서만 투표할 수 있습니다.'});const polls=old.ownerPolls||[],poll=polls.find(x=>x.id===pollId);if(!poll||!poll.options?.includes(option))return res.status(400).json({message:'투표 항목을 확인해주세요.'});poll.votes=poll.votes||{};if(poll.votes[userId]===option)delete poll.votes[userId];else poll.votes[userId]=option;await collection.updateOne({communityId},{$set:{ownerPolls:polls,updatedAt:new Date()}});return res.status(200).json({ok:true})}
    if(req.method==='PUT'){const items=Array.isArray(req.body?.communities)?req.body.communities.slice(0,200):[];for(const source of items){const communityId=String(source.id||'');if(!communityId)continue;const old=await collection.findOne({communityId}),allowed=isAdmin||old?.ownerId===userId||(!old&&source.ownerId===userId);if(!allowed)continue;const clean={...source,communityId,updatedAt:new Date()};delete clean._id;delete clean.id;delete clean.joined;delete clean.memberCount;await collection.updateOne({communityId},{$set:clean,$setOnInsert:{createdAt:new Date()}},{upsert:true})}return res.status(200).json({ok:true})}
  }
  return res.status(405).json({message:'지원하지 않는 동기화 요청입니다.'});
}