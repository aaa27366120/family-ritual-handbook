/* 把一筆節日資料整理成「版面結構」，網頁與 Word 匯出共用同一份，內容才不會不一致。
 * 區塊（block）種類：
 *   group  小標題            {k:'group', text}
 *   check  可勾選項目        {k:'check', text, key}
 *   text   一般文字          {k:'text', text, strike?, remark?, important?}
 *   step   流程步驟          {k:'step', n, time?, target?, text, strike?, remark?, important?, children:[block]}
 *   link   連結              {k:'link', text, url}
 */
(function (root) {
  'use strict';
  var Cal = root.Cal || (typeof require !== 'undefined' ? require('./lunar.js') : null);

  function ruleText(f) {
    var d = f.date;
    if (d.type === 'lunar') {
      var also = d.alsoDays || [];
      var ar = d.month + '月' + d.day + also.map(function (x) { return '或' + x; }).join('') + '日';
      var kz = Cal.lunarMonthName(d.month) + Cal.lunarDayName(d.day) +
        also.map(function (x) { return '或' + Cal.lunarDayName(x); }).join('');
      return '農曆' + ar + '（' + kz + '）';
    }
    if (d.type === 'lunarLastDay') {
      var note = d.note ? d.note.replace(/^農曆年最後一天，?/, '') : '';
      return '農曆' + d.month + '月最後一天（' + Cal.lunarMonthName(d.month) + '最後一天' + (note ? '，' + note : '') + '）';
    }
    if (d.type === 'solarTerm') return d.label || (d.term + '節氣');
    return '';
  }

  function daysText(days) {
    return days.map(function (d) { return Cal.fmtGreg(d) + '\n' + Cal.fmtLunar(d); }).join('\n或 ');
  }

  function dateLines(f, st) {
    var lines = [];
    var r = ruleText(f);
    if (r) lines.push('日期規則：' + r);
    if (st) {
      var o = st.occ;
      if (f.date.type === 'solarTerm' && o.anchor != null) {
        lines.push('節氣「' + f.date.term + '」是：' + Cal.fmtGreg(o.anchor));
      }
      var label = o.days.length > 1 ? '下次祭拜日（擇一）：' : '下次祭拜日：';
      lines.push(label + '\n' + daysText(o.days));
      if (st.isToday) lines.push('就是今天！');
      else lines.push('距離今天還有 ' + st.daysUntil + ' 天');
    }
    return lines;
  }

  function build(f, ctx) {
    ctx = ctx || {};
    var st = ctx.status || null;
    var occKey = st ? st.occ.first : 0;
    var n = 0;
    function key() { return f.id + ':' + occKey + ':' + (n++); }

    function offeringBlocks(offs) {
      var out = [];
      (offs || []).forEach(function (o) {
        if (o.group && o.group !== '供品') out.push({ k: 'group', text: o.group });
        o.items.forEach(function (it) { out.push({ k: 'check', text: it, key: key() }); });
      });
      return out;
    }
    function paperBlocks(papers, withHeading) {
      var out = [], order = [], by = {};
      (papers || []).forEach(function (p) {
        var g = p.group || '';
        if (!by[g]) { by[g] = []; order.push(g); }
        by[g].push(p);
      });
      order.forEach(function (g) {
        var head = g ? g + '金紙' : (withHeading ? '金紙' : '');
        if (head) out.push({ k: 'group', text: head });
        by[g].forEach(function (p) {
          out.push({ k: 'check', text: p.name + (p.count ? '（' + p.count + '）' : ''), key: key() });
        });
      });
      return out;
    }
    function textBlocks(arr) {
      return (arr || []).map(function (x) {
        return typeof x === 'string' ? { k: 'text', text: x } :
          { k: 'text', text: x.text, strike: x.strike, remark: x.remark, important: x.important };
      });
    }

    var sections = [];
    function add(title, blocks) { if (blocks.length) sections.push({ title: title, blocks: blocks }); }

    var tb = [];
    if (f.time) tb.push({ k: 'text', text: f.time });
    if (f.earlyWindow) tb.push({ k: 'text', text: '提早祭拜：' + f.earlyWindow });
    add('祭拜時間', tb);

    add('供品清單', offeringBlocks(f.offerings));
    add('金紙', paperBlocks(f.paper, false));

    var steps = (f.steps || []).map(function (s, i) {
      var ch = offeringBlocks(s.offerings).concat(paperBlocks(s.paper, true));
      return { k: 'step', n: i + 1, time: s.time, target: s.target, text: s.text,
               strike: s.strike, remark: s.remark, important: s.important, children: ch };
    });
    add('祭拜流程', steps);

    add('擺放方式', textBlocks(f.placement));
    add('禁忌', textBlocks(f.taboos));
    add('注意事項', textBlocks(f.notes));
    add('家庭傳統', textBlocks(f.family));

    var sup = f.supplement || {}, sb = [];
    if (sup.origin) sb.push({ k: 'text', text: sup.origin });
    if (sup.wikipedia) sb.push({ k: 'link', text: '維基百科：' + f.name, url: sup.wikipedia });
    add('補充說明', sb);

    return {
      id: f.id, name: f.name, targets: f.targets || [], primary: !!f.primary,
      dateLines: dateLines(f, st), sections: sections
    };
  }

  var api = { build: build, ruleText: ruleText, dateLines: dateLines };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.VM = api;
})(typeof window !== 'undefined' ? window : globalThis);
