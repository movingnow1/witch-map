import { toNodeHandler } from 'better-auth/node';
import { auth } from '../lib/auth.js';

const handler = toNodeHandler(auth);

export const config = { api: { bodyParser: false } };

export default function authProxy(req, res) {
  const value = req.query.authPath;
  const path = Array.isArray(value) ? value.join('/') : String(value || 'ok');
  const search = new URLSearchParams();
  for (const [key, raw] of Object.entries(req.query || {})) {
    if (key === 'authPath') continue;
    for (const item of Array.isArray(raw) ? raw : [raw]) if (item !== undefined) search.append(key, String(item));
  }
  const query = search.toString();
  req.url = `/api/auth/${path}${query ? `?${query}` : ''}`;
  return handler(req, res);
}
