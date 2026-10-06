/* Help center: articles with saved views, or categories, chosen by the rail (help.html?view=categories). Publish, copy and
   delete work on the sample in memory; a reload brings it back. Replace the handlers with calls to your own API. */
(function () {
  'use strict';
  var S = SUP, U = SUPUI;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var A = S.ARTICLES, view = U.param('view') === 'categories' ? 'categories' : 'articles';
  var table = $('#kb'), tview = $('#kb-view'), TONE = { Published: 'good', Draft: 'neutral', 'Needs review': 'warn' };
  var DOTS = '<svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false"><path d="M144,128a16,16,0,1,1-16-16A16,16,0,0,1,144,128ZM60,112a16,16,0,1,0,16,16A16,16,0,0,0,60,112Zm136,0a16,16,0,1,0,16,16A16,16,0,0,0,196,112Z"/></svg>';
  var dash = '<span class="gd-table__cell--muted">—</span>';
  var byId = function (id) { for (var i = 0; i < A.length; i++) if (A[i].id === id) return A[i]; };
  var day = function (t) { return S.short(t); };
  var last = [];

  /* ---- headline figures ------------------------------------------------------------------------------- */
  function cards() {
    var pub = A.filter(function (a) { return a.status === 'Published'; }), h = pub.reduce(function (t, a) { return t + a.helpful; }, 0) / (pub.length || 1), v = pub.reduce(function (t, a) { return t + a.views; }, 0);
    U.statCards($('#h-cards'), view === 'categories' ? [
      { name: 'Categories', value: S.CATEGORIES.length, meta: '<span class="gd-stat-card__compare">Each article sits in one</span>' },
      { name: 'Articles', value: A.length, meta: '<span class="gd-stat-card__compare">All statuses</span>' },
      { name: 'Views, last 30 days', value: S.nf(v), meta: '<span class="gd-stat-card__compare">Published articles</span>' },
      { name: 'Helpful', value: Math.round(h) + '%', meta: '<span class="gd-stat-card__compare">Readers who said yes</span>' }
    ] : [
      { name: 'Articles', value: A.length, meta: '<span class="gd-stat-card__compare">All statuses</span>' },
      { name: 'Published', value: pub.length, meta: '<span class="gd-stat-card__compare">Visible to customers</span>' },
      { name: 'Needs review', value: A.filter(function (a) { return a.status === 'Needs review'; }).length, meta: '<span class="gd-stat-card__compare">Waiting on an editor</span>' },
      { name: 'Helpful', value: Math.round(h) + '%', meta: '<span class="gd-stat-card__compare">Readers who said yes</span>' }
    ]);
  }

  /* ---- articles ---------------------------------------------------------------------------------------- */
  function rowHTML(a) {
    var au = S.agentById(a.author);
    return '<div class="gd-table__row" role="row" data-gd-id="' + a.id + '" data-name="' + U.esc(a.title) + '" data-status="' + a.status + '">' +
      U.cell('flex', 'title', '<span class="gd-table__who"><b class="gd-table__trunc">' + U.esc(a.title) + '</b><small>' + a.id + '</small></span>', ' title="' + U.esc(a.title) + '" data-gd-value="' + U.esc(a.title) + '"') + U.cell('', 'category', U.esc(a.category)) +
      U.cell('flex', 'status', U.badge(a.status, TONE[a.status])) + U.cell('flex', 'author', U.who(au.name), ' data-gd-value="' + U.esc(au.name) + '"') + U.cell('num', 'updated', day(a.updated), ' data-gd-value="' + a.updated + '"') +
      U.cell('num', 'views', a.views == null ? dash : S.nf(a.views), ' data-gd-value="' + (a.views == null ? '' : a.views) + '"') + U.cell('num', 'helpful', a.helpful == null ? dash : a.helpful + '%', ' data-gd-value="' + (a.helpful == null ? '' : a.helpful) + '"') +
      '<div class="gd-table__cell gd-table__cell--actions" role="cell"><button class="gd-table__more" type="button" data-gd-menu="row-menu" aria-haspopup="menu" aria-expanded="false" aria-label="Actions for ' + U.esc(a.title) + '">' + DOTS + '</button></div></div>';
  }
  var cols = [['title', 'Article', 'minmax(240px,2.2fr)'], ['category', 'Category', 'minmax(130px,1fr)'], ['status', 'Status', '120px', 'nosort'], ['author', 'Author', 'minmax(150px,1.2fr)'], ['updated', 'Updated', '100px', 'num'], ['views', 'Views', '90px', 'num'], ['helpful', 'Helpful', '90px', 'num']];
  function renderArticles() {
    table.style.cssText = '--gd-cols:' + cols.map(function (c) { return c[2]; }).join(' ') + ' 48px; --gd-table-min:940px';
    table.innerHTML = '<div class="gd-table__row gd-table__row--head" role="row">' + cols.map(function (c) { return U.th(c[0], c[1], { num: c[3] === 'num', sort: c[3] === 'nosort' ? false : undefined, sorted: c[0] === 'updated' ? 'descending' : undefined }); }).join('') + '<div class="gd-table__th" role="columnheader"><span class="gd-sr">Actions</span></div></div><div class="gd-table__body" role="rowgroup">' +
      A.slice().sort(function (a, b) { return b.updated - a.updated; }).map(rowHTML).join('') + '</div>';
    $('[data-gd-pager]').dataset.gdTotal = A.length; apply();
  }
  var viewKey = 'all';
  function apply() {
    var q = ($('[data-gd-search]').value || '').trim().toLowerCase();
    $$('[data-gd-id]', table).forEach(function (r) {
      var ok = (viewKey === 'all' || r.dataset.status === viewKey) && (!q || r.textContent.toLowerCase().indexOf(q) > -1);
      if (ok) delete r.dataset.gdOut; else r.dataset.gdOut = '';
    });
    GD.tables.refresh(table);
    var cnt = { all: A.length, Published: 0, Draft: 0, 'Needs review': 0 }; A.forEach(function (a) { cnt[a.status]++; });
    $$('#views [data-view]').forEach(function (b) { var n = $('[data-n]', b); if (n) n.textContent = cnt[b.dataset.view]; });
    $('#h-list-desc').textContent = A.length + ' articles. Edits last until you reload.';
  }
  document.addEventListener('gd:search', function () { setTimeout(apply, 0); });
  document.addEventListener('gd:tab', function (e) {
    var t = e.detail && e.detail.tab; if (!t || !t.closest || !t.closest('#views')) return;
    viewKey = t.dataset.view; $('[data-gd-pager]').dataset.gdPage = 1; apply();
  });
  document.addEventListener('gd:clear-filters', function () {
    var i = $('[data-gd-search]'); i.value = ''; $('[data-gd-search-clear]').hidden = true; viewKey = 'all';
    $$('#views [role="tab"]').forEach(function (b) { var on = b.dataset.view === 'all'; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; }); apply();
  });
  document.addEventListener('gd:export', function () {
    var rows = $$('[data-gd-id]', table).filter(function (r) { return !('gdOut' in r.dataset); }).map(function (r) { return byId(r.dataset.gdId); });
    U.csv('articles.csv', [['ID', 'Title', 'Category', 'Status', 'Author', 'Updated', 'Views', 'Helpful (%)']].concat(rows.map(function (a) { return [a.id, a.title, a.category, a.status, S.agentById(a.author).name, S.iso(a.updated).slice(0, 10), a.views == null ? '' : a.views, a.helpful == null ? '' : a.helpful]; })));
    U.toast('Export ready, ' + rows.length + (rows.length === 1 ? ' article' : ' articles'), 'success');
  });

  /* ---- row actions -------------------------------------------------------------------------------------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('.gd-table__more'); if (!t) return;
    var a = byId(t.closest('[role="row"]').dataset.gdId), l = $('[data-gd-action="toggle"] .gd-menu__text'); if (l && a) l.textContent = a.status === 'Published' ? 'Unpublish article' : 'Publish article';
  }, true);
  function refresh(a) { var old = $('[data-gd-id="' + a.id + '"]', table), tmp = document.createElement('div'); tmp.innerHTML = rowHTML(a); old.replaceWith(tmp.firstChild); cards(); apply(); }
  document.addEventListener('gd:rowaction', function (e) {
    var d = e.detail, a = byId(d.row.dataset.gdId); if (!a) return;
    if (d.action === 'toggle') {
      if (a.status === 'Published') { a.status = 'Draft'; a.views = null; a.helpful = null; } else { a.status = 'Published'; a.views = 0; a.helpful = 0; }
      a.updated = S.END; refresh(a); U.toast(a.status === 'Published' ? 'Article published' : 'Article unpublished', 'success');
    } else if (d.action === 'copy') (navigator.clipboard ? navigator.clipboard.writeText('https://help.example/' + a.id.toLowerCase()) : Promise.reject()).then(function () { U.toast('Link copied', 'success'); }, function () { U.toast('Could not copy the link', 'error'); });
    else if (d.action === 'remove') GD.confirm({ title: 'Delete "' + a.title + '"?', message: 'The article and its view history are removed. This sample stores nothing, so reloading the page brings it back.', confirmLabel: 'Delete article', danger: true }).then(function (ok) {
      if (!ok) return; var next = d.row.nextElementSibling || d.row.previousElementSibling; A.splice(A.indexOf(a), 1); d.row.remove(); $('[data-gd-pager]').dataset.gdTotal = A.length; cards(); apply(); U.toast('Article deleted', 'success');
      var f = (next && next.isConnected && $('.gd-table__more', next)) || $('[data-gd-search]'); if (f) f.focus();
    });
  });

  /* ---- new article ---------------------------------------------------------------------------------------- */
  var form = $('#na-form'), dlg = $('#new-article'), title = $('#na-title-in');
  function clear() { var f = $('#na-title-in-f'); delete f.dataset.state; $('#na-title-in-err').hidden = true; title.removeAttribute('aria-invalid'); }
  title.addEventListener('input', clear); dlg.addEventListener('close', clear);
  form.addEventListener('submit', function (e) {
    e.preventDefault(); var v = title.value.trim();
    if (!v) { var f = $('#na-title-in-f'), er = $('#na-title-in-err'); f.dataset.state = 'error'; er.textContent = 'Enter a title for the article.'; er.hidden = false; title.setAttribute('aria-invalid', 'true'); title.setAttribute('aria-describedby', 'na-title-in-err'); title.focus(); return; }
    var n = Math.max.apply(null, A.map(function (a) { return +a.id.slice(3); })) + 1;
    A.unshift({ id: 'KB-' + n, title: v, category: $('#na-cat input[type="hidden"]').value, status: 'Draft', author: 'a1', updated: S.END, views: null, helpful: null });
    dlg.close(); form.reset(); cards();
    if (view === 'articles') { renderArticles(); } else renderCategories();
    U.toast('Draft created: ' + v, 'success');
  });

  /* ---- categories ------------------------------------------------------------------------------------------- */
  function renderCategories() {
    var rows = S.CATEGORIES.map(function (c) {
      var as = A.filter(function (a) { return a.category === c; }), pub = as.filter(function (a) { return a.status === 'Published'; });
      return { name: c, n: as.length, pub: pub.length, views: pub.reduce(function (t, a) { return t + a.views; }, 0), upd: as.reduce(function (t, a) { return Math.max(t, a.updated); }, 0) };
    }).sort(function (a, b) { return b.views - a.views; });
    var host = $('#ch-views'); host.hidden = false; host.innerHTML = '';
    GD.charts.mount(host, 'hbar', { title: 'Views by category', description: 'Published articles, last 30 days', size: 'sm', card: true, items: rows.map(function (r) { return { label: r.name, value: r.views }; }) });
    var cs = [['name', 'Category', 'minmax(200px,2fr)', 'ascending'], ['n', 'Articles', '110px', 'num'], ['pub', 'Published', '110px', 'num'], ['views', 'Views', '110px', 'num'], ['upd', 'Last updated', '140px', 'num']];
    table.style.cssText = '--gd-cols:' + cs.map(function (c) { return c[2]; }).join(' ') + '; --gd-table-min:640px'; table.setAttribute('aria-label', 'Categories');
    table.innerHTML = '<div class="gd-table__row gd-table__row--head" role="row">' + cs.map(function (c) { return U.th(c[0], c[1], { num: c[3] === 'num', sorted: c[3] === 'ascending' ? 'ascending' : undefined }); }).join('') + '</div><div class="gd-table__body" role="rowgroup">' +
      rows.map(function (r) { return '<div class="gd-table__row" role="row" data-gd-id="' + U.esc(r.name) + '">' + U.cell('strong', 'name', U.esc(r.name)) + U.cell('num', 'n', r.n) + U.cell('num', 'pub', r.pub) + U.cell('num', 'views', S.nf(r.views), ' data-gd-value="' + r.views + '"') + U.cell('num', 'upd', day(r.upd), ' data-gd-value="' + r.upd + '"') + '</div>'; }).join('') + '</div>';
    $('#h-list-desc').textContent = rows.length + ' categories, most viewed first';
    $('[data-gd-pager]').dataset.gdTotal = rows.length; GD.tables.refresh(table);
  }

  /* ---- go ------------------------------------------------------------------------------------------------------ */
  function show(v) {
    view = v; cards(); var cat = view === 'categories';
    $('#views').hidden = cat; $('.gd-tbar').hidden = cat; $('[data-gd-pager]').hidden = cat; $('#ch-views').hidden = !cat;
    var s = $('[data-gd-search]'); s.value = ''; $('[data-gd-search-clear]').hidden = true; viewKey = 'all';
    $$('#views [role="tab"]').forEach(function (b) { var on = b.dataset.view === 'all'; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
    if (cat) {
      $('#h-title').textContent = 'Categories'; $('#h-desc').textContent = 'How the help center is organised and what people read. Every figure is invented sample data.'; $('#h-list-title').textContent = 'All categories';
      document.title = 'Categories - Help center - Gushwork'; renderCategories();
    } else {
      $('#h-title').textContent = 'Articles'; $('#h-desc').textContent = 'What customers can read without writing in. Every article and figure is invented sample data.'; $('#h-list-title').textContent = 'All articles';
      document.title = 'Articles - Help center - Gushwork'; renderArticles();
    }
  }
  show(U.bindTabs('view', view, 'articles', show));
})();
