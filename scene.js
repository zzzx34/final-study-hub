/* ==========================================================================
   final-study-hub · scene.js
   SVG 시각 도식 엔진 — 그림으로 한눈에 읽는 인포그래픽
   ========================================================================== */
(function () {
  'use strict';

  var UID = 0;
  var P = {
    blue: '#2563eb', blueS: '#dbeafe',
    red: '#dc2626', redS: '#fee2e2',
    green: '#059669', greenS: '#d1fae5',
    amber: '#d97706', amberS: '#fef3c7',
    purple: '#7c3aed', purpleS: '#ede9fe',
    cyan: '#0891b2', cyanS: '#cffafe',
    pink: '#db2777', pinkS: '#fce7f3',
    slate: '#64748b'
  };
  var PAL = [P.blue, P.green, P.amber, P.purple, P.red, P.cyan, P.pink];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function wrap(w, h, body) {
    UID++;
    return '<svg class="scene-svg" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet" ' +
      'font-family="Pretendard Variable,Pretendard,-apple-system,system-ui,sans-serif" ' +
      'style="display:block;width:100%;height:auto">' + body + '</svg>';
  }
  function tx(x, y, size, weight, fill, anchor, s, extra) {
    return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" font-weight="' + weight +
      '" fill="' + fill + '" text-anchor="' + (anchor || 'middle') + '"' + (extra || '') + '>' + esc(s) + '</text>';
  }
  function rect(x, y, w, h, r, fill, stroke, sw, op) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + r + '" fill="' + fill + '"' +
      (stroke ? ' stroke="' + stroke + '" stroke-width="' + (sw || 1.2) + '"' : '') +
      (op != null ? ' fill-opacity="' + op + '"' : '') + '></rect>';
  }
  function line(x1, y1, x2, y2, stroke, sw, dash, marker) {
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + stroke +
      '" stroke-width="' + (sw || 1.4) + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') +
      (marker ? ' marker-end="url(#' + marker + ')"' : '') + ' stroke-linecap="round"></line>';
  }
  function defs(colors) {
    var d = '<defs>';
    d += '<marker id="ah' + UID + '" markerWidth="7" markerHeight="7" refX="5.4" refY="3.5" orient="auto">' +
      '<path d="M0,0 L0,7 L7,3.5 z" fill="' + (colors || P.slate) + '"></path></marker>';
    d += '<marker id="ahw' + UID + '" markerWidth="7" markerHeight="7" refX="5.4" refY="3.5" orient="auto">' +
      '<path d="M0,0 L0,7 L7,3.5 z" fill="#fff"></path></marker>';
    return d + '</defs>';
  }
  function arrow(x1, y1, x2, y2, color, sw, dash) {
    return line(x1, y1, x2, y2, color || P.slate, sw || 1.6, dash, 'ah' + UID);
  }
  function cut(s, n) {
    s = String(s == null ? '' : s);
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }
  function wrapText(s, n) {
    s = String(s == null ? '' : s);
    var out = [], cur = '';
    for (var i = 0; i < s.length; i++) {
      cur += s[i];
      if (cur.length >= n || s[i] === ' ') { out.push(cur.trim()); cur = ''; }
    }
    if (cur.trim()) out.push(cur.trim());
    return out.slice(0, 3);
  }
  function pol(cx, cy, r, deg) {
    var a = deg * Math.PI / 180;
    return { x: +(cx + r * Math.cos(a)).toFixed(2), y: +(cy + r * Math.sin(a)).toFixed(2) };
  }
  function arcPath(cx, cy, rOut, rIn, a0, a1) {
    var p1 = pol(cx, cy, rOut, a0), p2 = pol(cx, cy, rOut, a1);
    var p3 = pol(cx, cy, rIn, a1), p4 = pol(cx, cy, rIn, a0);
    var large = (a1 - a0) > 180 ? 1 : 0;
    return 'M' + p1.x + ' ' + p1.y + ' A' + rOut + ' ' + rOut + ' 0 ' + large + ' 1 ' + p2.x + ' ' + p2.y +
      ' L' + p3.x + ' ' + p3.y + ' A' + rIn + ' ' + rIn + ' 0 ' + large + ' 0 ' + p4.x + ' ' + p4.y + ' Z';
  }

  /* ---------------------------------------------------------------- 1. 배너 */
  /* 단원 첫 화면: 핵심 흐름 3~4칩 (텍스트 없이 아이콘 + 1단어) */
  function banner(s) {
    var nodes = s.nodes || [];
    var W = 320, H = 74, n = nodes.length || 3;
    var pad = 4, gap = 16;
    var cw = (W - pad * 2 - gap * (n - 1)) / n;
    var body = '';
    nodes.forEach(function (nd, i) {
      var x = pad + i * (cw + gap);
      var c = nd.c || PAL[i % PAL.length];
      body += rect(x, 8, cw, 58, 14, c, null, 0, 0.10);
      body += '<rect x="' + x + '" y="8" width="' + cw + '" height="58" rx="14" fill="none" stroke="' + c + '" stroke-opacity=".38" stroke-width="1.2"></rect>';
      body += tx(x + cw / 2, 36, 19, 700, 'var(--text)', 'middle', nd.i || '•');
      body += tx(x + cw / 2, 55, 10.5, 900, 'var(--text)', 'middle', cut(nd.t, 6));
      if (i < n - 1) {
        body += tx(x + cw + gap / 2, 40, 12, 900, 'var(--muted)', 'middle', '›');
      }
    });
    return wrap(W, H, body);
  }

  /* ---------------------------------------------------------------- 2. 저울 */
  function balance(s) {
    var W = 320, H = 178, cx = 160, cy = 84, half = 104;
    var deg = s.tilt != null ? s.tilt : 9;
    var rad = deg * Math.PI / 180;
    var lx = +(cx - half * Math.cos(rad)).toFixed(1), ly = +(cy - half * Math.sin(rad)).toFixed(1);
    var rx = +(cx + half * Math.cos(rad)).toFixed(1), ry = +(cy + half * Math.sin(rad)).toFixed(1);
    var b = defs();
    /* 받침대 */
    b += '<path d="M' + cx + ' ' + cy + ' L' + (cx - 26) + ' 152 L' + (cx + 26) + ' 152 Z" fill="var(--seg-bg)"></path>';
    b += rect(cx - 40, 152, 80, 7, 3.5, 'var(--seg-bg)');
    /* 기둥 */
    b += line(cx, cy, cx, 150, 'var(--muted)', 2.5);
    /* 빔 */
    b += line(lx, ly, rx, ry, 'var(--sub)', 4.5);
    b += '<circle cx="' + cx + '" cy="' + cy + '" r="5.5" fill="var(--sub)"></circle>';
    /* 접시 */
    [[lx, ly], [rx, ry]].forEach(function (p) {
      b += line(p[0], p[1], p[0], p[1] + 26, 'var(--muted)', 1.1, '2 2');
      b += '<path d="M' + (p[0] - 34) + ' ' + (p[1] + 30) + ' Q' + p[0] + ' ' + (p[1] + 44) + ' ' + (p[0] + 34) + ' ' + (p[1] + 30) + '" fill="none" stroke="var(--muted)" stroke-width="2.4" stroke-linecap="round"></path>';
    });
    /* 좌우 라벨 */
    var L = s.left || {}, R = s.right || {};
    b += tx(lx, ly - 22, 11.5, 900, L.c || P.blue, 'middle', cut(L.label || 'A', 8));
    b += tx(lx, ly - 9, 9.5, 800, 'var(--muted)', 'middle', cut(L.value || '', 12));
    b += tx(rx, ry - 22, 11.5, 900, R.c || P.red, 'middle', cut(R.label || 'B', 8));
    b += tx(rx, ry - 9, 9.5, 800, 'var(--muted)', 'middle', cut(R.value || '', 12));
    /* 무게 원 */
    b += '<circle cx="' + lx + '" cy="' + (ly + 22) + '" r="9" fill="' + (L.c || P.blue) + '" fill-opacity=".18" stroke="' + (L.c || P.blue) + '"></circle>';
    b += '<circle cx="' + rx + '" cy="' + (ry + 22) + '" r="9" fill="' + (R.c || P.red) + '" fill-opacity=".18" stroke="' + (R.c || P.red) + '"></circle>';
    if (s.center) {
      b += tx(cx, 128, 10, 900, 'var(--muted)', 'middle', cut(s.center, 16));
    }
    return wrap(W, H, b);
  }

  /* ---------------------------------------------------------------- 3. 막대 비교 */
  function bars(s) {
    var items = s.items || [];
    var max = s.max || Math.max.apply(null, items.map(function (x) { return x.v; }).concat([1])) * 1.12;
    var rowH = 29, H = 10 + items.length * rowH;
    var b = defs();
    items.forEach(function (it, i) {
      var y = 8 + i * rowH;
      var w = Math.max(8, (it.v / max) * 196);
      var c = it.c || PAL[i % PAL.length];
      b += tx(70, y + 15, 10.5, 800, 'var(--sub)', 'end', cut(it.l, 7));
      b += rect(76, y + 4, 196, 15, 7.5, 'var(--seg-bg)');
      b += '<rect x="76" y="' + (y + 4) + '" width="' + w.toFixed(1) + '" height="15" rx="7.5" fill="' + c + '" fill-opacity="' + (it.ghost ? '.4' : '.92') + '"></rect>';
      b += tx(76 + w + 6, y + 15.5, 10, 900, c, 'start', it.x != null ? it.x : it.v);
    });
    return wrap(320, H, b);
  }

  /* ---------------------------------------------------------------- 4. 삼각형 */
  function triangle(s) {
    var W = 320, H = 200;
    var A = { x: 160, y: 38 }, B = { x: 54, y: 166 }, C = { x: 266, y: 166 };
    var b = defs();
    b += '<path d="M' + A.x + ' ' + A.y + ' L' + B.x + ' ' + B.y + ' L' + C.x + ' ' + C.y + ' Z" fill="' + P.blue + '" fill-opacity=".08" stroke="' + P.blue + '" stroke-opacity=".45" stroke-width="1.6"></path>';
    [A, B, C].forEach(function (p, i) {
      var n = (s.points || [])[i] || {};
      var c = n.c || PAL[i % PAL.length];
      b += '<circle cx="' + p.x + '" cy="' + p.y + '" r="15" fill="' + c + '" fill-opacity=".16" stroke="' + c + '" stroke-width="1.4"></circle>';
      b += tx(p.x, p.y + 4, 13, 700, 'var(--text)', 'middle', n.i || '•');
    });
    var pts = s.points || [];
    if (pts[0]) {
      b += tx(160, 12, 11.5, 900, pts[0].c || P.blue, 'middle', cut(pts[0].t, 12));
      b += tx(160, 24, 9, 700, 'var(--muted)', 'middle', cut(pts[0].d || '', 20));
    }
    if (pts[1]) {
      b += tx(46, 190, 11, 900, pts[1].c || P.green, 'middle', cut(pts[1].t, 9));
      b += tx(46, 180, 8.5, 700, 'var(--muted)', 'middle', cut(pts[1].d || '', 12));
    }
    if (pts[2]) {
      b += tx(274, 190, 11, 900, pts[2].c || P.amber, 'middle', cut(pts[2].t, 9));
      b += tx(274, 180, 8.5, 700, 'var(--muted)', 'middle', cut(pts[2].d || '', 12));
    }
    if (s.center) {
      var lines = wrapText(s.center, 9);
      lines.forEach(function (l, i) {
        b += tx(160, 100 + i * 14, 11, 900, 'var(--text)', 'middle', l);
      });
    }
    return wrap(W, H, b);
  }

  /* ---------------------------------------------------------------- 5. 무역 화살표 */
  function trade(s) {
    var W = 320, H = 208;
    var b = defs();
    var L = s.left || {}, R = s.right || {};
    b += rect(8, 30, 128, 150, 14, L.c || P.blue, L.c || P.blue, 1.4, 0.07);
    b += rect(184, 30, 128, 150, 14, R.c || P.green, R.c || P.green, 1.4, 0.07);
    b += tx(72, 22, 12, 900, L.c || P.blue, 'middle', L.name || '갑국');
    b += tx(248, 22, 12, 900, R.c || P.green, 'middle', R.name || '을국');
    b += tx(72, 52, 9, 700, 'var(--muted)', 'middle', L.sub || '');
    b += tx(248, 52, 9, 700, 'var(--muted)', 'middle', R.sub || '');
    (L.chips || []).forEach(function (c, i) {
      var y = 68 + i * 32;
      b += rect(20, y, 104, 25, 8, c.hot ? (L.c || P.blue) : 'var(--card)', c.hot ? (L.c || P.blue) : 'var(--border)', 1, c.hot ? 0.9 : 1);
      b += tx(72, y + 16.5, 10, 900, c.hot ? '#fff' : 'var(--sub)', 'middle', cut(c.t, 10));
      if (c.hot) b += tx(72, y + 24, 7.5, 800, '#fff', 'middle', '★ 특화');
    });
    (R.chips || []).forEach(function (c, i) {
      var y = 68 + i * 32;
      b += rect(196, y, 104, 25, 8, c.hot ? (R.c || P.green) : 'var(--card)', c.hot ? (R.c || P.green) : 'var(--border)', 1, c.hot ? 0.9 : 1);
      b += tx(248, y + 16.5, 10, 900, c.hot ? '#fff' : 'var(--sub)', 'middle', cut(c.t, 10));
      if (c.hot) b += tx(248, y + 24, 7.5, 800, '#fff', 'middle', '★ 특화');
    });
    /* 교환 화살표 */
    b += '<path d="M140 86 C160 74 176 74 196 86" fill="none" stroke="' + P.amber + '" stroke-width="2" marker-end="url(#ah' + UID + ')"></path>';
    b += tx(168, 70, 8.5, 900, P.amber, 'middle', s.outLabel || '수출 →');
    b += '<path d="M196 140 C176 152 160 152 140 140" fill="none" stroke="' + P.amber + '" stroke-width="2" marker-end="url(#ah' + UID + ')"></path>';
    b += tx(168, 164, 8.5, 900, P.amber, 'middle', s.inLabel || '← 수입');
    if (s.center) {
      b += '<circle cx="168" cy="113" r="16" fill="var(--card)" stroke="var(--border)"></circle>';
      b += tx(168, 117, 12, 700, 'var(--text)', 'middle', s.center);
    }
    return wrap(W, H, b);
  }

  /* ---------------------------------------------------------------- 6. 관계망 */
  function net(s) {
    var W = 320;
    var hub = s.hub || {};
    var nodes = s.nodes || [];
    var cx = 160, cy = 108, R = 74;
    var H = 216;
    var b = defs();
    var pos = nodes.map(function (n, i) {
      var a = -90 + i * (360 / nodes.length);
      var p = pol(cx, cy, R, a);
      return { x: Math.max(44, Math.min(W - 44, p.x)), y: Math.max(28, Math.min(H - 42, p.y)), n: n };
    });
    pos.forEach(function (p) {
      b += line(cx, cy, p.x, p.y, 'var(--grid)', 1.3, '3 3');
    });
    pos.forEach(function (p) {
      var c = p.n.c || PAL[0];
      b += rect(p.x - 42, p.y - 15, 84, 30, 9, c, c, 1.1, 0.09);
      b += tx(p.x, p.y + 4, 9.5, 900, 'var(--text)', 'middle', cut(p.n.t, 9));
    });
    b += '<circle cx="' + cx + '" cy="' + cy + '" r="27" fill="' + (hub.c || P.blue) + '" fill-opacity=".14" stroke="' + (hub.c || P.blue) + '" stroke-width="1.6"></circle>';
    b += tx(cx, cy - 2, 15, 700, 'var(--text)', 'middle', hub.i || '🌐');
    b += tx(cx, cy + 13, 9, 900, 'var(--text)', 'middle', cut(hub.t || '', 7));
    if (s.foot) b += tx(160, 208, 9, 700, 'var(--muted)', 'middle', cut(s.foot, 30));
    return wrap(W, H, b);
  }

  /* ---------------------------------------------------------------- 7. 인구 피라미드 */
  function popPyr(s) {
    var groups = s.groups || [];
    var W = 320, midX = 160, maxW = 112;
    var rowH = 26, top = 22, H = top + groups.length * rowH + 30;
    var max = s.max || Math.max.apply(null, groups.map(function (g) { return Math.max(g.m, g.f); }).concat([1]));
    var b = defs();
    b += tx(midX - 58, 12, 8.5, 900, P.blue, 'middle', s.maleLabel || '남');
    b += tx(midX + 58, 12, 8.5, 900, P.pink, 'middle', s.femaleLabel || '여');
    groups.forEach(function (g, i) {
      var y = top + i * rowH;
      var mw = Math.max(3, (g.m / max) * maxW);
      var fw = Math.max(3, (g.f / max) * maxW);
      b += tx(midX, y + 12, 8.5, 800, 'var(--muted)', 'middle', g.age);
      b += '<rect x="' + (midX - 20 - mw) + '" y="' + y + '" width="' + mw + '" height="16" rx="3" fill="' + P.blue + '" fill-opacity=".8"></rect>';
      b += '<rect x="' + (midX + 20) + '" y="' + y + '" width="' + fw + '" height="16" rx="3" fill="' + P.pink + '" fill-opacity=".8"></rect>';
      if (g.hot) {
        b += '<rect x="' + (midX - 20 - mw) + '" y="' + y + '" width="' + mw + '" height="16" rx="3" fill="none" stroke="' + P.red + '" stroke-width="1.4"></rect>';
      }
    });
    if (s.shape) {
      b += tx(160, H - 12, 9.5, 900, 'var(--sub)', 'middle', cut(s.shape, 26));
    }
    return wrap(W, H, b);
  }

  /* ---------------------------------------------------------------- 8. 도넛 */
  function donut(s) {
    var items = s.items || [];
    var W = 320, H = 172, cx = 86, cy = 92, rOut = 62, rIn = 40;
    var total = items.reduce(function (a, x) { return a + x.v; }, 0) || 1;
    var b = defs();
    var a0 = -90;
    items.forEach(function (it, i) {
      var a1 = a0 + (it.v / total) * 360;
      var c = it.c || PAL[i % PAL.length];
      b += '<path d="' + arcPath(cx, cy, rOut, rIn, a0 + 0.6, a1 - 0.6) + '" fill="' + c + '" fill-opacity=".9"></path>';
      a0 = a1;
    });
    b += tx(cx, cy - 2, 16, 900, 'var(--text)', 'middle', s.centerV || '');
    b += tx(cx, cy + 13, 8.5, 800, 'var(--muted)', 'middle', cut(s.centerL || '', 8));
    items.forEach(function (it, i) {
      var y = 34 + i * 26;
      var c = it.c || PAL[i % PAL.length];
      b += '<rect x="172" y="' + (y - 8) + '" width="9" height="9" rx="2.5" fill="' + c + '"></rect>';
      b += tx(186, y, 10, 800, 'var(--text)', 'start', cut(it.l, 9));
      b += tx(310, y, 10, 900, c, 'end', it.x != null ? it.x : Math.round(it.v / total * 100) + '%');
    });
    return wrap(W, H, b);
  }

  /* ---------------------------------------------------------------- 9. 비커 · 이온 */
  function beaker(s) {
    var W = 320, H = 216;
    var b = defs();
    var pans = s.pans || [];
    pans.forEach(function (pan, pi) {
      var x0 = pi === 0 ? 18 : 172, w = 130, top = 46, h = 108;
      var c = pan.c || (pi === 0 ? P.red : P.green);
      /* 비커 */
      b += '<path d="M' + x0 + ' ' + top + ' L' + x0 + ' ' + (top + h - 10) + ' Q' + x0 + ' ' + (top + h) + ' ' + (x0 + 12) + ' ' + (top + h) +
        ' L' + (x0 + w - 12) + ' ' + (top + h) + ' Q' + (x0 + w) + ' ' + (top + h) + ' ' + (x0 + w) + ' ' + (top + h - 10) +
        ' L' + (x0 + w) + ' ' + top + '" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linejoin="round"></path>';
      b += '<path d="M' + (x0 + 1) + ' ' + (top + 42) + ' L' + (x0 + 1) + ' ' + (top + h - 10) + ' Q' + (x0 + 1) + ' ' + (top + h - 1) + ' ' + (x0 + 13) + ' ' + (top + h - 1) +
        ' L' + (x0 + w - 13) + ' ' + (top + h - 1) + ' Q' + (x0 + w - 1) + ' ' + (top + h - 1) + ' ' + (x0 + w - 1) + ' ' + (top + h - 10) +
        ' L' + (x0 + w - 1) + ' ' + (top + 42) + ' Z" fill="' + c + '" fill-opacity=".12"></path>';
      b += tx(x0 + w / 2, top - 10, 10.5, 900, c, 'middle', cut(pan.label || '', 10));
      (pan.ions || []).forEach(function (ion) {
        var ix = x0 + ion.x, iy = top + ion.y;
        var ic = ion.c || (ion.t.indexOf('H') === 0 ? P.red : ion.t.indexOf('OH') === 0 ? P.blue : P.slate);
        b += '<circle cx="' + ix + '" cy="' + iy + '" r="11" fill="' + ic + '" fill-opacity=".16" stroke="' + ic + '" stroke-width="1.2"></circle>';
        b += tx(ix, iy + 3.5, 8.5, 900, 'var(--text)', 'middle', ion.t);
      });
      b += tx(x0 + w / 2, top + h + 16, 9, 800, 'var(--muted)', 'middle', cut(pan.note || '', 15));
    });
    /* 가운데 화살표 */
    b += '<path d="M150 100 C158 92 162 92 170 100" fill="none" stroke="' + P.amber + '" stroke-width="2" marker-end="url(#ah' + UID + ')"></path>';
    if (s.mid) {
      b += '<circle cx="160" cy="118" r="17" fill="var(--card)" stroke="' + P.amber + '" stroke-width="1.4"></circle>';
      b += tx(160, 116, 8.5, 900, P.amber, 'middle', cut(s.mid, 4));
      b += tx(160, 126, 7.5, 800, 'var(--muted)', 'middle', cut(s.mid2 || '', 6));
    }
    if (s.tail) b += tx(160, 196, 9, 700, 'var(--muted)', 'middle', cut(s.tail, 34));
    return wrap(W, H, b);
  }

  /* ---------------------------------------------------------------- 10. pH 스펙트럼 */
  function phBar(s) {
    var W = 320, H = 128, x0 = 10, w = 300, y = 58, cell = w / 14;
    var cols = ['#e11d48', '#e11d48', '#f43f5e', '#f97316', '#fb923c', '#f59e0b', '#facc15', '#a3e635',
      '#4ade80', '#34d399', '#22d3ee', '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa'];
    var b = defs();
    for (var i = 0; i < 14; i++) {
      b += '<rect x="' + (x0 + i * cell) + '" y="' + y + '" width="' + (cell + 0.6) + '" height="22" fill="' + cols[i] + '"></rect>';
      b += tx(x0 + i * cell + cell / 2, y + 38, 8, 800, 'var(--muted)', 'middle', i);
    }
    b += rect(x0, y, w, 22, 5, 'none', 'var(--border)', 1);
    b += tx(x0 + 20, 24, 10, 900, P.red, 'middle', '산성 ↑');
    b += tx(x0 + w / 2, 24, 10, 900, 'var(--sub)', 'middle', '중성 7');
    b += tx(x0 - 6 + w, 24, 10, 900, P.purple, 'middle', '염기성 ↑');
    (s.marks || []).forEach(function (m) {
      var x = x0 + (Math.max(0, Math.min(14, m.v)) + 0.5) * cell;
      var up = m.up;
      b += '<circle cx="' + x + '" cy="' + (y + 11) + '" r="4" fill="#fff" stroke="var(--text)" stroke-width="1.4"></circle>';
      b += line(x, up ? y - 2 : y + 24, x, up ? y - 12 : y + 40, 'var(--text)', 1, '2 2');
      b += tx(x, up ? y - 17 : y + 52, 9, 900, 'var(--text)', 'middle', cut(m.l, 9));
      if (m.d) b += tx(x, up ? y - 27 : y + 62, 7.5, 700, 'var(--muted)', 'middle', cut(m.d, 6));
    });
    return wrap(W, H, b);
  }

  /* ---------------------------------------------------------------- 11. 반응 에너지 곡선 */
  function energyProfile(s) {
    var W = 320, H = 190, x0 = 34, x1 = 286, yBase = 160, yTop = 26;
    var yR = s.endothermic ? yBase - 34 : yBase - 84;
    var yP = s.endothermic ? yBase - 92 : yBase - 30;
    var yPeak = yTop + (s.peak != null ? s.peak : 18);
    var b = defs();
    b += line(x0, yTop, x0, yBase, 'var(--muted)', 1.2);
    b += line(x0, yBase, x1, yBase, 'var(--muted)', 1.2);
    b += tx(x0 - 6, yTop + 4, 7.5, 800, 'var(--muted)', 'end', 'E');
    b += tx(x1, yBase + 14, 8, 800, 'var(--muted)', 'middle', '반응 진행 →');
    /* 수평선 */
    b += line(x0 + 6, yR, 132, yR, P.blue, 1.2, '4 3');
    b += line(196, yP, x1 - 8, yP, P.green, 1.2, '4 3');
    /* 곡선 */
    b += '<path d="M' + (x0 + 6) + ' ' + yR + ' C' + (x0 + 52) + ' ' + yR + ' ' + (x0 + 74) + ' ' + yPeak + ' 160 ' + yPeak +
      ' C' + (230) + ' ' + yPeak + ' ' + (240) + ' ' + yP + ' ' + (x1 - 8) + ' ' + yP + '" fill="none" stroke="' + (s.endothermic ? P.purple : P.red) + '" stroke-width="2.6" stroke-linecap="round"></path>';
    b += tx(60, yR - 7, 9, 900, P.blue, 'middle', '반응물');
    b += tx(252, yP + (s.endothermic ? 14 : 15), 9, 900, P.green, 'middle', '생성물');
    /* 활성화 에너지 */
    var xa = 160;
    b += line(xa, yPeak - 4, xa, yR, P.amber, 1.2, '3 2');
    b += line(xa - 4, yPeak - 4, xa + 4, yPeak - 4, P.amber, 1.2);
    b += tx(xa + 5, (yPeak + yR) / 2, 8.5, 900, P.amber, 'start', '활성화 E');
    /* 반응열 화살표 */
    var xd = 296;
    b += line(xd, yR, xd, yP, s.endothermic ? P.purple : P.red, 2, null);
    b += tx(312, (yR + yP) / 2 + 3, 8.5, 900, s.endothermic ? P.purple : P.red, 'middle', s.delta || 'ΔE');
    b += tx(160, 12, 11, 900, s.endothermic ? P.purple : P.red, 'middle', s.title2 || (s.endothermic ? '흡열 반응' : '발열 반응'));
    return wrap(W, H, b);
  }

  /* ---------------------------------------------------------------- 12. 먹이 사슬 */
  function foodChain(s) {
    var items = s.items || [];
    var W = 320, H = 132, n = items.length, cw = (W - 8 - (n - 1) * 14) / n;
    var b = defs();
    items.forEach(function (it, i) {
      var x = 4 + i * (cw + 14);
      var c = it.c || PAL[i % PAL.length];
      b += rect(x, 12, cw, 58, 12, c, c, 1, 0.08);
      b += tx(x + cw / 2, 44, 20, 700, 'var(--text)', 'middle', it.i || '•');
      b += tx(x + cw / 2, 62, 9.5, 900, 'var(--text)', 'middle', cut(it.t, 5));
      if (i < n - 1) {
        b += '<path d="M' + (x + cw + 1) + ' 41 L' + (x + cw + 12) + ' 41" stroke="' + P.amber + '" stroke-width="2" marker-end="url(#ah' + UID + ')"></path>';
      }
    });
    if (s.foot) {
      b += tx(160, 92, 9.5, 800, 'var(--muted)', 'middle', cut(s.foot, 30));
      b += tx(160, 108, 9.5, 900, P.amber, 'middle', cut(s.foot2 || '', 30));
    }
    return wrap(W, H, b);
  }

  /* ---------------------------------------------------------------- 13. 에너지 피라미드 */
  function energyPyr(s) {
    var layers = s.layers || [];
    var W = 320, H = 214;
    var b = defs();
    var n = layers.length;
    var baseW = 196, topW = 62, lh = 34, top = 26;
    layers.forEach(function (l, i) {
      var f = i / Math.max(1, n - 1);
      var w1 = baseW - (baseW - topW) * f;
      var w2 = baseW - (baseW - topW) * ((i + 1) / Math.max(1, n - 1));
      var y = top + i * lh;
      var c = l.c || PAL[i % PAL.length];
      b += '<path d="M' + (160 - w1 / 2) + ' ' + y + ' L' + (160 + w1 / 2) + ' ' + y + ' L' + (160 + w2 / 2) + ' ' + (y + lh - 2) + ' L' + (160 - w2 / 2) + ' ' + (y + lh - 2) + ' Z" fill="' + c + '" fill-opacity=".28" stroke="' + c + '" stroke-width="1.3"></path>';
      b += tx(160, y + 21, 9.5, 900, 'var(--text)', 'middle', cut(l.t, 8));
      b += tx(312, y + 21, 10, 900, c, 'end', l.v || '');
    });
    b += '<path d="M24 180 L24 58" stroke="' + P.amber + '" stroke-width="1.8" marker-end="url(#ah' + UID + ')"></path>';
    b += tx(14, 120, 8.5, 900, P.amber, 'middle', '10%');
    b += tx(14, 132, 8.5, 900, P.amber, 'middle', '전달');
    if (s.foot) b += tx(160, 204, 9, 800, 'var(--muted)', 'middle', cut(s.foot, 32));
    return wrap(W, H, b);
  }

  /* ---------------------------------------------------------------- 14. 탄소 순환 */
  function carbonCycle(s) {
    var nodes = s.nodes || [];
    var W = 320, H = 232, cx = 160, cy = 110, R = 74;
    var b = defs();
    var pos = nodes.map(function (n, i) {
      var a = -90 + i * (360 / nodes.length);
      return { x: cx + R * Math.cos(a * Math.PI / 180), y: cy + R * Math.sin(a * Math.PI / 180), n: n };
    });
    pos.forEach(function (p, i) {
      var q = pos[(i + 1) % pos.length];
      var mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
      b += '<path d="M' + p.x + ' ' + p.y + ' Q' + mx + ' ' + my + ' ' + q.x + ' ' + q.y + '" fill="none" stroke="' + P.green + '" stroke-opacity=".45" stroke-width="1.6" marker-end="url(#ah' + UID + ')"></path>';
    });
    pos.forEach(function (p) {
      var c = p.n.c || P.green;
      b += rect(p.x - 40, p.y - 14, 80, 28, 9, c, c, 1, 0.12);
      b += tx(p.x, p.y + 3.5, 9, 900, 'var(--text)', 'middle', cut(p.n.t, 9));
    });
    b += '<circle cx="' + cx + '" cy="' + cy + '" r="26" fill="var(--card)" stroke="var(--border)"></circle>';
    b += tx(cx, cy - 2, 13, 700, 'var(--text)', 'middle', '♻️');
    b += tx(cx, cy + 13, 8.5, 900, 'var(--muted)', 'middle', cut(s.center || '탄소 순환', 6));
    return wrap(W, H, b);
  }

  /* ---------------------------------------------------------------- 15. 에너지 변환 흐름 */
  function flowChain(s) {
    var steps = s.steps || [];
    var W = 320, n = steps.length, gap = 12;
    var cw = (W - 8 - gap * (n - 1)) / n;
    var H = 118;
    var b = defs();
    steps.forEach(function (st, i) {
      var x = 4 + i * (cw + gap);
      var c = st.c || PAL[i % PAL.length];
      b += rect(x, 10, cw, 66, 12, c, c, 1.1, 0.08);
      b += tx(x + cw / 2, 36, 17, 700, 'var(--text)', 'middle', st.i || '•');
      b += tx(x + cw / 2, 54, 9.5, 900, 'var(--text)', 'middle', cut(st.t, 6));
      if (st.d) b += tx(x + cw / 2, 68, 8, 800, 'var(--muted)', 'middle', cut(st.d, 7));
      if (i < n - 1) {
        b += '<path d="M' + (x + cw + 1) + ' 43 L' + (x + cw + gap - 2) + ' 43" stroke="' + P.amber + '" stroke-width="1.8" marker-end="url(#ah' + UID + ')"></path>';
      }
      if (st.loss) {
        b += tx(x + cw / 2, 94, 8.5, 900, P.red, 'middle', st.loss);
      }
    });
    if (s.foot) b += tx(160, 110, 8.5, 800, 'var(--muted)', 'middle', cut(s.foot, 34));
    return wrap(W, H, b);
  }

  /* ---------------------------------------------------------------- 16. 발전기 */
  function generator(s) {
    var W = 320, H = 196;
    var b = defs();
    /* 자석 */
    b += rect(22, 40, 40, 100, 8, P.red, P.red, 1.2, 0.18);
    b += tx(42, 88, 13, 900, P.red, 'middle', 'N');
    b += tx(42, 106, 8, 800, 'var(--muted)', 'middle', '자석');
    b += rect(258, 40, 40, 100, 8, P.blue, P.blue, 1.2, 0.18);
    b += tx(278, 88, 13, 900, P.blue, 'middle', 'S');
    b += tx(278, 106, 8, 800, 'var(--muted)', 'middle', '자석');
    /* 코일 */
    var coil = '';
    for (var i = 0; i < 6; i++) {
      var cx = 118 + i * 15;
      coil += '<ellipse cx="' + cx + '" cy="90" rx="6" ry="34" fill="none" stroke="' + P.amber + '" stroke-width="2"></ellipse>';
    }
    b += coil;
    b += tx(160, 36, 9, 900, P.amber, 'middle', '코일');
    /* 운동 화살표 */
    b += '<path d="M96 154 L128 154" stroke="' + P.green + '" stroke-width="2" marker-end="url(#ah' + UID + ')"></path>';
    b += '<path d="M224 154 L192 154" stroke="' + P.green + '" stroke-width="2" marker-end="url(#ah' + UID + ')"></path>';
    b += tx(160, 158, 8.5, 900, P.green, 'middle', '← 자석·코일 상대 운동 →');
    /* 전류 */
    b += '<path d="M160 124 L160 168 L214 168" fill="none" stroke="' + P.slate + '" stroke-width="1.6"></path>';
    b += '<circle cx="228" cy="168" r="13" fill="var(--card)" stroke="' + P.slate + '" stroke-width="1.4"></circle>';
    b += tx(228, 172, 9, 900, P.slate, 'middle', 'A');
    b += '<path d="M160 124 L160 132" stroke="' + P.slate + '" stroke-width="1.6"></path>';
    b += tx(160, 186, 8.5, 900, P.blue, 'middle', s.label || '자기장 변화 → 유도 전류');
    return wrap(W, H, b);
  }

  /* ---------------------------------------------------------------- 17. 타임라인 */
  function timeline(s) {
    var items = s.items || [];
    var W = 320, rowH = s.compact ? 34 : 42, top = 14;
    var H = top + items.length * rowH + 6;
    var b = defs();
    b += line(58, top + 6, 58, top + items.length * rowH - 12, 'var(--grid)', 2);
    items.forEach(function (it, i) {
      var y = top + i * rowH;
      var c = it.c || PAL[i % PAL.length];
      b += '<circle cx="58" cy="' + (y + 8) + '" r="10" fill="' + c + '" fill-opacity=".18" stroke="' + c + '" stroke-width="1.4"></circle>';
      b += tx(58, y + 12, 11, 700, 'var(--text)', 'middle', it.i || '•');
      b += tx(46, y + 12, 8.5, 900, c, 'end', it.when);
      b += tx(74, y + 8, 10.5, 900, 'var(--text)', 'start', cut(it.t, 17));
      if (it.d) b += tx(74, y + 21, 8.5, 700, 'var(--muted)', 'start', cut(it.d, 26));
    });
    return wrap(W, H, b);
  }

  /* ---------------------------------------------------------------- 18. 단계 노드 */
  function nodes(s) {
    var steps = s.steps || [];
    var W = 320, rowH = 46, top = 10;
    var H = top + steps.length * rowH + 6;
    var b = defs();
    steps.forEach(function (st, i) {
      var y = top + i * rowH;
      var c = st.c || PAL[i % PAL.length];
      b += rect(10, y, 300, 36, 11, 'var(--card)', 'var(--border)', 1);
      b += '<circle cx="32" cy="' + (y + 18) + '" r="11" fill="' + c + '" fill-opacity=".18" stroke="' + c + '" stroke-width="1.3"></circle>';
      b += tx(32, y + 22, 10, 900, c, 'middle', st.i || String(i + 1));
      b += tx(50, y + 16, 10.5, 900, 'var(--text)', 'start', cut(st.t, 16));
      if (st.d) b += tx(50, y + 29, 8.5, 700, 'var(--muted)', 'start', cut(st.d, 30));
      if (i < steps.length - 1) {
        b += '<path d="M32 ' + (y + 38) + ' L32 ' + (y + rowH + 2) + '" stroke="' + c + '" stroke-width="1.6" marker-end="url(#ah' + UID + ')"></path>';
      }
    });
    return wrap(W, H, b);
  }

  /* ---------------------------------------------------------------- 19. 중세국어 대응 */
  function glossMatch(s) {
    var rows = s.rows || [];
    var W = 320, rowH = 38, top = 26;
    var H = top + rows.length * rowH + 6;
    var b = defs();
    b += tx(78, 14, 9, 900, P.purple, 'middle', s.leftLabel || '중세국어');
    b += tx(242, 14, 9, 900, P.green, 'middle', s.rightLabel || '현대어');
    rows.forEach(function (r, i) {
      var y = top + i * rowH;
      b += rect(8, y, 140, 30, 9, P.purple, P.purple, 1, 0.09);
      b += tx(78, y + 19, 11, 900, 'var(--text)', 'middle', cut(r.a, 11));
      b += '<path d="M152 ' + (y + 15) + ' L168 ' + (y + 15) + '" stroke="' + P.amber + '" stroke-width="1.8" marker-end="url(#ah' + UID + ')"></path>';
      b += rect(172, y, 140, 30, 9, P.green, P.green, 1, 0.09);
      b += tx(242, y + 19, 10.5, 900, 'var(--text)', 'middle', cut(r.b, 13));
      if (r.why) b += tx(242, y + 33, 7.5, 700, 'var(--muted)', 'middle', cut(r.why, 18));
    });
    return wrap(W, H, b);
  }

  /* ---------------------------------------------------------------- 20. 논증 트리 */
  function argTree(s) {
    var W = 320, H = 208;
    var b = defs();
    /* 주장 */
    b += rect(60, 10, 200, 32, 10, P.blue, P.blue, 1.2, 0.16);
    b += tx(160, 30, 10.5, 900, 'var(--text)', 'middle', '주장 · ' + cut(s.claim || '', 16));
    b += line(160, 42, 160, 56, 'var(--muted)', 1.4);
    b += line(80, 56, 240, 56, 'var(--muted)', 1.4);
    b += line(80, 56, 80, 68, 'var(--muted)', 1.4);
    b += line(240, 56, 240, 68, 'var(--muted)', 1.4);
    (s.reasons || []).forEach(function (r, i) {
      var x = i === 0 ? 6 : 164;
      b += rect(x, 68, 150, 46, 10, P.green, P.green, 1.1, 0.1);
      b += tx(x + 75, 84, 9, 900, P.green, 'middle', '근거 ' + (i + 1));
      b += tx(x + 75, 100, 9.5, 800, 'var(--text)', 'middle', cut(r, 16));
      b += line(x + 75, 114, x + 75, 128, 'var(--muted)', 1.4);
    });
    b += line(80, 128, 240, 128, 'var(--muted)', 1.4);
    b += line(160, 128, 160, 140, 'var(--muted)', 1.4);
    b += rect(60, 140, 200, 32, 10, P.red, P.red, 1.2, 0.1);
    b += tx(160, 160, 10, 900, 'var(--text)', 'middle', '반론 · ' + cut(s.counter || '', 16));
    b += line(160, 172, 160, 184, 'var(--muted)', 1.4);
    b += tx(160, 198, 9.5, 900, P.blue, 'middle', '재반박 · ' + cut(s.rebut || '', 18));
    return wrap(W, H, b);
  }

  /* ---------------------------------------------------------------- 21. 레이더 */
  function radar(s) {
    var axes = s.axes || [];
    var vals = s.values || [];
    var W = 320, H = 218, cx = 160, cy = 108, R = 74, n = axes.length;
    var b = defs();
    [0.25, 0.5, 0.75, 1].forEach(function (f) {
      var pts = [];
      for (var i = 0; i < n; i++) {
        var p = pol(cx, cy, R * f, -90 + i * 360 / n);
        pts.push(p.x + ',' + p.y);
      }
      b += '<polygon points="' + pts.join(' ') + '" fill="none" stroke="var(--grid)" stroke-width=".9"></polygon>';
    });
    var vp = [];
    for (var i = 0; i < n; i++) {
      var a = -90 + i * 360 / n;
      var e = pol(cx, cy, R, a);
      b += line(cx, cy, e.x, e.y, 'var(--grid)', .9);
      var lbl = pol(cx, cy, R + 18, a);
      b += tx(lbl.x, lbl.y + 3, 8.5, 900, 'var(--sub)', 'middle', cut(axes[i], 6));
      var v = Math.max(0.08, Math.min(1, vals[i] == null ? 0.5 : vals[i]));
      var pv = pol(cx, cy, R * v, a);
      vp.push(pv.x + ',' + pv.y);
    }
    b += '<polygon points="' + vp.join(' ') + '" fill="' + P.blue + '" fill-opacity=".22" stroke="' + P.blue + '" stroke-width="2"></polygon>';
    if (s.label) {
      b += rect(108, 190, 104, 20, 8, P.blue, P.blue, 1, 0.12);
      b += tx(160, 204, 9, 900, P.blue, 'middle', cut(s.label, 14));
    }
    return wrap(W, H, b);
  }

  /* ---------------------------------------------------------------- 22. 2×2 매트릭스 */
  function matrix(s) {
    var W = 320, H = 236, x0 = 42, x1 = 306, y0 = 26, y1 = 200;
    var b = defs();
    b += rect(x0, y0, x1 - x0, y1 - y0, 10, 'var(--tile)', 'var(--border)', 1, 1);
    b += line((x0 + x1) / 2, y0, (x0 + x1) / 2, y1, 'var(--grid)', 1.2, '3 3');
    b += line(x0, (y0 + y1) / 2, x1, (y0 + y1) / 2, 'var(--grid)', 1.2, '3 3');
    var q = s.q || ['', '', '', ''];
    b += tx((x0 + x1) / 2 / 2 + x0 / 2, y0 - 6, 8.5, 900, 'var(--muted)', 'middle', cut(q[0], 10));
    b += tx((x0 + x1) / 2 + (x1 - (x0 + x1) / 2) / 2, y0 - 6, 8.5, 900, 'var(--muted)', 'middle', cut(q[1], 10));
    b += tx((x0 + x1) / 2 / 2 + x0 / 2, y1 + 12, 8.5, 900, 'var(--muted)', 'middle', cut(q[2], 10));
    b += tx((x0 + x1) / 2 + (x1 - (x0 + x1) / 2) / 2, y1 + 12, 8.5, 900, 'var(--muted)', 'middle', cut(q[3], 10));
    b += tx(x1, y0 - 18, 8.5, 900, 'var(--sub)', 'end', (s.xlab || '') + ' →');
    b += tx(x0, y0 - 18, 8.5, 900, 'var(--sub)', 'start', '↑ ' + (s.ylab || ''));
    var cols = [P.blue, P.green, P.amber, P.purple];
    (s.items || []).forEach(function (it, i) {
      var px = x0 + 8 + Math.max(0, Math.min(1, it.x)) * (x1 - x0 - 16);
      var py = y1 - 8 - Math.max(0, Math.min(1, it.y)) * (y1 - y0 - 16);
      var c = it.c || cols[i % 4];
      var w = Math.min(120, 12 + String(it.t).length * 8.5);
      b += rect(px - w / 2, py - 11, w, 22, 7, c, c, 1, 0.16);
      b += tx(px, py + 4, 9.5, 900, 'var(--text)', 'middle', cut(it.t, 12));
    });
    return wrap(W, H, b);
  }

  /* ---------------------------------------------------------------- 23. A vs B 대비 */
  function compare(s) {
    var A = s.a || {}, B = s.b || {};
    var rows = Math.max((A.items || []).length, (B.items || []).length);
    var W = 320, H = 34 + rows * 30 + 8;
    var b = defs();
    var ca = A.c || P.red, cb = B.c || P.green;
    b += rect(4, 4, 152, 26, 9, ca, ca, 1.1, 0.16);
    b += tx(80, 22, 11, 900, 'var(--text)', 'middle', A.title || 'A');
    b += rect(164, 4, 152, 26, 9, cb, cb, 1.1, 0.16);
    b += tx(240, 22, 11, 900, 'var(--text)', 'middle', B.title || 'B');
    for (var i = 0; i < rows; i++) {
      var y = 36 + i * 30;
      if ((A.items || [])[i]) {
        b += rect(4, y, 152, 24, 7, ca, null, 0, 0.07);
        b += tx(80, y + 16, 9.5, 800, 'var(--text)', 'middle', cut(A.items[i], 14));
      }
      if ((B.items || [])[i]) {
        b += rect(164, y, 152, 24, 7, cb, null, 0, 0.07);
        b += tx(240, y + 16, 9.5, 800, 'var(--text)', 'middle', cut(B.items[i], 14));
      }
    }
    return wrap(W, H, b);
  }

  /* ---------------------------------------------------------------- 24. 세로 막대 (성장) */
  function colBars(s) {
    var items = s.items || [];
    var W = 320, H = 172, x0 = 26, yb = 138;
    var max = s.max || Math.max.apply(null, items.map(function (x) { return x.v; }).concat([1])) * 1.1;
    var cw = (W - x0 - 12) / items.length;
    var b = defs();
    b += line(x0, 18, x0, yb, 'var(--muted)', 1);
    b += line(x0, yb, W - 8, yb, 'var(--muted)', 1);
    items.forEach(function (it, i) {
      var h = Math.max(4, (it.v / max) * (yb - 28));
      var x = x0 + 6 + i * cw;
      var c = it.c || PAL[i % PAL.length];
      b += '<rect x="' + (x + 4) + '" y="' + (yb - h) + '" width="' + (cw - 14) + '" height="' + h + '" rx="5" fill="' + c + '" fill-opacity=".85"></rect>';
      b += tx(x + cw / 2 - 3, yb - h - 5, 9, 900, c, 'middle', it.x != null ? it.x : it.v);
      b += tx(x + cw / 2 - 3, yb + 14, 8.5, 800, 'var(--muted)', 'middle', cut(it.l, 7));
    });
    if (s.foot) b += tx(W / 2, 166, 8.5, 700, 'var(--muted)', 'middle', cut(s.foot, 34));
    return wrap(W, H, b);
  }

  /* ---------------------------------------------------------------- 25. 지구 에너지 수지 */
  function earthBudget(s) {
    var W = 320, H = 186;
    var b = defs();
    /* 태양 */
    b += '<circle cx="34" cy="46" r="20" fill="' + P.amber + '" fill-opacity=".22" stroke="' + P.amber + '" stroke-width="1.4"></circle>';
    b += tx(34, 52, 16, 700, P.amber, 'middle', '☀️');
    b += tx(34, 78, 8, 900, 'var(--muted)', 'middle', '100');
    for (var i = 0; i < 3; i++) {
      b += '<path d="M58 ' + (34 + i * 12) + ' L96 ' + (34 + i * 12) + '" stroke="' + P.amber + '" stroke-width="2" marker-end="url(#ah' + UID + ')"></path>';
    }
    /* 지구 */
    b += '<circle cx="176" cy="96" r="42" fill="' + P.blue + '" fill-opacity=".16" stroke="' + P.blue + '" stroke-width="1.6"></circle>';
    b += tx(176, 92, 22, 700, P.blue, 'middle', '🌍');
    b += tx(176, 112, 8.5, 900, 'var(--text)', 'middle', '지구');
    /* 반사 */
    b += '<path d="M150 66 L112 30" stroke="' + P.cyan + '" stroke-width="1.8" marker-end="url(#ah' + UID + ')"></path>';
    b += tx(122, 26, 8.5, 900, P.cyan, 'middle', '반사 30');
    /* 흡수 */
    b += '<path d="M204 74 L246 46" stroke="' + P.red + '" stroke-width="1.8" marker-end="url(#ah' + UID + ')"></path>';
    b += tx(238, 38, 8.5, 900, P.red, 'middle', '흡수 70');
    /* 재방출 */
    b += '<path d="M212 120 L252 148" stroke="' + P.purple + '" stroke-width="1.8" marker-end="url(#ah' + UID + ')"></path>';
    b += tx(256, 160, 8.5, 900, P.purple, 'middle', '재방출');
    /* 온실 */
    b += '<path d="M118 140 Q176 120 234 140" fill="none" stroke="' + P.green + '" stroke-width="1.6" stroke-dasharray="4 3"></path>';
    b += tx(176, 156, 8.5, 900, P.green, 'middle', '온실기체가 재방출 일부 흡수');
    return wrap(W, H, b);
  }

  /* ---------------------------------------------------------------- 26. 성장 곡선 */
  function curve(s) {
    var W = 320, H = 176, x0 = 30, x1 = 306, yb = 146;
    var pts = s.points || [];
    var max = s.max || Math.max.apply(null, pts.map(function (p) { return p.y; }).concat([1])) * 1.1;
    var b = defs();
    b += line(x0, 18, x0, yb, 'var(--muted)', 1);
    b += line(x0, yb, x1, yb, 'var(--muted)', 1);
    var path = '', area = '';
    pts.forEach(function (p, i) {
      var x = x0 + (i / Math.max(1, pts.length - 1)) * (x1 - x0 - 8);
      var y = yb - (p.y / max) * (yb - 30);
      path += (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1) + ' ';
      area += (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1) + ' ';
      b += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="2.8" fill="' + (s.c || P.blue) + '"></circle>';
      if (p.l) b += tx(x.toFixed(1), yb + 14, 8, 800, 'var(--muted)', 'middle', p.l);
    });
    b += '<path d="' + path + '" fill="none" stroke="' + (s.c || P.blue) + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></path>';
    (s.marks || []).forEach(function (m) {
      b += tx(Math.min(W - 12, Math.max(12, m.x)), m.y, 8.5, 900, m.c || P.amber, 'middle', cut(m.t, 12));
    });
    if (s.foot) b += tx(160, 166, 8.5, 700, 'var(--muted)', 'middle', cut(s.foot, 34));
    return wrap(W, H, b);
  }

  /* ---------------------------------------------------------------- 디스패처 */
  var TAGS = {
    banner: '핵심 흐름', balance: '저울 도식', bars: '막대 비교', triangle: '삼각 모형',
    trade: '교환 도식', net: '관계도', popPyr: '인구 피라미드', donut: '도넛 비중',
    beaker: '입자 모형', phBar: 'pH 스케일', energyProfile: '에너지 곡선', foodChain: '먹이 사슬',
    energyPyr: '에너지 피라미드', carbonCycle: '순환도', flowChain: '에너지 흐름', generator: '유도 모형',
    timeline: '타임라인', nodes: '단계 도식', glossMatch: '대응 도식', argTree: '논증 트리',
    radar: '레이더', matrix: '2×2 매트릭스', compare: '대비 도식', colBars: '세로 막대',
    earthBudget: '에너지 수지', curve: '변화 곡선'
  };

  function render(s) {
    if (!s) return '';
    try {
      switch (s.type) {
        case 'banner': return banner(s);
        case 'balance': return balance(s);
        case 'bars': return bars(s);
        case 'triangle': return triangle(s);
        case 'trade': return trade(s);
        case 'net': return net(s);
        case 'popPyr': return popPyr(s);
        case 'donut': return donut(s);
        case 'beaker': return beaker(s);
        case 'phBar': return phBar(s);
        case 'energyProfile': return energyProfile(s);
        case 'foodChain': return foodChain(s);
        case 'energyPyr': return energyPyr(s);
        case 'carbonCycle': return carbonCycle(s);
        case 'flowChain': return flowChain(s);
        case 'generator': return generator(s);
        case 'timeline': return timeline(s);
        case 'nodes': return nodes(s);
        case 'glossMatch': return glossMatch(s);
        case 'argTree': return argTree(s);
        case 'radar': return radar(s);
        case 'matrix': return matrix(s);
        case 'compare': return compare(s);
        case 'colBars': return colBars(s);
        case 'earthBudget': return earthBudget(s);
        case 'curve': return curve(s);
        default: return '';
      }
    } catch (e) {
      return '<div class="sc-fail">도식을 표시할 수 없습니다</div>';
    }
  }

  window.HUB_SCENE = { render: render, tag: function (t) { return TAGS[t] || '도식'; }, pal: PAL };
})();
