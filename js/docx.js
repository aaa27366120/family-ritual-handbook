/* 產生 Word（.docx）檔：自己組 XML 並打包成 zip（不壓縮），不需要任何外部函式庫。
 * 輸入是 viewmodel.js 產生的版面結構。字體為大字級（14pt），方便列印給長輩閱讀。
 */
(function (root) {
  'use strict';

  /* ---------- XML 小工具 ---------- */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function run(t, o) {
    o = o || {};
    var r = '';
    if (o.b) r += '<w:b/>';
    if (o.strike) r += '<w:strike/>';
    if (o.color) r += '<w:color w:val="' + o.color + '"/>';
    if (o.sz) r += '<w:sz w:val="' + o.sz + '"/><w:szCs w:val="' + o.sz + '"/>';
    return '<w:r>' + (r ? '<w:rPr>' + r + '</w:rPr>' : '') + '<w:t xml:space="preserve">' + esc(t) + '</w:t></w:r>';
  }
  function br() { return '<w:r><w:br/></w:r>'; }
  // 文字中的換行 → Word 換行
  function runs(t, o) {
    return String(t).split('\n').map(function (seg) { return run(seg, o); }).join(br());
  }
  function para(inner, o) {
    o = o || {};
    var p = '';
    if (o.style) p += '<w:pStyle w:val="' + o.style + '"/>';
    if (o.keepNext) p += '<w:keepNext/>';
    if (o.pageBreakBefore) p += '<w:pageBreakBefore/>';
    if (o.border) p += '<w:pBdr><w:left w:val="single" w:sz="24" w:space="8" w:color="B8892B"/></w:pBdr>';
    if (o.after != null) p += '<w:spacing w:after="' + o.after + '"/>';
    if (o.left != null) p += '<w:ind w:left="' + o.left + '"' + (o.hanging ? ' w:hanging="' + o.hanging + '"' : '') + '/>';
    return '<w:p>' + (p ? '<w:pPr>' + p + '</w:pPr>' : '') + inner + '</w:p>';
  }

  /* ---------- 版面結構 → 段落 ---------- */
  var RED = '7A1F1F', GOLD = '8A6417', GREY = '6B5446';

  function blockToXml(b, indent) {
    indent = indent || 0;
    var L = 360 + indent;
    if (b.k === 'group') {
      return para(run(b.text, { b: true, color: GOLD }), { left: L, after: 40, keepNext: true });
    }
    if (b.k === 'check') {
      return para(run('☐  ') + run(b.text), { left: L + 480, hanging: 480, after: 40 });
    }
    if (b.k === 'link') {
      return para(run(b.text) + br() + run(b.url, { color: GREY, sz: 24 }), { left: L, after: 80 });
    }
    if (b.k === 'text') {
      var x = run('•  ') + run(b.text, { strike: b.strike, b: b.important });
      if (b.remark) x += run('　（' + b.remark + '）', { color: GREY, sz: 24 });
      return para(x, { left: L + 360, hanging: 360, after: 60, border: b.important });
    }
    if (b.k === 'step') {
      var head = run(b.n + '.  ', { b: true, color: RED });
      if (b.time) head += run('【' + b.time + '】', { b: true });
      if (b.target) head += run('〔' + b.target + '〕', { b: true, color: GOLD });
      head += run(b.text, { strike: b.strike, b: b.important });
      if (b.remark) head += run('　（' + b.remark + '）', { color: GREY, sz: 24 });
      var out = para(head, { left: L + 480, hanging: 480, after: 60, keepNext: b.children && b.children.length > 0 });
      (b.children || []).forEach(function (c) { out += blockToXml(c, 480); });
      return out;
    }
    return '';
  }

  function festivalXml(vm, first) {
    var x = para(run(vm.name), { style: 'Heading1', pageBreakBefore: !first });
    (vm.dateLines || []).forEach(function (line) {
      x += para(runs(line), { after: 80 });
    });
    if (vm.targets && vm.targets.length) {
      x += para(run('祭拜對象：', { b: true }) + run(vm.targets.join('、')), { after: 80 });
    }
    vm.sections.forEach(function (s) {
      x += para(run(s.title), { style: 'Heading2' });
      s.blocks.forEach(function (b) { x += blockToXml(b); });
    });
    return x;
  }

  function documentXml(vms, opts) {
    opts = opts || {};
    var body = '';
    var firstFestival = true;
    if (opts.cover) {
      body += para(run(opts.title || '節日祭祀備忘手冊'), { style: 'Title' });
      if (opts.subtitle) body += para(run(opts.subtitle, { color: GREY }), { after: 240 });
      body += para(run('目錄', { b: true, color: RED, sz: 32 }), { after: 120 });
      vms.forEach(function (vm, i) {
        var line = (i + 1) + '.  ' + vm.name;
        body += para(run(line), { left: 360, after: 40 });
      });
      firstFestival = false; // 封面後的第一個節日也要換頁
    }
    vms.forEach(function (vm, i) {
      body += festivalXml(vm, firstFestival && i === 0);
    });
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + body +
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
      '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>' +
      '</w:body></w:document>';
  }

  var STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:docDefaults><w:rPrDefault><w:rPr>' +
    '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="標楷體" w:cs="Times New Roman"/>' +
    '<w:sz w:val="28"/><w:szCs w:val="28"/><w:lang w:val="en-US" w:eastAsia="zh-TW"/></w:rPr></w:rPrDefault>' +
    '<w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="360" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>' +
    '<w:pPr><w:spacing w:before="1200" w:after="240"/><w:jc w:val="center"/></w:pPr>' +
    '<w:rPr><w:b/><w:color w:val="7A1F1F"/><w:sz w:val="64"/><w:szCs w:val="64"/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>' +
    '<w:pPr><w:keepNext/><w:pBdr><w:bottom w:val="single" w:sz="12" w:space="4" w:color="B8892B"/></w:pBdr>' +
    '<w:spacing w:before="0" w:after="200"/><w:outlineLvl w:val="0"/></w:pPr>' +
    '<w:rPr><w:b/><w:color w:val="7A1F1F"/><w:sz w:val="44"/><w:szCs w:val="44"/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>' +
    '<w:pPr><w:keepNext/><w:spacing w:before="280" w:after="100"/><w:outlineLvl w:val="1"/></w:pPr>' +
    '<w:rPr><w:b/><w:color w:val="7A1F1F"/><w:sz w:val="34"/><w:szCs w:val="34"/></w:rPr></w:style>' +
    '</w:styles>';

  var CONTENT_TYPES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
    '</Types>';
  var ROOT_RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>';
  var DOC_RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '</Relationships>';

  /* ---------- 簡易 zip（不壓縮） ---------- */
  var crcTable = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function zip(files) {
    var enc = new TextEncoder();
    var parts = [], central = [], offset = 0;
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data);
      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
      lh.setUint16(8, 0, true); lh.setUint16(10, 0, true); lh.setUint16(12, 33, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
      lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), name, data);
      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
      ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, 0, true); ch.setUint16(14, 33, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
      ch.setUint16(28, name.length, true); ch.setUint16(30, 0, true); ch.setUint16(32, 0, true);
      ch.setUint16(34, 0, true); ch.setUint16(36, 0, true); ch.setUint32(38, 0, true); ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + data.length;
    });
    var cdSize = 0;
    central.forEach(function (c) { cdSize += c.length; });
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(4, 0, true); end.setUint16(6, 0, true);
    end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true); end.setUint16(20, 0, true);
    var all = parts.concat(central, [new Uint8Array(end.buffer)]);
    var total = 0;
    all.forEach(function (a) { total += a.length; });
    var out = new Uint8Array(total), pos = 0;
    all.forEach(function (a) { out.set(a, pos); pos += a.length; });
    return out;
  }

  function build(vms, opts) {
    return zip([
      { name: '[Content_Types].xml', text: CONTENT_TYPES },
      { name: '_rels/.rels', text: ROOT_RELS },
      { name: 'word/document.xml', text: documentXml(vms, opts) },
      { name: 'word/styles.xml', text: STYLES },
      { name: 'word/_rels/document.xml.rels', text: DOC_RELS }
    ]);
  }

  function download(bytes, filename) {
    var blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 2000);
  }

  var api = { build: build, download: download };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Docx = api;
})(typeof window !== 'undefined' ? window : globalThis);
