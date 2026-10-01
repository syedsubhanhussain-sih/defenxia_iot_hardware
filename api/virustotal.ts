export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-apikey');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  try {
    const urlObj = new URL(req.url || '', `http://${req.headers?.host || 'localhost'}`);
    const targetUrl = urlObj.searchParams.get('url') || req.query?.url || '';
    const fileHash = urlObj.searchParams.get('hash') || req.query?.hash || '';
    const apiKey = req.headers?.['x-apikey'] || process.env.VITE_VIRUSTOTAL_API_KEY || '354ec18fa45e7871f8c8ea783eea9fbe571f7e670521d814689d0a5909c8c685';

    let vtEndpoint = '';
    if (targetUrl) {
      // VirusTotal v3 URL ID is base64 without padding
      const b64 = Buffer.from(targetUrl.trim()).toString('base64').replace(/=/g, '');
      vtEndpoint = `https://www.virustotal.com/api/v3/urls/${b64}`;
    } else if (fileHash) {
      vtEndpoint = `https://www.virustotal.com/api/v3/files/${fileHash.trim()}`;
    } else {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Either "url" or "hash" parameter is required' }));
      return;
    }

    const upstreamRes = await fetch(vtEndpoint, {
      headers: {
        'x-apikey': apiKey
      }
    });

    const data = await upstreamRes.json();
    res.statusCode = upstreamRes.status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  } catch (error: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: error?.message || 'VirusTotal proxy error' }));
  }
}
