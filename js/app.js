/* 節日祭祀備忘手冊：網頁主程式 */
(function () {
  'use strict';

  var DATA = null;
  var FS_MIN = 18, FS_MAX = 48, FS_DEFAULT = 24, FS_STEP = 2;
  var state = { fs: FS_DEFAULT, sort: 'date', filter: 'all', checks: {} };
  var todayDay = 0;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------- 本機儲存（失敗也不影響使用） ---------- */
  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* 忽略 */ } }

  /* ---------- 字體大小 ---------- */
  function applyFs() {
    document.documentElement.style.setProperty('--fs', state.fs + 'px');
    var s = $('#fsRange'); if (s) s.value = state.fs;
    var l = $('#fsLabel'); if (l) l.textContent = state.fs;
  }
  function setFs(v) {
    v = Math.max(FS_MIN, Math.min(FS_MAX, Math.round(v)));
    state.fs = v; save('fs', v); applyFs();
  }

  /* ---------- 名詞解釋 ---------- */
  var termMap = {}, termRegex = null;
  function buildGlossary() {
    var terms = [];
    (DATA.glossary || []).forEach(function (g) {
      [g.term].concat(g.alias || []).forEach(function (t) { termMap[t] = g; terms.push(t); });
    });
    terms.sort(function (a, b) { return b.length - a.length; });
    termRegex = terms.length ? new RegExp('(' + terms.map(function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'g') : null;
  }
  function rich(text) {
    var h = esc(text).replace(/\n/g, '<br>');
    if (!termRegex) return h;
    return h.replace(termRegex, '<button type="button" class="term" data-term="$1">$1</button>');
  }
  function showTerm(t) {
    var g = termMap[t]; if (!g) return;
    var names = [g.term].concat(g.alias || []);
    $('#sheetBody').innerHTML = '<h3>' + esc(names.join('、')) + '</h3><p>' + esc(g.meaning) + '</p>';
    $('#sheet').hidden = false;
  }

  /* ---------- 節日狀態 ---------- */
  function notifyDays() { return (DATA.meta && DATA.meta.defaultNotifyDays) || 3; }
  function statusOf(f) {
    if (!Cal.supported) return null;
    try { return Cal.status(f, todayDay, notifyDays()); } catch (e) { return null; }
  }
  function allItems() {
    return DATA.festivals.map(function (f, i) { return { f: f, st: statusOf(f), i: i }; });
  }
  function groupsOf(f) {
    var g = [];
    (f.targets || []).forEach(function (t) {
      var k = t === '公媽' ? 'ancestor' : t === '地基主' ? 'diji' : t === '好兄弟' ? 'ghost' : t === '家中供品' ? null : 'deity';
      if (k && g.indexOf(k) < 0) g.push(k);
    });
    return g;
  }
  var FILTERS = [
    ['all', '全部'], ['deity', '神明'], ['ancestor', '公媽（祖先）'], ['diji', '地基主'], ['ghost', '好兄弟']
  ];

  function countText(st) {
    if (!st) return '';
    if (st.isToday) return '就是今天';
    if (st.daysUntil === 1) return '明天';
    return '還有 ' + st.daysUntil + ' 天';
  }
  function datesText(st) {
    var days = st.occ.days.filter(function (d) { return d >= todayDay; });
    if (!days.length) days = st.occ.days;
    return days.map(function (d) { return Cal.fmtGreg(d); }).join('\n或 ');
  }

  /* ---------- 首頁 ---------- */
  function timeStr() {
    return new Intl.DateTimeFormat('zh-TW', {
      timeZone: 'Asia/Taipei', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true
    }).format(new Date());
  }

  function dateCard() {
    var h = '<section class="card datecard" aria-label="今天的日期">';
    h += '<div class="clock" id="clock">' + esc(timeStr()) + '</div>';
    var g = Cal.dayToYMD(todayDay);
    var gShort = g.y + '/' + g.m + '/' + g.d + ' 星期' + '日一二三四五六'[Cal.weekdayOf(todayDay)];
    h += '<div class="drow"><span class="lbl">國曆</span><span>' + esc(gShort) + '</span></div>';
    if (Cal.supported) {
      var L = Cal.lunarOf(todayDay);
      h += '<div class="drow"><span class="lbl">農曆</span><span>' + esc(Cal.fmtLunar(todayDay)) + '</span></div>';
      h += '<div class="dsub">' + esc(Cal.lunarYearName(L.y)) + '　民國 ' + Cal.rocYear(todayDay) + ' 年</div>';
    } else {
      h += '<div class="warn">這個瀏覽器不支援農曆換算，請改用較新版本的 Chrome、Safari 或 Edge。</div>';
    }
    return h + '</section>';
  }

  function tagsHtml(f) {
    return (f.targets || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('');
  }

  function cardHtml(it, opts) {
    opts = opts || {};
    var f = it.f, st = it.st;
    var badge = '';
    if (st) badge = '<span class="badge' + (st.isToday ? ' today' : st.active ? ' soon' : '') + '">' + esc(countText(st)) + '</span>';
    var h = '<a class="fcard' + (f.primary ? ' primary' : '') + '" href="#/f/' + encodeURIComponent(f.id) + '">';
    h += '<div class="fc-top"><span class="fc-name">' + esc(f.name) + '</span>' + badge + '</div>';
    h += '<div class="fc-rule">' + esc(VM.ruleText(f)) + '</div>';
    if (st) h += '<div class="fc-date">國曆 ' + esc(datesText(st)).replace(/\n/g, '<br>') + '</div>';
    h += '<div class="fc-tags">' + tagsHtml(f) + '</div></a>';
    return h;
  }

  function renderHome() {
    var items = allItems();
    var h = dateCard();

    var dated = items.filter(function (x) { return x.st; });
    var nextGroup = [];
    if (dated.length) {
      var minDay = Math.min.apply(null, dated.map(function (x) { return x.st.nextDay; }));
      nextGroup = dated.filter(function (x) { return x.st.nextDay === minDay; });
      var st0 = nextGroup[0].st;
      h += '<section class="card hero" aria-label="下一個節日"><div class="hero-tag">下一個節日</div>';
      h += '<div class="hero-count">' + esc(countText(st0)) + '</div>';
      h += '<div class="hero-date">' + esc(Cal.fmtGreg(minDay)) + '　' + esc(Cal.fmtLunar(minDay)) + '</div>';
      nextGroup.forEach(function (x) {
        h += '<a class="hero-link" href="#/f/' + encodeURIComponent(x.f.id) + '">' + esc(x.f.name) + '<span aria-hidden="true"> ›</span></a>';
      });
      h += '</section>';

      var alerts = dated.filter(function (x) { return x.st.active && nextGroup.indexOf(x) < 0; })
        .sort(function (a, b) { return a.st.nextDay - b.st.nextDay; });
      if (alerts.length) {
        h += '<h2 class="sec-title">近期提醒</h2><div class="cards">';
        alerts.forEach(function (x) { h += cardHtml(x); });
        h += '</div>';
      }
    }

    h += '<h2 class="sec-title">全部節日</h2>';
    h += '<div class="chips" role="group" aria-label="依祭拜對象篩選">';
    FILTERS.forEach(function (c) {
      h += '<button type="button" class="chip" data-act="filter" data-v="' + c[0] + '" aria-pressed="' + (state.filter === c[0]) + '">' + c[1] + '</button>';
    });
    h += '</div>';
    h += '<div class="chips" role="group" aria-label="排序方式">';
    h += '<button type="button" class="chip" data-act="sort" data-v="date" aria-pressed="' + (state.sort === 'date') + '">依日期先後</button>';
    h += '<button type="button" class="chip" data-act="sort" data-v="lunar" aria-pressed="' + (state.sort === 'lunar') + '">依農曆順序</button>';
    h += '</div>';

    var list = items.filter(function (x) { return state.filter === 'all' || groupsOf(x.f).indexOf(state.filter) >= 0; });
    list.sort(function (a, b) {
      var ka = a.st ? (state.sort === 'lunar' ? a.st.lunarOrderKey : a.st.nextDay) : 1e9;
      var kb = b.st ? (state.sort === 'lunar' ? b.st.lunarOrderKey : b.st.nextDay) : 1e9;
      return ka - kb || a.i - b.i;
    });
    h += '<div class="cards">';
    list.forEach(function (x) { h += cardHtml(x); });
    h += '</div>';
    if (!list.length) h += '<p class="muted">這個分類目前沒有節日。</p>';

    h += '<section class="card tools"><h2>列印與匯出</h2>';
    h += '<p class="muted">想印成紙本給長輩，可以匯出成 Word 檔（已用大字排好），或直接列印。</p>';
    h += '<div class="btnrow"><button type="button" class="btn" data-act="export-all">匯出全部節日（Word）</button>';
    h += '<button type="button" class="btn ghost" data-act="print">列印這一頁</button></div></section>';

    h += '<p class="foot">農曆與節氣由程式自動換算，若與農民曆不同，請以農民曆與家中長輩為準。<br>內容依家中傳統整理。</p>';
    $('#app').innerHTML = h;
  }

  /* ---------- 節日內頁 ---------- */
  function blockHtml(b) {
    if (b.k === 'group') return '<h3 class="grp">' + esc(b.text) + '</h3>';
    if (b.k === 'check') {
      var on = state.checks[b.key] ? ' checked' : '';
      return '<label class="chk"><input type="checkbox" data-key="' + esc(b.key) + '"' + on + '><span class="ct">' + rich(b.text) + '</span></label>';
    }
    if (b.k === 'link') {
      return '<p class="tx"><a class="ext" href="' + esc(b.url) + '" target="_blank" rel="noopener noreferrer">' + esc(b.text) + '</a></p>';
    }
    if (b.k === 'text') {
      var t = rich(b.text);
      if (b.strike) t = '<s>' + t + '</s>';
      var cls = 'tx' + (b.important ? ' important' : '');
      return '<p class="' + cls + '">' + t + (b.remark ? '<span class="remark">（' + esc(b.remark) + '）</span>' : '') + '</p>';
    }
    if (b.k === 'step') {
      var head = '';
      if (b.time) head += '<span class="pill time">' + esc(b.time) + '</span>';
      if (b.target) head += '<span class="pill target">' + esc(b.target) + '</span>';
      var tx = rich(b.text);
      if (b.strike) tx = '<s>' + tx + '</s>';
      var h = '<div class="step"><div class="step-n" aria-hidden="true">' + b.n + '</div><div class="step-body">';
      if (head) h += '<div class="step-head">' + head + '</div>';
      h += '<p class="step-text' + (b.important ? ' important' : '') + '">' + tx + (b.remark ? '<span class="remark">（' + esc(b.remark) + '）</span>' : '') + '</p>';
      (b.children || []).forEach(function (c) { h += blockHtml(c); });
      return h + '</div></div>';
    }
    return '';
  }

  function hasChecks(vm) {
    var found = false;
    (function walk(bs) { bs.forEach(function (b) { if (b.k === 'check') found = true; if (b.children) walk(b.children); }); })(
      [].concat.apply([], vm.sections.map(function (s) { return s.blocks; })));
    return found;
  }

  function renderDetail(id) {
    var f = DATA.festivals.filter(function (x) { return x.id === id; })[0];
    if (!f) { location.hash = '#/'; return; }
    var st = statusOf(f);
    var vm = VM.build(f, { status: st });
    var h = '<div class="topnav"><a class="btn back" href="#/">‹ 回首頁</a></div>';
    h += '<article>';
    h += '<h1 class="ptitle">' + esc(f.name) + '</h1>';
    h += '<div class="fc-tags">' + tagsHtml(f) + '</div>';
    h += '<section class="card datebox">';
    vm.dateLines.forEach(function (ln, i) {
      var cls = /^就是今天/.test(ln) ? 'today-line' : /^距離今天/.test(ln) ? 'count-line' : '';
      h += '<p class="dl ' + cls + '">' + esc(ln).replace(/\n/g, '<br>') + '</p>';
    });
    if (!vm.dateLines.length) h += '<p class="dl">日期請見下方說明。</p>';
    h += '</section>';
    h += '<div class="btnrow"><button type="button" class="btn" data-act="export-one" data-id="' + esc(f.id) + '">匯出本節日（Word）</button>';
    h += '<button type="button" class="btn ghost" data-act="print">列印本頁</button></div>';

    vm.sections.forEach(function (s) {
      h += '<section class="card sec"><h2>' + esc(s.title) + '</h2>';
      s.blocks.forEach(function (b) { h += blockHtml(b); });
      h += '</section>';
    });

    if (hasChecks(vm)) {
      h += '<div class="btnrow"><button type="button" class="btn ghost" data-act="clear-checks" data-id="' + esc(f.id) + '">清除本節日的勾選</button></div>';
      h += '<p class="muted small">勾選紀錄只存在這支手機（或這台電腦）裡，每年會自動重新開始。</p>';
    }
    h += '</article>';
    h += '<div class="topnav bottom"><a class="btn back" href="#/">‹ 回首頁</a></div>';
    $('#app').innerHTML = h;
    document.title = f.name + '｜' + DATA.meta.title;
  }

  /* ---------- 路由 ---------- */
  function route() {
    if (!DATA) return;
    todayDay = Cal.todayInTaipei();
    var m = /^#\/f\/(.+)$/.exec(location.hash);
    if (m) renderDetail(decodeURIComponent(m[1]));
    else { document.title = DATA.meta.title; renderHome(); }
  }
  function routeAndTop() { route(); window.scrollTo(0, 0); }

  /* ---------- 匯出 ---------- */
  function vmFor(f) { return VM.build(f, { status: statusOf(f) }); }
  function safeName(s) { return s.replace(/[\\/:*?"<>|（）()\s]+/g, '_'); }
  function exportWord(ids) {
    var fs = ids.map(function (id) { return DATA.festivals.filter(function (x) { return x.id === id; })[0]; }).filter(Boolean);
    if (ids.length > 1) {
      fs = fs.map(function (f, i) { return { f: f, st: statusOf(f), i: i }; })
        .sort(function (a, b) { return (a.st ? a.st.lunarOrderKey : 1e9) - (b.st ? b.st.lunarOrderKey : 1e9) || a.i - b.i; })
        .map(function (x) { return x.f; });
    }
    var vms = fs.map(vmFor);
    var bytes = Docx.build(vms, {
      cover: vms.length > 1, title: DATA.meta.title,
      subtitle: '列印日期：' + Cal.fmtGreg(todayDay) + '　依農曆順序排列'
    });
    Docx.download(bytes, (vms.length > 1 ? DATA.meta.title : safeName(vms[0].name)) + '.docx');
  }

  /* ---------- 事件 ---------- */
  function onClick(e) {
    var t = e.target.closest('[data-term]');
    if (t) { showTerm(t.getAttribute('data-term')); return; }
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var act = el.getAttribute('data-act');
    if (act === 'filter') { state.filter = el.getAttribute('data-v'); renderHome(); }
    else if (act === 'sort') { state.sort = el.getAttribute('data-v'); renderHome(); }
    else if (act === 'print') window.print();
    else if (act === 'export-all') exportWord(DATA.festivals.map(function (f) { return f.id; }));
    else if (act === 'export-one') exportWord([el.getAttribute('data-id')]);
    else if (act === 'clear-checks') {
      if (!window.confirm('要清除這個節日的所有勾選嗎？')) return;
      var prefix = el.getAttribute('data-id') + ':';
      Object.keys(state.checks).forEach(function (k) { if (k.indexOf(prefix) === 0) delete state.checks[k]; });
      save('checks', state.checks); route();
    }
    else if (act === 'fs-down') setFs(state.fs - FS_STEP);
    else if (act === 'fs-up') setFs(state.fs + FS_STEP);
    else if (act === 'close-sheet') $('#sheet').hidden = true;
  }
  function onChange(e) {
    var cb = e.target.closest('input[type=checkbox][data-key]');
    if (!cb) return;
    var k = cb.getAttribute('data-key');
    if (cb.checked) state.checks[k] = 1; else delete state.checks[k];
    save('checks', state.checks);
  }

  function tick() {
    var c = $('#clock'); if (c) c.textContent = timeStr();
    if (Cal.todayInTaipei() !== todayDay) route();
  }

  function init() {
    state.fs = load('fs', FS_DEFAULT);
    state.checks = load('checks', {});
    buildGlossary();
    applyFs();
    $('#fsRange').addEventListener('input', function (e) { setFs(+e.target.value); });
    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') $('#sheet').hidden = true; });
    window.addEventListener('hashchange', routeAndTop);
    setInterval(tick, 1000);
    route();
  }

  function boot() {
    fetch('data/festivals.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) { DATA = d; init(); })
      .catch(function (err) {
        $('#app').innerHTML = '<section class="card"><h2>資料載入失敗</h2><p>請確認 data/festivals.json 存在且格式正確。若是直接用檔案開啟（網址以 file:// 開頭），請改用 GitHub Pages 的網址。</p><p class="muted small">' + esc(err && err.message || err) + '</p></section>';
      });
  }
  document.addEventListener('DOMContentLoaded', function () {
    todayDay = Cal.todayInTaipei();
    boot();
  });
})();
