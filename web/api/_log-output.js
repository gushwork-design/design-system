/* ============================================================================
   log-output.js — keep a private copy of a file a Gushwork skill made, so the Usage Logs page
   can open it.

   THIS IS THE ONE PLACE FILE CONTENTS LEAVE A TEAMMATE'S MACHINE. Until now the log held names,
   flags and links, never the thing itself; R29 in DECISIONS.md records why that changed and what
   it costs. A copy can carry client copy and pricing, so it is treated accordingly:

     · PRIVATE STORE. The Blob store is created with private access: nothing is reachable by URL.
       The only way back out is /api/usage-log?file=…, which checks the session cookie and then
       OWNER_EMAILS, exactly as the log itself does.
     · SMALL AND KNOWN. PDF, PNG, PPTX, HTML and SVG only, 3 MB raw at most (the request body
       limit is 4.5 MB and base64 adds a third). Bigger files stay a name in the log.
     · CHECKED, NOT TRUSTED. This endpoint is public, like log-usage, because the plugin has no
       secret it could keep. So the declared type must match the bytes (a PDF starts %PDF, a PNG
       its signature, a PPTX is a zip), a daily cap bounds what any flood could store, and a
       per-IP limit slows a loop.
     · EXPIRES. scripts purge it after RETENTION_DAYS (see _purge-outputs.js).
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
const MAX_BYTES = 3 * 1024 * 1024;
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

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'bad body' });

  const sess = String(body.sess || '');
  const file = String(body.file || '');
  const ext = (file.split('.').pop() || '').toLowerCase();
  if (!/^[a-f0-9]{8,16}$/.test(sess)) return res.status(400).json({ error: 'bad session' });
  if (!/^[A-Za-z0-9][A-Za-z0-9 _.()\-]{0,118}$/.test(file) || !TYPES[ext]) return res.status(400).json({ error: 'bad file' });
  if (typeof body.data !== 'string' || body.data.length > Math.ceil(MAX_BYTES * 4 / 3) + 8) {
    return res.status(413).json({ error: 'too large' });
  }

  const buf = Buffer.from(body.data, 'base64');
  if (!buf.length || buf.length > MAX_BYTES) return res.status(413).json({ error: 'too large' });
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
