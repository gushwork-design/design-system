/* Sample data for the support operations template. Every figure, name and ticket here is invented.
   It is generated from a seeded function, so it is stable between loads and consistent between pages: a ticket listed on
   Tickets opens as the same ticket on Ticket, and the Overview's backlog counts the same tickets the list shows.
   Replace this file with your real data layer; the pages read only window.SUP. */
window.SUP = (function () {
  'use strict';
  var DAY = 864e5, HOUR = 36e5, END = Date.UTC(2026, 9, 5);   // the "today" of the sample
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function hash(n) { n = Math.imul(n ^ (n >>> 15), 2246822507); n = Math.imul(n ^ (n >>> 13), 3266489909); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var short = function (t) { var d = new Date(t); return MON[d.getUTCMonth()] + ' ' + d.getUTCDate(); };
  var long = function (t) { return short(t) + ', ' + new Date(t).getUTCFullYear(); };
  var clock = function (t) { var d = new Date(t); return pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()); };
  var iso = function (t) { return new Date(t).toISOString(); };
  var nf = function (n) { return Math.round(n).toLocaleString('en-US'); };
  var minutes = function (m) { return m < 60 ? Math.round(m) + ' min' : (m / 60).toFixed(1) + ' h'; };
  var parseISO = function (s) { var p = s.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); };

  var QUEUES = ['Billing', 'Technical', 'Onboarding', 'Account access', 'Integrations'];
  var CHANNELS = ['Email', 'Chat', 'Web form', 'Phone'];
  var PRIORITIES = ['Urgent', 'High', 'Normal', 'Low'];
  var STATUSES = ['Open', 'Pending', 'Resolved'];
  var AGENTS = [
    { id: 'a1', name: 'Priya Nair', email: 'priya.nair@example.com', role: 'Support lead' },
    { id: 'a2', name: 'Marcus Webb', email: 'marcus.webb@example.com', role: 'Agent' },
    { id: 'a3', name: 'Elena Rossi', email: 'elena.rossi@example.com', role: 'Agent' },
    { id: 'a4', name: 'Tomás Alvarez', email: 'tomas.alvarez@example.com', role: 'Agent' },
    { id: 'a5', name: 'Hannah Kim', email: 'hannah.kim@example.com', role: 'Agent' },
    { id: 'a6', name: 'Daniel Okafor', email: 'daniel.okafor@example.com', role: 'Agent' },
    { id: 'a7', name: 'Sofia Lindqvist', email: 'sofia.lindqvist@example.com', role: 'Agent' },
    { id: 'a8', name: 'Wei Zhang', email: 'wei.zhang@example.com', role: 'Admin' }
  ];
  var SUBJECTS = [
    ['Invoice shows the wrong billing address', 'Billing'], ['Cannot reset my password', 'Account access'],
    ['Webhook deliveries failing since Tuesday', 'Integrations'], ['Export to CSV times out on large reports', 'Technical'],
    ['Seat count does not match the invoice', 'Billing'], ['Two-factor codes are not arriving', 'Account access'],
    ['Import stopped at 40 percent', 'Technical'], ['Request to merge two workspaces', 'Onboarding'],
    ['Refund for a duplicate charge', 'Billing'], ['Questions about API rate limits', 'Integrations'],
    ['Single sign-on loops back to the sign-in page', 'Account access'], ['Dashboard widgets are blank after the update', 'Technical'],
    ['Add a teammate without changing the invoice', 'Onboarding'], ['Calendar sync misses recurring events', 'Integrations'],
    ['Updating the payment method failed', 'Billing'], ['Data retention policy question', 'Onboarding'],
    ['Slack integration disconnected overnight', 'Integrations'], ['Archived projects are not visible', 'Technical'],
    ['Bulk edit changes the wrong rows', 'Technical'], ['Trial extension request', 'Billing'],
    ['Mobile app closes when opening reports', 'Technical'], ['Custom domain certificate is still pending', 'Onboarding'],
    ['Download link in the email has expired', 'Account access'], ['Guests cannot comment on shared pages', 'Account access']
  ];
  var PEOPLE = [
    ['Amara Osei', 'Northwind Logistics'], ['Jonas Berg', 'Halden & Co'], ['Mei Tanaka', 'Brightwell'], ['Carlos Mendes', 'Cobalt Freight'],
    ['Imogen Hart', 'Juniper Labs'], ['Rahul Verma', 'Tidewater Foods'], ['Lena Fischer', 'Marlow Studio'], ['Omar Haddad', 'Orchard Health'],
    ['Grace Mwangi', 'Kestrel Energy'], ['Nils Andersen', 'Fennel & Rye'], ['Yara Costa', 'Northwind Logistics'], ['Felix Moreau', 'Brightwell']
  ];
  var CHAN_W = [0.46, 0.28, 0.18, 0.08];

  function pick(a, r) { return a[Math.min(a.length - 1, Math.floor(r * a.length))]; }
  function weighted(a, w, r) { var s = 0; for (var i = 0; i < a.length; i++) { s += w[i]; if (r < s) return a[i]; } return a[a.length - 1]; }

  /* ---- tickets: 48, newest first, fixed ----------------------------------------------------------- */
  var TICKETS = [];
  for (var i = 0; i < 48; i++) {
    var n = 48 - i, r = function (k) { return hash(n * 17 + k); };
    var subj = SUBJECTS[(n * 5) % SUBJECTS.length], who = PEOPLE[Math.floor(r(1) * PEOPLE.length)];
    var created = END - Math.round((i * 0.13 + r(2) * 0.14) * DAY) - Math.round(r(3) * 9 * HOUR) + 9 * HOUR;
    var age = (END + 17 * HOUR - created) / HOUR;                       // hours since created, relative to 17:00 on the last day
    var priority = weighted(PRIORITIES, [0.12, 0.24, 0.48, 0.16], r(4));
    var status = age > 96 ? (r(5) < 0.7 ? 'Resolved' : 'Pending') : age > 36 ? weighted(STATUSES, [0.34, 0.3, 0.36], r(5)) : weighted(STATUSES, [0.62, 0.3, 0.08], r(5));
    var assigned = r(6) < 0.12 && status === 'Open' ? null : AGENTS[Math.floor(r(7) * AGENTS.length)];
    var frt = status === 'Open' && r(8) < 0.2 ? null : Math.round(8 + r(9) * (priority === 'Urgent' ? 25 : priority === 'High' ? 70 : 200));
    TICKETS.push({
      id: 'SUP-' + (1000 + n), num: 1000 + n, subject: subj[0], queue: subj[1], priority: priority, status: status,
      channel: weighted(CHANNELS, CHAN_W, r(10)), requester: who[0], company: who[1],
      email: who[0].toLowerCase().replace(/[^a-z ]/g, '').replace(' ', '.') + '@' + who[1].toLowerCase().replace(/[^a-z]+/g, '') + '.example',
      assignee: assigned ? assigned.id : null, created: created, frt: frt,
      resolvedAt: status === 'Resolved' ? created + Math.round((2 + r(11) * 40) * HOUR) : null,
      csat: status === 'Resolved' ? (r(12) < 0.78 ? 5 : r(12) < 0.9 ? 4 : r(12) < 0.96 ? 3 : 2) : null
    });
  }
  var agentById = function (id) { for (var k = 0; k < AGENTS.length; k++) if (AGENTS[k].id === id) return AGENTS[k]; return null; };
  var ticketById = function (id) { for (var k = 0; k < TICKETS.length; k++) if (TICKETS[k].id === id) return TICKETS[k]; return null; };

  /* ---- one ticket's activity, generated from the ticket ------------------------------------------------ */
  function activity(t) {
    var a = agentById(t.assignee), ev = [], at = t.created;
    ev.push({ t: at, tone: 'info', icon: 'chat', who: t.requester, text: 'opened the ticket by ' + t.channel.toLowerCase(), comment: 'Hi, I need help with this: ' + t.subject.toLowerCase() + '. It started a couple of days ago and is blocking our team.' });
    ev.push({ t: at + 2 * 60000, tone: '', icon: 'tag', who: 'Rules', text: 'routed the ticket to <b>' + t.queue + '</b> and set the priority to <b>' + t.priority + '</b>' });
    if (a) ev.push({ t: at + 4 * 60000, tone: '', icon: 'user', who: 'Rules', text: 'assigned the ticket to <b>' + a.name + '</b>' });
    if (a && t.frt) ev.push({ t: at + t.frt * 60000, tone: 'info', icon: 'send', who: a.name, text: 'replied to ' + t.requester, comment: 'Thanks for the details, ' + t.requester.split(' ')[0] + '. I have reproduced this on our side and I am checking it with the team. I will update you here shortly.' });
    if (a && t.frt && t.status !== 'Open') ev.push({ t: at + t.frt * 60000 + 3 * HOUR, tone: '', icon: 'note', who: a.name, text: 'added an internal note', comment: 'Confirmed on the current release. Workaround shared. Fix is queued for the next patch.' });
    if (t.status === 'Pending') ev.push({ t: at + t.frt * 60000 + 6 * HOUR, tone: 'warn', icon: 'clock', who: a ? a.name : 'Rules', text: 'set the ticket to <b>Pending</b> and is waiting for ' + t.requester.split(' ')[0] });
    if (t.status === 'Resolved') ev.push({ t: t.resolvedAt, tone: 'good', icon: 'check', who: a ? a.name : 'Rules', text: 'marked the ticket <b>Resolved</b>' });
    return ev.sort(function (x, y) { return y.t - x.t; });
  }

  /* ---- one day of the whole desk, stable per date ------------------------------------------------------- */
  function rec(t) {
    var d = Math.floor(t / DAY), dow = new Date(t).getUTCDay(), age = (t - END) / DAY, g = 0.8 + 0.2 * Math.exp(age / 160);
    var w = [0.35, 1.08, 1.14, 1.1, 1.04, 0.92, 0.4][dow];
    var created = Math.max(1, Math.round(74 * w * g * (1 + (hash(d * 3 + 1) - 0.5) * 0.26)));
    var resolved = Math.max(1, Math.round(created * (0.9 + (hash(d * 3 + 2) - 0.5) * 0.22)));
    var frt = 46 + Math.min(14, -age * 0.04) + (hash(d * 3 + 3) - 0.5) * 18;           // median first response, minutes
    var csat = Math.min(99, 91 + (hash(d * 3 + 4) - 0.5) * 8 - Math.min(2, -age * 0.01));
    var queue = {}; QUEUES.forEach(function (q, k) { queue[q] = Math.round(created * [0.24, 0.31, 0.17, 0.16, 0.12][k]); });
    return { t: t, created: created, resolved: resolved, frt: frt, csat: csat, queue: queue };
  }
  function recs(from, to) { var a = []; for (var t = from; t <= to; t += DAY) a.push(rec(t)); return a; }
  function sum(a) {
    var s = { created: 0, resolved: 0, frt: 0, csat: 0 };
    a.forEach(function (r) { s.created += r.created; s.resolved += r.resolved; s.frt += r.frt; s.csat += r.csat; });
    s.frt = a.length ? s.frt / a.length : 0; s.csat = a.length ? s.csat / a.length : 0; return s;
  }


  /* ---- companies and people, derived from the tickets so the counts always agree with the Tickets page ---- */
  var PLANS = ['Starter', 'Growth', 'Scale'];
  function companies() {
    var names = [], by = {};
    PEOPLE.forEach(function (p) { if (names.indexOf(p[1]) < 0) names.push(p[1]); });
    names.forEach(function (n, i) { by[n] = { name: n, plan: PLANS[Math.floor(hash(i * 5 + 1) * 3)], seats: Math.round(8 + hash(i * 5 + 2) * 140), owner: AGENTS[Math.floor(hash(i * 5 + 3) * AGENTS.length)].id, tickets: 0, open: 0, last: 0, csat: [] }; });
    TICKETS.forEach(function (t) {
      var c = by[t.company]; if (!c) return;
      c.tickets++; if (t.status !== 'Resolved') c.open++; if (t.created > c.last) c.last = t.created; if (t.csat) c.csat.push(t.csat);
    });
    return names.map(function (n) {
      var c = by[n], avg = c.csat.length ? c.csat.reduce(function (a, v) { return a + v; }, 0) / c.csat.length : null;
      c.satisfaction = avg; c.health = c.open >= 4 || (avg && avg < 4) ? 'At risk' : c.open === 0 && c.tickets > 0 ? 'Healthy' : 'Stable';
      return c;
    });
  }
  function people() {
    return PEOPLE.map(function (p, i) {
      var ts = TICKETS.filter(function (t) { return t.requester === p[0]; }), cs = ts.filter(function (t) { return t.csat; }).map(function (t) { return t.csat; });
      return { name: p[0], company: p[1], email: p[0].toLowerCase().replace(/[^a-z ]/g, '').replace(' ', '.') + '@' + p[1].toLowerCase().replace(/[^a-z]+/g, '') + '.example', tickets: ts.length, open: ts.filter(function (t) { return t.status !== 'Resolved'; }).length, last: ts.reduce(function (a, t) { return Math.max(a, t.created); }, 0), satisfaction: cs.length ? cs.reduce(function (a, v) { return a + v; }, 0) / cs.length : null };
    });
  }

  /* ---- the desk's people: workload and results per agent ------------------------------------------------ */
  var CAPACITY = 12, PRESENCE = ['Online', 'Online', 'Away', 'Online', 'Offline', 'Online', 'Away', 'Online'];
  function agentStats() {
    return AGENTS.map(function (a, i) {
      var ts = TICKETS.filter(function (t) { return t.assignee === a.id; }), open = ts.filter(function (t) { return t.status !== 'Resolved'; });
      var f = ts.filter(function (t) { return t.frt; }).map(function (t) { return t.frt; }).sort(function (x, y) { return x - y; }), cs = ts.filter(function (t) { return t.csat; }).map(function (t) { return t.csat; });
      var byP = { Urgent: 0, High: 0, Normal: 0, Low: 0 }; open.forEach(function (t) { byP[t.priority]++; });
      return { agent: a, presence: PRESENCE[i], open: open.length, resolved: ts.length - open.length, byPriority: byP, frt: f.length ? f[Math.floor(f.length / 2)] : null, csat: cs.length ? cs.reduce(function (x, v) { return x + v; }, 0) / cs.length : null, capacity: CAPACITY, load: Math.min(100, Math.round(open.length / CAPACITY * 100)) };
    });
  }

  /* ---- help centre -------------------------------------------------------------------------------------- */
  var CATEGORIES = ['Getting started', 'Billing', 'Account access', 'Integrations', 'Technical', 'Workspaces'];
  var ARTICLE_TITLES = [
    ['Reset your password', 'Account access'], ['Update a payment method', 'Billing'], ['Set up single sign-on', 'Account access'], ['Export reports to CSV', 'Technical'],
    ['Connect Slack', 'Integrations'], ['How webhook delivery and retries work', 'Integrations'], ['Invite teammates and set roles', 'Getting started'], ['Merge two workspaces', 'Workspaces'],
    ['Understand your invoice', 'Billing'], ['Request a refund', 'Billing'], ['Use the mobile app', 'Getting started'], ['Set up a custom domain', 'Workspaces'],
    ['API rate limits', 'Integrations'], ['Archive and restore projects', 'Workspaces'], ['Sync your calendar', 'Integrations'], ['Turn on two-factor authentication', 'Account access'],
    ['Data retention and deletion', 'Workspaces'], ['Edit many rows at once', 'Technical'], ['Import data from a spreadsheet', 'Technical'], ['Give a guest access', 'Account access'],
    ['Fix an expired download link', 'Technical'], ['Ask for a trial extension', 'Billing'], ['Take a tour of the dashboard', 'Getting started'], ['Troubleshoot a blank dashboard', 'Technical']
  ];
  var ARTICLES = ARTICLE_TITLES.map(function (a, i) {
    var r = function (k) { return hash(i * 13 + k + 400); };
    var status = r(1) < 0.68 ? 'Published' : r(1) < 0.86 ? 'Draft' : 'Needs review';
    return { id: 'KB-' + (200 + i), title: a[0], category: a[1], status: status, author: AGENTS[Math.floor(r(2) * AGENTS.length)].id, updated: END - Math.round(r(3) * 60) * DAY, views: status === 'Published' ? Math.round(120 + r(4) * 4200) : null, helpful: status === 'Published' ? Math.round(68 + r(5) * 28) : null };
  });

  return {
    DAY: DAY, HOUR: HOUR, END: END, MON: MON, DOW: DOW, QUEUES: QUEUES, CHANNELS: CHANNELS, PRIORITIES: PRIORITIES, STATUSES: STATUSES,
    AGENTS: AGENTS, TICKETS: TICKETS, PLANS: PLANS, CATEGORIES: CATEGORIES, ARTICLES: ARTICLES, CAPACITY: CAPACITY, companies: companies, people: people, agentStats: agentStats, hash: hash, short: short, long: long, clock: clock, iso: iso, nf: nf, minutes: minutes, parseISO: parseISO,
    agentById: agentById, ticketById: ticketById, activity: activity, rec: rec, recs: recs, sum: sum,
    /* relative time against the sample's own "now" (17:00 on the last day), so it never drifts */
    ago: function (t) {
      var m = Math.max(1, Math.round((END + 17 * HOUR - t) / 60000));
      return m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago';
    },
    stamp: function (t) { return long(t) + ', ' + clock(t) + ' UTC'; }
  };
})();
