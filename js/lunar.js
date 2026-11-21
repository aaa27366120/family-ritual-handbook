/* 農曆與節氣換算（無外部函式庫）
 * 農曆：使用瀏覽器內建的 Intl「chinese」曆法（ICU），時區固定為台灣（UTC+8）。
 * 節氣：以太陽視黃經公式計算（誤差約數分鐘，用來判斷「哪一天」已足夠）。
 */
(function (root) {
  'use strict';
  var DAY_MS = 86400000;
  var WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  var STEMS = '甲乙丙丁戊己庚辛壬癸';
  var BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
  var ANIMALS = '鼠牛虎兔龍蛇馬羊猴雞狗豬';
  var LUNAR_MONTHS = ['', '正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
  var TERMS = {
    '春分': 0, '清明': 15, '穀雨': 30, '立夏': 45, '小滿': 60, '芒種': 75,
    '夏至': 90, '小暑': 105, '大暑': 120, '立秋': 135, '處暑': 150, '白露': 165,
    '秋分': 180, '寒露': 195, '霜降': 210, '立冬': 225, '小雪': 240, '大雪': 255,
    '冬至': 270, '小寒': 285, '大寒': 300, '立春': 315, '雨水': 330, '驚蟄': 345
  };

  /* ---------- 日期（以「自 1970-01-01 起的天數」表示一個民用日） ---------- */
  function ymdToDay(y, m, d) { return Math.round(Date.UTC(y, m - 1, d) / DAY_MS); }
  function dayToYMD(n) {
    var dt = new Date(n * DAY_MS);
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
  }
  function weekdayOf(n) { return new Date(n * DAY_MS).getUTCDay(); }

  function todayInTaipei(now) {
    now = now || new Date();
    var parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(now);
    var o = {};
    parts.forEach(function (p) { o[p.type] = p.value; });
    return ymdToDay(+o.year, +o.month, +o.day);
  }

  /* ---------- 農曆 ---------- */
  var chFmt = null, supported = false;
  try {
    chFmt = new Intl.DateTimeFormat('en-u-ca-chinese', {
      timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric'
    });
    supported = chFmt.resolvedOptions().calendar === 'chinese';
  } catch (e) { supported = false; }

  /* 修正表：瀏覽器內建農曆與台灣官方曆書不同的「月初一」。
   * 這類差異都出在新月剛好落在午夜前後幾分鐘的月份（瀏覽器算晚一天）。
   * 格式：{ y: 農曆年, m: 農曆月, date: [官方初一的國曆 年, 月, 日] }
   * 若日後發現別的差異，在這裡加一行即可。 */
  var FIXES = [
    { y: 2027, m: 1, date: [2027, 2, 6] }   // 2027 春節：官方為 2/6，瀏覽器算成 2/7
  ];
  var fixStart = new Map(); // 官方初一(day) -> {y, m}
  FIXES.forEach(function (f) { fixStart.set(ymdToDay(f.date[0], f.date[1], f.date[2]), { y: f.y, m: f.m }); });

  var lunarCache = new Map();
  function rawLunar(day) {
    var parts = chFmt.formatToParts(new Date(day * DAY_MS + 43200000));
    var m = 0, d = 0, leap = false;
    parts.forEach(function (p) {
      if (p.type === 'month') { leap = /\D/.test(p.value); m = parseInt(p.value.replace(/\D/g, ''), 10); }
      else if (p.type === 'day') { d = parseInt(p.value, 10); }
    });
    var g = dayToYMD(day);
    var y = g.y;
    if (m >= 11 && g.m <= 2) y = g.y - 1; // 農曆十一、十二月出現在國曆 1~2 月時，屬於前一個農曆年
    return { y: y, m: m, d: d, leap: leap };
  }
  function lunarOf(day) {
    var c = lunarCache.get(day);
    if (c) return c;
    c = rawLunar(day);
    // 套用修正表：官方初一 S 早於瀏覽器的初一 S+1
    if (fixStart.has(day)) {                       // S 當天：本來是上個月最後一天，改為新月初一
      var fx = fixStart.get(day);
      c = { y: fx.y, m: fx.m, d: 1, leap: false };
    } else {
      for (var k = 1; k <= 31; k++) {              // 在修正月份內的其他日子：日序 +1
        var S = day - k;
        if (fixStart.has(S)) {
          var f2 = fixStart.get(S), r = rawLunar(day);
          if (r.y === f2.y && r.m === f2.m && !r.leap) c = { y: r.y, m: r.m, d: r.d + 1, leap: false };
          break;
        }
      }
    }
    lunarCache.set(day, c);
    return c;
  }

  var yearCache = new Map();
  function lunarYearInfo(ry) {
    var info = yearCache.get(ry);
    if (info) return info;
    var byKey = new Map(), lastByMonth = {};
    var start = ymdToDay(ry, 1, 10), end = ymdToDay(ry + 1, 2, 28);
    for (var n = start; n <= end; n++) {
      var L = lunarOf(n);
      if (L.y !== ry || L.leap) continue;
      byKey.set(L.m + '-' + L.d, n);
      lastByMonth[L.m] = n;
    }
    info = { byKey: byKey, lastByMonth: lastByMonth };
    yearCache.set(ry, info);
    return info;
  }

  function lunarMonthName(m, leap) { return (leap ? '閏' : '') + LUNAR_MONTHS[m] + '月'; }
  function lunarDayName(d) {
    if (d <= 10) return '初' + '一二三四五六七八九十'[d - 1];
    if (d < 20) return '十' + '一二三四五六七八九'[d - 11];
    if (d === 20) return '二十';
    if (d < 30) return '廿' + '一二三四五六七八九'[d - 21];
    return '三十';
  }
  function fmtLunar(day) {
    var L = lunarOf(day);
    return '農曆' + lunarMonthName(L.m, L.leap) + lunarDayName(L.d);
  }
  function lunarYearName(ry) {
    var s = ((ry - 4) % 10 + 10) % 10, b = ((ry - 4) % 12 + 12) % 12;
    return STEMS[s] + BRANCHES[b] + '年（屬' + ANIMALS[b] + '）';
  }
  function fmtGreg(day) {
    var g = dayToYMD(day);
    return g.y + '年' + g.m + '月' + g.d + '日（星期' + WEEK[weekdayOf(day)] + '）';
  }
  function fmtGregNoYear(day) {
    var g = dayToYMD(day);
    return g.m + '月' + g.d + '日（星期' + WEEK[weekdayOf(day)] + '）';
  }
  function rocYear(day) { return dayToYMD(day).y - 1911; }

  /* ---------- 節氣 ---------- */
  function norm360(x) { x = x % 360; return x < 0 ? x + 360 : x; }
  function sunLongitude(jd) {
    var T = (jd - 2451545.0) / 36525;
    var L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    var M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    var Mr = M * Math.PI / 180;
    var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr) +
            (0.019993 - 0.000101 * T) * Math.sin(2 * Mr) + 0.000289 * Math.sin(3 * Mr);
    var omega = (125.04 - 1934.136 * T) * Math.PI / 180;
    return norm360(L0 + C - 0.00569 - 0.00478 * Math.sin(omega));
  }
  var termCache = new Map();
  function termDay(year, name) {
    var key = year + name;
    if (termCache.has(key)) return termCache.get(key);
    var L = TERMS[name];
    if (L === undefined) throw new Error('未知的節氣：' + name);
    var ms = Date.UTC(year, 2, 20, 12) + (L / 360) * 365.2422 * DAY_MS;
    if (ms >= Date.UTC(year + 1, 0, 1)) ms -= 365.2422 * DAY_MS;
    for (var i = 0; i < 12; i++) {
      var lon = sunLongitude(ms / DAY_MS + 2440587.5);
      var diff = ((L - lon + 540) % 360 + 360) % 360 - 180;
      ms += (diff / 0.9856473) * DAY_MS;
      if (Math.abs(diff) < 1e-7) break;
    }
    var day = Math.floor((ms + 8 * 3600000) / DAY_MS); // 換成台灣時間的日期
    termCache.set(key, day);
    return day;
  }

  /* ---------- 節日的實際日期 ---------- */
  function occurrences(f, today, defaultNotify) {
    var res = [], date = f.date, notify = defaultNotify == null ? 3 : defaultNotify;
    var g = dayToYMD(today), L = lunarOf(today);
    if (date.type === 'lunar' || date.type === 'lunarLastDay') {
      for (var ry = L.y - 1; ry <= L.y + 1; ry++) {
        var info = lunarYearInfo(ry), days = [];
        if (date.type === 'lunar') {
          var a = info.byKey.get(date.month + '-' + date.day);
          if (a != null) days.push(a);
          (date.alsoDays || []).forEach(function (dd) {
            var b = info.byKey.get(date.month + '-' + dd);
            if (b != null) days.push(b);
          });
        } else {
          var z = info.lastByMonth[date.month];
          if (z != null) days.push(z);
        }
        if (!days.length) continue;
        days.sort(function (p, q) { return p - q; });
        var n = date.notifyDaysBefore == null ? notify : date.notifyDaysBefore;
        res.push({ days: days, first: days[0], last: days[days.length - 1], showFrom: days[0] - n, anchor: null });
      }
    } else if (date.type === 'solarTerm') {
      for (var y = g.y - 1; y <= g.y + 1; y++) {
        var T = termDay(y, date.term);
        var ds = (date.offsetDays || [0]).map(function (o) { return T + o; }).sort(function (p, q) { return p - q; });
        var from = date.showFromOffsetDays == null ? -notify : date.showFromOffsetDays;
        res.push({ days: ds, first: ds[0], last: ds[ds.length - 1], showFrom: T + from, anchor: T });
      }
    }
    return res;
  }

  function status(f, today, defaultNotify) {
    var occs = occurrences(f, today, defaultNotify);
    var up = occs.filter(function (o) { return o.last >= today; })
                 .sort(function (a, b) { return a.first - b.first; })[0];
    if (!up) return null;
    var nextDay = up.days.filter(function (d) { return d >= today; })[0];
    var ry = lunarOf(today).y;
    var inYear = occs.filter(function (o) { return lunarOf(o.first).y === ry; })[0];
    return {
      occ: up, nextDay: nextDay, daysUntil: nextDay - today,
      active: up.showFrom <= today, isToday: up.days.indexOf(today) >= 0,
      lunarOrderKey: (inYear || up).first
    };
  }

  var api = {
    supported: supported, TERMS: TERMS,
    ymdToDay: ymdToDay, dayToYMD: dayToYMD, weekdayOf: weekdayOf, todayInTaipei: todayInTaipei,
    lunarOf: lunarOf, lunarYearInfo: lunarYearInfo, lunarYearName: lunarYearName,
    lunarMonthName: lunarMonthName, lunarDayName: lunarDayName,
    fmtLunar: fmtLunar, fmtGreg: fmtGreg, fmtGregNoYear: fmtGregNoYear, rocYear: rocYear,
    termDay: termDay, occurrences: occurrences, status: status
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Cal = api;
})(typeof window !== 'undefined' ? window : globalThis);
