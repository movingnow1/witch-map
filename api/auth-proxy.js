import { toNodeHandler } from 'better-auth/node';
import { auth } from '../lib/auth.js';

const handler = toNodeHandler(auth);

export const config = { api: { bodyParser: false } };

export default function authProxy(req, res) {
  const value = req.query.authPath;
  const path = Array.isArray(value) ? value.join('/') : String(value || 'ok');
  req.url = `/api/auth/${path}`;
  return handler(req, res);
}
