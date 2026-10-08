// A pretend Upstash store for the task board's tests and its local dev server.
// It answers the REST pipeline the site's modules use (POST <url>/pipeline with a list of commands) and nothing else,
// and sends every other fetch to `others`, so a test can also pretend to be Anthropic. Never used in production.
//
//   const kv = installKv({ others: async (url, init) => new Response(...) });
//   kv.hashes  // the data, to look at or seed

export function installKv({ others } = {}) {
  const hashes = new Map();      // key -> Map(field -> string)
  const strings = new Map();     // key -> string (counters)
  const hash = (k) => { if (!hashes.has(k)) hashes.set(k, new Map()); return hashes.get(k); };

  function run([cmd, key, ...a]) {
    switch (String(cmd).toUpperCase()) {
      case 'HGET': return hash(key).get(a[0]) ?? null;
      case 'HSET': { let n = 0; for (let i = 0; i < a.length; i += 2) { if (!hash(key).has(a[i])) n++; hash(key).set(a[i], String(a[i + 1])); } return n; }
      case 'HDEL': return a.reduce((n, f) => n + (hash(key).delete(f) ? 1 : 0), 0);
      case 'HVALS': return [...hash(key).values()];
      case 'HLEN': return hash(key).size;
      case 'HMGET': return a.map((f) => hash(key).get(f) ?? null);
      case 'HINCRBY': { const v = (Number(hash(key).get(a[0])) || 0) + Number(a[1]); hash(key).set(a[0], String(v)); return v; }
      case 'INCR': { const v = (Number(strings.get(key)) || 0) + 1; strings.set(key, String(v)); return v; }
      case 'EXPIRE': return 1;
      case 'GET': return strings.get(key) ?? null;
      case 'SET': strings.set(key, String(a[0])); return 'OK';
      default: return null;
    }
  }

  const real = globalThis.fetch;
  process.env.KV_REST_API_URL = 'https://kv.test';
  process.env.KV_REST_API_TOKEN = 'test';
  globalThis.fetch = async (url, init = {}) => {
    if (String(url) === 'https://kv.test/pipeline') {
      const cmds = JSON.parse(init.body);
      return new Response(JSON.stringify(cmds.map((c) => ({ result: run(c) }))), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (others) return others(url, init);
    return real(url, init);
  };
  return { hashes, strings, restore() { globalThis.fetch = real; } };
}
