import type { IncomingMessage, ServerResponse } from 'http';

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  try {
    // Parse query params
    const urlObj = new URL(req.url || '', `http://${req.headers?.host || 'localhost'}`);
    const check = urlObj.searchParams.get('check') || req.query?.check || '';
    const key = urlObj.searchParams.get('key') || req.query?.key || process.env.VITE_LEAKCHECK_API_KEY || '100a7e96bd104e5f135cb8b2bd9451cc3419317e';

    if (!check) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Query parameter "check" is required' }));
      return;
    }

    const cleanQuery = check.trim();
    const endpoint = `https://leakcheck.io/api/public?check=${encodeURIComponent(cleanQuery)}&key=${key}`;

    const upstreamRes = await fetch(endpoint, {
      headers: {
        'User-Agent': 'Defenxia-Frontline-Guard/1.0'
      }
    });

    if (!upstreamRes.ok) {
      res.statusCode = upstreamRes.status;
      const errText = await upstreamRes.text();
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: errText || 'Upstream API error' }));
      return;
    }

    const data = await upstreamRes.json();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  } catch (error: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: error?.message || 'Internal server error' }));
  }
}
