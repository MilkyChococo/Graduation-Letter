// Vercel serverless proxy: visitors -> /api/wishes -> Apps Script -> private Google Sheet.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  const secret = process.env.WISHES_SHARED_SECRET;
  if (!scriptUrl || !secret) {
    return res.status(503).json({ error: 'Wish collection is not configured yet' });
  }
  let url;
  try {
    url = new URL(scriptUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || !url.pathname.endsWith('/exec')) {
      throw new Error('Invalid Apps Script URL');
    }
  } catch {
    return res.status(503).json({ error: 'Invalid destination configuration' });
  }
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) {
    return res.status(415).json({ error: 'JSON required' });
  }
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }
  const { name, wish, website } = body || {};
  if (website) return res.status(200).json({ ok: true }); // Honeypot.
  if (typeof name !== 'string' || typeof wish !== 'string') {
    return res.status(400).json({ error: 'Invalid fields' });
  }
  const cleanName = name.trim();
  const cleanWish = wish.trim();
  if (!cleanName || !cleanWish || cleanName.length > 80 || cleanWish.length > 1200) {
    return res.status(400).json({ error: 'Invalid length' });
  }
  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, name: cleanName, wish: cleanWish }),
      redirect: 'follow',
      signal: AbortSignal.timeout(20000)
    });
    if (!upstream.ok) {
      console.error('Apps Script HTTP response:', upstream.status);
      return res.status(502).json({ error: 'Google Sheets unavailable' });
    }
    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); } catch {
      console.error('Apps Script returned non-JSON response');
      return res.status(502).json({ error: 'Invalid Google Sheets response' });
    }
    if (data?.ok !== true) {
      console.error('Apps Script rejected submission:', data?.error || 'unknown');
      return res.status(502).json({ error: 'Google Sheets could not save the message' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Apps Script request failed:', err?.message || 'unknown');
    return res.status(502).json({ error: 'Google Sheets unavailable' });
  }
}
