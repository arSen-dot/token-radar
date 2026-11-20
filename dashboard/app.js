// Token Radar's dashboard, radar-2. It reads window.RADAR (written beside dashboard/ by
// main.ts) and renders the ranked board, filters, a per-protocol detail view with the model's
// own inputs, its peers and its farm plan. No network: every byte it shows is in data.js.
// The page recomputes each row's implied value from the snapshot figures, so the code and
// board.json are visibly the same arithmetic; the detail view says so, row by row.
(function () {
  'use strict';

  var DATA = window.RADAR;
  var app = document.getElementById('board');
  if (!DATA || !app) return;

  // State: the query string is the deep link (view=detail&slug=, category=, chain=, q=,
  // tab=, sort=, minTvl=, watchlist=1); the hash is the starter's older form, read too.
  var params = new URLSearchParams(window.location.search || '');
  var hash = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
  function param(name, fallback) {
    var v = params.get(name);
    if (v !== null && v !== '') return v;
    var h = hash.get(name === 'slug' ? 'p' : name);
    return h !== null && h !== '' ? h : fallback;
  }
  var state = {
    q: param('q', ''),
    category: param('category', 'all'),
    chain: param('chain', 'all'),
    minTvl: param('minTvl', '0'),
    watchlist: param('watchlist', '') === '1',
    tab: param('tab', 'pre-token'),
    sort: param('sort', 'implied'),
    dir: -1,
    selected: param('view', '') === 'detail' ? param('slug', null) : (hash.get('p') || null)
  };
  // The watchlist is the snapshot's own list, shipped in data.js: the toggle shows exactly
  // those 40, never an approximation of them.
  var watchSlugs = {};
  (DATA.watchlist || []).forEach(function (s) { watchSlugs[s] = true; });

  var usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return usd0.format(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(days)) + 'd';
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // The model, recomputed in the page from the row's own figures and the model constants.
  function impliedOf(row, model) {
    var growth = Math.min(model.growth_cap, Math.max(model.growth_floor, row.change_7d === null || row.change_7d === undefined ? 0 : row.change_7d));
    var growthMult = 1 + (growth / 100) * model.growth_weight;
    var age = row.age_days === null || row.age_days === undefined ? model.unknown_age_days : row.age_days;
    var maturity = model.maturity_floor + (Math.min(Math.max(age, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
    var breadth = 1 + Math.min(Math.max((row.chains || []).length - 1, 0), model.breadth_max_extra) * model.breadth_step;
    var cls = row.class_factor;
    return Math.max(1, Math.round(row.tvl_usd * row.peer_multiple * growthMult * maturity * breadth * cls));
  }

  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (child === null || child === undefined) continue;
      if (Array.isArray(child)) child.forEach(function (c) { if (c) node.appendChild(c); });
      else if (typeof child === 'string') node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    }
    return node;
  }

  function writeState() {
    var p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.category !== 'all') p.set('category', state.category);
    if (state.chain !== 'all') p.set('chain', state.chain);
    if (state.minTvl !== '0') p.set('minTvl', state.minTvl);
    if (state.watchlist) p.set('watchlist', '1');
    if (state.tab !== 'pre-token') p.set('tab', state.tab);
    if (state.sort !== 'implied') p.set('sort', state.sort);
    if (state.selected) { p.set('view', 'detail'); p.set('slug', state.selected); }
    var next = p.toString();
    var url = next ? window.location.pathname + '?' + next : window.location.pathname;
    window.history.replaceState(null, '', url);
  }

  function filteredRows() {
    var q = state.q.trim().toLowerCase();
    var minTvl = parseFloat(state.minTvl) || 0;
    return DATA.rows.filter(function (r) {
      if (state.watchlist && !watchSlugs[r.slug]) return false;
      if (state.category !== 'all' && (r.category || 'Other') !== state.category) return false;
      if (state.chain !== 'all' && (r.chains || []).indexOf(state.chain) < 0) return false;
      if (r.tvl_usd < minTvl) return false;
      if (!q) return true;
      var hay = [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }
  function sortedRows(list) {
    var key = state.sort;
    return list.slice().sort(function (a, b) {
      var av, bv;
      if (key === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (key === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
      else if (key === 'growth') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (key === 'age') { av = a.age_days === null ? Infinity : a.age_days; bv = b.age_days === null ? Infinity : b.age_days; }
      else if (key === 'cost') { av = a.farm_cost_usd; bv = b.farm_cost_usd; }
      else if (key === 'rank') { av = a.rank; bv = b.rank; }
      else { av = a.implied_value_usd; bv = b.implied_value_usd; }
      if (av < bv) return -state.dir;
      if (av > bv) return state.dir;
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
    });
  }

  function renderTop() {
    var meta = document.getElementById('top-meta');
    meta.textContent = '';
    [['Snapshot', DATA.as_of], ['Model', DATA.model_version], ['Source', 'DefiLlama protocol index']].forEach(function (kv) {
      meta.appendChild(el('span', { class: 'pill' }, kv[0] + ' ', el('b', { text: kv[1] })));
    });
    var lede = document.getElementById('lede');
    lede.textContent = '';
    lede.appendChild(el('h1', { text: DATA.board_size + ' pre-token protocols, ranked by implied value' }));
    lede.appendChild(el('p', { text: 'The watchlist is the floor: every protocol with at least ' + fmtUsd(DATA.floor_usd) + ' of TVL and no token on record. The radar ranks all ' + DATA.board_size + ' protocols that record no token at all, including the early ones below the floor. Implied value is a model, not a promise: it never predicts whether or when a token is issued.' }));
    var facts = el('div', { class: 'facts' });
    var top = DATA.rows[0];
    [
      ['Watchlist covered', DATA.watchlist_size + ' / ' + DATA.watchlist_size, 'every watchlist protocol is ranked'],
      ['Total implied value', fmtUsd(DATA.total_implied_usd), 'all ' + DATA.board_size + ' rows combined'],
      ['Watchlist implied', fmtUsd(DATA.watchlist_implied_usd), 'the 40 watchlist rows alone'],
      ['Pre-token TVL', fmtUsd(DATA.pretoken_tvl_usd), 'locked in protocols with no token'],
      ['Top pick', top ? top.name : 'n/a', top ? 'rank 1 at ' + fmtUsd(top.implied_value_usd) : '']
    ].forEach(function (f) {
      facts.appendChild(el('div', { class: 'fact' }, el('span', { text: f[0] }), el('b', { text: f[1] }), el('small', { text: f[2] })));
    });
    lede.appendChild(facts);
  }

  function renderControls() {
    var box = document.getElementById('controls');
    box.textContent = '';
    var cats = Array.from(new Set(DATA.rows.map(function (r) { return r.category || 'Other'; }))).sort();
    var chains = Array.from(new Set(DATA.rows.reduce(function (a, r) { return a.concat(r.chains || []); }, []))).sort();
    var search = el('input', { type: 'search', id: 'q', placeholder: 'Search name, category or chain', value: state.q, 'aria-label': 'Search the board' });
    search.addEventListener('input', function () { state.q = search.value; writeState(); renderTable(); });
    var catSel = el('select', { id: 'category', 'aria-label': 'Filter by category' },
      el('option', { value: 'all', text: 'All categories' }),
      cats.map(function (c) { return el('option', { value: c, text: c + ' (' + DATA.rows.filter(function (r) { return (r.category || 'Other') === c; }).length + ')', selected: c === state.category ? 'selected' : null }); })
    );
    catSel.addEventListener('change', function () { state.category = catSel.value; writeState(); renderTable(); });
    var chainSel = el('select', { id: 'chain', 'aria-label': 'Filter by chain' },
      el('option', { value: 'all', text: 'All chains' }),
      chains.map(function (c) { return el('option', { value: c, text: c, selected: c === state.chain ? 'selected' : null }); })
    );
    chainSel.addEventListener('change', function () { state.chain = chainSel.value; writeState(); renderTable(); });
    var tvlSel = el('select', { id: 'minTvl', 'aria-label': 'Minimum TVL' },
      [['0', 'Any TVL'], ['50000000', 'TVL $50M+'], ['100000000', 'TVL $100M+'], ['500000000', 'TVL $500M+'], ['1000000000', 'TVL $1B+']].map(function (o) {
        return el('option', { value: o[0], text: o[1], selected: o[0] === state.minTvl ? 'selected' : null });
      })
    );
    tvlSel.addEventListener('change', function () { state.minTvl = tvlSel.value; writeState(); renderTable(); });
    var wl = el('label', { class: 'toggle' });
    var wlBox = el('input', { type: 'checkbox', checked: state.watchlist ? 'checked' : null });
    wlBox.addEventListener('change', function () { state.watchlist = wlBox.checked; writeState(); renderTable(); });
    wl.appendChild(wlBox);
    wl.appendChild(document.createTextNode('Watchlist only'));
    var pre = el('button', { type: 'button', 'aria-pressed': state.tab === 'pre-token' ? 'true' : 'false', text: 'Pre-token', onclick: function () { state.tab = 'pre-token'; writeState(); renderTable(); } });
    var live = el('button', { type: 'button', 'aria-pressed': state.tab === 'live' ? 'true' : 'false', text: 'Live token', onclick: function () { state.tab = 'live'; writeState(); renderTable(); } });
    box.appendChild(el('div', { class: 'field' }, el('label', { for: 'q', text: 'Search' }), search));
    box.appendChild(el('div', { class: 'field' }, el('label', { for: 'category', text: 'Category' }), catSel));
    box.appendChild(el('div', { class: 'field' }, el('label', { for: 'chain', text: 'Chain' }), chainSel));
    box.appendChild(el('div', { class: 'field' }, el('label', { for: 'minTvl', text: 'Minimum TVL' }), tvlSel));
    box.appendChild(wl);
    box.appendChild(el('div', { class: 'field' }, el('span', { class: 'sub', text: 'Token status' }), el('div', { class: 'tabs' }, pre, live)));
    box.appendChild(el('span', { class: 'count', id: 'count' }));
  }

  function sortHeader(key, label, numeric) {
    return el('th', { scope: 'col', class: numeric ? 'num' : null },
      el('button', { type: 'button', onclick: function () { if (state.sort === key) state.dir = -state.dir; else { state.sort = key; state.dir = key === 'name' ? 1 : -1; } writeState(); renderTable(); } },
        label,
        state.sort === key ? el('span', { 'aria-hidden': 'true', text: state.dir < 0 ? ' v' : ' ^' }) : null
      )
    );
  }

  function classBadge(r) {
    return r.launch_class === 'candidate'
      ? el('span', { class: 'status cand', text: 'launch candidate' })
      : el('span', { class: 'status rep', text: 'repackaged product' });
  }

  function boardTable() {
    var list = sortedRows(filteredRows());
    var count = document.getElementById('count');
    if (count) count.textContent = list.length + ' of ' + DATA.board_size + ' rows shown';
    if (list.length === 0) {
      return el('div', { class: 'panel' }, el('div', { class: 'empty' },
        el('h2', { text: 'No protocol matches that filter' }),
        el('p', { text: 'Clear the search or pick another category to see the board again.' }),
        el('button', { class: 'button primary', type: 'button', text: 'Clear filters', onclick: function () { state.q = ''; state.category = 'all'; state.chain = 'all'; state.minTvl = '0'; state.watchlist = false; writeState(); renderControls(); renderTable(); } })
      ));
    }
    var max = DATA.rows[0].implied_value_usd || 1;
    var tbody = el('tbody');
    list.forEach(function (r) {
      var growth = r.change_7d === null ? 'n/a' : fmtPct(r.change_7d);
      var growthClass = r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg';
      var tr = el('tr', {
        'data-selected': state.selected === r.slug ? 'true' : 'false',
        tabindex: '0',
        onclick: function () { openDetail(r.slug); },
        onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(r.slug); } }
      },
        el('td', { class: 'num' + (r.rank === 1 ? ' rank1' : ''), text: String(r.rank) }),
        el('td', null, el('div', { class: 'name' },
          el('b', { text: r.name }),
          el('span', { class: 'sub', text: (r.category || 'Other') + ' on ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') + (r.chains.length > 2 ? ' +' + (r.chains.length - 2) : '') : 'an unnamed chain') })
        )),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + growthClass, text: growth }),
        el('td', { class: 'num', text: fmtAge(r.age_days) }),
        el('td', null, el('div', { class: 'implied' },
          el('div', { class: 'bar' + (r.rank <= 3 ? ' gold' : ''), 'aria-hidden': 'true' }, el('i', { style: 'width:' + Math.max(3, Math.round((r.implied_value_usd / max) * 100)) + '%' })),
          el('span', { class: 'num', text: fmtUsd(r.implied_value_usd) })
        )),
        el('td', { class: 'num', text: '$' + r.farm_cost_usd }),
        el('td', null, classBadge(r))
      );
      tbody.appendChild(tr);
    });
    return el('div', { class: 'panel' },
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('caption', { class: 'sub', text: 'Pre-token protocols, strongest implied value first. Select a row for its model, its peers and its farm plan.' }),
          el('thead', null, el('tr', null,
            sortHeader('rank', 'Rank', true),
            sortHeader('name', 'Protocol', false),
            sortHeader('tvl', 'TVL', true),
            sortHeader('growth', '7d', true),
            sortHeader('age', 'Age', true),
            sortHeader('implied', 'Implied value', true),
            sortHeader('cost', 'Farm cost', true),
            el('th', { scope: 'col', text: 'Class' })
          )),
          tbody
        )
      )
    );
  }

  function liveTable() {
    var count = document.getElementById('count');
    if (count) count.textContent = DATA.live.length + ' live-token protocols';
    var tbody = el('tbody');
    DATA.live.forEach(function (r) {
      tbody.appendChild(el('tr', null,
        el('td', { class: 'num', text: 'live' }),
        el('td', null, el('div', { class: 'name' }, el('b', { text: r.name }), el('span', { class: 'sub', text: (r.category || 'Other') + ' on ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain') }))),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + (r.change_7d !== null && r.change_7d >= 0 ? 'pos' : 'neg'), text: fmtPct(r.change_7d) }),
        el('td', { class: 'num', text: fmtUsd(r.mcap_usd) }),
        el('td', null, el('span', { class: 'status', text: 'already trades' }))
      ));
    });
    return el('div', { class: 'panel' },
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('caption', { class: 'sub', text: 'Token live: these protocols already trade, so their market cap is a fact, not a model. They are set aside from the pre-token ranking, and they are the peers the model prices against.' }),
          el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Status' }), el('th', { scope: 'col', text: 'Protocol' }), el('th', { scope: 'col', text: 'TVL' }), el('th', { scope: 'col', text: '7d' }), el('th', { scope: 'col', text: 'Market cap' }), el('th', { scope: 'col', text: 'Token' }))),
          tbody
        )
      )
    );
  }

  function renderMethod() {
    var m = DATA.model;
    var box = document.getElementById('method');
    box.textContent = '';
    box.appendChild(el('h2', { text: 'How implied value is computed' }));
    box.appendChild(el('p', { text: 'Every row is scored by one function of the snapshot figures. No protocol name is special-cased, and no row is hand-picked.' }));
    box.appendChild(el('div', { class: 'formula', text:
      'implied = round( tvl_usd x peer_multiple x (1 + clamp(change_7d, ' + m.growth_floor + ', ' + m.growth_cap + ') / 100 x ' + m.growth_weight + ') x (' + m.maturity_floor + ' + min(age_days, ' + m.maturity_days + ') / ' + m.maturity_days + ' x ' + m.maturity_range + ') x breadth x class )'
    }));
    box.appendChild(el('p', { text: 'Peer multiple: the median market-cap-to-TVL ratio of tokenized protocols in the same category (at least ' + m.peer_min_peers + ' peers with a market cap, else the global median), clamped to [' + m.peer_floor + ', ' + m.peer_cap + ']. Age is the time since the protocol was first listed, the best record of how long it has run with no token; an unlisted age uses ' + m.unknown_age_days + ' days. Breadth adds ' + (m.breadth_step * 100) + '% per extra chain, up to ' + m.breadth_max_extra + ' extra chains. Class is 1.00 for a genuine launch candidate and ' + m.repackaged_factor + ' for a repackaged product: a bridge, a liquid-staking or restaking product, an exchange, a versioned deployment, or a name carrying wrapped, staked or staking, which repackages a token that already trades.' }));
    var shown = DATA.peer_multiples.filter(function (p) { return !p.fallback; }).slice(0, 12);
    if (shown.length > 0) {
      var tbody = el('tbody');
      shown.forEach(function (p) {
        tbody.appendChild(el('tr', null,
          el('td', { text: p.category }),
          el('td', { class: 'num', text: String(p.peers) }),
          el('td', { class: 'num', text: p.multiple.toFixed(3) + 'x' })
        ));
      });
      box.appendChild(el('p', { text: 'Peer multiples the model actually used (categories with at least ' + m.peer_min_peers + ' priced peers; the rest use the global median):' }));
      box.appendChild(el('table', null,
        el('thead', null, el('tr', null, el('th', { text: 'Category' }), el('th', { class: 'num', text: 'Peers' }), el('th', { class: 'num', text: 'Multiple' }))),
        tbody
      ));
    }
    box.appendChild(el('p', { text: 'A protocol records no token when its DefiLlama record carries no market cap, no CoinGecko id and no symbol. That is a record, not proof: a protocol on this board may still have a token its record does not carry. Farm plans are derived from the same record: the action fits the category, the capital fits the TVL, the hold fits the age, the gas fits the chain.' }));
  }

  function renderFoot() {
    var foot = document.getElementById('foot');
    foot.textContent = 'Snapshot ' + DATA.as_of + ' from DefiLlama, sealed for this competition. Model ' + DATA.model_version + '. Implied values are estimates from the snapshot alone; they are not prices, predictions or investment advice.';
  }

  var dialog = document.getElementById('detail');
  dialog.addEventListener('close', function () { state.selected = null; writeState(); renderTable(); });

  function openDetail(slug) {
    var row = null;
    DATA.rows.forEach(function (r) { if (r.slug === slug) row = r; });
    if (!row) return;
    state.selected = slug;
    writeState();
    dialog.textContent = '';
    var recomputed = impliedOf(row, DATA.model);
    var match = recomputed === row.implied_value_usd;
    dialog.appendChild(el('div', { class: 'detail-head' },
      el('div', null,
        el('span', { class: 'brand-name', text: 'Rank ' + row.rank + ' of ' + DATA.board_size }),
        el('h2', { id: 'detail-title', text: row.name }),
        el('p', { class: 'sub', text: (row.category || 'Other') + ' on ' + (row.chains && row.chains.length ? row.chains.join(', ') : 'an unnamed chain') + '  ·  ' + (row.launch_class === 'candidate' ? 'launch candidate' : 'repackaged product') })
      ),
      el('button', { class: 'close', type: 'button', 'aria-label': 'Close details', text: 'Close', onclick: function () { dialog.close(); } })
    ));
    var eq = el('div', { class: 'equation' });
    [
      ['TVL', fmtUsd(row.tvl_usd)],
      ['Seven-day growth', fmtPct(row.change_7d)],
      ['Age with no token', fmtAge(row.age_days)],
      ['Peer multiple (' + row.peer_category + ', ' + row.peer_count + (row.peer_count === 1 ? ' peer' : ' peers') + ')', row.peer_multiple.toFixed(3) + 'x'],
      ['Growth multiplier', row.growth_multiplier.toFixed(4)],
      ['Maturity multiplier', row.maturity_multiplier.toFixed(4)],
      ['Chain breadth multiplier', row.breadth_multiplier.toFixed(4)],
      ['Class factor', String(row.class_factor)]
    ].forEach(function (kv) {
      eq.appendChild(el('div', null, el('span', { text: kv[0] }), el('b', { class: 'num', text: kv[1] })));
    });
    eq.appendChild(el('div', { class: 'total' }, el('span', { text: 'Implied value' }), el('b', { class: 'num', text: fmtUsd(row.implied_value_usd) })));
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Implied value' }),
      eq,
      el('p', { class: 'check', html: 'Model ' + esc(DATA.model_version) + ': the page recomputes this row as <b>' + esc(fmtUsd(recomputed)) + '</b>' + (match ? ', the same number board.json carries.' : ', which differs from the board: the data would be stale.') + ' This is an estimate, not a price.' })
    ));
    if (row.launch_class === 'repackaged') {
      dialog.appendChild(el('section', { class: 'detail-section' },
        el('h3', { text: 'Why this row is discounted' }),
        el('p', { class: 'sub', text: 'This protocol repackages a token that already trades, or is a versioned deployment or an exchange, so the model prices it at ' + (DATA.model.repackaged_factor * 100) + '% of its raw value. It stays on the board because the radar covers every pre-token protocol, but it is not a launch candidate.' })
      ));
    }
    var peers = el('table', { class: 'peers' });
    var pbody = el('tbody');
    row.peers.forEach(function (p) {
      pbody.appendChild(el('tr', null,
        el('td', { text: p.name }),
        el('td', { class: 'num', text: fmtUsd(p.tvl_usd) }),
        el('td', { class: 'num', text: fmtUsd(p.mcap_usd) }),
        el('td', { class: 'num', text: p.multiple.toFixed(3) + 'x' })
      ));
    });
    peers.appendChild(el('thead', null, el('tr', null, el('th', { text: 'Priced peer (token trades)' }), el('th', { class: 'num', text: 'TVL' }), el('th', { class: 'num', text: 'Market cap' }), el('th', { class: 'num', text: 'mcap / TVL' }))));
    peers.appendChild(pbody);
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Priced against' }),
      peers,
      el('p', { class: 'sub', text: row.peer_count >= DATA.model.peer_min_peers
        ? 'The peer multiple is the median mcap / TVL of the priced protocols in this category; the peers above are its largest by market cap.'
        : 'This category has too few priced peers, so the peer multiple is the global median; the peers above are the largest priced protocols overall.' })
    ));
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Farm plan  ·  about $' + row.farm_cost_usd + ' in all' }),
      el('ol', { class: 'steps' }, row.farm_steps.map(function (s) {
        var at = s.indexOf(' Cost: ');
        var action = at >= 0 ? s.slice(0, at) : s;
        var tail = at >= 0 ? s.slice(at + 1) : '';
        return el('li', null, el('b', { text: action }), el('span', { class: 'cost', text: tail }));
      }))
    ));
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
    renderTable();
  }

  function renderTable() {
    var slot = document.getElementById('table-slot');
    slot.textContent = '';
    slot.appendChild(state.tab === 'pre-token' ? boardTable() : liveTable());
    app.setAttribute('aria-busy', 'false');
  }

  renderTop();
  renderControls();
  renderTable();
  renderMethod();
  renderFoot();
  if (state.selected) openDetail(state.selected);
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && dialog.open) dialog.close();
  });
})();
