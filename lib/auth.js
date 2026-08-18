import { betterAuth } from 'better-auth/minimal';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { admin } from 'better-auth/plugins';
import { database, mongoClient } from './mongodb.js';

export const auth = betterAuth({
  appName: '마실지도',
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  basePath: '/api/auth',
  trustedOrigins: [
    'https://witch-map.vercel.app',
    'https://*.vercel.app',
    'http://localhost:3000'
  ],
  database: mongodbAdapter(database, { client: mongoClient }),
  socialProviders: process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET ? {
    naver: {
        clientId: process.env.NAVER_CLIENT_ID,
        clientSecret: process.env.NAVER_CLIENT_SECRET,
        authorizationEndpoint: 'https://nid.naver.com/oauth2.0/authorize?auth_type=reauthenticate'
      }
  } : {},
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    revokeSessionsOnPasswordReset: true
  },
  user: {
    deleteUser: { enabled: true },
    additionalFields: {
      userType: { type: ['user', 'owner'], required: false, defaultValue: 'user' },
      homeLocation: { type: 'string', required: false, defaultValue: '' }
    }
  },
  databaseHooks: {
    user: {
      delete: {
        after: async (user) => {
          const userId=String(user.id),now=new Date();
          await database.collection('mapContent').updateMany({kind:'store',ownerId:userId},{$unset:{ownerId:'',claimedAt:''},$set:{claimable:true,updatedAt:now}});
          const communities=await database.collection('communities').find({$or:[{ownerId:userId},{members:userId}]}).toArray();
          for(const community of communities){
            const remaining=(community.members||[]).filter(id=>String(id)!==userId),update={$pull:{members:userId},$unset:{[`memberNames.${userId}`]:''},$set:{updatedAt:now}};
            if(String(community.ownerId)===userId)update.$set.ownerId=remaining.length?String(remaining[0]):'';
            await database.collection('communities').updateOne({_id:community._id},update);
          }
          await database.collection('passwordResetRequests').deleteMany({userId});
        }
      }
    }
  },
  plugins: [admin()]
});
