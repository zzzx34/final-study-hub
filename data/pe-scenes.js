/* ==========================================================================
   체육 · 배구 전용 SVG 도식 엔진 (scene.js 뒤에 로드)
   - vbCourt      : 코트·어택 라인·전위/후위·포지션 도식
   - vbRotate     : 시계 방향 로테이션 도식
   - vbSignal     : 주심 핸드시그널 1종 픽토그램
   - vbSignalGrid : 주심 핸드시그널 여러 개 표
   ========================================================================== */
(function () {
  'use strict';

  var base = window.HUB_SCENE;
  if (!base) return;

  var SUB = 'var(--sub)', MUT = 'var(--muted)', BOR = 'var(--border)', TXT = 'var(--text)';
  var ACC = 'var(--accent)', OK = 'var(--ok)', BAD = 'var(--bad)', TILE = 'var(--tile)', CARD = 'var(--card)';
  var UID = 0;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function cut(s, n) {
    s = String(s == null ? '' : s);
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
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
      (op != null ? ' fill-opacity="' + op + '"' : '') +
      (stroke ? ' stroke="' + stroke + '" stroke-width="' + (sw || 1.2) + '"' : '') + '></rect>';
  }
  function line(x1, y1, x2, y2, stroke, sw, dash) {
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + stroke +
      '" stroke-width="' + (sw || 1.2) + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') +
      ' stroke-linecap="round"></line>';
  }
  function circ(cx, cy, r, fill, stroke, sw, op) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fill + '"' +
      (op != null ? ' fill-opacity="' + op + '"' : '') +
      (stroke ? ' stroke="' + stroke + '" stroke-width="' + (sw || 1.2) + '"' : '') + '></circle>';
  }
  function arrow(x1, y1, x2, y2, stroke, sw) {
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + stroke +
      '" stroke-width="' + (sw || 1.8) + '" stroke-linecap="round" marker-end="url(#vbAh' + UID + ')"></line>';
  }
  function defs() {
    return '<defs><marker id="vbAh' + UID + '" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">' +
      '<path d="M0,0 L0,6 L6,3 z" fill="' + ACC + '"></path></marker></defs>';
  }

  /* -------- 코트 공통 좌표 (320 x 258) -------- */
  var CX0 = 26, CX1 = 294, CY0 = 32, CY1 = 230;
  var ATK = CY0 + (CY1 - CY0) / 3;              /* 어택 라인 */
  var POS = { 4: [70, 66], 3: [160, 66], 2: [250, 66], 5: [70, 176], 6: [160, 176], 1: [250, 176] };

  function courtBase(s) {
    var b = defs();
    var hl = s.hl || [];
    if (hl.indexOf('front') >= 0) b += rect(CX0, CY0, CX1 - CX0, ATK - CY0, 0, ACC, null, 0, 0.08);
    if (hl.indexOf('back') >= 0) b += rect(CX0, ATK, CX1 - CX0, CY1 - ATK, 0, OK, null, 0, 0.07);
    b += rect(CX0, CY0, CX1 - CX0, CY1 - CY0, 4, 'none', BOR, 1.4);
    /* 네트 */
    b += line(CX0 - 6, CY0, CX1 + 6, CY0, SUB, 3.4);
    b += tx(CX1 - 2, CY0 - 7, 8.5, 900, MUT, 'end', '네트');
    /* 어택 라인 */
    b += line(CX0, ATK, CX1, ATK, ACC, 1.6, '5 3');
    b += tx(CX1 - 2, ATK - 5, 8, 900, ACC, 'end', '어택 라인 3m');
    if (hl.indexOf('front') >= 0 || hl.indexOf('back') >= 0) {
      b += tx(CX0 + 16, (CY0 + ATK) / 2 + 3, 9, 900, ACC, 'middle', '전위');
      b += tx(CX0 + 16, (ATK + CY1) / 2 + 3, 9, 900, OK, 'middle', '후위');
    }
    return b;
  }

  function positionDots(s) {
    var hot = s.hot || [];
    var b = '';
    [4, 3, 2, 5, 6, 1].forEach(function (n) {
      var p = POS[n];
      var isHot = hot.indexOf(n) >= 0;
      b += circ(p[0], p[1], 12, isHot ? OK : TILE, isHot ? OK : BOR, isHot ? 2 : 1.4, isHot ? 0.16 : 1);
      b += tx(p[0], p[1] + 3.6, 10.5, 900, isHot ? OK : SUB, 'middle', String(n));
    });
    return b;
  }

  /* -------- 1. 코트 도식 -------- */
  function vbCourt(s) {
    var W = 320, H = 258;
    var b = courtBase(s);
    (s.areas || []).forEach(function (a) {
      var x = CX0 + a.a[0] * (CX1 - CX0), y = CY0 + a.a[1] * (CY1 - CY0);
      var w = a.a[2] * (CX1 - CX0), h = a.a[3] * (CY1 - CY0);
      var c = a.c || ACC;
      b += rect(x, y, w, h, 6, c, c, 1.1, 0.10);
      b += tx(x + w / 2, y + h / 2 + 3, 8, 900, c, 'middle', cut(a.label || '', 10));
    });
    b += positionDots(s);
    if (s.foot) b += tx(160, H - 4, 8.5, 700, MUT, 'middle', cut(s.foot, 40));
    return wrap(W, H, b);
  }

  /* -------- 2. 로테이션 도식 -------- */
  function vbRotate(s) {
    var W = 320, H = 258;
    var b = courtBase({ hl: [] });
    b += positionDots({ hot: [] });
    /* 시계 방향: 2→1→6→5→4→3→2 */
    b += arrow(250, 80, 250, 162, ACC, 2);
    b += arrow(236, 176, 174, 176, ACC, 2);
    b += arrow(146, 176, 84, 176, ACC, 2);
    b += arrow(70, 162, 70, 80, ACC, 2);
    b += arrow(84, 66, 146, 66, ACC, 2);
    b += arrow(174, 66, 236, 66, ACC, 2);
    b += tx(160, 124, 10.5, 900, ACC, 'middle', '시계 방향');
    b += tx(160, 138, 8, 700, MUT, 'middle', '서비스권을 얻으면 한 자리씩');
    if (s.foot) b += tx(160, H - 4, 8.5, 700, MUT, 'middle', cut(s.foot, 40));
    return wrap(W, H, b);
  }

  /* -------- 3. 시그널 픽토그램 (100 x 100 로컬 좌표) -------- */
  function bodyBase() {
    var b = '';
    b += circ(50, 30, 7.5, 'none', SUB, 2.2);
    b += rect(40, 40, 20, 34, 9, TILE, BOR, 1.4);
    b += line(45, 74, 41, 90, SUB, 2.6);
    b += line(55, 74, 59, 90, SUB, 2.6);
    return b;
  }
  function arm(x1, y1, x2, y2, w) { return line(x1, y1, x2, y2, SUB, w || 5); }
  function palm(x, y, w, h, r) { return rect(x, y, w, h, r == null ? 3 : r, TILE, SUB, 1.6); }
  function fingers(xs, y, len) {
    var b = '';
    xs.forEach(function (x) { b += line(x, y, x, y - len, SUB, 1.7); });
    return b;
  }
  function motion(x1, y1, cx, cy, x2, y2) {
    return '<path d="M' + x1 + ',' + y1 + ' Q' + cx + ',' + cy + ' ' + x2 + ',' + y2 + '" fill="none" stroke="' + ACC +
      '" stroke-width="1.6" stroke-dasharray="3 2" marker-end="url(#vbAh' + UID + ')"></path>';
  }

  function signalGlyph(n) {
    var b = bodyBase();
    switch (n) {
      case 1: /* 서비스할 팀: 팔을 옆으로 뻗음 */
        b += arm(58, 48, 82, 44);
        b += palm(80, 38, 13, 12, 4);
        break;
      case 2: /* 서비스 허가: 손을 서브 방향으로 이동 */
        b += arm(58, 48, 78, 32);
        b += palm(76, 20, 13, 11, 4);
        b += motion(60, 22, 74, 12, 86, 18);
        break;
      case 3: /* 코트 교대: 전완을 몸 둘레로 회전 */
        b += arm(58, 52, 76, 52);
        b += palm(74, 46, 11, 11, 3);
        b += '<path d="M26,60 A26,26 0 1 0 74,60" fill="none" stroke="' + ACC + '" stroke-width="1.6" stroke-dasharray="3 2" marker-end="url(#vbAh' + UID + ')"></path>';
        break;
      case 4: /* 타임아웃: 수직 팔 + 손바닥 = T */
        b += arm(66, 56, 66, 24);
        b += palm(52, 18, 28, 7, 3);
        break;
      case 5: /* 선수 교대: 두 전완을 서로 회전 */
        b += arm(56, 50, 78, 44);
        b += arm(56, 44, 78, 50);
        b += motion(60, 36, 70, 30, 82, 34);
        b += motion(60, 58, 70, 64, 82, 60);
        break;
      case 6: /* 세트 종료: 양팔 교차 */
        b += line(34, 44, 66, 70, SUB, 5);
        b += line(66, 44, 34, 70, SUB, 5);
        break;
      case 7: /* 서비스 지연: 손가락 8개 */
        b += palm(26, 16, 16, 11, 3);
        b += fingers([29, 34, 39, 44], 16, 7);
        b += palm(58, 16, 16, 11, 3);
        b += fingers([61, 66, 71, 76], 16, 7);
        b += tx(50, 90, 7.5, 900, MUT, 'middle', '8개');
        break;
      case 8: /* 볼 인: 바닥 쪽을 가리킴 */
        b += arm(58, 52, 74, 82);
        b += palm(72, 82, 13, 10, 3);
        b += line(58, 94, 94, 94, MUT, 2.4);
        b += line(62, 92, 62, 97, MUT, 1.4);
        b += line(90, 92, 90, 97, MUT, 1.4);
        break;
      case 9: /* 볼 아웃: 전완 수직 + 손바닥 몸 쪽 */
        b += arm(64, 56, 64, 22);
        b += palm(56, 8, 17, 15, 4);
        b += '<path d="M60,22 Q64,16 68,22" fill="none" stroke="' + ACC + '" stroke-width="1.5"></path>';
        b += tx(87, 14, 7, 800, MUT, 'middle', '몸 쪽');
        break;
      case 10: /* 캐치볼: 천천히, 손바닥 위로 */
        b += arm(60, 54, 76, 34);
        b += palm(70, 24, 16, 7, 3);
        b += '<path d="M78,20 L78,10 M78,10 L74,14 M78,10 L82,14" fill="none" stroke="' + ACC + '" stroke-width="1.5" stroke-linecap="round"></path>';
        break;
      case 11: /* 더블컨택: 손가락 2개 */
        b += palm(56, 18, 16, 12, 3);
        b += fingers([60, 67], 18, 11);
        b += tx(64, 40, 7.5, 900, MUT, 'middle', '2개');
        break;
      case 12: /* 포 히트: 손가락 4개 */
        b += palm(54, 18, 20, 12, 3);
        b += fingers([57, 62, 67, 72], 18, 11);
        b += tx(64, 40, 7.5, 900, MUT, 'middle', '4개');
        break;
      case 13: /* 터치 네트: 네트를 가리킴 */
        b += rect(72, 8, 20, 52, 2, 'none', MUT, 1.4);
        [80, 88].forEach(function (x) { b += line(x, 8, x, 60, MUT, 0.9); });
        [20, 32, 44, 56].forEach(function (y) { b += line(72, y, 92, y, MUT, 0.9); });
        b += arm(56, 50, 66, 34);
        b += palm(60, 26, 13, 11, 3);
        break;
      case 14: /* 볼 터치: 손가락 위를 손바닥으로 스침 */
        b += arm(58, 52, 58, 30);
        b += palm(52, 16, 13, 14, 3);
        b += fingers([55, 58, 62], 16, 6);
        b += palm(60, 12, 20, 6, 3);
        b += motion(74, 10, 82, 16, 78, 24);
        break;
      default:
        break;
    }
    return b;
  }

  function vbSignal(s) {
    var b = defs();
    b += signalGlyph(s.n || 1);
    return wrap(100, 100, b);
  }

  /* -------- 4. 시그널 표 -------- */
  var SIG = {
    1: ['서비스할 팀', '서브할 팀 쪽으로 팔을 뻗음'],
    2: ['서비스 허가', '서브 방향으로 손을 이동'],
    3: ['코트 교대', '팔뚝을 몸 둘레로 회전'],
    4: ['타임아웃', '수직 팔 + 손바닥 = T자'],
    5: ['선수 교대', '두 팔뚝을 서로 회전'],
    6: ['세트 종료', '가슴 앞 양팔 교차(X)'],
    7: ['서비스 지연', '손가락 8개를 펴서 올림'],
    8: ['볼 인', '바닥 쪽을 가리킴'],
    9: ['볼 아웃', '전완 수직 · 손바닥은 몸 쪽'],
    10: ['캐치볼', '천천히 올려 손바닥 위로'],
    11: ['더블컨택', '검지·중지 2개'],
    12: ['포 히트', '손가락 4개'],
    13: ['터치 네트', '해당 팀 네트를 가리킴'],
    14: ['볼 터치', '손가락 위를 손바닥으로 스침']
  };

  function vbSignalGrid(s) {
    var from = s.from || 1, to = s.to || 7;
    var nums = [];
    for (var i = from; i <= to; i++) nums.push(i);
    var cols = 2, rows = Math.ceil(nums.length / cols);
    var W = 320, cw = 156, ch = 78, top = 4;
    var H = top + rows * ch + 4;
    var b = defs();
    nums.forEach(function (n, k) {
      var c = k % cols, r = Math.floor(k / cols);
      var x = 2 + c * (cw + 4), y = top + r * ch;
      b += rect(x, y, cw, ch - 6, 10, TILE, BOR, 1);
      b += '<g transform="translate(' + (x + 4) + ',' + (y + 8) + ') scale(0.52)">' + signalGlyph(n) + '</g>';
      var t = SIG[n] || ['', ''];
      b += tx(x + 60, y + 26, 9, 900, TXT, 'start', n + '. ' + t[0]);
      b += tx(x + 60, y + 42, 7.5, 700, MUT, 'start', cut(t[1], 15));
    });
    return wrap(W, H, b);
  }

  /* -------- 5. 표 (HUB_UI.scenes 전용: 앱의 .cmp 표 스타일을 그대로 쓴다) -------- */
  function inline(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  }
  function vbTable(s) {
    var cols = s.cols || [], rows = s.rows || [];
    var head = '<thead><tr>' + cols.map(function (c, i) {
      return '<th' + (i === 0 ? ' style="min-width:64px"' : '') + '>' + inline(c) + '</th>';
    }).join('') + '</tr></thead>';
    var body = rows.map(function (r) {
      return '<tr>' + r.map(function (c, i) {
        return i === 0 ? '<th>' + inline(c) + '</th>' : '<td>' + inline(c) + '</td>';
      }).join('') + '</tr>';
    }).join('');
    return '<div class="cmp-wrap"><table class="cmp">' + head + '<tbody>' + body + '</tbody></table></div>';
  }

  var OWN = { vbCourt: vbCourt, vbRotate: vbRotate, vbSignal: vbSignal, vbSignalGrid: vbSignalGrid, vbTable: vbTable };
  var TAGS = { vbCourt: '코트 도식', vbRotate: '로테이션', vbSignal: '시그널', vbSignalGrid: '시그널 표', vbTable: '정리 표' };

  window.HUB_SCENE = {
    render: function (s) {
      if (s && s.type && OWN[s.type]) {
        try { return OWN[s.type](s); } catch (e) { return '<div class="sc-fail">도식을 표시할 수 없습니다</div>'; }
      }
      return base.render(s);
    },
    tag: function (t) { return TAGS[t] || base.tag(t); },
    pal: base.pal
  };
})();
