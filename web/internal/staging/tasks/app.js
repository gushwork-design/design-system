/* Tasks board. One classic script, no dependencies. Sections: core (helpers, dates, sort, filters), api and
   state, render per view, drawer, pickers, board and timeline interaction, Ask Bruce, wiring. The pure helpers
   (dates, sort, filters) touch no DOM so they can be tested on their own (window.GWTasks). */
(function () {
  'use strict';
  const doc = document;
  const $ = (s, r) => (r || doc).querySelector(s);
  const $$ = (s, r) => Array.from((r || doc).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  };

  /* ------------------------------------------------------------------ icons (Phosphor, from assets/icons) */
  const ICON = {
    search: '<path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"/>',
    filter: '<path d="M230.6,49.53A15.81,15.81,0,0,0,216,40H40A16,16,0,0,0,28.19,66.76l.08.09L96,139.17V216a16,16,0,0,0,24.87,13.32l32-21.34A16,16,0,0,0,160,194.66V139.17l67.74-72.32.08-.09A15.8,15.8,0,0,0,230.6,49.53ZM40,56h0Zm106.18,74.58A8,8,0,0,0,144,136v58.66L112,216V136a8,8,0,0,0-2.16-5.47L40,56H216Z"/>',
    display: '<path d="M40,88H73a32,32,0,0,0,62,0h81a8,8,0,0,0,0-16H135a32,32,0,0,0-62,0H40a8,8,0,0,0,0,16Zm64-24A16,16,0,1,1,88,80,16,16,0,0,1,104,64ZM216,168H199a32,32,0,0,0-62,0H40a8,8,0,0,0,0,16h97a32,32,0,0,0,62,0h17a8,8,0,0,0,0-16Zm-48,24a16,16,0,1,1,16-16A16,16,0,0,1,168,192Z"/>',
    plus: '<path d="M228,128a12,12,0,0,1-12,12H140v76a12,12,0,0,1-24,0V140H40a12,12,0,0,1,0-24h76V40a12,12,0,0,1,24,0v76h76A12,12,0,0,1,228,128Z"/>',
    x: '<path d="M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z"/>',
    down: '<path d="M216.49,104.49l-80,80a12,12,0,0,1-17,0l-80-80a12,12,0,0,1,17-17L128,159l71.51-71.52a12,12,0,0,1,17,17Z"/>',
    right: '<path d="M184.49,136.49l-80,80a12,12,0,0,1-17-17L159,128,87.51,56.49a12,12,0,1,1,17-17l80,80A12,12,0,0,1,184.49,136.49Z"/>',
    left: '<path d="M168.49,199.51a12,12,0,0,1-17,17l-80-80a12,12,0,0,1,0-17l80-80a12,12,0,0,1,17,17L97,128Z"/>',
    more: '<path d="M144,128a16,16,0,1,1-16-16A16,16,0,0,1,144,128ZM60,112a16,16,0,1,0,16,16A16,16,0,0,0,60,112Zm136,0a16,16,0,1,0,16,16A16,16,0,0,0,196,112Z"/>',
    check: '<path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z"/>',
    cal: '<path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Z"/>',
    warn: '<path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z"/>',
    retry: '<path d="M244,56v48a12,12,0,0,1-12,12H184a12,12,0,1,1,0-24H201.1l-19-17.38c-.13-.12-.26-.24-.38-.37A76,76,0,1,0,127,204h1a75.53,75.53,0,0,0,52.15-20.72,12,12,0,0,1,16.49,17.45A99.45,99.45,0,0,1,128,228h-1.37A100,100,0,1,1,198.51,57.06L220,76.72V56a12,12,0,0,1,24,0Z"/>',
    at: '<path d="M128,24a104,104,0,0,0,0,208c21.51,0,44.1-6.48,60.43-17.33a8,8,0,0,0-8.86-13.33C166,210.38,146.21,216,128,216a88,88,0,1,1,88-88c0,26.45-10.88,32-20,32s-20-5.55-20-32V88a8,8,0,0,0-16,0v4.26a48,48,0,1,0,5.93,65.1c6,12,16.35,18.64,30.07,18.64,22.54,0,36-17.94,36-48A104.11,104.11,0,0,0,128,24Zm0,136a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z"/>',
    send: '<path d="M208.49,120.49a12,12,0,0,1-17,0L140,69V216a12,12,0,0,1-24,0V69L64.49,120.49a12,12,0,0,1-17-17l72-72a12,12,0,0,1,17,0l72,72A12,12,0,0,1,208.49,120.49Z"/>',
    trash: '<path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"/>',
    out: '<path d="M224,104a8,8,0,0,1-16,0V59.32l-66.33,66.34a8,8,0,0,1-11.32-11.32L196.68,48H152a8,8,0,0,1,0-16h64a8,8,0,0,1,8,8Zm-40,24a8,8,0,0,0-8,8v72H48V80h72a8,8,0,0,0,0-16H48A16,16,0,0,0,32,80V208a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V136A8,8,0,0,0,184,128Z"/>',
    grip: '<path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60,12a12,12,0,1,0-12-12A12,12,0,0,0,164,72ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"/>',
    tasks: '<path d="M224,128a8,8,0,0,1-8,8H128a8,8,0,0,1,0-16h88A8,8,0,0,1,224,128ZM128,72h88a8,8,0,0,0,0-16H128a8,8,0,0,0,0,16Zm88,112H128a8,8,0,0,0,0,16h88a8,8,0,0,0,0-16ZM82.34,42.34,56,68.69,45.66,58.34A8,8,0,0,0,34.34,69.66l16,16a8,8,0,0,0,11.32,0l32-32A8,8,0,0,0,82.34,42.34Zm0,64L56,132.69,45.66,122.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32,0l32-32a8,8,0,0,0-11.32-11.32Zm0,64L56,196.69,45.66,186.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32,0l32-32a8,8,0,0,0-11.32-11.32Z"/>',
    chat: '<path d="M140,128a12,12,0,1,1-12-12A12,12,0,0,1,140,128ZM84,116a12,12,0,1,0,12,12A12,12,0,0,0,84,116Zm88,0a12,12,0,1,0,12,12A12,12,0,0,0,172,116Zm60,12A104,104,0,0,1,79.12,219.82L45.07,231.17a16,16,0,0,1-20.24-20.24l11.35-34.05A104,104,0,1,1,232,128Zm-16,0A88,88,0,1,0,51.81,172.06a8,8,0,0,1,.66,6.54L40,216,77.4,203.53a7.85,7.85,0,0,1,2.53-.42,8,8,0,0,1,4,1.08A88,88,0,0,0,216,128Z"/>',
  };
  const ico = (k, px) => '<svg viewBox="0 0 256 256" width="' + (px || 16) + '" height="' + (px || 16) + '" fill="currentColor" aria-hidden="true" focusable="false">' + ICON[k] + '</svg>';

  /* ------------------------------------------------------------------ dates: plain YYYY-MM-DD, local calendar day, no time */
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parseYmd = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); if (!m) return null; const d = new Date(+m[1], +m[2] - 1, +m[3], 12); return ymd(d) === s ? d : null; };   // noon, so a DST shift never changes the day
  const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
  const diffDays = (a, b) => Math.round((parseYmd(a) - parseYmd(b)) / 864e5);
  const weekday = (s) => (parseYmd(s).getDay() + 6) % 7;          // Monday is 0
  const mondayOf = (s) => addDays(s, -weekday(s));
  const todayStr = () => ymd(new Date());
  const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const fmtLong = (s) => { const d = parseYmd(s); return d ? DOW[weekday(s)] + ' ' + d.getDate() + ' ' + MON[d.getMonth()] : ''; };
  const fmtShort = (s) => { const d = parseYmd(s); return d ? d.getDate() + ' ' + MON[d.getMonth()] : ''; };
  function relDay(s, today) {            // the words on a card: Today, Tomorrow, Fri, 2 days ago, 12 Oct
    const n = diffDays(s, today);
    if (n === 0) return 'Today';
    if (n === 1) return 'Tomorrow';
    if (n === -1) return 'Yesterday';
    if (n < 0 && n > -14) return Math.abs(n) + ' days ago';
    if (n > 1 && n < 7) return DOW[weekday(s)];
    return fmtShort(s) + (parseYmd(s).getFullYear() !== parseYmd(today).getFullYear() ? ' ' + parseYmd(s).getFullYear() : '');
  }
  const WD = { mon: 0, monday: 0, tue: 1, tues: 1, tuesday: 1, wed: 2, weds: 2, wednesday: 2, thu: 3, thur: 3, thurs: 3, thursday: 3, fri: 4, friday: 4, sat: 5, saturday: 5, sun: 6, sunday: 6 };
  const MO = { jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11 };
  function addMonths(s, n) { const d = parseYmd(s); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); return ymd(d); }
  // "fri", "next week", "in 3 days", "oct 12": a plain-words date, or null when the words mean nothing
  function parseDateText(raw, today) {
    const s = String(raw || '').trim().toLowerCase().replace(/[,.]/g, '').replace(/\s+/g, ' ');
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return parseYmd(s) ? s : null;
    if (s === 'today' || s === 'tod') return today;
    if (s === 'tomorrow' || s === 'tmr' || s === 'tmrw') return addDays(today, 1);
    if (s === 'yesterday') return addDays(today, -1);
    const wd = weekday(today);
    if (s in WD) { let n = WD[s] - wd; if (n <= 0) n += 7; return addDays(today, n); }
    let m = /^(next|this) (\w+)$/.exec(s);
    if (m && m[2] in WD) return m[1] === 'next' ? addDays(mondayOf(today), 7 + WD[m[2]]) : (WD[m[2]] > wd ? addDays(mondayOf(today), WD[m[2]]) : addDays(mondayOf(today), 7 + WD[m[2]]));
    if (s === 'next week') return addDays(mondayOf(today), 7);
    if (s === 'weekend' || s === 'this weekend') return wd >= 5 ? today : addDays(today, 5 - wd);
    if (s === 'next month') return addMonths(today, 1);
    m = /^(?:in )?(\d{1,3}) ?(d|day|days|w|wk|wks|week|weeks|m|mo|month|months)$/.exec(s);
    if (m && (s.startsWith('in ') || /^\d+ ?(d|w|wk|wks)$/.test(s))) { const n = +m[1], u = m[2][0]; return u === 'd' ? addDays(today, n) : u === 'w' ? addDays(today, n * 7) : addMonths(today, n); }
    m = /^([a-z]+) (\d{1,2})(?:st|nd|rd|th)?(?: (\d{4}))?$/.exec(s) || null;
    let mon, day, yr;
    if (m && m[1] in MO) { mon = MO[m[1]]; day = +m[2]; yr = m[3] ? +m[3] : null; }
    else { m = /^(\d{1,2})(?:st|nd|rd|th)? ([a-z]+)(?: (\d{4}))?$/.exec(s); if (m && m[2] in MO) { mon = MO[m[2]]; day = +m[1]; yr = m[3] ? +m[3] : null; } else return null; }
    const ty = parseYmd(today).getFullYear();
    let out = ty + '-' + pad(mon + 1) + '-' + pad(day);
    if (!yr) { if (!parseYmd(out)) return null; if (out < today) out = (ty + 1) + '-' + pad(mon + 1) + '-' + pad(day); }
    else out = yr + '-' + pad(mon + 1) + '-' + pad(day);
    return parseYmd(out) ? out : null;
  }
  function ago(iso) {
    const t = Date.parse(iso); if (!t) return '';
    const m = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (m < 1) return 'just now'; if (m < 60) return m + ' min ago';
    const h = Math.round(m / 60); if (h < 24) return h + ' h ago';
    const d = Math.round(h / 24); return d + ' d ago';
  }

  /* ------------------------------------------------------------------ priority, sort ("Bruce's order") and filters */
  const PR = { urgent: 0, high: 1, med: 2, low: 3, '': 4 };
  const PR_NAME = { urgent: 'Urgent', high: 'High', med: 'Medium', low: 'Low', '': 'No priority' };
  const PR_LEVEL = { urgent: 4, high: 3, med: 2, low: 1, '': 0 };
  const STATUS_NAME = { suggested: 'Suggested', todo: 'To do', doing: 'Doing', done: 'Done', dismissed: 'Dismissed' };
  const isOverdue = (t, today) => !!t.due && t.due < today && t.status !== 'done' && t.status !== 'dismissed';
  // Bruce's order: priority first, then soonest due. An overdue task moves up one level in the ORDER only; its stored priority is untouched.
  function orderRank(t, today) { let r = PR[t.priority || '']; if (isOverdue(t, today) && r > 0) r -= 1; return r; }
  const dateKey = (s) => s || '9999-99-99';
  function sortTasks(list, key, dir, today) {
    const sign = dir === 'desc' ? -1 : 1;
    const out = list.slice();
    const tie = (a, b) => (a.n || 0) - (b.n || 0);
    const byDue = (a, b) => (dateKey(a.due) < dateKey(b.due) ? -1 : dateKey(a.due) > dateKey(b.due) ? 1 : 0);
    out.sort((a, b) => {
      let c = 0;
      if (key === 'bruce') c = orderRank(a, today) - orderRank(b, today) || byDue(a, b);
      else if (key === 'priority') { if (!a.priority !== !b.priority) return !a.priority ? 1 : -1; c = (PR[a.priority || ''] - PR[b.priority || '']) * sign || byDue(a, b); }
      else if (key === 'due') { if (!a.due !== !b.due) return !a.due ? 1 : -1; c = byDue(a, b) * sign; }
      else if (key === 'start') { if (!a.start !== !b.start) return !a.start ? 1 : -1; c = (dateKey(a.start) < dateKey(b.start) ? -1 : dateKey(a.start) > dateKey(b.start) ? 1 : 0) * sign; }
      else if (key === 'created') c = (String(a.createdAt) < String(b.createdAt) ? -1 : String(a.createdAt) > String(b.createdAt) ? 1 : 0) * sign;
      else if (key === 'updated') c = (String(a.updatedAt) < String(b.updatedAt) ? -1 : String(a.updatedAt) > String(b.updatedAt) ? 1 : 0) * sign;
      return c || tie(a, b);
    });
    return out;
  }
  const weekEnd = (today) => addDays(mondayOf(today), 6);
  const FIELDS = [
    { key: 'status', label: 'Status', values: [['suggested', 'Suggested'], ['todo', 'To do'], ['doing', 'Doing'], ['done', 'Done']] },
    { key: 'priority', label: 'Priority', values: [['urgent', 'Urgent'], ['high', 'High'], ['med', 'Medium'], ['low', 'Low'], ['none', 'No priority']] },
    { key: 'due', label: 'Due date', values: [['overdue', 'Overdue'], ['today', 'Today'], ['week', 'This week'], ['none', 'Has none']] },
    { key: 'source', label: 'Source', values: [['slack', 'Slack'], ['hand', 'Added by hand']] },
    { key: 'added', label: 'Added by', values: [['you', 'You'], ['bruce', 'Bruce']] },
    { key: 'assignee', label: 'Assignee', values: null }
  ];
  function taskValue(t, field, today) {   // the value(s) a task has for a filter field
    if (field === 'status') return t.status;
    if (field === 'priority') return t.priority || 'none';
    if (field === 'due') { const v = []; if (!t.due) v.push('none'); else { if (isOverdue(t, today)) v.push('overdue'); if (t.due === today) v.push('today'); if (t.due >= mondayOf(today) && t.due <= weekEnd(today)) v.push('week'); } return v; }
    if (field === 'source') return t.source && t.source.kind === 'slack' ? 'slack' : 'hand';
    if (field === 'added') return t.createdBy === 'bruce' ? 'bruce' : 'you';
    if (field === 'assignee') return t.assignee || 'none';
    return '';
  }
  function matchFilters(t, filters, today) {   // any-of within a field, all fields must match
    return filters.every((f) => { const v = taskValue(t, f.field, today); return f.values.some((x) => Array.isArray(v) ? v.includes(x) : v === x); });
  }
  const sameFilters = (a, b) => JSON.stringify(normFilters(a)) === JSON.stringify(normFilters(b));
  const normFilters = (fs) => fs.map((f) => ({ field: f.field, values: f.values.slice().sort() })).sort((a, b) => (a.field < b.field ? -1 : 1));
  const BUILTIN_VIEWS = [
    { id: 'all', name: 'All', filters: [] },
    { id: 'today', name: 'Today', filters: [{ field: 'due', values: ['today'] }] },
    { id: 'bruce', name: 'From Bruce', filters: [{ field: 'added', values: ['bruce'] }] },
    { id: 'overdue', name: 'Overdue', filters: [{ field: 'due', values: ['overdue'] }] },
    { id: 'agents', name: 'Agents’ work', filters: [{ field: 'assignee', values: ['a:bruce', 'a:alfred'] }] }
  ];

  window.GWTasks = { parseDateText, sortTasks, orderRank, matchFilters, ymd, addDays, diffDays, mondayOf, relDay, FIELDS };

  /* ------------------------------------------------------------------ state */
  const S = {
    status: 'loading', err: null,
    tasks: [], me: { email: '', name: '' }, names: {}, agents: [], ask: { used: 0, cap: 0 },
    view: store.get('gw-tasks-view', 'board'),
    filters: [], search: '',
    display: Object.assign({ sort: 'bruce', dir: 'asc', group: 'due', showDone: true, showDismissed: false }, store.get('gw-tasks-display', {})),
    custom: store.get('gw-tasks-views', []),           // [{id, name, filters}]
    openId: null, sel: new Set(), collapsed: new Set(['done']),
    lane: 'todo',                                        // the one lane a phone shows
    tl: { zoom: store.get('gw-tasks-zoom', 'week'), start: null },
    inboxId: null, lastDismissed: [],
    today: todayStr()
  };
  const isPhone = () => matchMedia('(max-width: 767px)').matches;
  const VIEWS = ['board', 'list', 'timeline', 'inbox'];
  if (!VIEWS.includes(S.view)) S.view = 'board';
  const byId = (id) => S.tasks.find((t) => t.id === id);
  const tag = (t) => 'TSK-' + t.n;
  const agentOf = (id) => S.agents.find((a) => a.id === id);
  const isAgent = (a) => /^a:/.test(a || '');
  const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  function personName(email) { if (email === S.me.email) return S.me.name || cap1(email.split('@')[0]); return S.names[email] || cap1(email.split('@')[0].replace(/[._]/g, ' ')); }
  function nameOf(a) {
    if (!a) return 'Unassigned';
    if (isAgent(a)) { const g = agentOf(a.slice(2)); return g ? g.name : cap1(a.slice(2)); }
    return personName(a.slice(2));
  }
  const actorName = (by) => { if (by === 'bruce' || by === 'alfred') { const g = agentOf(by); return g ? g.name : cap1(by); } return by === S.me.email ? 'You' : personName(by); };
  const initials = (n) => { const p = String(n).replace(/[^\w\s.]/g, '').split(/[\s.]+/).filter(Boolean); return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase(); };
  const meAssignee = () => 'u:' + S.me.email;

  /* ------------------------------------------------------------------ api */
  async function request(method, body, qs) {
    const res = await fetch('/api/tasks' + (qs || ''), { method, credentials: 'same-origin', cache: 'no-store', headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    let data = null; try { data = await res.json(); } catch (e) { /* no body */ }
    if (!res.ok) { const err = new Error((data && data.error) || 'That did not work. Try again.'); err.status = res.status; err.data = data; throw err; }
    return data;
  }
  const toast = (m, o) => { if (window.GD && GD.toast) GD.toast(m, o); };
  const failToast = (e) => toast(e && e.message ? e.message : 'That did not save. Try again.', { type: 'error' });
  function put(t) { const i = S.tasks.findIndex((x) => x.id === t.id); if (i < 0) S.tasks.push(t); else S.tasks[i] = t; }
  async function load() {
    S.status = 'loading'; render();
    try {
      const d = await request('GET');
      S.tasks = d.tasks || []; S.me = d.me || S.me; S.names = d.names || {}; S.agents = d.agents || []; S.ask = d.ask || { used: 0, cap: 0 };
      // the launcher's dot says when Bruce last finished scanning Slack, or that he has not yet
      const dot = document.getElementById('tk-launch-status');
      if (dot) { const tip = d.scan && d.scan.at ? 'Bruce last scanned Slack ' + ago(d.scan.at) + '. Open settings.' : 'Bruce has not scanned Slack yet. Open settings.'; dot.setAttribute('data-gd-tooltip', tip); dot.setAttribute('aria-label', tip); }
      S.status = 'ready'; S.err = null;
    } catch (e) { S.status = 'error'; S.err = e; }
    S.today = todayStr();
    render();
  }
  // mirror the server's rules for an instant response; the reply from the server then replaces it
  function optimistic(t, patch) {
    Object.assign(t, patch);
    if ('due' in patch || 'priority' in patch) { t.guessed = Object.assign({}, t.guessed, 'due' in patch ? { due: false } : {}, 'priority' in patch ? { priority: false } : {}); }
    if ('status' in patch) t.doneAt = patch.status === 'done' ? new Date().toISOString() : '';
    if ('assignee' in patch) { t.run = isAgent(patch.assignee) ? 'queued' : ''; if (!isAgent(patch.assignee)) t.runNote = ''; }
    return t;
  }
  async function update(id, patch, o) {
    const t = byId(id); if (!t) return null;
    const before = JSON.parse(JSON.stringify(t));
    optimistic(t, patch);
    if (!o || !o.quiet) refresh();
    try { const r = await request('POST', { op: 'update', id, patch }); put(r.task); if (!o || !o.quiet) refresh(); return r.task; }
    catch (e) { put(before); refresh(); failToast(e); return null; }
  }
  async function bulk(ids, patch) {
    const before = ids.map((id) => byId(id)).filter(Boolean).map((t) => JSON.parse(JSON.stringify(t)));
    before.forEach((b) => optimistic(byId(b.id), patch)); refresh();
    try { const r = await request('POST', { op: 'bulk', ids, patch }); r.tasks.forEach(put); refresh(); return r.tasks; }
    catch (e) { before.forEach(put); refresh(); failToast(e); return null; }
  }
  async function createTask(task) {
    try { const r = await request('POST', { op: 'create', task }); put(r.task); refresh(); return r.task; } catch (e) { failToast(e); return null; }
  }
  async function acceptTask(id) {
    const t = byId(id); if (!t) return null;
    const before = JSON.parse(JSON.stringify(t)); t.status = 'todo'; if (!t.assignee) t.assignee = meAssignee(); refresh();
    try { const r = await request('POST', { op: 'accept', id }); put(r.task); refresh(); return r.task; } catch (e) { put(before); refresh(); failToast(e); return null; }
  }
  async function dismissTask(id) {
    const t = byId(id); if (!t) return null;
    const before = JSON.parse(JSON.stringify(t)); t.status = 'dismissed'; refresh();
    try { const r = await request('POST', { op: 'dismiss', id }); put(r.task); refresh(); return r.task; } catch (e) { put(before); refresh(); failToast(e); return null; }
  }
  async function deleteTask(id) {
    try { await request('POST', { op: 'delete', id }); S.tasks = S.tasks.filter((t) => t.id !== id); S.sel.delete(id); refresh(); return true; } catch (e) { failToast(e); return false; }
  }

  /* ------------------------------------------------------------------ what is visible */
  const searchText = (t) => (tag(t) + ' ' + t.title + ' ' + (t.notes || '') + ' ' + (t.source ? t.source.channel + ' ' + t.source.from : '')).toLowerCase();
  function baseVisible(t) {                        // dismissed and done are hidden unless Display says otherwise
    if (t.status === 'dismissed') return S.display.showDismissed;
    if (t.status === 'done') return S.display.showDone;
    return true;
  }
  function visible(list) {
    const q = S.search.trim().toLowerCase();
    return (list || S.tasks).filter((t) => baseVisible(t) && matchFilters(t, S.filters, S.today) && (!q || searchText(t).includes(q)));
  }
  const sorted = (list) => sortTasks(list, S.display.sort, S.display.dir, S.today);
  function viewsList() {
    const agentIds = S.agents.map((a) => 'a:' + a.id);
    const b = BUILTIN_VIEWS.map((v) => v.id === 'agents' ? { id: v.id, name: v.name, filters: [{ field: 'assignee', values: agentIds }] } : v);
    return b.concat(S.custom.map((v) => ({ id: 'c:' + v.id, name: v.name, filters: v.filters, custom: true, rawId: v.id })));
  }
  const viewCount = (v) => S.tasks.filter((t) => t.status !== 'dismissed' && t.status !== 'done' && matchFilters(t, v.filters, S.today)).length;
  const currentView = () => viewsList().find((v) => sameFilters(v.filters, S.filters));

  /* ------------------------------------------------------------------ small html blocks */
  function avHtml(a, o) {
    o = o || {};
    const cls = ['gd-av']; if (o.sm) cls.push('gd-av--sm'); if (o.lg) cls.push('gd-av--lg'); if (o.btn) cls.push('gd-av--btn');
    let inner = '', label = nameOf(a);
    if (!a) { cls.push('gd-av--ghost'); label = 'Unassigned'; }
    else if (isAgent(a)) { cls.push('gd-av--agent', a === 'a:bruce' ? 'gd-av--ink' : 'gd-av--outline'); inner = esc(nameOf(a).charAt(0)); }
    else inner = esc(initials(nameOf(a)));
    const attrs = (o.attrs || '') + (o.btn ? '' : ' role="img"') + ' aria-label="' + esc(label) + '"';
    return o.btn ? '<button type="button" class="' + cls.join(' ') + '"' + attrs + '>' + inner + '</button>' : '<span class="' + cls.join(' ') + '"' + attrs + ' data-gd-tooltip="' + esc(label) + '">' + inner + '</span>';
  }
  function prioHtml(p) {
    if (!p) return '';
    if (p === 'urgent') return '<span class="gd-badge gd-badge--solid">Urgent</span>';
    return '<span class="gd-prio" data-level="' + PR_LEVEL[p] + '" role="img" aria-label="' + PR_NAME[p] + ' priority" data-gd-tooltip="' + PR_NAME[p] + ' priority"><i></i><i></i><i></i></span>';
  }
  const RUN_NAME = { queued: 'Queued', working: 'Working', needs: 'Needs you', review: 'Ready for review', failed: 'Failed' };
  const RUN_DOT = { queued: 'neutral', working: 'info gd-status-dot--live', needs: 'warn', review: 'good', failed: 'bad' };
  function runHtml(t, withRetry) {
    if (!isAgent(t.assignee) || !t.run) return '';
    const inner = '<span class="gd-status-dot gd-status-dot--' + RUN_DOT[t.run] + '" aria-hidden="true"></span>' + RUN_NAME[t.run] + (t.run === 'failed' && withRetry ? ' \u00b7 Retry' : '');
    return t.run === 'failed' && withRetry
      ? '<button type="button" class="gd-run gd-run--btn" data-state="failed" data-act="retry" data-id="' + t.id + '" aria-label="Failed. Retry ' + esc(tag(t)) + '">' + inner + '</button>'
      : '<span class="gd-run" data-state="' + t.run + '">' + inner + '</span>';
  }
  function dueHtml(t, withGuess) {
    if (!t.due) return '';
    const od = isOverdue(t, S.today), td = t.due === S.today && t.status !== 'done';
    const cls = od ? ' gd-badge--bad' : td ? ' gd-badge--warn' : '';
    return '<span class="gd-badge' + cls + '" title="' + esc(fmtLong(t.due)) + '">' + esc(relDay(t.due, S.today)) + (withGuess && t.guessed && t.guessed.due ? ' \u00b7 guessed' : '') + '</span>';
  }
  const srcHtml = (t) => t.source && t.source.channel ? '<span class="gd-badge" title="From Slack, ' + esc(t.source.channel) + '">' + esc(t.source.channel) + '</span>' : '';
  const bruceMark = (t) => t.createdBy === 'bruce' && t.assignee !== 'a:bruce' ? '<span class="gd-av gd-av--agent gd-av--ink gd-av--sm" role="img" aria-label="Bruce added this" data-gd-tooltip="Bruce added this">B</span>' : '';
  const itemBtn = (cls, act, text, extra) => '<button type="button" class="gd-menu__item' + (cls ? ' ' + cls : '') + '" role="menuitem" data-value="' + act + '"' + (extra || '') + '><span>' + text + '</span></button>';

  function cardMenu(t) {
    const items = [];
    if (t.status === 'suggested') items.push(itemBtn('', 'accept', 'Accept'), itemBtn('', 'dismiss', 'Dismiss'));
    else if (t.status === 'dismissed') items.push(itemBtn('', 'restore', 'Restore to suggestions'));
    else {
      items.push(itemBtn('', 'open', 'Open'));
      ['todo', 'doing', 'done'].filter((s) => s !== t.status).forEach((s) => items.push(itemBtn('', 'move:' + s, 'Move to ' + STATUS_NAME[s])));
    }
    items.push(itemBtn('', 'ask', 'Ask about this'));
    if (t.status !== 'suggested' && t.status !== 'dismissed') items.push('<div class="gd-menu__sep"></div>', itemBtn('gd-menu__item--danger', 'delete', 'Delete\u2026'));
    return '<div class="gd-pop gd-taskcard__more"><button type="button" class="gd-iconbtn gd-iconbtn--sm" data-gd-menu aria-haspopup="menu" aria-expanded="false" aria-label="More actions for ' + esc(tag(t)) + '">' + ico('more') + '</button><div class="gd-menu gd-menu--end" role="menu" hidden>' + items.join('') + '</div></div>';
  }
  function cardHtml(t) {
    const sug = t.status === 'suggested', dis = t.status === 'dismissed';
    const draggable = !sug && !dis;
    const quote = (sug || dis) && t.source && t.source.quote ? '<p class="gd-taskcard__quote">' + esc(t.source.quote) + '</p>' : '';
    const from = (sug || dis) && t.source ? '<span class="gd-taskcard__num">' + esc(t.source.from || '') + ' \u00b7 ' + esc(ago(t.createdAt)) + '</span>' : '';
    const meta = prioHtml(t.priority) + runHtml(t, true) + dueHtml(t, sug) + srcHtml(t) + from + (sug || dis ? '' : bruceMark(t)) + '<span class="gd-taskcard__spacer"></span>' + (sug || dis ? '' : avHtml(t.assignee));
    const acts = sug ? '<div class="gd-taskcard__acts"><button type="button" class="gd-btn gd-btn--primary gd-btn--sm" data-act="accept" data-id="' + t.id + '">Accept</button><button type="button" class="gd-btn gd-btn--outline gd-btn--sm" data-act="dismiss" data-id="' + t.id + '">Dismiss</button></div>'
      : dis ? '<div class="gd-taskcard__acts"><button type="button" class="gd-btn gd-btn--outline gd-btn--sm" data-act="restore" data-id="' + t.id + '">Restore</button></div>' : '';
    return '<article class="gd-taskcard' + (sug ? ' gd-taskcard--suggested' : '') + (dis ? ' gd-taskcard--dismissed' : '') + '" data-id="' + t.id + '"' + (draggable ? ' draggable="true"' : '') + (t.status === 'done' ? ' data-done' : '') + (S.sel.has(t.id) ? ' data-selected="true"' : '') + '>' +
      '<button type="button" class="gd-taskcard__open" data-open="' + t.id + '" aria-label="' + esc(tag(t) + ', ' + t.title) + '">' + esc(t.title) + '</button>' + cardMenu(t) + quote + '<div class="gd-taskcard__meta">' + meta + '</div>' + acts + '</article>';
  }

  /* ------------------------------------------------------------------ chrome: bar, strip, lane chips, bottom bar */
  const fkOf = (el) => !el || !el.dataset ? '' : el.dataset.fk || (el.dataset.open ? 'open:' + el.dataset.open : (el.dataset.act && el.dataset.id ? 'act:' + el.dataset.act + ':' + el.dataset.id : ''));
  function keepFocus(fn) {
    const key = fkOf(doc.activeElement);
    fn();
    if (key) { const n = $$('[data-fk],[data-open],[data-act][data-id]').find((e) => fkOf(e) === key); if (n && n !== doc.activeElement) n.focus({ preventScroll: true }); }
  }
  const inboxItems = () => S.tasks.filter((t) => t.status === 'suggested').sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)) || b.n - a.n);

  function renderChrome() {
    const ready = S.status === 'ready', has = ready && S.tasks.some((t) => t.status !== 'dismissed');
    const seg = $('#tk-viewseg'), acts = $('#tk-acts');
    seg.hidden = !ready; acts.hidden = !ready;
    const inbox = S.view === 'inbox';
    if (ready) {
      const n = inboxItems().length;
      if (seg.children.length !== VIEWS.length) seg.innerHTML = VIEWS.map((v) => '<button type="button" class="gd-seg__item" role="radio" data-value="' + v + '" data-fk="seg:' + v + '">' + cap1(v) + '</button>').join('');
      // the segment's moving fill follows aria-checked, so the buttons are updated in place, never rebuilt
      $$('.gd-seg__item', seg).forEach((b) => {
        const v = b.dataset.value, on = v === S.view;
        if (b.getAttribute('aria-checked') !== String(on)) b.setAttribute('aria-checked', String(on));
        b.tabIndex = on ? 0 : -1;
        let c = $('.gd-views__n', b);
        if (v === 'inbox' && n) { if (!c) { c = doc.createElement('span'); c.className = 'gd-views__n'; b.appendChild(c); } c.textContent = n; } else if (c) c.remove();
      });
      $('#tk-search').hidden = !has;
      $('#tk-filter-btn').closest('.gd-popover-wrap').hidden = !has || inbox;
      $('#tk-display-btn').closest('.gd-popover-wrap').hidden = !has || inbox;
      $('#tk-people-wrap').hidden = !has;
      const fn = $('#tk-filter-n'); fn.hidden = !S.filters.length; fn.textContent = S.filters.length || '';
      renderPeople();
      const sf = $('#tk-search-field'), open = !sf.hidden || !!S.search;
      sf.hidden = !open; $('#tk-search-btn').hidden = open; $('#tk-search').dataset.open = open ? 'true' : 'false';
    }
    $('#tk-new-btn').hidden = !ready;
    $('#tk-fab').hidden = !(ready && isPhone() && (S.view === 'board' || S.view === 'list'));
    const bn = $('#tk-bottomnav');
    bn.hidden = !ready || !has;
    if (ready) {
      const n = inboxItems().length;
      bn.innerHTML = ['board', 'list', 'inbox'].map((v) => '<button type="button" class="gd-bottomnav__item" data-nav="' + v + '" data-fk="nav:' + v + '" aria-current="' + (S.view === v) + '">' + cap1(v) + (v === 'inbox' && n ? ' <span class="gd-num">' + n + '</span>' : '') + '</button>').join('') + '<button type="button" class="gd-bottomnav__item" data-nav="ask" aria-current="false">Ask Bruce</button>';
    }
    syncLauncher();
  }
  function renderPeople() {
    const people = [S.me.email].concat(Object.keys(S.names).filter((e) => e !== S.me.email));
    const ids = people.map((e) => 'u:' + e).concat(S.agents.map((a) => 'a:' + a.id));
    const f = S.filters.find((x) => x.field === 'assignee');
    $('#tk-people').innerHTML = ids.map((id) => {
      const on = f && f.values.length === 1 && f.values[0] === id;
      return avHtml(id, { btn: true, attrs: ' data-fk="person:' + esc(id) + '" data-assignee="' + esc(id) + '" aria-pressed="' + !!on + '" data-gd-tooltip="' + esc(nameOf(id) + (on ? ', showing only their tasks' : ', show only their tasks')) + '"' });
    }).join('');
  }
  function valueLabel(field, v) {
    if (field === 'assignee') return v === 'none' ? 'Unassigned' : nameOf(v);
    const f = FIELDS.find((x) => x.key === field); const p = f && f.values && f.values.find((x) => x[0] === v); return p ? p[1] : v;
  }
  function renderStrip() {
    const el = $('#tk-strip');
    const show = S.status === 'ready' && S.tasks.some((t) => t.status !== 'dismissed') && S.view !== 'inbox';
    el.hidden = !show; if (!show) return;
    const cur = currentView();
    const tabs = viewsList().map((v) => '<button type="button" class="gd-views__tab" role="tab" aria-selected="' + (cur && cur.id === v.id) + '" tabindex="' + (cur && cur.id === v.id ? 0 : -1) + '" data-view-id="' + esc(v.id) + '" data-fk="view:' + esc(v.id) + '">' + esc(v.name) + ' <span class="gd-views__n gd-num">' + viewCount(v) + '</span></button>' +
      (v.custom ? '<button type="button" class="gd-views__x" data-view-del="' + esc(v.rawId) + '" aria-label="Delete view ' + esc(v.name) + '">' + ico('x', 10) + '</button>' : '')).join('');
    const chips = S.filters.map((f, i) => {
      const txt = f.values.map((v) => valueLabel(f.field, v)).join(', ');
      const fl = FIELDS.find((x) => x.key === f.field).label;
      return '<span class="gd-chip"><span class="gd-chip__f">' + esc(fl) + '</span><span class="gd-chip__op">is</span><span class="gd-chip__v">' + esc(txt) + '</span><button type="button" class="gd-chip__x" data-chip-x="' + esc(f.field) + '" aria-label="Remove filter ' + esc(fl + ' is ' + txt) + '">' + ico('x', 10) + '</button></span>';
    }).join('');
    el.innerHTML = '<div class="gd-views" role="tablist" aria-label="Saved views">' + tabs + '<button type="button" class="gd-btn gd-btn--ghost gd-btn--sm" data-gd-views-save>+ Save view</button></div>' +
      (S.filters.length ? '<div class="gd-chips">' + chips + (S.filters.length > 1 ? '<button type="button" class="gd-btn gd-btn--link gd-btn--sm" data-clear-filters>Clear all</button>' : '') + '</div>' : '');
  }
  function renderLaneChips() {
    const el = $('#tk-lanechips');
    const show = S.status === 'ready' && S.view === 'board' && isPhone() && S.tasks.length > 0;
    el.hidden = !show; if (!show) return;
    const vis = visible(), lanes = boardLanes();
    if (!lanes.includes(S.lane)) S.lane = 'todo';
    el.innerHTML = '<div class="gd-tabs gd-tabs--pill" role="tablist" aria-label="Lane">' + lanes.map((l) => '<button type="button" class="gd-tabs__tab" role="tab" aria-selected="' + (S.lane === l) + '" tabindex="' + (S.lane === l ? 0 : -1) + '" data-lane-chip="' + l + '" data-fk="lane:' + l + '">' + STATUS_NAME[l] + '<span class="gd-tabs__count gd-num">' + vis.filter((t) => t.status === l).length + '</span></button>').join('') + '</div>';
  }

  /* ------------------------------------------------------------------ the view */
  function renderView() {
    const el = $('#tk-view');
    if (S.status === 'loading') { el.innerHTML = skeletonHtml(); return; }
    if (S.status === 'error') { el.innerHTML = errorHtml(); return; }
    if (!S.tasks.length) { el.innerHTML = emptyHtml(); return; }
    const html = S.view === 'board' ? boardHtml() : S.view === 'list' ? listHtml() : S.view === 'timeline' ? timelineHtml() : inboxHtml();
    el.innerHTML = html;
  }
  function skeletonHtml() {
    const lane = (w) => '<section class="gd-lane"><div class="gd-lane__head"><span class="gd-ghost gd-ghost--title" style="width:' + w + '"></span></div><div class="gd-lane__list">' + [0, 1, 2].map(() => '<div class="tk-sk__card"><span class="gd-ghost gd-ghost--title"></span><span class="gd-ghost gd-ghost--block"></span></div>').join('') + '</div></section>';
    return '<div class="gd-lanes tk-sk" aria-busy="true" aria-label="Loading tasks">' + ['20%', '16%', '14%', '12%'].map(lane).join('') + '</div>';
  }
  function emptyHtml() {
    return '<div class="tk-state"><div class="gd-empty gd-empty--first-use"><div class="gd-empty__badge">' + ico('tasks') + '</div><div class="gd-empty__copy"><h2 class="gd-empty__title">Nothing here yet</h2><p class="gd-empty__text">Bruce will suggest tasks as he finds them in Slack. You can also add one yourself, or DM Bruce.</p></div><div class="gd-empty__actions"><button type="button" class="gd-btn gd-btn--primary" data-new-task>New task</button><button type="button" class="gd-btn gd-btn--outline" data-open-settings>Bruce settings</button></div></div></div>';
  }
  function errorHtml() {
    const st = S.err && S.err.status;
    const c = st === 401 ? ['error', 'You are signed out', 'Sign in to the design hub again, then try again.']
      : st === 403 ? ['no-access', 'You do not have access to tasks', 'Tasks are for the Gushwork team. Ask Utsav for access.']
      : st === 503 ? ['error', 'The task store is not connected', 'Tasks are unavailable right now. Try again in a moment.']
      : ['error', 'Tasks are unavailable', 'The task board could not be read. Try again in a moment.'];
    return '<div class="tk-state"><div class="gd-empty gd-empty--' + c[0] + '" role="alert"><div class="gd-empty__badge">' + ico('warn') + '</div><div class="gd-empty__copy"><h2 class="gd-empty__title">' + c[1] + '</h2><p class="gd-empty__text">' + c[2] + '</p></div>' + (st === 403 ? '' : '<div class="gd-empty__actions"><button type="button" class="gd-btn gd-btn--outline" data-retry-load>Try again</button></div>') + '</div></div>';
  }
  function noResultsHtml() {
    const n = S.filters.length, q = S.search.trim();
    return '<div class="tk-state"><div class="gd-empty gd-empty--no-results"><div class="gd-empty__badge">' + ico('filter') + '</div><div class="gd-empty__copy"><h2 class="gd-empty__title">No tasks match</h2><p class="gd-empty__text">' + (n ? n + ' filter' + (n > 1 ? 's are' : ' is') + ' applied' : '') + (n && q ? ' and ' : '') + (q ? 'the search is “' + esc(q) + '”' : '') + '.</p></div><div class="gd-empty__actions"><button type="button" class="gd-btn gd-btn--outline" data-clear-all>Clear ' + (n && q ? 'filters and search' : n ? 'filters' : 'search') + '</button></div></div></div>';
  }

  /* board */
  const boardLanes = () => ['suggested', 'todo', 'doing'].concat(S.display.showDone ? ['done'] : []);
  function boardHtml() {
    const vis = visible(), lanes = boardLanes();
    if (!vis.length && (S.filters.length || S.search)) return noResultsHtml();
    if (!lanes.includes(S.lane)) S.lane = 'todo';
    const empties = { suggested: 'Nothing suggested. Bruce files finds here.', todo: 'Drop a task here', doing: 'Drop a task here', done: 'Nothing done yet' };
    const out = lanes.map((l) => {
      let list = sorted(vis.filter((t) => t.status === l));
      if (l === 'done') list = list.sort((a, b) => String(b.doneAt).localeCompare(String(a.doneAt)));
      if (l === 'suggested' && S.display.showDismissed) list = list.concat(sorted(vis.filter((t) => t.status === 'dismissed')));
      const by = l === 'suggested' ? '<span class="gd-lane__by"><span class="gd-av gd-av--agent gd-av--ink gd-av--sm" aria-hidden="true">B</span>Bruce</span>' : '';
      return '<section class="gd-lane' + (l === 'suggested' ? ' gd-lane--suggested' : '') + '" data-lane="' + l + '"' + (S.lane === l ? ' data-active="true"' : '') + ' aria-label="' + STATUS_NAME[l] + ', ' + list.length + '">' +
        '<header class="gd-lane__head"><h2 class="gd-lane__name">' + STATUS_NAME[l] + '</h2><span class="gd-lane__count gd-num">' + list.length + '</span>' + by + '</header>' +
        '<div class="gd-lane__list" data-lane-list="' + l + '">' + (list.length ? list.map(cardHtml).join('') : '<div class="gd-lane__empty">' + empties[l] + '</div>') + '</div>' +
        (l === 'todo' || l === 'doing' ? '<button type="button" class="gd-lane__add" data-add-lane="' + l + '">' + ico('plus', 14) + 'Add task</button>' : '') + '</section>';
    });
    return '<div class="gd-lanes" data-lanes="' + lanes.length + '">' + out.join('') + '</div>';
  }

  /* list */
  function groupTasks(vis) {
    const g = S.display.group, today = S.today, groups = [];
    const live = vis.filter((t) => t.status !== 'done' && t.status !== 'dismissed');
    const add = (key, name, tasks) => { if (tasks.length) groups.push({ key, name, tasks: sorted(tasks) }); };
    if (g === 'none') add('all', '', live);
    else if (g === 'status') ['suggested', 'todo', 'doing'].forEach((s) => add(s, STATUS_NAME[s], live.filter((t) => t.status === s)));
    else if (g === 'priority') ['urgent', 'high', 'med', 'low', ''].forEach((p) => add('p:' + p, PR_NAME[p], live.filter((t) => (t.priority || '') === p)));
    else if (g === 'assignee') { const ids = Array.from(new Set(live.map((t) => t.assignee || ''))).sort((a, b) => (a === '' ? 1 : b === '' ? -1 : nameOf(a).localeCompare(nameOf(b)))); ids.forEach((id) => add('a:' + id, id ? nameOf(id) : 'Unassigned', live.filter((t) => (t.assignee || '') === id))); }
    else { add('overdue', 'Overdue', live.filter((t) => isOverdue(t, today))); add('today', 'Today', live.filter((t) => t.due === today)); add('upcoming', 'Upcoming', live.filter((t) => t.due > today)); add('none', 'No date', live.filter((t) => !t.due)); }
    const done = vis.filter((t) => t.status === 'done').sort((a, b) => String(b.doneAt).localeCompare(String(a.doneAt)));
    if (done.length) groups.push({ key: 'done', name: 'Done', tasks: done });
    add('dismissed', 'Dismissed', vis.filter((t) => t.status === 'dismissed'));
    return groups;
  }
  function rowHtml(t) {
    const live = t.status !== 'suggested' && t.status !== 'dismissed';
    const done = t.status === 'done';
    const check = live ? '<button type="button" class="gd-tasklist__check" role="checkbox" aria-checked="' + done + '" data-act="toggle" data-id="' + t.id + '" aria-label="' + (done ? 'Reopen ' : 'Mark done: ') + esc(tag(t)) + '">' + ico('check', 12) + '</button>' : '';
    const badge = t.status === 'suggested' ? ' <span class="gd-badge gd-badge--info">Suggested</span>' : t.status === 'dismissed' ? ' <span class="gd-badge">Dismissed</span>' : '';
    return '<div class="gd-tasklist__row" role="listitem" data-id="' + t.id + '"' + (done ? ' data-done' : '') + (S.sel.has(t.id) ? ' data-selected="true"' : '') + '>' +
      '<div class="gd-tasklist__cell">' + check + '</div>' +
      '<div class="gd-tasklist__cell gd-tasklist__cell--main"><span class="gd-tasklist__line"><button type="button" class="gd-tasklist__open" data-open="' + t.id + '">' + esc(t.title) + '</button>' + badge + '</span><span class="gd-tasklist__sub">' + esc(t.due ? relDay(t.due, S.today) : '') + '</span></div>' +
      '<div class="gd-tasklist__cell gd-tasklist__hide-sm">' + (prioHtml(t.priority) || '') + runHtml(t, true) + '</div>' +
      '<div class="gd-tasklist__cell gd-tasklist__hide-sm">' + (srcHtml(t) || '<span class="gd-badge">Added by hand</span>') + '</div>' +
      '<div class="gd-tasklist__cell gd-tasklist__hide-sm">' + (dueHtml(t, false) || '<span aria-label="No due date">—</span>') + '</div>' +
      '<div class="gd-tasklist__cell">' + avHtml(t.assignee, { sm: false }) + '</div></div>';
  }
  function listHtml() {
    const vis = visible();
    if (!vis.length) return noResultsHtml();
    const groups = groupTasks(vis);
    const head = '<div class="gd-tasklist__head" aria-hidden="true"><span></span><span>Task</span><span class="gd-tasklist__hide-sm">Priority</span><span class="gd-tasklist__hide-sm">Source</span><span class="gd-tasklist__hide-sm">Due</span><span></span></div>';
    return '<div class="gd-tasklist" role="list">' + head + groups.map((g) => {
      const col = S.collapsed.has(g.key);
      const h = g.name ? '<button type="button" class="gd-tasklist__group-head" data-group="' + esc(g.key) + '" aria-expanded="' + !col + '">' + ico('right', 12) + esc(g.name) + ' <span class="gd-tasklist__n gd-num">' + g.tasks.length + '</span></button>' : '';
      return '<div class="gd-tasklist__group" role="group" aria-label="' + esc(g.name || 'Tasks') + '"' + (col ? ' data-collapsed="true"' : '') + '>' + h + g.tasks.map(rowHtml).join('') + '</div>';
    }).join('') + '</div>';
  }

  /* ------------------------------------------------------------------ timeline */
  const tlDays = () => (S.tl.zoom === 'month' ? 84 : 28);
  function tlStart() { if (!S.tl.start) S.tl.start = mondayOf(S.today); return S.tl.start; }
  const levelOf = (p) => (p === 'urgent' ? 'urgent' : p || 'none');
  // the dates a task draws with: both dates is a bar, one date is a diamond
  function span(t) {
    const a = t.start || t.due, b = t.due || t.start;
    return a <= b ? { s: a, e: b, diamond: !(t.start && t.due), field: t.due ? 'due' : 'start' } : { s: b, e: a, diamond: false, field: 'due' };
  }
  function barHtml(t, start, days) {
    const sp = span(t), s = diffDays(sp.s, start), e = diffDays(sp.e, start);
    if (e < 0) return '<span class="gd-gantt__off" style="left:0">Ended ' + esc(fmtShort(sp.e)) + '</span>';
    if (s >= days) return '<span class="gd-gantt__off" style="right:0">Starts ' + esc(fmtShort(sp.s)) + '</span>';
    const cs = Math.max(s, 0), ce = Math.min(e, days - 1), len = ce - cs + 1;
    const sug = t.status === 'suggested';
    const label = sp.diamond ? '' : (len >= (days > 28 ? 5 : 3) ? esc(t.title) : '');
    const grips = sp.diamond ? '' : (s >= 0 ? '<span class="gd-gantt__grip gd-gantt__grip--start" data-grip="start"></span>' : '') + (e <= days - 1 ? '<span class="gd-gantt__grip gd-gantt__grip--end" data-grip="end"></span>' : '');
    const when = sp.diamond ? 'due ' + fmtLong(sp.s) : 'from ' + fmtLong(sp.s) + ' to ' + fmtLong(sp.e);
    return '<button type="button" class="gd-gantt__bar" data-id="' + t.id + '" data-fk="bar:' + t.id + '" data-level="' + levelOf(t.priority) + '"' + (sug ? ' data-suggested' : '') + ' data-kind="' + (sp.diamond ? 'diamond' : 'bar') + '" style="--gd-tl-start:' + cs + ';--gd-tl-len:' + len + '" aria-label="' + esc(tag(t) + ', ' + t.title + ', ' + when + '. Left and right arrows move it by a day.') + '">' + label + grips + '</button>';
  }
  function tlRow(t, start, days) {
    return '<div class="gd-gantt__row" data-id="' + t.id + '"><div class="gd-gantt__label">' + (t.priority === 'urgent' ? '<span class="gd-badge gd-badge--solid">Urgent</span>' : prioHtml(t.priority) || '<span class="gd-prio" data-level="0" aria-hidden="true"><i></i><i></i><i></i></span>') +
      '<button type="button" class="gd-gantt__name" data-open="' + t.id + '">' + esc(t.title) + '</button>' + (t.status === 'suggested' ? '<span class="gd-av gd-av--agent gd-av--ink gd-av--sm" role="img" aria-label="Suggested by Bruce">B</span>' : avHtml(t.assignee, { sm: true })) +
      '</div><div class="gd-gantt__cells">' + barHtml(t, start, days) + '</div></div>';
  }
  function timelineHtml() {
    const start = tlStart(), days = tlDays(), end = addDays(start, days - 1);
    const vis = visible().filter((t) => t.status !== 'dismissed');
    if (!vis.length) return noResultsHtml();
    const dated = vis.filter((t) => t.due || t.start), tray = vis.filter((t) => !t.due && !t.start && t.status !== 'done');
    const sm = parseYmd(start), em = parseYmd(end);
    const month = sm.getMonth() === em.getMonth() ? MONTH_FULL[sm.getMonth()] + ' ' + sm.getFullYear() : MON[sm.getMonth()] + ' to ' + MON[em.getMonth()] + ' ' + em.getFullYear();
    const tools = '<div class="gd-gantt__tools tk-tltools"><div class="gd-seg" id="tk-zoom" role="radiogroup" aria-label="Zoom">' + ['week', 'month'].map((z) => '<button type="button" class="gd-seg__item" role="radio" aria-checked="' + (S.tl.zoom === z) + '" tabindex="' + (S.tl.zoom === z ? 0 : -1) + '" data-value="' + z + '">' + cap1(z) + '</button>').join('') + '</div>' +
      '<button type="button" class="gd-iconbtn gd-iconbtn--outline" data-tl-nav="-1" aria-label="Earlier">' + ico('left') + '</button><button type="button" class="gd-btn" data-tl-nav="0">Today</button><button type="button" class="gd-iconbtn gd-iconbtn--outline" data-tl-nav="1" aria-label="Later">' + ico('right') + '</button>' +
      '<span class="tk-tltools__month">' + esc(month) + '</span>' +
      '<div class="gd-gantt__legend" aria-hidden="true"><span><i></i>Urgent</span><span><i data-level="high"></i>High</span><span><i data-level="med"></i>Medium</span><span><i data-level="low"></i>Low</span><span><i data-suggested></i>Suggested</span></div></div>';
    let scale = '';
    for (let i = 0; i < days; i++) { const d = addDays(start, i), wd = weekday(d); scale += '<span class="gd-gantt__day"' + (wd >= 5 ? ' data-we' : '') + (d === S.today ? ' data-today' : '') + '>' + (days <= 28 || wd === 0 || d === S.today ? parseYmd(d).getDate() : '') + '</span>'; }
    let weeks = ''; for (let w = 0; w < days / 7; w++) weeks += '<span class="gd-gantt__week" style="left:' + (w * 7 * 100 / days) + '%">' + esc(fmtShort(addDays(start, w * 7))) + '</span>';
    const groups = [['suggested', 'Suggested by Bruce'], ['todo', 'To do'], ['doing', 'Doing']].concat(S.display.showDone ? [['done', 'Done']] : []);
    let body = '';
    groups.forEach(([k, name]) => { const rows = sorted(dated.filter((t) => t.status === k)); if (!rows.length) return; body += '<div class="gd-gantt__group"><div>' + name + '</div><div class="gd-gantt__cells"></div></div>' + rows.map((t) => tlRow(t, start, days)).join(''); });
    const ti = diffDays(S.today, start), tIn = ti >= 0 && ti < days;
    const trayHtml = '<div class="gd-gantt__tray"><b>Unscheduled <span class="gd-num">' + tray.length + '</span></b>' + (tray.length ? tray.map((t) => '<button type="button" class="gd-gantt__chip" draggable="true" data-id="' + t.id + '" data-open="' + t.id + '" title="Drag onto the grid to set a due date, or click to open">' + esc(t.title) + '</button>').join('') : '<span>Every task has a date.</span>') + '</div>';
    return tools + '<div class="gd-gantt" style="--gd-tl-days:' + days + ';--gd-tl-today:' + (tIn ? ti : 0) + '"><div class="gd-gantt__head"><div class="gd-gantt__corner">Task</div><div class="gd-gantt__scale">' + scale + weeks + '</div></div><div class="gd-gantt__body">' + (tIn ? '<div class="gd-gantt__today" aria-hidden="true"></div>' : '') + (body || '<div class="gd-gantt__group"><div>Nothing is dated in this range</div><div class="gd-gantt__cells"></div></div>') + '</div>' + trayHtml + '</div>';
  }

  /* ------------------------------------------------------------------ inbox */
  const dismissedToday = () => S.tasks.filter((t) => t.status === 'dismissed' && ymd(new Date(t.updatedAt)) === todayStr()).length;
  function inboxHtml() {
    const items = inboxItems();
    if (!items.length) return '<div class="tk-state"><div class="gd-empty gd-empty--first-use"><div class="gd-empty__badge">' + ico('tasks') + '</div><div class="gd-empty__copy"><h2 class="gd-empty__title">Inbox is clear</h2><p class="gd-empty__text">Nothing from Bruce is waiting for you. New finds land here and in the Suggested lane.</p></div>' + (dismissedToday() ? '<div class="gd-empty__actions"><button type="button" class="gd-btn gd-btn--outline" data-inbox-undo>Undo last dismiss</button></div>' : '') + '</div></div>';
    if (!items.some((t) => t.id === S.inboxId)) S.inboxId = items[0].id;
    const cur = byId(S.inboxId), last = S.lastDismissed.find((id) => { const t = byId(id); return t && t.status === 'dismissed'; });
    const rows = items.map((t) => '<button type="button" class="gd-inbox__row" data-inbox="' + t.id + '" data-fk="ib:' + t.id + '" aria-current="' + (t.id === cur.id) + '"><span>' + esc(t.title) + '</span><span class="gd-inbox__meta">' + srcHtml(t) + esc((t.source ? t.source.from + ' · ' : '') + ago(t.createdAt)) + '</span></button>').join('');
    const src = cur.source;
    const quote = src && src.quote ? '<figure class="gd-quote"><span class="gd-quote__label">From Slack · ' + esc(src.channel) + '</span><blockquote>' + esc(src.quote) + '</blockquote><figcaption>' + esc(src.from || '') + (safeUrl(src.url) ? ' · <a class="tk-link" href="' + esc(src.url) + '" target="_blank" rel="noopener noreferrer">Open in Slack</a>' : '') + '</figcaption></figure>' : '';
    const why = cur.why ? '<div class="gd-banner gd-banner--neutral"><div class="gd-banner__body"><span class="gd-banner__title">Why Bruce thinks it is a task</span><span>' + esc(cur.why) + '</span></div></div>' : '';
    return '<div class="gd-inbox"><div class="gd-inbox__list" role="list" aria-label="Suggested tasks">' + rows +
      '<div class="gd-inbox__foot">Dismissed today: <span class="gd-num">' + dismissedToday() + '</span>' + (last ? ' · <button type="button" class="gd-btn gd-btn--link gd-btn--sm" data-inbox-undo>Undo last</button>' : '') + '</div></div>' +
      '<div class="gd-inbox__pane"><div class="gd-inbox__head"><span class="gd-av gd-av--agent gd-av--ink" aria-hidden="true">B</span><b>Bruce suggested this</b><span>· ' + esc(ago(cur.createdAt)) + '</span><span class="gd-inbox__keys"><kbd class="gd-kbd">J</kbd><kbd class="gd-kbd">K</kbd>next or previous</span></div>' +
      quote + why +
      '<textarea class="gd-inbox__title" id="tk-ib-title" data-id="' + cur.id + '" rows="1" aria-label="Task title" maxlength="200">' + esc(cur.title) + '</textarea>' +
      propsHtml(cur, 'ib') +
      '<div class="gd-inbox__acts"><button type="button" class="gd-btn gd-btn--primary" data-act="accept" data-id="' + cur.id + '" aria-keyshortcuts="A">Accept<kbd class="gd-btn__key" aria-hidden="true">A</kbd></button><button type="button" class="gd-btn gd-btn--outline" data-act="dismiss" data-id="' + cur.id + '" aria-keyshortcuts="D">Dismiss<kbd class="gd-btn__key" aria-hidden="true">D</kbd></button></div></div></div>';
  }
  const safeUrl = (u) => /^https:\/\//i.test(u || '');

  /* ------------------------------------------------------------------ properties (drawer and inbox) and their pickers */
  function popTrigger(ctx, kind, t, inner, o) {
    o = o || {};
    const id = 'pop-' + ctx + '-' + kind + '-' + t.id;
    return '<div class="gd-popover-wrap"><button type="button" class="gd-prop' + (o.empty ? ' gd-prop--empty' : '') + '" data-gd-popover="#' + id + '" data-fk="pop:' + ctx + ':' + kind + '" aria-haspopup="dialog" aria-expanded="false" aria-controls="' + id + '">' + inner + '</button><div class="gd-popover" id="' + id + '" data-placement="bottom-start" data-kind="' + kind + '" data-id="' + t.id + '" hidden></div></div>';
  }
  function propsHtml(t, ctx) {
    const sug = t.status === 'suggested';
    const stInner = '<span>' + esc(sug ? STATUS_NAME[S.goes[t.id] || 'todo'] : STATUS_NAME[t.status]) + '</span>';
    const prInner = t.priority ? (prioHtml(t.priority) || '') + '<span>' + PR_NAME[t.priority] + '</span>' + (t.guessed && t.guessed.priority ? '<span class="gd-prop__tag">suggested</span>' : '') : '<span>No priority</span>';
    const asInner = avHtml(t.assignee, { sm: true }) + '<span>' + esc(nameOf(t.assignee)) + '</span>';
    const dInner = (d, label, guess) => d ? ico('cal') + '<span>' + esc(fmtLong(d)) + '</span>' + (guess ? '<span class="gd-prop__tag">guessed</span>' : '') : ico('cal') + '<span>' + label + '</span>';
    const src = t.source ? '<span class="gd-badge">' + esc(t.source.channel || 'Slack') + (t.source.from ? ' · ' + esc(t.source.from) : '') + '</span>' + (safeUrl(t.source.url) ? '<a class="tk-link" href="' + esc(t.source.url) + '" target="_blank" rel="noopener noreferrer">Open in Slack</a>' : '') : '<span class="gd-badge">Added by hand</span>';
    return '<dl class="gd-props">' +
      '<div class="gd-props__row"><dt>' + (sug ? 'Goes to' : 'Status') + '</dt><dd>' + popTrigger(ctx, 'status', t, stInner) + '</dd></div>' +
      '<div class="gd-props__row"><dt>Priority</dt><dd>' + popTrigger(ctx, 'priority', t, prInner, { empty: !t.priority }) + '</dd></div>' +
      '<div class="gd-props__row"><dt>Assignee</dt><dd>' + popTrigger(ctx, 'assignee', t, asInner, { empty: !t.assignee }) + '</dd></div>' +
      '<div class="gd-props__row"><dt>Start</dt><dd>' + popTrigger(ctx, 'start', t, dInner(t.start, 'Set start', false), { empty: !t.start }) + '</dd></div>' +
      '<div class="gd-props__row"><dt>Due</dt><dd>' + popTrigger(ctx, 'due', t, dInner(t.due, 'Set due date', t.guessed && t.guessed.due), { empty: !t.due }) + '</dd></div>' +
      '<div class="gd-props__row"><dt>Source</dt><dd>' + src + '</dd></div></dl>';
  }
  S.goes = {};                                      // where a suggestion lands when accepted: todo or doing
  const AGENT_NOTICE = 'Agents do not pick up tasks on staging yet.';
  const anyAgentCold = () => S.agents.some((a) => !a.live);

  const pickRow = (val, inner, checked, o) => '<button type="button" class="gd-picker__row" role="menuitemradio" aria-checked="' + !!checked + '" data-pick="' + esc(val) + '"' + (o && o.key ? ' data-key="' + o.key + '"' : '') + '>' + inner + '<svg class="gd-picker__check" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">' + ICON.check + '</svg></button>';
  function pickerHtml(kind, t) {
    if (kind === 'status') {
      const cur = t.status === 'suggested' ? (S.goes[t.id] || 'todo') : t.status;
      return '<div class="gd-picker" role="menu" aria-label="' + (t.status === 'suggested' ? 'Goes to' : 'Status') + '">' + ['todo', 'doing', 'done'].filter((s) => t.status !== 'suggested' || s !== 'done').map((s) => pickRow(s, '<span class="gd-picker__text"><b>' + STATUS_NAME[s] + '</b></span>', cur === s)).join('') + '</div>';
    }
    if (kind === 'priority') {
      const rows = ['urgent', 'high', 'med', 'low', ''].map((p, i) => pickRow(p || 'none', (p === 'urgent' ? '<span class="gd-badge gd-badge--solid">Urgent</span><span class="gd-picker__text"></span>' : '<span class="gd-prio" data-level="' + PR_LEVEL[p] + '" aria-hidden="true"><i></i><i></i><i></i></span><span class="gd-picker__text"><b>' + PR_NAME[p] + '</b></span>') + '<span class="gd-picker__key">' + (p ? i + 1 : 0) + '</span>', (t.priority || '') === p));
      const sug = t.guessed && t.guessed.priority && t.priority ? '<div class="gd-picker__suggest"><b><span class="gd-av gd-av--agent gd-av--ink gd-av--sm" aria-hidden="true">B</span>Bruce suggests ' + PR_NAME[t.priority] + '</b><span>' + esc(t.why || 'He read the message and judged the priority from it.') + '</span><div><button type="button" class="gd-btn gd-btn--primary gd-btn--sm" data-pick="' + t.priority + '">Apply</button><button type="button" class="gd-btn gd-btn--ghost gd-btn--sm" data-pop-close>Ignore</button></div></div>' : '';
      return '<div class="gd-picker" role="menu" aria-label="Priority">' + rows.join('') + (sug ? '<div class="gd-picker__sep"></div>' + sug : '') + '</div>';
    }
    if (kind === 'assignee') {
      const people = [S.me.email].concat(Object.keys(S.names).filter((e) => e !== S.me.email));
      const cur = t.assignee || '';
      const ppl = people.map((e) => pickRow('u:' + e, avHtml('u:' + e, { sm: true }) + '<span class="gd-picker__text"><b>' + esc(personName(e)) + '</b>' + (e === S.me.email ? '<small>You</small>' : '') + '</span>', cur === 'u:' + e)).join('');
      const ags = S.agents.map((a) => pickRow('a:' + a.id, avHtml('a:' + a.id, { sm: true }) + '<span class="gd-picker__text"><b>' + esc(a.name) + '</b><small>' + esc(a.does) + '</small></span>', cur === 'a:' + a.id)).join('');
      return '<div class="gd-picker" role="menu" aria-label="Assign to"><div class="gd-picker__label">People</div>' + ppl +
        '<button type="button" class="gd-picker__row gd-picker__row--quiet" role="menuitem" data-open-notyet><span class="gd-av gd-av--ghost" aria-hidden="true">' + ico('plus', 12) + '</span><span class="gd-picker__text"><b>Invite someone</b></span></button>' +
        '<div class="gd-picker__label">Agents</div>' + ags +
        '<button type="button" class="gd-picker__row gd-picker__row--quiet" role="menuitem" data-open-notyet><span class="gd-av gd-av--agent gd-av--ghost" aria-hidden="true">' + ico('plus', 12) + '</span><span class="gd-picker__text"><b>Add an agent</b></span></button>' +
        (anyAgentCold() ? '<p class="gd-picker__note">' + AGENT_NOTICE + '</p>' : '') +
        '<div class="gd-picker__sep"></div>' + pickRow('', '<span class="gd-picker__text"><b>Unassigned</b></span>', !cur) + '</div>';
    }
    return '';
  }

  /* date picker: the state is which field is being edited and which month is showing */
  const DP = {};                                    // popover id -> {field, month}
  function datepickHtml(t, p) {
    const st = DP[p.id] || (DP[p.id] = { field: p.dataset.kind === 'start' ? 'start' : 'due', month: (t[p.dataset.kind === 'start' ? 'start' : 'due'] || S.today).slice(0, 7) + '-01' });
    const first = st.month, fd = weekday(first), dim = new Date(parseYmd(first).getFullYear(), parseYmd(first).getMonth() + 1, 0).getDate();
    const a = t.start, b = t.due;
    let cells = DOW.map((d) => '<span class="gd-datepick__dow">' + d[0] + '</span>').join('');
    for (let i = -fd; i < Math.ceil((fd + dim) / 7) * 7 - fd; i++) {
      const d = addDays(first, i), out = i < 0 || i >= dim, dn = parseYmd(d).getDate();
      let rg = ''; const lo = a && b ? (a <= b ? a : b) : (a || b), hi = a && b ? (a <= b ? b : a) : (a || b);
      if (lo && hi) rg = lo === hi ? (d === lo ? 'only' : '') : d === lo ? 'start' : d === hi ? 'end' : d > lo && d < hi ? 'mid' : '';
      cells += '<button type="button" class="gd-datepick__day"' + (out ? ' data-out' : '') + (d === S.today ? ' data-today' : '') + (rg ? ' data-range="' + rg + '"' : '') + ' data-dp-day="' + d + '" aria-label="' + esc(fmtLong(d) + ' ' + parseYmd(d).getFullYear()) + '">' + dn + '</button>';
    }
    const fm = parseYmd(first);
    const field = (k, label, v) => '<button type="button" class="gd-datepick__field" data-dp-field="' + k + '" aria-pressed="' + (st.field === k) + '"><small>' + label + '</small>' + esc(v ? fmtLong(v) : 'No date') + '</button>';
    const quicks = [['today', 'Today'], ['tomorrow', 'Tomorrow'], ['weekend', 'This weekend'], ['next week', 'Next week'], ['in 2 weeks', 'In 2 weeks'], ['', 'No date']];
    return '<div class="gd-datepick" role="group" aria-label="Dates"><div class="gd-datepick__fields">' + field('start', 'Start', a) + field('due', 'Due', b) + '</div>' +
      '<input class="gd-datepick__type" type="text" data-dp-type placeholder="Type a date: fri, next week, in 3 days" aria-label="Type a date for ' + (st.field === 'start' ? 'start' : 'due') + '" autocomplete="off"><p class="gd-datepick__hint" data-dp-hint aria-live="polite"></p>' +
      '<div class="gd-datepick__quicks">' + quicks.map((q) => '<button type="button" class="gd-datepick__quick" data-dp-quick="' + q[0] + '">' + q[1] + '</button>').join('') + '</div>' +
      '<div class="gd-datepick__nav"><button type="button" class="gd-iconbtn gd-iconbtn--sm" data-dp-nav="-1" aria-label="Previous month">' + ico('left', 14) + '</button><span aria-live="polite">' + MONTH_FULL[fm.getMonth()] + ' ' + fm.getFullYear() + '</span><button type="button" class="gd-iconbtn gd-iconbtn--sm" data-dp-nav="1" aria-label="Next month">' + ico('right', 14) + '</button></div>' +
      '<div class="gd-datepick__grid">' + cells + '</div></div>';
  }
  // one date field changes; the range never runs backwards, so the other end gives way
  function datePatch(t, field, val) {
    const patch = {}; patch[field] = val;
    if (val) { if (field === 'start' && t.due && val > t.due) patch.due = ''; if (field === 'due' && t.start && val < t.start) patch.start = ''; }
    return patch;
  }

  /* the toolbar popovers: filter, display, add */
  const FP = { field: 'priority' };
  function filterPopHtml() {
    const f = FIELDS.find((x) => x.key === FP.field) || FIELDS[0];
    const cur = S.filters.find((x) => x.field === f.key), sel = cur ? cur.values : [];
    const values = f.values || [['none', 'Unassigned']].concat(Object.keys(S.names).concat(S.me.email).filter((e, i, a) => a.indexOf(e) === i).map((e) => ['u:' + e, personName(e)])).concat(S.agents.map((a) => ['a:' + a.id, a.name]));
    const base = S.tasks.filter((t) => t.status !== 'dismissed');
    const n = (v) => base.filter((t) => { const x = taskValue(t, f.key, S.today); return Array.isArray(x) ? x.includes(v) : x === v; }).length;
    const fields = FIELDS.map((x) => { const c = S.filters.find((y) => y.field === x.key); return '<button type="button" class="gd-filterpop__field" data-fk="fpf:' + x.key + '" data-fp-field="' + x.key + '" aria-current="' + (x.key === f.key) + '">' + x.label + (c ? '<span class="gd-tbar__n">' + c.values.length + '</span>' : '') + '</button>'; }).join('');
    const rows = values.map(([v, label]) => '<label class="gd-filterpop__value"><span class="gd-check"><input type="checkbox" data-fk="fpv:' + esc(v) + '" data-fp-value="' + esc(v) + '"' + (sel.includes(v) ? ' checked' : '') + '><span class="gd-check__box"></span></span><span>' + esc(label) + '</span><span class="gd-filterpop__n gd-num">' + n(v) + '</span></label>').join('');
    return '<div class="gd-filterpop"><div class="gd-filterpop__fields" role="group" aria-label="Filter by">' + fields + '</div><div class="gd-filterpop__values" role="group" aria-label="' + esc(f.label) + ' is any of"><div class="gd-filterpop__title">' + esc(f.label) + ' is any of</div>' + rows + '</div>' +
      '<div class="gd-filterpop__foot"><button type="button" class="gd-btn gd-btn--ghost gd-btn--sm" data-clear-filters' + (S.filters.length ? '' : ' disabled') + '>Clear</button><button type="button" class="gd-btn gd-btn--outline gd-btn--sm" data-save-view' + (S.filters.length ? '' : ' disabled') + '>Save as view</button></div></div>';
  }
  const selectHtml = (key, label, opts, cur) => '<div class="tk-disp__row"><span>' + label + '</span><div class="gd-select gd-select--sm gd-select--auto" data-gd-select data-key="' + key + '"><button type="button" class="gd-input" aria-haspopup="listbox" aria-label="' + label + '"><span class="gd-select__value">' + esc(opts.find((o) => o[0] === cur)[1]) + '</span><svg class="gd-input__caret" viewBox="0 0 256 256" width="12" height="12" fill="currentColor" aria-hidden="true">' + ICON.down + '</svg></button><div class="gd-menu" role="listbox" hidden>' + opts.map((o) => '<button type="button" class="gd-menu__item" role="option" data-value="' + o[0] + '" aria-selected="' + (o[0] === cur) + '"><span class="gd-menu__text">' + esc(o[1]) + (o[2] ? '<span class="gd-menu__desc">' + esc(o[2]) + '</span>' : '') + '</span><svg class="gd-menu__check" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">' + ICON.check + '</svg></button>').join('') + '</div></div></div>';
  const toggleHtml = (key, label, on) => '<label class="tk-disp__row gd-toggle gd-toggle--xs"><span>' + label + '</span><input type="checkbox" role="switch" data-disp-toggle="' + key + '"' + (on ? ' checked' : '') + '><span class="gd-toggle__track"></span></label>';
  function displayPopHtml() {
    const d = S.display;
    return selectHtml('sort', 'Sort by', [['bruce', 'Bruce’s order', 'Priority, then due date'], ['priority', 'Priority'], ['due', 'Due date'], ['start', 'Start date'], ['created', 'Created'], ['updated', 'Recently updated']], d.sort) +
      (d.sort === 'bruce' ? '' : '<div class="tk-disp__row"><span>Direction</span><div class="gd-seg gd-seg--auto" role="radiogroup" aria-label="Direction" data-disp-dir>' + [['asc', 'Ascending'], ['desc', 'Descending']].map((x) => '<button type="button" class="gd-seg__item" role="radio" aria-checked="' + (d.dir === x[0]) + '" tabindex="' + (d.dir === x[0] ? 0 : -1) + '" data-value="' + x[0] + '">' + x[1] + '</button>').join('') + '</div></div>') +
      selectHtml('group', 'Group list by', [['due', 'Due date'], ['status', 'Status'], ['priority', 'Priority'], ['assignee', 'Assignee'], ['none', 'No grouping']], d.group) +
      toggleHtml('showDone', 'Show done tasks', d.showDone) + toggleHtml('showDismissed', 'Show dismissed suggestions', d.showDismissed);
  }
  function addPopHtml() {
    return '<div class="gd-picker" role="menu" aria-label="Add"><button type="button" class="gd-picker__row" role="menuitem" data-open-notyet><span class="gd-av gd-av--ghost" aria-hidden="true">' + ico('plus', 12) + '</span><span class="gd-picker__text"><b>Invite someone</b></span></button><button type="button" class="gd-picker__row" role="menuitem" data-open-notyet><span class="gd-av gd-av--agent gd-av--ghost" aria-hidden="true">' + ico('plus', 12) + '</span><span class="gd-picker__text"><b>Add an agent</b></span></button></div>';
  }
  function fillPopover(p) {
    const k = p.dataset.kind, t = p.dataset.id ? byId(p.dataset.id) : null;
    if (k === 'filter') p.innerHTML = filterPopHtml();
    else if (k === 'display') p.innerHTML = displayPopHtml();
    else if (k === 'add') p.innerHTML = addPopHtml();
    else if (t && (k === 'start' || k === 'due')) p.innerHTML = datepickHtml(t, p);
    else if (t) p.innerHTML = pickerHtml(k, t);
  }
  function closePop(p, back) {
    if (!p || p.hidden) return;
    p.hidden = true;
    const tr = $$('[data-gd-popover]').find((x) => x.getAttribute('aria-controls') === p.id);
    if (tr) { tr.setAttribute('aria-expanded', 'false'); if (back) tr.focus(); }
  }
  // a re-render keeps an open popover alive: the element moves into the new markup
  function preservePopovers(container, fn) {
    const open = $$('.gd-popover:not([hidden])', container).filter((p) => p.id);
    const kept = open.map((p) => { p.remove(); return p; });
    fn();
    kept.forEach((old) => {
      const fresh = doc.getElementById(old.id);
      if (!fresh) return;
      fresh.replaceWith(old); fillPopover(old);
      const tr = $$('[data-gd-popover]', container).find((x) => x.getAttribute('aria-controls') === old.id); if (tr) tr.setAttribute('aria-expanded', 'true');
    });
  }

  /* ------------------------------------------------------------------ the task drawer */
  const drawer = () => $('#tk-drawer');
  S.rework = {};                                    // task id -> true while the rework note box is open
  let notesTimer = null, openerKey = '';
  function keepNodes(container, ids, fn) {
    const kept = ids.map((id) => { const n = doc.getElementById(id); return n && container.contains(n) && n.contains(doc.activeElement) ? n : null; }).filter(Boolean);
    const marks = kept.map((n) => { const m = doc.createComment(n.id); n.replaceWith(m); return [n, m]; });
    fn();
    kept.forEach((n) => { const fresh = doc.getElementById(n.id); if (fresh) fresh.replaceWith(n); });
  }
  function agentLines(t) { return (t.activity || []).filter((a) => a.by === 'bruce' || a.by === 'alfred'); }
  function agentSection(t, ag) {
    let h = '';
    if (ag && !ag.live) h += '<p class="tk-agentnote">' + AGENT_NOTICE + '</p>';
    if (t.run === 'needs') h += '<div class="tk-sec"><span class="tk-sec__label">Needs you</span><div class="tk-result"><span>' + esc(t.runNote || 'The agent has a question for you.') + '</span></div><div class="tk-acts"><button type="button" class="gd-btn gd-btn--outline" data-act="resend" data-id="' + t.id + '">Send back to ' + esc(ag ? ag.name : 'the agent') + '</button></div></div>';
    if (t.run === 'failed') h += '<div class="tk-sec"><span class="tk-sec__label">Failed</span><div class="tk-result"><span>' + esc(t.runNote || 'The run failed.') + '</span></div><div class="tk-acts"><button type="button" class="gd-btn gd-btn--outline" data-act="retry" data-id="' + t.id + '">' + ico('retry', 14) + 'Retry</button></div></div>';
    if (t.run === 'review') {
      const last = agentLines(t).slice(-1)[0];
      h += '<div class="tk-sec"><span class="tk-sec__label">Result</span><div class="tk-result"><b>' + esc(last ? last.text : 'Ready for your review') + '</b></div>' +
        '<div class="tk-acts"><button type="button" class="gd-btn gd-btn--primary" data-act="approve" data-id="' + t.id + '">Approve, mark done</button><button type="button" class="gd-btn gd-btn--outline" data-act="rework-open" data-id="' + t.id + '" aria-expanded="' + !!S.rework[t.id] + '">Rework with a note</button></div>' +
        (S.rework[t.id] ? '<div class="tk-rework" id="tk-rework"><textarea class="tk-notes" id="tk-rework-note" rows="3" placeholder="What should change" aria-label="Note for the rework"></textarea><div class="tk-acts"><button type="button" class="gd-btn gd-btn--primary gd-btn--sm" data-act="rework-send" data-id="' + t.id + '">Send back</button><button type="button" class="gd-btn gd-btn--ghost gd-btn--sm" data-act="rework-cancel" data-id="' + t.id + '">Cancel</button></div></div>' : '') + '</div>';
    }
    return h;
  }
  function activityHtml(t, label) {
    const items = (t.activity || []).slice().reverse().map((a) => {
      const agent = a.by === 'bruce' || a.by === 'alfred';
      const av = agent ? '<span class="gd-av gd-av--agent gd-av--sm ' + (a.by === 'bruce' ? 'gd-av--ink' : 'gd-av--outline') + '" aria-hidden="true">' + esc(actorName(a.by).charAt(0)) + '</span>' : '<span class="gd-av gd-av--sm" aria-hidden="true">' + esc(initials(actorName(a.by))) + '</span>';
      return '<li class="gd-timeline__item"><span class="gd-timeline__node">' + av + '</span><div class="gd-timeline__body"><span><span class="gd-timeline__actor">' + esc(actorName(a.by)) + '</span> ' + esc(a.text) + '</span></div><time class="gd-timeline__time" datetime="' + esc(a.at) + '" title="' + esc(new Date(a.at).toLocaleString()) + '">' + esc(ago(a.at)) + '</time></li>';
    }).join('');
    return '<div class="tk-sec"><span class="tk-sec__label">' + label + '</span><ol class="gd-timeline tk-feed">' + (items || '<li class="tk-agentnote">Nothing yet.</li>') + '</ol></div>';
  }
  function drawerBodyHtml(t) {
    const agent = isAgent(t.assignee), ag = agent ? agentOf(t.assignee.slice(2)) : null;
    let h = '';
    if (t.status === 'suggested' && t.why) h += '<div class="gd-banner gd-banner--neutral"><div class="gd-banner__body"><span class="gd-banner__title">Why Bruce thinks it is a task</span><span>' + esc(t.why) + '</span></div></div>';
    h += propsHtml(t, 'dr');
    if (t.source && t.source.quote) h += '<div class="tk-sec"><figure class="gd-quote"><span class="gd-quote__label">Original message</span><blockquote>' + esc(t.source.quote) + '</blockquote></figure></div>';
    if (agent) h += agentSection(t, ag);
    h += '<div class="tk-sec" id="tk-notes-sec"><label class="tk-sec__label" for="tk-notes">' + (agent ? 'Brief' : 'Notes') + '</label><textarea class="tk-notes" id="tk-notes" rows="4" maxlength="4000" placeholder="' + (agent ? 'Tell ' + esc(ag ? ag.name : 'the agent') + ' what you need' : 'Add notes') + '">' + esc(t.notes || '') + '</textarea><span class="tk-saved" id="tk-saved" aria-live="polite"></span></div>';
    h += activityHtml(t, agent ? 'Run log' : 'Activity');
    return h;
  }
  function drawerFootHtml(t) {
    if (t.status === 'suggested') return '<span class="tk-dr-foot-note"></span><div class="gd-drawer__acts"><button type="button" class="gd-btn gd-btn--outline" data-act="dismiss" data-id="' + t.id + '">Dismiss</button><button type="button" class="gd-btn gd-btn--primary" data-act="accept" data-id="' + t.id + '">Accept</button></div>';
    if (t.status === 'dismissed') return '<span></span><div class="gd-drawer__acts"><button type="button" class="gd-btn gd-btn--primary" data-act="restore" data-id="' + t.id + '">Restore to suggestions</button></div>';
    return '<button type="button" class="gd-btn gd-btn--danger" data-act="delete" data-id="' + t.id + '">Delete</button><div class="gd-drawer__acts">' + (t.status === 'done' ? '<button type="button" class="gd-btn gd-btn--outline" data-act="reopen" data-id="' + t.id + '">Reopen</button>' : '<button type="button" class="gd-btn gd-btn--primary" data-act="done" data-id="' + t.id + '">Mark done</button>') + '</div>';
  }
  function syncDrawer() {
    const d = drawer();
    if (!S.openId || !d.open) return;
    const t = byId(S.openId);
    if (!t) { d.close(); return; }
    $('#tk-dr-sub').innerHTML = '<span>Tasks / ' + esc(tag(t)) + '</span>' + runHtml(t, false);
    const ti = $('#tk-dr-title'); if (doc.activeElement !== ti) ti.value = t.title;
    const body = $('#tk-dr-body');
    preservePopovers(body, () => keepNodes(body, ['tk-notes-sec', 'tk-rework'], () => { body.innerHTML = drawerBodyHtml(t); }));
    $('#tk-dr-foot').innerHTML = drawerFootHtml(t);
  }
  function openTask(id) {
    const t = byId(id); if (!t) return;
    openerKey = fkOf(doc.activeElement) || 'open:' + id;
    S.openId = id;
    const d = drawer();
    $('#tk-dr-title').value = t.title;
    if (!d.open) GD.feedback.open(d);
    syncDrawer();
  }
  function flushNotes() {
    if (!notesTimer) return; clearTimeout(notesTimer); notesTimer = null;
    const ta = $('#tk-notes'); if (!ta || !S.openId) return;
    const t = byId(S.openId); if (!t || t.notes === ta.value) return;
    update(S.openId, { notes: ta.value }, { quiet: true }).then((r) => { const s = $('#tk-saved'); if (r && s) s.textContent = 'Saved'; });
  }
  async function markDone(id) {
    const t = byId(id); if (!t) return; const prev = t.status;
    const r = await update(id, { status: 'done' });
    if (r) toast('Marked ' + tag(t) + ' done', { type: 'success', action: { label: 'Undo', onClick: () => update(id, { status: prev === 'done' ? 'todo' : prev }) } });
  }
  async function confirmDelete(id) {
    const t = byId(id); if (!t) return;
    const ok = await GD.confirm({ title: 'Delete ' + tag(t) + '?', message: '“' + t.title + '” will be removed from every view. This cannot be undone.', confirmLabel: 'Delete ' + tag(t) });
    if (!ok) return;
    const n = tag(t);
    if (await deleteTask(id)) { if (S.openId === id) drawer().close(); toast('Deleted ' + n, { type: 'success' }); }
  }
  const lastDismissedPush = (id) => { S.lastDismissed.unshift(id); S.lastDismissed = S.lastDismissed.slice(0, 20); };
  async function doAccept(id) {
    const goes = S.goes[id]; const t = await acceptTask(id);
    if (t && goes === 'doing') await update(id, { status: 'doing' });
    delete S.goes[id];
    if (t) toast('Accepted ' + tag(t), { type: 'success' });
    return t;
  }
  async function doDismiss(id) {
    const t = await dismissTask(id); if (!t) return;
    lastDismissedPush(id); refresh();
    toast('Dismissed ' + tag(t), { type: 'success', action: { label: 'Undo', onClick: () => restore(id) } });
  }
  async function restore(id) { await update(id, { status: 'suggested' }); refresh(); }

  /* new task: from the bar, the phone button, or a lane's footer */
  function openNew() {
    const d = $('#tk-new'); $('#tk-new-title').value = ''; $('#tk-new-err').hidden = true;
    GD.feedback.open(d); $('#tk-new-title').focus();
  }
  async function submitNew(ev) {
    ev.preventDefault();
    const v = $('#tk-new-title').value.trim();
    if (!v) { $('#tk-new-err').hidden = false; $('#tk-new-title').setAttribute('aria-invalid', 'true'); $('#tk-new-title').focus(); return; }
    $('#tk-new-title').removeAttribute('aria-invalid');
    $('#tk-new').close();
    const t = await createTask({ title: v, status: 'todo' });
    if (t) toast('Added ' + tag(t), { type: 'success' });
  }
  function quickAdd(btn) {
    const lane = btn.dataset.addLane, inp = doc.createElement('input');
    inp.className = 'gd-lane__quick'; inp.placeholder = 'Task title'; inp.maxLength = 200; inp.setAttribute('aria-label', 'Task title for ' + STATUS_NAME[lane]);
    btn.hidden = true; btn.before(inp); inp.focus();
    let done = false;
    const end = async (ok) => {
      if (done) return; done = true; const v = inp.value.trim(); inp.remove(); btn.hidden = false;
      if (ok && v) { const t = await createTask({ title: v, status: lane }); if (t) { const b = $('[data-add-lane="' + lane + '"]'); if (b) b.focus(); } } else btn.focus();
    };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); end(true); } else if (e.key === 'Escape') { e.stopPropagation(); end(false); } });
    inp.addEventListener('blur', () => end(!!inp.value.trim()));
  }

  /* ------------------------------------------------------------------ Ask Bruce */
  const A = { msgs: [], tags: [], ctx: true, openId: null, pending: false, m: { mode: null, tab: 'tasks', q: '', sel: 0, items: [] }, returnTo: null };
  const ask = () => $('#tk-ask');
  const askOpen = () => !ask().hidden;
  const CTX_NAME = { board: 'this board', list: 'this list', timeline: 'this timeline', inbox: 'this inbox' };
  function syncLauncher() { $('#tk-launch').hidden = !(S.status === 'ready' && S.tasks.length > 0) || askOpen(); }
  function askSub() { const a = S.ask || { used: 0, cap: 0 }; return 'Sees your tasks and Slack · ' + (a.cap > 0 ? Math.max(0, a.cap - a.used) + ' of ' + a.cap + ' messages left today' : a.used + (a.used === 1 ? ' message' : ' messages') + ' today'); }
  function openAsk(o) {
    o = o || {};
    A.returnTo = o.from || doc.activeElement;
    ask().hidden = false; syncLauncher();
    $('#tk-ask-sub').textContent = askSub();
    renderComposerBits(); renderThread();
    if (o.focus !== false) $('#tk-ask-input').focus();
  }
  function closeAsk() {
    closeMention(); ask().hidden = true; syncLauncher();
    const r = A.returnTo; A.returnTo = null;
    const target = isPhone() ? $('[data-nav="ask"]') : $('#tk-launch-main');
    if (r && r.isConnected && r !== doc.body && !isPhone()) r.focus && r.focus(); else if (target) target.focus();
  }
  const toggleAsk = () => (askOpen() ? closeAsk() : openAsk());

  /* tags */
  const tagKey = (t) => t.kind + ':' + (t.id || t.key);
  function addTag(t) { if (!A.tags.some((x) => tagKey(x) === tagKey(t))) A.tags.push(t); renderComposerBits(); }
  const taskTagObj = (t) => ({ kind: 'task', id: t.id, key: tag(t), title: t.title });
  function tagChip(t, x) { return '<span class="gd-tagchip" data-kind="' + t.kind + '"><b>' + esc(t.key) + '</b>' + (t.title ? '<span>' + esc(t.title) + '</span>' : '') + (x == null ? '' : '<button type="button" class="gd-tagchip__x" data-tag-x="' + x + '" aria-label="Remove tag ' + esc(t.key) + '">' + ico('x', 10) + '</button>') + '</span>'; }
  function renderComposerBits() {
    $('#tk-ctags').innerHTML = A.tags.map((t, i) => tagChip(t, i)).join('');
    const cx = $('#tk-tool-ctx'); cx.hidden = !A.ctx;
    cx.innerHTML = 'Context: ' + esc(CTX_NAME[S.view] || 'this board') + ico('x', 10);
    cx.setAttribute('aria-label', 'Remove context: ' + (CTX_NAME[S.view] || 'this board'));
    $('#tk-ask-send').disabled = !($('#tk-ask-input').value.trim() || A.tags.length) || A.pending;
  }

  /* the picker above the composer: @ for tags, / for commands */
  const COMMANDS = [['/move', 'Change status of tagged tasks'], ['/date', 'Set start or due dates'], ['/priority', 'Set priority'], ['/remind', 'DM you at a time you choose'], ['/reply', 'Draft a Slack reply, you send it'], ['/summarise', 'Today, this week, or what changed']];
  const viewTasks = () => (S.view === 'inbox' ? inboxItems() : visible().filter((t) => t.status !== 'dismissed'));
  function mentionItems() {
    const m = A.m, q = m.q.toLowerCase();
    if (m.mode === 'cmd') return COMMANDS.filter((c) => c[0].slice(1).startsWith(q)).map((c) => ({ type: 'cmd', cmd: c[0], hint: c[1] }));
    if (m.tab === 'tasks') {
      const list = sorted(S.tasks.filter((t) => t.status !== 'dismissed' && (!q || (tag(t) + ' ' + t.title).toLowerCase().includes(q))))
        .sort((a, b) => (tag(b).toLowerCase() === q) - (tag(a).toLowerCase() === q) || (tag(b).toLowerCase().startsWith(q)) - (tag(a).toLowerCase().startsWith(q))).slice(0, 8)
        .map((t) => ({ type: 'task', t }));
      const vt = viewTasks(), sel = S.tasks.filter((t) => S.sel.has(t.id));
      return list.concat([{ type: 'group', key: 'This view', ids: vt.map((t) => t.id), n: vt.length, label: 'Tag everything on this view', hint: vt.length + (vt.length === 1 ? ' task' : ' tasks'), off: !vt.length },
        { type: 'group', key: 'Selected cards', ids: sel.map((t) => t.id), n: sel.length, label: 'Tag the selected cards', hint: sel.length ? sel.length + ' selected' : 'Cmd-click cards to select', off: !sel.length }]);
    }
    if (m.tab === 'people') {
      const ppl = [S.me.email].concat(Object.keys(S.names).filter((e) => e !== S.me.email)).map((e) => ({ type: 'person', id: 'u:' + e, key: '@' + personName(e).split(' ')[0], hint: e === S.me.email ? 'You' : 'Person' }));
      const ags = S.agents.map((a) => ({ type: 'person', id: 'a:' + a.id, key: '@' + a.name, hint: a.does }));
      return ppl.concat(ags).filter((x) => !q || x.key.toLowerCase().includes(q));
    }
    const chs = Array.from(new Set(S.tasks.map((t) => t.source && t.source.channel).filter((c) => c && c.startsWith('#')))).sort();
    return chs.filter((c) => !q || c.toLowerCase().includes(q)).map((c) => ({ type: 'channel', key: c, hint: S.tasks.filter((t) => t.source && t.source.channel === c).length + ' tasks' }));
  }
  function renderMention() {
    const el = $('#tk-mention'), m = A.m;
    if (!m.mode) { el.hidden = true; return; }
    m.items = mentionItems(); m.sel = Math.min(m.sel, Math.max(0, m.items.length - 1));
    const tabs = m.mode === 'at' ? '<div class="gd-seg gd-seg--auto" role="radiogroup" aria-label="Tag type">' + [['tasks', 'Tasks'], ['people', 'People'], ['channels', 'Channels']].map((x) => '<button type="button" class="gd-seg__item" role="radio" aria-checked="' + (m.tab === x[0]) + '" tabindex="-1" data-m-tab="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' : '<div class="gd-mention__none" style="padding-bottom:0">Commands</div>';
    const rows = m.items.map((it, i) => {
      const sel = i === m.sel ? ' aria-selected="true"' : '', off = it.off ? ' aria-disabled="true"' : '';
      if (it.type === 'task') return '<button type="button" class="gd-mention__row" role="option" data-m-i="' + i + '"' + sel + '><b>' + esc(tag(it.t)) + '</b><span>' + esc(it.t.title) + '</span><small>' + esc(STATUS_NAME[it.t.status] + (it.t.due ? ' · ' + relDay(it.t.due, S.today) : '')) + '</small></button>';
      if (it.type === 'group') return (it.key === 'This view' ? '<div class="gd-mention__sep"></div>' : '') + '<button type="button" class="gd-mention__row" role="option" data-m-i="' + i + '"' + sel + off + '><span>' + it.label + '</span><small>' + esc(it.hint) + '</small></button>';
      if (it.type === 'cmd') return '<button type="button" class="gd-mention__row" role="option" data-m-i="' + i + '"' + sel + '><b>' + it.cmd + '</b><span>' + esc(it.hint) + '</span></button>';
      return '<button type="button" class="gd-mention__row" role="option" data-m-i="' + i + '"' + sel + '><b>' + esc(it.key) + '</b><span></span><small>' + esc(it.hint) + '</small></button>';
    }).join('');
    const none = !m.items.length ? '<div class="gd-mention__none">' + (m.mode === 'cmd' ? 'No command matches.' : m.tab === 'channels' ? 'No channels yet. Tasks from Slack bring them here.' : 'No match.') + '</div>' : '';
    el.innerHTML = tabs + '<div class="gd-mention__list" role="listbox" aria-label="' + (m.mode === 'cmd' ? 'Commands' : 'Tag') + '">' + rows + none + '</div>';
    el.hidden = false;
    const s = $('[aria-selected="true"]', el); if (s) s.scrollIntoView({ block: 'nearest' });
  }
  function openMention(mode, q) { A.m.mode = mode; A.m.q = q || ''; if (mode === 'cmd') A.m.sel = 0; renderMention(); }
  function closeMention() { A.m.mode = null; A.m.sel = 0; $('#tk-mention').hidden = true; }
  function chooseMention(i) {
    const it = A.m.items[i]; if (!it || it.off) return;
    const input = $('#tk-ask-input'), mode = A.m.mode;
    if (it.type === 'cmd') {
      input.value = it.cmd + ' '; closeMention(); input.focus(); renderComposerBits(); return;
    }
    // remove the "@query" the person typed; the chip replaces it
    if (mode === 'at') { const pos = input.selectionStart, before = input.value.slice(0, pos).replace(/(^|\s)@[^\s@]*$/, '$1'); input.value = before + input.value.slice(pos); input.setSelectionRange(before.length, before.length); }
    if (it.type === 'task') addTag(taskTagObj(it.t));
    else if (it.type === 'group') addTag({ kind: 'group', id: it.key, key: it.key, title: it.n + (it.n === 1 ? ' task' : ' tasks'), ids: it.ids });
    else addTag({ kind: it.type, id: it.id, key: it.key });
    closeMention(); input.focus(); renderComposerBits();
  }
  function onComposerInput() {
    const input = $('#tk-ask-input'), pos = input.selectionStart, before = input.value.slice(0, pos);
    let m = /(^|\s)@([^\s@]*)$/.exec(before);
    if (m) { openMention('at', m[2]); }
    else if ((m = /^\/(\w*)$/.exec(input.value))) { openMention('cmd', m[1]); }
    else closeMention();
    renderComposerBits();
  }

  /* the thread */
  const ERRORS = { 401: 'I cannot tell who you are. Sign in to the hub again and ask me once more.', 403: 'That is not open to you. Ask Utsav for access.', 429: 'That is the daily limit. I am out of messages until tomorrow.', 500: 'That did not work on my side. Try again in a moment.', 502: 'I could not reach my own head just now. Try again in a moment.' };
  function answerHtml(text) {
    const refs = []; const seen = new Set();
    const html = esc(text).replace(/TSK-(\d+)/g, (m, n) => { const t = S.tasks.find((x) => x.n === +n); if (t && !seen.has(t.id)) { seen.add(t.id); refs.push(t); } return '<span class="gd-tagchip" data-kind="task"><b>' + m + '</b></span>'; });
    const minis = refs.slice(0, 6).map((t) => '<div class="gd-ask__mini"><b>' + esc(t.title) + '</b>' + dueHtml(t, false) + '<button type="button" class="gd-ask__tag" data-ask-tag="' + t.id + '" aria-label="Tag ' + esc(tag(t)) + '">@ tag</button></div>').join('');
    return '<div>' + html + '</div>' + minis;
  }
  function stepDetail(st) {
    if (st.kind === 'slack') return '<div class="gd-plan__draft">' + esc(st.text || '') + '</div>';
    const ids = st.ids || (st.id ? [st.id] : []);
    const chips = ids.map((id) => byId(id)).filter(Boolean).map((t) => '<span class="gd-tagchip" data-kind="task"><b>' + esc(tag(t)) + '</b><span>' + esc(t.title) + '</span></span>').join('');
    return chips ? '<div class="gd-plan__detail">' + chips + '</div>' : '';
  }
  function planHtml(mi, p) {
    if (p.state === 'cancelled') return '<div class="gd-plan__note">Plan cancelled. Nothing changed.</div>';
    if (p.state === 'done') {
      const r = p.result, slack = p.steps.filter((s, i) => s.kind === 'slack' && p.ticked[i] && r.keepSlack);
      return '<div class="gd-donecard">' + ico('check') + '<span><b>' + (r.undone ? 'Undone.' : 'Done.') + '</b> ' + (r.undone ? 'Your tasks are back as they were.' : r.count + (r.count === 1 ? ' task' : ' tasks') + ' changed.') + (r.failed ? ' One step did not run.' : '') + '</span>' + (r.undone || !r.undo.length ? '' : '<button type="button" class="gd-btn gd-btn--outline gd-btn--sm" data-plan-undo="' + mi + '">Undo</button>') + '</div>' +
        slack.map((s) => '<div class="gd-plan"><div class="gd-plan__label"><b>' + esc(s.label) + '</b><span class="gd-badge gd-badge--warn">visible to others</span></div><div class="gd-plan__draft">' + esc(s.text || '') + '</div><p class="gd-plan__note">Waiting for your Send. Slack sending is not switched on yet.</p><div class="gd-plan__foot"><button type="button" class="gd-btn gd-btn--primary gd-btn--sm" aria-disabled="true" disabled>Send as Bruce</button></div></div>').join('');
    }
    const hasSlack = p.steps.some((s) => s.kind === 'slack'), running = p.state === 'running';
    const steps = p.steps.map((st, i) => '<div class="gd-plan__step" data-off="' + !p.ticked[i] + '"><label class="gd-check"><input type="checkbox" data-plan-step="' + mi + ':' + i + '"' + (p.ticked[i] ? ' checked' : '') + (running ? ' disabled' : '') + '><span class="gd-check__box"></span><span class="gd-sr">Include: ' + esc(st.label) + '</span></label><div><div class="gd-plan__label"><span>' + esc(st.label) + '</span>' + (st.kind === 'slack' ? '<span class="gd-badge gd-badge--warn">visible to others</span>' : '<span class="gd-badge">your tasks</span>') + '</div>' + stepDetail(st) + '</div></div>').join('');
    const any = p.ticked.some(Boolean), anyTasks = p.steps.some((s, i) => s.kind === 'tasks' && p.ticked[i]);
    return '<div class="gd-plan">' + steps +
      (hasSlack ? '<p class="gd-plan__note">Slack sending is not switched on yet. Slack steps stay as drafts.</p><div class="gd-plan__foot"><button type="button" class="gd-btn gd-btn--outline gd-btn--sm" aria-disabled="true" disabled>Send as Bruce</button></div>' : '') +
      '<div class="gd-plan__foot"><button type="button" class="gd-btn gd-btn--primary gd-btn--sm" data-plan-go="' + mi + ':all"' + (!any || running ? ' disabled' : '') + (running ? ' aria-busy="true"' : '') + '>Approve all</button>' + (hasSlack ? '<button type="button" class="gd-btn gd-btn--outline gd-btn--sm" data-plan-go="' + mi + ':tasks"' + (!anyTasks || running ? ' disabled' : '') + '>Tasks only</button>' : '') + '<button type="button" class="gd-btn gd-btn--ghost gd-btn--sm" data-plan-cancel="' + mi + '"' + (running ? ' disabled' : '') + '>Cancel</button></div></div>';
  }
  function msgHtml(m, i) {
    if (m.role === 'user') {
      return '<div class="gd-ask__msg gd-ask__msg--me">' + (m.tags.length ? '<div class="gd-ask__tags">' + m.tags.map((t) => tagChip(t)).join('') + '</div>' : '') + (m.text ? '<div class="gd-ask__bubble">' + esc(m.text) + '</div>' : '') + '</div>';
    }
    return '<div class="gd-ask__msg gd-ask__msg--bruce"><span class="gd-av gd-av--agent gd-av--ink gd-av--sm" aria-hidden="true">B</span><div class="gd-ask__bubble' + (m.error ? ' gd-ask__bubble--error' : '') + '">' + (m.error ? esc(m.content) : answerHtml(m.content)) + (m.plan ? planHtml(i, m.plan) : '') + '</div></div>';
  }
  function renderThread(stick) {
    const th = $('#tk-ask-thread');
    const empty = !A.msgs.length && !A.pending;
    const near = th.scrollHeight - th.scrollTop - th.clientHeight < 80;
    th.innerHTML = empty ? '<div class="gd-ask__empty"><span>Ask about your tasks, or tell me what to change. I will show a plan before I touch anything.</span><div class="gd-ask__starters">' + ['What is due this week?', 'What is overdue?', 'Move everything in To do to Doing'].map((q) => '<button type="button" class="gd-btn gd-btn--outline gd-btn--sm" data-starter="' + esc(q) + '">' + esc(q) + '</button>').join('') + '</div></div>'
      : A.msgs.map(msgHtml).join('') + (A.pending ? '<div class="gd-ask__msg gd-ask__msg--bruce"><span class="gd-av gd-av--agent gd-av--ink gd-av--sm" aria-hidden="true">B</span><div class="gd-ask__bubble"><span class="gd-ask__typing">Looking</span></div></div>' : '');
    if (stick || near) th.scrollTop = th.scrollHeight;
    $('#tk-ask-newchat').hidden = !A.msgs.length;
  }
  async function sendAsk() {
    const input = $('#tk-ask-input'), text = input.value.trim();
    if ((!text && !A.tags.length) || A.pending) return;
    const extra = A.tags.filter((t) => t.kind === 'person' || t.kind === 'channel').map((t) => t.key).join(' ');
    const content = (text + (extra ? (text ? ' ' : '') + extra : '')) || A.tags.map((t) => t.key).join(' ');
    const ids = Array.from(new Set(A.tags.flatMap((t) => (t.kind === 'task' ? [t.id] : t.kind === 'group' ? t.ids : [])))).slice(0, 50);
    A.msgs.push({ role: 'user', content, text, tags: A.tags.slice() });
    input.value = ''; A.tags = []; closeMention(); renderComposerBits();
    A.pending = true; renderThread(true); renderComposerBits();
    const messages = A.msgs.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content })).slice(-20);
    const context = {}; if (A.ctx) { context.view = S.view; if (A.openId) context.openId = A.openId; } if (ids.length) context.tagged = ids;
    try {
      const r = await request('POST', { op: 'ask', messages, context });
      S.ask = { used: r.used != null ? r.used : S.ask.used + 1, cap: r.cap != null ? r.cap : S.ask.cap };
      const plan = Array.isArray(r.plan) && r.plan.length ? { steps: r.plan, ticked: r.plan.map(() => true), state: 'pending' } : null;
      A.msgs.push({ role: 'assistant', content: r.answer || '', plan });
    } catch (e) {
      if (e.status === 429) S.ask = { used: (e.data && e.data.cap) || S.ask.cap, cap: (e.data && e.data.cap) || S.ask.cap };
      A.msgs.push({ role: 'assistant', content: ERRORS[e.status] || ERRORS[500], error: true });
    }
    A.pending = false; $('#tk-ask-sub').textContent = askSub(); renderThread(true); renderComposerBits();
  }

  /* running an approved plan: only steps of kind "tasks" ever run, through the same ops as the board */
  const pick = (t, keys) => keys.reduce((o, k) => { o[k] = t[k] == null ? '' : t[k]; return o; }, {});
  async function runStep(st, undo, touched) {
    const fail = () => { throw new Error('step'); };
    if (st.op === 'update') { const t = byId(st.id); if (!t) fail(); const prev = pick(t, Object.keys(st.patch || {})); if (!(await update(st.id, st.patch || {}))) fail(); undo.push({ op: 'update', id: st.id, patch: prev }); touched.add(st.id); }
    else if (st.op === 'bulk') { const ids = (st.ids || []).filter((id) => byId(id)); const prev = ids.map((id) => [id, pick(byId(id), Object.keys(st.patch || {}))]); if (!ids.length || !(await bulk(ids, st.patch || {}))) fail(); prev.forEach(([id, p]) => { undo.push({ op: 'update', id, patch: p }); touched.add(id); }); }
    else if (st.op === 'create') { const t = await createTask(st.task || {}); if (!t) fail(); undo.push({ op: 'delete', id: t.id }); touched.add(t.id); }
    else if (st.op === 'delete') { const t = byId(st.id); if (!t) fail(); const snap = pick(t, ['title', 'notes', 'status', 'priority', 'start', 'due', 'assignee']); if (!(await deleteTask(st.id))) fail(); undo.push({ op: 'create', task: snap }); touched.add(st.id); }
    else if (st.op === 'accept') { const t = byId(st.id); if (!t || !(await acceptTask(st.id))) fail(); undo.push({ op: 'update', id: st.id, patch: { status: 'suggested' } }); touched.add(st.id); }
    else if (st.op === 'dismiss') { const t = byId(st.id); if (!t || !(await dismissTask(st.id))) fail(); undo.push({ op: 'update', id: st.id, patch: { status: 'suggested' } }); touched.add(st.id); }
    else fail();
  }
  async function approvePlan(mi, mode) {
    const m = A.msgs[mi]; if (!m || !m.plan || m.plan.state !== 'pending') return;
    const p = m.plan; p.state = 'running'; renderThread();
    const undo = [], touched = new Set(); let failed = false;
    for (let i = 0; i < p.steps.length; i++) {
      const st = p.steps[i]; if (!p.ticked[i] || st.kind !== 'tasks') continue;
      try { await runStep(st, undo, touched); } catch (e) { failed = true; break; }
    }
    p.state = 'done'; p.result = { count: touched.size, undo, undone: false, failed, keepSlack: mode === 'all' };
    refresh(); renderThread(true);
  }
  async function undoPlan(mi) {
    const m = A.msgs[mi]; if (!m || !m.plan || !m.plan.result || m.plan.result.undone) return;
    const r = m.plan.result;
    for (const u of r.undo.slice().reverse()) {
      if (u.op === 'update') await update(u.id, u.patch);
      else if (u.op === 'delete') await deleteTask(u.id);
      else if (u.op === 'create') await createTask(u.task);
    }
    r.undone = true; refresh(); renderThread();
  }

  /* ------------------------------------------------------------------ render and refresh */
  function render() {
    renderChrome(); renderStrip(); renderLaneChips();
    const el = $('#tk-view');
    preservePopovers(el, () => keepNodes(el, ['tk-ib-title'], renderView));
  }
  function refresh() { keepFocus(() => { render(); syncDrawer(); if (askOpen()) renderComposerBits(); }); }
  const openSettings = () => { $$('.gd-popover:not([hidden])').forEach((p) => closePop(p)); GD.feedback.open($('#tk-settings')); };
  const openNotYet = () => { $$('.gd-popover:not([hidden])').forEach((p) => closePop(p)); GD.feedback.open($('#tk-notyet')); };
  function setView(v) {
    if (!VIEWS.includes(v) || (v === 'timeline' && isPhone())) return;
    S.view = v; store.set('gw-tasks-view', v); S.sel.clear(); render(); $('#tk-scroll').scrollTop = 0;
    if (askOpen()) renderComposerBits();
  }
  const persistDisplay = () => store.set('gw-tasks-display', S.display);
  function setFilter(field, values) {
    S.filters = S.filters.filter((f) => f.field !== field);
    if (values.length) S.filters.push({ field, values });
    render();
  }
  function setZoom(z) { S.tl.zoom = z; store.set('gw-tasks-zoom', z); render(); }
  function openSearch() { const sf = $('#tk-search-field'); sf.hidden = false; $('#tk-search-btn').hidden = true; $('#tk-search').dataset.open = 'true'; $('#tk-search-btn').setAttribute('aria-expanded', 'true'); $('#tk-search-input').focus(); }
  function closeSearch(focus) { S.search = ''; $('#tk-search-input').value = ''; $('#tk-search-field').hidden = true; $('#tk-search-btn').hidden = false; $('#tk-search').dataset.open = 'false'; $('#tk-search-btn').setAttribute('aria-expanded', 'false'); render(); if (focus !== false) $('#tk-search-btn').focus(); }

  /* ------------------------------------------------------------------ clicks */
  const dateApply = (p, field, val) => { const t = byId(p.dataset.id); if (!t) return; const st = DP[p.id]; update(t.id, datePatch(t, field, val)); if (val && st) { st.month = val.slice(0, 7) + '-01'; if (field === 'start') st.field = 'due'; } };
  doc.addEventListener('click', (ev) => {   // capture phase below fills a popover before the library opens it
    const e = ev.target;
    const q = (s) => e.closest && e.closest(s);
    let b;

    if ((b = q('[data-pick]'))) { const p = b.closest('.gd-popover'); const t = p && byId(p.dataset.id); if (!t) return; const kind = p.dataset.kind, v = b.dataset.pick;
      if (kind === 'status') { if (t.status === 'suggested') S.goes[t.id] = v; else update(t.id, { status: v }); }
      else if (kind === 'priority') update(t.id, { priority: v === 'none' ? '' : v });
      else if (kind === 'assignee') update(t.id, { assignee: v });
      closePop(p, true); if (t.status === 'suggested') refresh(); return; }
    if (q('[data-pop-close]')) { closePop(q('.gd-popover'), true); return; }
    if (q('[data-open-notyet]')) { openNotYet(); return; }
    if (q('[data-open-settings]') || q('#tk-launch-status')) { openSettings(); return; }

    /* date picker */
    if ((b = q('[data-dp-day]'))) { const p = b.closest('.gd-popover'); const st = DP[p.id]; dateApply(p, st.field, b.dataset.dpDay); return; }
    if ((b = q('[data-dp-field]'))) { const p = b.closest('.gd-popover'); DP[p.id].field = b.dataset.dpField; fillPopover(p); const n = $('[data-dp-field="' + b.dataset.dpField + '"]', p); if (n) n.focus(); return; }
    if ((b = q('[data-dp-nav]'))) { const p = b.closest('.gd-popover'); const st = DP[p.id]; st.month = addMonths(st.month, +b.dataset.dpNav); fillPopover(p); const n = $('[data-dp-nav="' + b.dataset.dpNav + '"]', p); if (n) n.focus(); return; }
    if ((b = q('[data-dp-quick]'))) { const p = b.closest('.gd-popover'); const st = DP[p.id]; const w = b.dataset.dpQuick; const val = w === '' ? '' : parseDateText(w, S.today); dateApply(p, st.field, val); return; }

    /* filter popover */
    if ((b = q('[data-fp-field]'))) { FP.field = b.dataset.fpField; const p = $('#tk-filter-pop'); fillPopover(p); const n = $('[data-fp-field="' + FP.field + '"]', p); if (n) n.focus(); return; }
    if (q('[data-clear-filters]') && !q('[data-clear-filters]').disabled) { S.filters = []; render(); const p = $('#tk-filter-pop'); if (!p.hidden) fillPopover(p); return; }
    if (q('[data-clear-all]')) { S.filters = []; closeSearchSilently(); render(); return; }
    if ((b = q('[data-chip-x]'))) { setFilter(b.dataset.chipX, []); return; }
    if ((b = q('[data-save-view]')) && !b.disabled) { closePop($('#tk-filter-pop')); const sv = $('[data-gd-views-save]'); if (sv) sv.click(); return; }
    if ((b = q('[data-view-id]'))) { const v = viewsList().find((x) => x.id === b.dataset.viewId); if (v) { S.filters = JSON.parse(JSON.stringify(v.filters)); if (v.sort) { Object.assign(S.display, v.sort); persistDisplay(); } render(); } return; }
    if ((b = q('[data-view-del]'))) { S.custom = S.custom.filter((v) => v.id !== b.dataset.viewDel); store.set('gw-tasks-views', S.custom); render(); return; }
    if ((b = q('[data-assignee]'))) { const id = b.dataset.assignee; const f = S.filters.find((x) => x.field === 'assignee'); setFilter('assignee', f && f.values.length === 1 && f.values[0] === id ? [] : [id]); return; }
    if ((b = q('[data-nav]'))) { const v = b.dataset.nav; if (v === 'ask') openAsk({ from: b }); else setView(v); return; }
    if ((b = q('[data-lane-chip]'))) { S.lane = b.dataset.laneChip; render(); const n = $('[data-lane-chip="' + S.lane + '"]'); if (n) n.focus(); return; }
    if (q('#tk-search-btn')) { openSearch(); return; }
    if (q('[data-retry-load]')) { load(); return; }
    if (q('[data-new-task]')) { openNew(); return; }
    if ((b = q('[data-add-lane]'))) { quickAdd(b); return; }
    if ((b = q('[data-group]'))) { const k = b.dataset.group; if (S.collapsed.has(k)) S.collapsed.delete(k); else S.collapsed.add(k); render(); const n = $('[data-group="' + k + '"]'); if (n) n.focus(); return; }
    if ((b = q('[data-tl-nav]'))) { const dir = +b.dataset.tlNav; S.tl.start = dir === 0 ? mondayOf(S.today) : addDays(tlStart(), dir * (S.tl.zoom === 'week' ? 14 : 28)); render(); const n = $('[data-tl-nav="' + dir + '"]'); if (n) n.focus(); return; }
    if ((b = q('[data-inbox]'))) { S.inboxId = b.dataset.inbox; render(); return; }
    if (q('[data-inbox-undo]')) { const id = S.lastDismissed.find((x) => { const t = byId(x); return t && t.status === 'dismissed'; }); if (id) restore(id); return; }

    /* record actions */
    if ((b = q('[data-act]')) && b.dataset.id) {
      const id = b.dataset.id, t = byId(id), act = b.dataset.act;
      if (act === 'accept') { if (S.view === 'inbox') moveInboxAfter(id); doAccept(id); }
      else if (act === 'dismiss') { if (S.view === 'inbox') moveInboxAfter(id); doDismiss(id); }
      else if (act === 'restore') restore(id);
      else if (act === 'retry') update(id, { run: 'queued', runNote: '' });
      else if (act === 'resend') update(id, { run: 'queued' });
      else if (act === 'toggle' && t) update(id, { status: t.status === 'done' ? 'todo' : 'done' });
      else if (act === 'done') markDone(id);
      else if (act === 'reopen') update(id, { status: 'todo' });
      else if (act === 'delete') confirmDelete(id);
      else if (act === 'approve') { markDone(id); }
      else if (act === 'rework-open') { S.rework[id] = !S.rework[id]; syncDrawer(); const n = $('#tk-rework-note'); if (n) n.focus(); }
      else if (act === 'rework-cancel') { S.rework[id] = false; syncDrawer(); }
      else if (act === 'rework-send' && t) { const note = $('#tk-rework-note').value.trim(); if (!note) { $('#tk-rework-note').focus(); return; } S.rework[id] = false; update(id, { notes: ((t.notes ? t.notes + '\n\n' : '') + 'Rework note: ' + note).slice(0, 4000), run: 'queued' }); }
      return;
    }
    if ((b = q('[data-open]'))) { if (ev.metaKey || ev.ctrlKey) { toggleSel(b.dataset.open); return; } openTask(b.dataset.open); return; }
    if ((b = q('.gd-taskcard, .gd-tasklist__row')) && !q('button, a, input, textarea, label, .gd-pop')) { const id = b.dataset.id; if (ev.metaKey || ev.ctrlKey) toggleSel(id); else openTask(id); return; }

    /* menus on cards: the library emits gd:menu; handled below */

    /* Ask Bruce */
    if (q('#tk-launch-main')) { openAsk({ from: $('#tk-launch-main') }); return; }
    if (q('#tk-ask-close')) { closeAsk(); return; }
    if (q('#tk-ask-newchat')) { A.msgs = []; A.tags = []; A.openId = null; A.ctx = true; renderThread(); renderComposerBits(); $('#tk-ask-input').focus(); return; }
    if (q('#tk-tool-at')) { const m = A.m.mode === 'at'; if (m) closeMention(); else openMention('at', ''); $('#tk-ask-input').focus(); return; }
    if (q('#tk-tool-slash')) { const i = $('#tk-ask-input'); if (!i.value) { i.value = '/'; openMention('cmd', ''); } i.focus(); renderComposerBits(); return; }
    if (q('#tk-tool-ctx')) { A.ctx = false; A.openId = null; renderComposerBits(); $('#tk-ask-input').focus(); return; }
    if (q('#tk-ask-send')) { sendAsk(); return; }
    if ((b = q('[data-tag-x]'))) { A.tags.splice(+b.dataset.tagX, 1); renderComposerBits(); $('#tk-ask-input').focus(); return; }
    if ((b = q('[data-ask-tag]'))) { const t = byId(b.dataset.askTag); if (t) { addTag(taskTagObj(t)); $('#tk-ask-input').focus(); } return; }
    if ((b = q('[data-m-i]'))) { chooseMention(+b.dataset.mI); return; }
    if ((b = q('[data-m-tab]'))) { A.m.tab = b.dataset.mTab; A.m.sel = 0; renderMention(); $('#tk-ask-input').focus(); return; }
    if ((b = q('[data-starter]'))) { const i = $('#tk-ask-input'); i.value = b.dataset.starter; renderComposerBits(); i.focus(); return; }
    if ((b = q('[data-plan-go]'))) { const [mi, mode] = b.dataset.planGo.split(':'); approvePlan(+mi, mode); return; }
    if ((b = q('[data-plan-cancel]'))) { const m = A.msgs[+b.dataset.planCancel]; if (m && m.plan) { m.plan.state = 'cancelled'; renderThread(); } return; }
    if ((b = q('[data-plan-undo]'))) { undoPlan(+b.dataset.planUndo); return; }
    if (q('#tk-dr-ask')) { const t = byId(S.openId); if (!t) return; drawer().close(); openAsk({ from: $('#tk-launch-main') }); addTag(taskTagObj(t)); A.openId = t.id; A.ctx = true; renderComposerBits(); return; }
    // an outside click closes the tag picker
    if (A.m.mode && !q('.gd-mention') && !q('#tk-ask-input') && !q('#tk-tool-at') && !q('#tk-tool-slash')) closeMention();
  });
  // a popover's content is made when it opens, before the library shows it
  doc.addEventListener('click', (ev) => {
    const tr = ev.target.closest && ev.target.closest('[data-gd-popover]'); if (!tr) return;
    const p = doc.querySelector(tr.getAttribute('data-gd-popover')); if (p && p.hidden) { fillPopover(p); setTimeout(() => placePop(p), 0); }
  }, true);
  // start-aligned unless it would run off the screen, then end-aligned; above the trigger when there is no room below
  function placePop(p) {
    if (p.hidden) return;
    const edge = p.dataset.edge || 'start'; p.dataset.placement = 'bottom-' + edge;
    let r = p.getBoundingClientRect();
    if (edge === 'start' && r.right > innerWidth - 8) p.dataset.placement = 'bottom-end';
    r = p.getBoundingClientRect();
    const tr = p.parentElement.getBoundingClientRect();
    if (r.bottom > innerHeight - 8 && tr.top > r.height + 16) p.dataset.placement = p.dataset.placement.replace('bottom', 'top');
  }
  const closeSearchSilently = () => { S.search = ''; $('#tk-search-input').value = ''; };
  function toggleSel(id) { if (S.sel.has(id)) S.sel.delete(id); else S.sel.add(id); refresh(); }
  function moveInboxAfter(id) { const items = inboxItems(), i = items.findIndex((t) => t.id === id); const nxt = items[i + 1] || items[i - 1]; S.inboxId = nxt ? nxt.id : null; }

  /* card menu */
  doc.addEventListener('gd:menu', (ev) => {
    const card = ev.target.closest && ev.target.closest('.gd-taskcard'); if (!card) return;
    const id = card.dataset.id, v = ev.detail.value, t = byId(id); if (!t) return;
    setTimeout(() => {
      if (v === 'open') openTask(id);
      else if (v === 'accept') doAccept(id); else if (v === 'dismiss') doDismiss(id); else if (v === 'restore') restore(id);
      else if (v.startsWith('move:')) update(id, { status: v.slice(5) });
      else if (v === 'ask') { openAsk({ from: $('#tk-launch-main') }); addTag(taskTagObj(t)); }
      else if (v === 'delete') confirmDelete(id);
    }, 0);
  });

  /* value changes: seg switches, selects, toggles, checkboxes, the date words */
  doc.addEventListener('gd:change', (ev) => {
    const v = ev.detail && ev.detail.value;
    if (ev.target.id === 'tk-viewseg') setView(v);
    else if (ev.target.id === 'tk-zoom') setZoom(v);
    else if (ev.target.matches && ev.target.matches('[data-gd-select][data-key]')) {
      // later in the same turn: the library's popover closes itself when the clicked option is no longer inside it
      const k = ev.target.dataset.key; S.display[k] = v;
      if (k === 'sort') S.display.dir = v === 'created' || v === 'updated' ? 'desc' : 'asc';
      persistDisplay();
      setTimeout(() => { fillPopover($('#tk-display-pop')); render(); const n = $('#tk-display-pop .gd-select[data-key="' + k + '"] button'); if (n) n.focus(); }, 0);
    } else if (ev.target.matches && ev.target.matches('[data-disp-dir]')) { S.display.dir = v; persistDisplay(); setTimeout(() => { fillPopover($('#tk-display-pop')); render(); const n = $('#tk-display-pop [data-disp-dir] [aria-checked="true"]'); if (n) n.focus(); }, 0); }
  });
  doc.addEventListener('change', (ev) => {
    const t = ev.target;
    if (t.matches && t.matches('[data-disp-toggle]')) { S.display[t.dataset.dispToggle] = t.checked; persistDisplay(); render(); }
    else if (t.matches && t.matches('[data-fp-value]')) {
      const p = $('#tk-filter-pop'), vals = $$('[data-fp-value]', p).filter((x) => x.checked).map((x) => x.dataset.fpValue);
      const key = t.dataset.fpValue; setFilter(FP.field, vals); fillPopover(p); const n = $$('[data-fp-value]', p).find((x) => x.dataset.fpValue === key); if (n) n.focus();
    } else if (t.matches && t.matches('[data-plan-step]')) { const [mi, i] = t.dataset.planStep.split(':').map(Number); const p = A.msgs[mi].plan; p.ticked[i] = t.checked; renderThread(); const n = $('[data-plan-step="' + mi + ':' + i + '"]'); if (n) n.focus(); }
  });
  doc.addEventListener('gd:viewsave', (ev) => {
    const name = ev.detail && ev.detail.name;
    const defaultDisplay = S.display.sort === 'bruce' && S.display.group === 'due';
    if (name && (S.filters.length || !defaultDisplay)) {
      const id = Math.random().toString(36).slice(2, 8);
      S.custom.push({ id, name, filters: JSON.parse(JSON.stringify(S.filters)), sort: { sort: S.display.sort, dir: S.display.dir, group: S.display.group } });
      store.set('gw-tasks-views', S.custom);
    } else if (name) toast('Apply a filter or change the sort first, then save the view.', { type: 'info' });
    render(); const n = $('[data-view-id="c:' + (S.custom.length ? S.custom[S.custom.length - 1].id : '') + '"]'); if (n) n.focus();
  });
  doc.addEventListener('input', (ev) => {
    const t = ev.target;
    if (t.id === 'tk-search-input') { S.search = t.value; clearTimeout(t._d); t._d = setTimeout(render, 120); }
    else if (t.id === 'tk-ask-input') onComposerInput();
    else if (t.id === 'tk-notes') { clearTimeout(notesTimer); const s = $('#tk-saved'); if (s) s.textContent = ''; notesTimer = setTimeout(flushNotes, 700); }
    else if (t.matches && t.matches('[data-dp-type]')) { const h = $('[data-dp-hint]', t.closest('.gd-popover')); const v = parseDateText(t.value, S.today); t.removeAttribute('aria-invalid'); h.textContent = !t.value.trim() ? '' : v ? fmtLong(v) + ' ' + parseYmd(v).getFullYear() : 'Not a date I know yet'; }
  });
  doc.addEventListener('focusout', (ev) => {
    const t = ev.target;
    if (t.id === 'tk-notes') flushNotes();
    else if (t.id === 'tk-search-input' && !t.value && isPhone()) closeSearch(false);
    else if (t.id === 'tk-dr-title') saveTitle(t, S.openId);
    else if (t.id === 'tk-ib-title') saveTitle(t, t.dataset.id);
  });
  function saveTitle(el, id) {
    const t = byId(id); if (!t) return; const v = el.value.trim();
    if (!v) { el.value = t.title; return; }
    if (v !== t.title) update(id, { title: v });
  }

  /* ------------------------------------------------------------------ keyboard */
  const typing = () => { const a = doc.activeElement; return a && (a.matches('input, textarea, select, [contenteditable]')); };
  doc.addEventListener('keydown', (ev) => {
    const k = ev.key, mod = ev.metaKey || ev.ctrlKey;
    if (mod && k.toLowerCase() === 'k') { ev.preventDefault(); if (S.status === 'ready') toggleAsk(); return; }
    if (mod && k === '/') { ev.preventDefault(); if (S.status === 'ready' && !$('#tk-search').hidden) openSearch(); return; }

    const t = ev.target;
    // composer
    if (t.id === 'tk-ask-input') {
      const m = A.m;
      if (m.mode) {
        if (k === 'ArrowDown' || k === 'ArrowUp') { ev.preventDefault(); const n = m.items.length; if (n) { m.sel = (m.sel + (k === 'ArrowDown' ? 1 : n - 1)) % n; renderMention(); } return; }
        if (k === 'Enter' || k === 'Tab') { if (m.items.length) { ev.preventDefault(); chooseMention(m.sel); return; } }
        if (k === 'Escape') { ev.preventDefault(); ev.stopPropagation(); closeMention(); return; }
      }
      if (k === 'Enter' && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); sendAsk(); return; }
      if (k === 'Backspace' && !t.value && A.tags.length) { A.tags.pop(); renderComposerBits(); return; }
    }
    if (k === 'Escape' && askOpen() && !doc.querySelector('dialog[open]') && !doc.querySelector('.gd-popover:not([hidden])') && !(t.id === 'tk-search-input')) { ev.preventDefault(); closeAsk(); return; }
    if (k === 'Escape' && t.id === 'tk-search-input') { ev.preventDefault(); closeSearch(true); return; }
    if (k === 'Escape' && S.sel.size && !doc.querySelector('dialog[open]')) { S.sel.clear(); refresh(); return; }

    // popover rows: arrows move between rows
    if ((k === 'ArrowDown' || k === 'ArrowUp') && t.closest && t.closest('.gd-picker')) {
      const rows = $$('.gd-picker__row', t.closest('.gd-picker')), i = rows.indexOf(t); if (i < 0) return;
      ev.preventDefault(); rows[(i + (k === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length].focus(); return;
    }
    // priority menu: 0 to 4 set it
    const pp = t.closest && t.closest('.gd-popover[data-kind="priority"]');
    if (pp && /^[0-4]$/.test(k)) { const task = byId(pp.dataset.id), v = ['', 'urgent', 'high', 'med', 'low'][+k]; if (task) { update(task.id, { priority: v }); closePop(pp, true); } return; }
    // opening a popover trigger focuses its first row
    if ((k === 'ArrowDown') && t.matches && t.matches('[data-gd-popover][aria-haspopup="dialog"]')) { ev.preventDefault(); t.click(); const p = doc.querySelector(t.getAttribute('data-gd-popover')); const r = p && $('.gd-picker__row, .gd-datepick__field', p); if (r) r.focus(); return; }
    // date words: Enter applies
    if (k === 'Enter' && t.matches && t.matches('[data-dp-type]')) { ev.preventDefault(); const p = t.closest('.gd-popover'), v = parseDateText(t.value, S.today); if (v) dateApply(p, DP[p.id].field, v); else if (t.value.trim()) { t.setAttribute('aria-invalid', 'true'); } return; }
    // title fields
    if (k === 'Enter' && (t.id === 'tk-dr-title' || t.id === 'tk-ib-title')) { ev.preventDefault(); t.blur(); const n = t.id === 'tk-dr-title' ? $('#tk-dr-body [data-fk="pop:dr:status"]') : $('#tk-view [data-fk="pop:ib:status"]'); if (n) n.focus(); return; }
    if (k === 'Enter' && t.id === 'tk-new-title') return;

    // board: Alt+arrows move a card between lanes
    if (ev.altKey && (k === 'ArrowLeft' || k === 'ArrowRight') && t.matches && t.matches('.gd-taskcard__open')) {
      const id = t.dataset.open, task = byId(id), lanes = ['todo', 'doing', 'done'], i = lanes.indexOf(task && task.status);
      if (i >= 0) { const n = lanes[i + (k === 'ArrowLeft' ? -1 : 1)]; if (n) { ev.preventDefault(); update(id, { status: n }); } }
      return;
    }
    // timeline bar: arrows move it, shift resizes
    if (t.matches && t.matches('.gd-gantt__bar') && (k === 'ArrowLeft' || k === 'ArrowRight')) {
      ev.preventDefault(); const task = byId(t.dataset.id); if (!task) return; const d = k === 'ArrowLeft' ? -1 : 1, sp = span(task);
      if (ev.shiftKey && !sp.diamond) { const due = addDays(task.due, d); if (due >= task.start) update(task.id, { due }); }
      else if (sp.diamond) { const p = {}; p[sp.field] = addDays(task[sp.field], d); update(task.id, p); }
      else update(task.id, { start: addDays(task.start, d), due: addDays(task.due, d) });
      return;
    }
    // inbox
    if (S.view === 'inbox' && !typing() && !mod && !doc.querySelector('dialog[open]') && askOpen() === false) {
      const items = inboxItems(), i = items.findIndex((x) => x.id === S.inboxId);
      if (k === 'j' || k === 'ArrowDown' && !t.closest('.gd-popover')) { if (k === 'j') { ev.preventDefault(); if (items[i + 1]) { S.inboxId = items[i + 1].id; render(); } return; } }
      if (k === 'k') { ev.preventDefault(); if (items[i - 1]) { S.inboxId = items[i - 1].id; render(); } return; }
      if (k === 'a' && items[i]) { ev.preventDefault(); const id = items[i].id; moveInboxAfter(id); doAccept(id); return; }
      if (k === 'd' && items[i]) { ev.preventDefault(); const id = items[i].id; moveInboxAfter(id); doDismiss(id); return; }
    }
  });

  /* ------------------------------------------------------------------ drag: cards between lanes, tray chips onto the timeline, bars along it */
  const D = { id: null, tray: null };
  doc.addEventListener('dragstart', (ev) => {
    const card = ev.target.closest && ev.target.closest('.gd-taskcard[draggable="true"]'), chip = ev.target.closest && ev.target.closest('.gd-gantt__chip');
    if (card) { D.id = card.dataset.id; card.setAttribute('data-dragging', ''); }
    else if (chip) { D.tray = chip.dataset.id; }
    else return;
    ev.dataTransfer.effectAllowed = 'move'; try { ev.dataTransfer.setData('text/plain', D.id || D.tray); } catch (e) { /* noop */ }
  });
  const dayAt = (body, x) => { const c = $('.gd-gantt__cells', body), r = c.getBoundingClientRect(), days = tlDays(); return Math.max(0, Math.min(days - 1, Math.floor((x - r.left) / (r.width / days)))); };
  doc.addEventListener('dragover', (ev) => {
    if (D.id) { const lane = ev.target.closest && ev.target.closest('.gd-lane[data-lane]'); $$('.gd-lane[data-over]').forEach((l) => l !== lane && l.removeAttribute('data-over')); if (lane && lane.dataset.lane !== 'suggested') { ev.preventDefault(); lane.setAttribute('data-over', 'true'); } }
    else if (D.tray) { const body = ev.target.closest && ev.target.closest('.gd-gantt__body'); if (body) { ev.preventDefault(); const g = body.closest('.gd-gantt'); let d = $('.gd-gantt__drop', body); if (!d) { d = doc.createElement('div'); d.className = 'gd-gantt__drop'; d.setAttribute('aria-hidden', 'true'); body.appendChild(d); } d.style.setProperty('--gd-tl-drop', dayAt(body, ev.clientX)); g.dataset.drop = '1'; } }
  });
  doc.addEventListener('drop', (ev) => {
    if (D.id) { const lane = ev.target.closest && ev.target.closest('.gd-lane[data-lane]'); const id = D.id; clearDrag(); if (lane && lane.dataset.lane !== 'suggested') { ev.preventDefault(); const t = byId(id); if (t && t.status !== lane.dataset.lane) update(id, { status: lane.dataset.lane }); } }
    else if (D.tray) { const body = ev.target.closest && ev.target.closest('.gd-gantt__body'); const id = D.tray; clearDrag(); if (body) { ev.preventDefault(); const day = addDays(tlStart(), dayAt(body, ev.clientX)); update(id, { due: day }); } }
  });
  function clearDrag() { D.id = null; D.tray = null; $$('.gd-lane[data-over]').forEach((l) => l.removeAttribute('data-over')); $$('[data-dragging]').forEach((c) => c.removeAttribute('data-dragging')); $$('.gd-gantt__drop').forEach((d) => d.remove()); }
  doc.addEventListener('dragend', clearDrag);

  // timeline bars use pointer events so a bar can be moved and an edge can resize it
  let drag = null;
  doc.addEventListener('pointerdown', (ev) => {
    const bar = ev.target.closest && ev.target.closest('.gd-gantt__bar'); if (!bar || ev.button) return;
    const t = byId(bar.dataset.id); if (!t) return;
    const cells = bar.parentElement.getBoundingClientRect(), days = tlDays(), grip = ev.target.closest('[data-grip]');
    drag = { bar, t, x0: ev.clientX, cw: cells.width / days, mode: grip ? grip.dataset.grip : 'move', sp: span(t), moved: false, dd: 0, s0: +bar.style.getPropertyValue('--gd-tl-start'), l0: +bar.style.getPropertyValue('--gd-tl-len'), days };
    bar.setPointerCapture(ev.pointerId);
  });
  doc.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    const dx = ev.clientX - drag.x0; if (!drag.moved && Math.abs(dx) < 4) return; drag.moved = true;
    const dd = Math.round(dx / drag.cw), { bar, s0, l0 } = drag; let s = s0, l = l0;
    if (drag.mode === 'move') s = s0 + dd; else if (drag.mode === 'start') { s = Math.min(s0 + dd, s0 + l0 - 1); l = l0 - (s - s0); } else l = Math.max(1, l0 + dd);
    drag.dd = dd; bar.setAttribute('data-dragging', ''); bar.style.setProperty('--gd-tl-start', s); bar.style.setProperty('--gd-tl-len', l);
  });
  const endBarDrag = (ev, cancel) => {
    if (!drag) return; const d = drag; drag = null; d.bar.removeAttribute('data-dragging');
    if (!d.moved) { if (!cancel) openTask(d.t.id); return; }
    if (cancel || !d.dd) { render(); return; }
    const t = d.t, sp = d.sp, patch = {};
    if (sp.diamond) patch[sp.field] = addDays(sp.s, d.dd);
    else if (d.mode === 'move') { patch.start = addDays(sp.s, d.dd); patch.due = addDays(sp.e, d.dd); }
    else if (d.mode === 'start') { patch.start = addDays(sp.s, d.dd); if (patch.start > sp.e) patch.start = sp.e; }
    else { patch.due = addDays(sp.e, d.dd); if (patch.due < sp.s) patch.due = sp.s; }
    update(t.id, patch);
  };
  doc.addEventListener('pointerup', (ev) => endBarDrag(ev, false));
  doc.addEventListener('pointercancel', (ev) => endBarDrag(ev, true));

  /* ------------------------------------------------------------------ the drawer and dialogs */
  doc.addEventListener('gd:close', (ev) => {
    if (ev.target.id !== 'tk-drawer') return;
    flushNotes(); S.openId = null; S.rework = {};
    const n = $$('[data-open],[data-fk]').find((e) => fkOf(e) === openerKey && openerKey);
    if (n && n.isConnected) n.focus({ preventScroll: true });
    A.openId = A.openId && askOpen() ? A.openId : null;
  });
  $('#tk-new-form').addEventListener('submit', submitNew);
  $('#tk-ask-input').addEventListener('keyup', (ev) => { if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') onComposerInput(); });

  /* ------------------------------------------------------------------ start */
  let lastLoad = Date.now();
  async function quietReload() {
    if (S.status !== 'ready' || drag || D.id) return;
    try { const d = await request('GET'); S.tasks = d.tasks || []; S.names = d.names || {}; S.agents = d.agents || S.agents; S.ask = d.ask || S.ask; S.today = todayStr(); lastLoad = Date.now(); refresh(); $('#tk-ask-sub').textContent = askSub(); } catch (e) { /* keep what is on screen */ }
  }
  doc.addEventListener('visibilitychange', () => { if (!doc.hidden && Date.now() - lastLoad > 60000) quietReload(); });
  matchMedia('(max-width: 767px)').addEventListener('change', () => { if (isPhone() && S.view === 'timeline') S.view = 'board'; render(); });
  doc.addEventListener('DOMContentLoaded', () => load());
})();
