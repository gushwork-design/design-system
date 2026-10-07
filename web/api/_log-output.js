/* ============================================================================
   log-output.js — keep a private copy of a file a Gushwork skill made, so the Usage Logs page
   can open it.

   THIS IS THE ONE PLACE FILE CONTENTS LEAVE A TEAMMATE'S MACHINE. Until now the log held names,
   flags and links, never the thing itself; R29 in DECISIONS.md records why that changed and what
   it costs. A copy can carry client copy and pricing, so it is treated accordingly:

     · PRIVATE STORE. The Blob store is created with private access: nothing is reachable by URL.
       The only way back out is /api/usage-log?file=…, which checks the session cookie and then
       OWNER_EMAILS, exactly as the log itself does.
     · SMALL AND KNOWN. PDF, PNG, PPTX, HTML and SVG only, 4 MB at most. The plugin sends the raw
       bytes, not base64, because a Vercel function rejects any request body over 4.5 MB: that is
       the ceiling, and 5 MB would need the client-upload route instead. Bigger files stay a name.
     · CHECKED, NOT TRUSTED. This endpoint is public, like log-usage, because the plugin has no
       secret it could keep. So the declared type must match the bytes (a PDF starts %PDF, a PNG
       its signature, a PPTX is a zip), a daily cap bounds what any flood could store, and a
       per-IP limit slows a loop.
     · NO AUTOMATIC EXPIRY. Copies are kept until someone deletes them in the Vercel dashboard,
       which is to be done when storage becomes a problem. The daily cap below bounds growth.
     · OFF BY A SWITCH. GW_NO_USAGE_PING=1 stops the whole hook; GW_NO_OUTPUT_COPIES=1 keeps the
       log and skips only the copy (scripts/log-activity.sh).

   IT IS OFF UNTIL A STORE EXISTS. Without BLOB_READ_WRITE_TOKEN (Vercel writes it when a Blob
   store is connected to the project) this answers 204 and does nothing, so shipping the code
   ahead of the store breaks nothing.

   @vercel/blob is imported INSIDE the handler, never at the top. gw.js loads every module, so a
   top-level import that failed would take log-usage, usage-log and the rest down with it; this
   way only this feature can fail.
   ========================================================================= */

const INDEX_KEY = 'gw:files';          // hash: "<sess>|<file>" -> {p: pathname, n: bytes, at}
const DAY_KEY = 'gw:files:day:';       // counter per UTC day
const MAX_BYTES = 4 * 1024 * 1024;
const DAILY_CAP = 300;

const TYPES = {
  pdf: 'application/pdf',
  png: 'image/png',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  html: 'text/html',
  svg: 'image/svg+xml',
};

function redisCfg() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function redis(cfg, commands) {
  const res = await fetch(`${cfg.url}/pipeline`, {
    method: 'POST',
    headers: { authorization: `Bearer ${cfg.token}`, 'content-type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`kv ${res.status}`);
  return res.json();
}

const HITS = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const fresh = (HITS.get(ip) || []).filter((t) => now - t < 5 * 60 * 1000);
  fresh.push(now);
  HITS.set(ip, fresh);
  if (HITS.size > 500) for (const [k, v] of HITS) if (!v.some((t) => now - t < 5 * 60 * 1000)) HITS.delete(k);
  return fresh.length > 60;
}

/* The declared type has to match the bytes. A text type must be text (no NUL bytes). */
function bytesMatch(ext, buf) {
  if (ext === 'pdf') return buf.subarray(0, 5).toString('latin1') === '%PDF-';
  if (ext === 'png') return buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (ext === 'pptx') return buf[0] === 0x50 && buf[1] === 0x4b;              // PK, a zip
  return !buf.includes(0);                                                     // html, svg
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const kv = redisCfg();
  if (!token || !kv) return res.status(204).end();           // unconfigured is the normal state

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) return res.status(429).json({ error: 'slow down' });

  /* The plugin sends the file as the request body, raw, with its session and name in headers. */
  const buf = Buffer.isBuffer(req.body) ? req.body : null;
  const sess = String(req.headers['x-gw-sess'] || '');
  let file = '';
  try { file = decodeURIComponent(String(req.headers['x-gw-file'] || '')); } catch { file = ''; }
  const ext = (file.split('.').pop() || '').toLowerCase();
  if (!/^[a-f0-9]{8,16}$/.test(sess)) return res.status(400).json({ error: 'bad session' });
  if (!/^[A-Za-z0-9][A-Za-z0-9 _.()\-]{0,118}$/.test(file) || !TYPES[ext]) return res.status(400).json({ error: 'bad file' });
  if (!buf || !buf.length) return res.status(400).json({ error: 'no file' });
  if (buf.length > MAX_BYTES) return res.status(413).json({ error: 'too large' });
  if (!bytesMatch(ext, buf)) return res.status(400).json({ error: 'type does not match contents' });

  try {
    const day = DAY_KEY + new Date().toISOString().slice(0, 10);
    const [{ result: n }] = await redis(kv, [['INCR', day], ['EXPIRE', day, '172800']]);
    if (Number(n) > DAILY_CAP) return res.status(429).json({ error: 'daily limit' });

    const { put } = await import('@vercel/blob');
    const blob = await put(`outputs/${sess}/${file}`, buf, {
      access: 'private',
      contentType: TYPES[ext],
      addRandomSuffix: true,
      token,
    });
    await redis(kv, [['HSET', INDEX_KEY, `${sess}|${file}`,
      JSON.stringify({ p: blob.pathname, n: buf.length, at: new Date().toISOString() })]]);
    return res.status(204).end();
  } catch {
    return res.status(502).json({ error: 'could not store' });          // no detail to a public caller
  }
}
