/* ============================================================================
   purge-outputs.js — delete kept copies of outputs after RETENTION_DAYS, and their index entries.

   Run daily by the cron in vercel.json (Hobby allows one run a day). Vercel sends
   `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set on the project; with no secret
   set this refuses everything, so nobody can trigger a purge by hitting the URL.

   It only ever touches blobs under outputs/, and only those older than the window.
   ========================================================================= */

const RETENTION_DAYS = 30;
const INDEX_KEY = 'gw:files';

function redisCfg() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'unauthorised' });
  }
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const kv = redisCfg();
  if (!token || !kv) return res.status(200).json({ ok: true, skipped: 'no store' });

  const cutoff = Date.now() - RETENTION_DAYS * 86400000;
  try {
    const { list, del } = await import('@vercel/blob');
    let cursor, removed = 0;
    const gone = new Set();
    do {
      const page = await list({ prefix: 'outputs/', cursor, limit: 500, token });
      const old = page.blobs.filter((b) => new Date(b.uploadedAt).getTime() < cutoff);
      if (old.length) {
        await del(old.map((b) => b.url), { token });
        old.forEach((b) => gone.add(b.pathname));
        removed += old.length;
      }
      cursor = page.cursor;
    } while (cursor);

    /* Drop index entries that point at something just deleted. */
    if (gone.size) {
      const r = await fetch(`${kv.url}/pipeline`, {
        method: 'POST',
        headers: { authorization: `Bearer ${kv.token}`, 'content-type': 'application/json' },
        body: JSON.stringify([['HGETALL', INDEX_KEY]]),
      });
      const [{ result: flat }] = await r.json();
      const dead = [];
      for (let i = 0; i + 1 < (flat || []).length; i += 2) {
        try { if (gone.has(JSON.parse(flat[i + 1]).p)) dead.push(flat[i]); } catch { dead.push(flat[i]); }
      }
      if (dead.length) {
        await fetch(`${kv.url}/pipeline`, {
          method: 'POST',
          headers: { authorization: `Bearer ${kv.token}`, 'content-type': 'application/json' },
          body: JSON.stringify([['HDEL', INDEX_KEY, ...dead]]),
        });
      }
    }
    return res.status(200).json({ ok: true, removed, retentionDays: RETENTION_DAYS });
  } catch {
    return res.status(502).json({ error: 'purge failed' });
  }
}
