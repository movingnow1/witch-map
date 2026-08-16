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
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    revokeSessionsOnPasswordReset: true
  },
  user: {
    deleteUser: { enabled: true },
    additionalFields: {
      userType: { type: 'string', required: false, defaultValue: 'user' },
      homeLocation: { type: 'string', required: false, defaultValue: '' }
    }
  },
  plugins: [admin()]
});
