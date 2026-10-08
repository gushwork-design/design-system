// Builds web/admin/agents-data.json from agents/ (the registry, each agent's record and its durable memory).
// The Agents page reads that one file. Run: node scripts/agents-build.mjs          (write it)
//                                          node scripts/agents-build.mjs --check  (fail if it is out of date)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'web/admin/agents-data.json');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

export function buildAgents(root = ROOT) {
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const registry = JSON.parse(rd('agents/registry.json'));
  const agents = registry.agents.map((id) => {
    const a = JSON.parse(rd(`agents/${id}/agent.json`));
    const memPath = (a.memory && a.memory.durable) || `agents/${id}/memory.md`;
    if (!existsSync(join(root, memPath))) throw new Error(`${id}: ${memPath} does not exist`);
    return { ...a, memoryText: rd(memPath).trim() };
  });
  const routing = registry.routing || [];
  return { version: registry.version, lead: registry.lead, agents, routing, paused: registry.paused || [] };
}

export function render(data) { return JSON.stringify(data, null, 2) + '\n'; }

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const next = render(buildAgents());
  if (process.argv.includes('--check')) {
    const cur = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
    if (cur !== next) { console.error('web/admin/agents-data.json is out of date. Run: node scripts/agents-build.mjs'); process.exit(1); }
    console.log('agents-data.json is current');
  } else { writeFileSync(OUT, next); console.log('wrote web/admin/agents-data.json'); }
}
