// The agents record (agents/) and the file the Agents page reads. Run: node scripts/agents.test.mjs
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { buildAgents, render } from './agents-build.mjs';
let pass = 0, fail = 0; const ok = (n, c, d = '') => (c ? pass++ : (fail++, console.log(`✘ ${n} ${d}`)));
const root = new URL('..', import.meta.url).pathname;
const reg = JSON.parse(readFileSync(root + 'agents/registry.json', 'utf8'));
const data = buildAgents(root);

ok('the registry names a lead who is one of the agents', reg.agents.includes(reg.lead) && data.agents.some((a) => a.id === reg.lead && a.lead === true));
ok('exactly one agent is the lead', data.agents.filter((a) => a.lead).length === 1);
ok('ids are unique and match their folder', new Set(reg.agents).size === reg.agents.length && data.agents.every((a, i) => a.id === reg.agents[i]));
ok('every folder under agents/ is in the registry', readdirSync(root + 'agents', { withFileTypes: true }).filter((d) => d.isDirectory()).every((d) => reg.agents.includes(d.name)));
const need = ['id', 'name', 'role', 'status', 'owner', 'summary', 'routine', 'reachedBy', 'schedule', 'does', 'never', 'limits', 'memory', 'links', 'prompt', 'cost'];
for (const a of data.agents) {
  ok(`${a.id}: has every field the page reads`, need.every((k) => a[k] !== undefined && a[k] !== null), need.filter((k) => a[k] == null).join());
  ok(`${a.id}: a routine id and a claude.ai link that agree`, /^trig_[A-Za-z0-9]+$/.test(a.routine.id) && a.routine.url === `https://claude.ai/code/routines/${a.routine.id}`);
  ok(`${a.id}: its token estimate is explained and its numbers are positive`, typeof a.cost.basis === 'string' && a.cost.basis.length > 30 && Object.entries(a.cost).filter(([k]) => ['start', 'chat', 'run'].includes(k)).every(([, v]) => v > 0) && a.cost.run > 0);
  ok(`${a.id}: says what it does and what it never does`, a.does.length > 0 && a.never.length > 0);
  ok(`${a.id}: has durable memory that is written down`, a.memoryText.length > 40 && existsSync(root + a.memory.durable));
  ok(`${a.id}: the prompt is not in git and says why`, a.prompt.inGit === false && /public/i.test(a.prompt.why));
  ok(`${a.id}: links are on this site, or on GitHub`, a.links.every((l) => /^\//.test(l.href) || /^https:\/\/github\.com\/gushwork-design\//.test(l.href)));
}
// nothing committed here may be a secret: the repo is public
const SECRET = /(sk-ant-|xox[bpase]-|ghp_|github_pat_|Bearer\s+[A-Za-z0-9_\-]{12,}|-----BEGIN|AKIA[0-9A-Z]{12})/;
const files = ['agents/registry.json', ...data.agents.flatMap((a) => [`agents/${a.id}/agent.json`, a.memory.durable])];
ok('no file under agents/ holds anything that looks like a secret', files.every((f) => !SECRET.test(readFileSync(root + f, 'utf8'))), files.filter((f) => SECRET.test(readFileSync(root + f, 'utf8'))).join());
ok('routing only names agents that exist', (reg.routing || []).every((r) => reg.agents.includes(r.agent)));
ok('the page data is current (run node scripts/agents-build.mjs)', readFileSync(root + 'web/admin/agents-data.json', 'utf8') === render(data));
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
