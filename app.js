/* ==========================================================================
   기말 학습 허브 — app.js
   라우팅 · 진도 저장 · 시각 도식 렌더러 · 퀴즈 엔진
   ========================================================================== */
(function () {
  'use strict';

  const SUBJECTS = window.HUB_SUBJECTS || [];
  const UIMAP = window.HUB_UI || {};
  const STORE_KEY = 'finalStudyHub.v1';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* ----------------------------- 상태 ----------------------------- */
  const defaultState = { theme: 'light', done: {}, quiz: {}, wrong: {}, lastUnit: null, lastSubject: null, lastTab: 'basic' };
  let state = load();
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return Object.assign({}, defaultState);
      const p = JSON.parse(raw);
      return Object.assign({}, defaultState, p, {
        done: p.done || {}, quiz: p.quiz || {}, wrong: p.wrong || {}
      });
    } catch (e) { return Object.assign({}, defaultState); }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  /* ----------------------------- 유틸 ----------------------------- */
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // **굵게**, __강조__, ~~취소~~ 지원
  const fmt = (s) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/__(.+?)__/g, '<em class="hl">$1</em>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>');

  const ALL_UNITS = [];
  SUBJECTS.forEach((s) => s.units.forEach((u) => ALL_UNITS.push({ sub: s, unit: u })));
  // 문제은행(data/q-*.js)이 있으면 소단원 퀴즈를 교체
  if (window.HUB_QUIZ) {
    ALL_UNITS.forEach((x) => { if (window.HUB_QUIZ[x.unit.id]) x.unit.quiz = window.HUB_QUIZ[x.unit.id]; });
  }
  const findUnit = (id) => ALL_UNITS.find((x) => x.unit.id === id);

  function todayKST() {
    const now = new Date();
    const kst = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60000);
    return new Date(kst.getFullYear(), kst.getMonth(), kst.getDate());
  }
  function daysUntil(iso) {
    const d = new Date(iso + 'T00:00:00+09:00');
    const t = todayKST();
    return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - t) / 86400000);
  }
  function ddayText(iso) {
    const n = daysUntil(iso);
    if (n > 0) return 'D-' + n;
    if (n === 0) return 'D-DAY';
    return 'D+' + Math.abs(n);
  }
  function nearestExam() {
    const list = SUBJECTS.map((s) => ({ s, n: daysUntil(s.examISO) }))
      .filter((x) => x.n >= 0).sort((a, b) => a.n - b.n);
    return list[0] || null;
  }
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 1700);
  }
  function ring(pct, size, label, sub) {
    const s = size || 64, r = (s - 9) / 2, c = 2 * Math.PI * r;
    const off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
    return `<div style="position:relative;width:${s}px;height:${s}px;flex:0 0 auto">
      <svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" style="transform:rotate(-90deg)">
        <circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="6"></circle>
        <circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="#7dd3fc" stroke-width="6" stroke-linecap="round"
          stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"></circle>
      </svg>
      <div style="position:absolute;inset:0;display:grid;place-items:center;color:#fff;text-align:center;line-height:1.05">
        <div><div style="font-size:${size > 70 ? 18 : 14}px;font-weight:900;font-variant-numeric:tabular-nums">${label}</div>
        ${sub ? `<div style="font-size:8.5px;font-weight:800;opacity:.8">${sub}</div>` : ''}</div>
      </div>
    </div>`;
  }

  /* ----------------------------- 진도 계산 ----------------------------- */
  const isDone = (id) => !!state.done[id];
  function subjectStats(sub) {
    const total = sub.units.length;
    const done = sub.units.filter((u) => isDone(u.id)).length;
    const q = sub.units.map((u) => state.quiz[u.id]).filter(Boolean);
    const acc = q.length ? Math.round((q.reduce((a, x) => a + x.correct, 0) / q.reduce((a, x) => a + x.total, 0)) * 100) : 0;
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0, quizCount: q.length, acc };
  }
  function overallStats() {
    const total = ALL_UNITS.length;
    const done = ALL_UNITS.filter((x) => isDone(x.unit.id)).length;
    const q = Object.values(state.quiz);
    const acc = q.length ? Math.round((q.reduce((a, x) => a + x.correct, 0) / q.reduce((a, x) => a + x.total, 0)) * 100) : 0;
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0, acc, quizCount: q.length };
  }

  /* ----------------------------- 테마 ----------------------------- */
  const THEMES = { light: ['🌙', 'dark', '#f2f2f7'], dark: ['☀️', 'light', '#09090b'], mono: ['◐', 'mono', '#ffffff'] };
  function applyTheme(t) {
    if (t === 'mono') {
      // 고대비(고대비 흑백) 테마는 다크 → 모노 순환에서 진입
      t = 'mono';
    }
    document.documentElement.setAttribute('data-theme', t);
    const btn = $('#themeBtn');
    if (btn) btn.textContent = t === 'dark' ? '☀️' : (t === 'mono' ? '◑' : '🌙');
    const meta = $('#metaThemeColor');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#09090b' : (t === 'mono' ? '#ffffff' : '#f2f2f7'));
    state.theme = t; save();
  }
  function cycleTheme() {
    const order = ['light', 'dark', 'mono'];
    const i = order.indexOf(state.theme || 'light');
    applyTheme(order[(i + 1) % order.length]);
    toast({ light: '라이트 테마', dark: '다크 테마', mono: '고대비 테마' }[state.theme]);
  }

  /* ----------------------------- 네비 ----------------------------- */
  let route = { view: 'home' };
  function setHeader(title, sub, showBack) {
    $('#headerTitle').textContent = title;
    $('#headerSub').textContent = sub || '';    $('#backBtn').hidden = !showBack;
    $('#unitTabs').classList.toggle('hidden', route.view !== 'unit');
    const ne = nearestExam();
    $('#headerDday').textContent = ne ? ddayText(ne.s.examISO) : 'D-DAY';
    $$('nav.bottom button[data-nav]').forEach((b) => b.classList.toggle('on', b.dataset.nav === (route.view === 'unit' || route.view === 'subject' ? 'home' : route.view)));
  }
  function showView(name) {
    ['home', 'subject', 'unit', 'progress'].forEach((v) => {
      const el = $('#view-' + v);
      if (el) el.classList.toggle('hidden', v !== name);
    });
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }
  function goHome(push) {
    route = { view: 'home' };
    showView('home');
    setHeader('기말 학습 허브', '4과목 · ' + ALL_UNITS.length + '개 소단원', false);
    renderHome();
    if (push) history.pushState({ v: 'home' }, '');
  }
  function goProgress(push) {
    route = { view: 'progress' };
    showView('progress');
    setHeader('학습 진도', '완료·퀴즈 기록', false);
    renderProgress();
    if (push) history.pushState({ v: 'progress' }, '');
  }
  function goSubject(sid, push) {
    const sub = SUBJECTS.find((s) => s.id === sid);
    if (!sub) return goHome();
    route = { view: 'subject', sid };
    state.lastSubject = sid; save();
    showView('subject');
    setHeader(sub.name, sub.pub, true);
    renderSubject(sub);
    if (push) history.pushState({ v: 'subject', sid }, '');
  }
  function goUnit(uid, push, keepTab) {
    const hit = findUnit(uid);
    if (!hit) return goHome();
    route = { view: 'unit', sid: hit.sub.id, uid, tab: keepTab ? (state.lastTab || 'basic') : 'basic' };
    state.lastUnit = uid; save();
    showView('unit');
    const tail = hit.unit.title.length > 13 ? hit.unit.title.slice(0, 13) + '…' : hit.unit.title;
    setHeader(hit.unit.no + ' · ' + tail, hit.sub.name, true);
    renderUnit(hit.sub, hit.unit);
    if (push) history.pushState({ v: 'unit', uid }, '');
  }
  function setTab(tab) {
    if (route.view !== 'unit') return;
    route.tab = tab;
    state.lastTab = tab; save();
    $$('#unitTabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    ['basic', 'visual', 'deep', 'quiz'].forEach((t) => $('#tab-' + t).classList.toggle('hidden', t !== tab));
    $('#unitHead').classList.toggle('compact', tab !== 'basic');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ----------------------------- 홈 렌더 ----------------------------- */
  function renderHome() {
    const o = overallStats();
    const ne = nearestExam();
    const now = todayKST();
    $('#homeDate').textContent = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${'일월화수목금토'[now.getDay()]})`;
    const ringBox = $('#homeRing');
    if (ringBox) ringBox.innerHTML = ring(o.pct, 76, o.pct + '%', '완료');

    const stats = $('#homeStats');
    if (stats) {
      stats.innerHTML = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px">
        ${['<div><div style="font-size:17px;font-weight:900;font-variant-numeric:tabular-nums">' + o.done + '<span style="font-size:11px;opacity:.7">/' + o.total + '</span></div><div class="tiny" style="opacity:.72;font-weight:800">완료 소단원</div></div>',
        '<div><div style="font-size:17px;font-weight:900;font-variant-numeric:tabular-nums">' + (ne ? ddayText(ne.s.examISO) : '-') + '</div><div class="tiny" style="opacity:.72;font-weight:800">' + (ne ? ne.s.name : '시험 종료') + '</div></div>',
        '<div><div style="font-size:17px;font-weight:900;font-variant-numeric:tabular-nums">' + (o.quizCount ? o.acc + '%' : '—') + '</div><div class="tiny" style="opacity:.72;font-weight:800">퀴즈 정답률</div></div>'].map((x) => x.replace('<div>', '<div style="border-radius:12px;background:rgba(255,255,255,.12);padding:8px 9px">')).join('')}
      </div>`;
    }

    // 시험 스트립
    const strip = $('#examStrip');
    if (strip) {
      strip.innerHTML = SUBJECTS.map((s) => {
        const n = daysUntil(s.examISO);
        return `<button type="button" class="exam-chip ${n <= 3 && n >= 0 ? 'on' : ''}" data-sub="${s.id}">
          <div class="ec-d" style="color:${s.color}">${ddayText(s.examISO)}</div>
          <div class="ec-n">${esc(s.name)}</div>
          <div class="tiny muted" style="margin-top:2px">${esc(s.examLabel)}</div>
        </button>`;
      }).join('');
      $$('#examStrip .exam-chip').forEach((b) => b.addEventListener('click', () => goSubject(b.dataset.sub, true)));
    }

    // 이어서 학습
    const cont = $('#continueCard');
    if (cont) {
      const target = state.lastUnit ? findUnit(state.lastUnit) : null;
      const fallback = ALL_UNITS.find((x) => !isDone(x.unit.id)) || ALL_UNITS[0];
      const it = target || fallback;
      if (it) {
        cont.innerHTML = `<button type="button" class="card" style="width:100%;text-align:left;display:flex;align-items:center;gap:12px" data-unit="${it.unit.id}">
          <div style="flex:0 0 auto;width:42px;height:42px;border-radius:12px;display:grid;place-items:center;font-size:19px;background:var(--tile);border:1px solid var(--border)">${it.sub.emoji || '📘'}</div>
          <div class="grow">
            <div class="tiny muted strong">${esc(it.sub.name)} · ${esc(it.unit.no)}</div>
            <div class="strong" style="font-size:13px;line-height:1.35;margin-top:1px">${esc(it.unit.title)}</div>
            <div class="tiny muted" style="margin-top:3px">${isDone(it.unit.id) ? '✅ 완료 · 복습하기' : '▶ 이어서 학습하기'}</div>
          </div>
          <div class="muted">›</div>
        </button>`;
        $('[data-unit]', cont).addEventListener('click', () => goUnit(it.unit.id, true));
      }
    }

    // 과목 카드
    const grid = $('#subjectGrid');
    if (grid) {
      grid.innerHTML = SUBJECTS.map((s) => {
        const st = subjectStats(s);
        return `<button type="button" class="subject-card" data-sub="${s.id}" style="--sc:${s.color}">
          <span class="sc-stripe"></span>
          <div class="row" style="justify-content:space-between;align-items:flex-start">
            <div>
              <div class="sc-name">${s.emoji || ''} ${esc(s.name)}</div>
              <div class="sc-meta">${esc(s.examLabel)} · ${ddayText(s.examISO)}</div>
            </div>
            <div class="tiny strong tnum" style="color:${s.color}">${st.pct}%</div>
          </div>
          <div class="bar" style="margin-top:9px"><i style="width:${st.pct}%;background:${s.color}"></i></div>
          <div class="tiny muted" style="margin-top:5px">${st.done}/${st.total} 소단원 · 퀴즈 ${st.quizCount ? st.acc + '%' : '미응시'}</div>
        </button>`;
      }).join('');
      $$('#subjectGrid .subject-card').forEach((b) => b.addEventListener('click', () => goSubject(b.dataset.sub, true)));
    }
  }

  /* ----------------------------- 과목 렌더 ----------------------------- */
  function renderSubject(sub) {
    const st = subjectStats(sub);
    $('#subjectHero').innerHTML = `<div class="card">
      <div class="row" style="justify-content:space-between;align-items:flex-start">
        <div>
          <div class="row" style="gap:6px">
            <span class="pill" style="border-color:${sub.color};color:${sub.color};font-weight:900">${esc(sub.pub)}</span>
            <span class="pill" style="background:${sub.color};border-color:${sub.color};color:#fff">${ddayText(sub.examISO)}</span>
          </div>
          <h1 style="font-size:18px;font-weight:900;margin-top:8px;letter-spacing:-.02em">${sub.emoji || ''} ${esc(sub.name)}</h1>
          <div class="small muted" style="margin-top:3px">시험일 ${esc(sub.examLabel)} · ${st.total}개 소단원</div>
        </div>
      </div>
      <div class="bar" style="margin-top:12px"><i style="width:${st.pct}%;background:${sub.color}"></i></div>
      <div class="row small" style="justify-content:space-between;margin-top:6px">
        <span class="muted">완료 <b class="tnum" style="color:var(--text)">${st.done}/${st.total}</b></span>
        <span class="muted">퀴즈 ${st.quizCount ? '<b style="color:var(--text)">' + st.acc + '%</b>' : '미응시'}</span>
        <span class="strong" style="color:${sub.color}">${st.pct}%</span>
      </div>
    </div>`;

    $('#subjectUnitCount').textContent = st.total + '개 · ' + ddayText(sub.examISO);
    $('#unitList').innerHTML = sub.units.map((u, i) => {
      const q = state.quiz[u.id];
      return `<button type="button" class="unit-row" data-unit="${u.id}">
        <span class="unit-no" style="color:${sub.color}">${esc(u.no)}</span>
        <span class="unit-name">${esc(u.title)}
          <span class="tiny muted" style="display:block;font-weight:700;margin-top:2px">${esc((u.terms && u.terms[0] && u.terms[0].t) || '')}${q ? ' · 퀴즈 ' + q.correct + '/' + q.total : ''}</span>
        </span>
        <span class="unit-check ${isDone(u.id) ? 'done' : ''}">✓</span>
      </button>`;
    }).join('');
    $$('#unitList .unit-row').forEach((b) => b.addEventListener('click', () => goUnit(b.dataset.unit, true)));
  }

  /* ----------------------------- 소단원 렌더 ----------------------------- */
  function uiOf(id) { return UIMAP[id] || null; }

  function sceneHTML(v) {
    if (!v || !window.HUB_SCENE) return '';
    const svg = window.HUB_SCENE.render(v);
    if (!svg) return '';
    return '<div class="scene">' +
      '<div class="sc-head"><span class="sc-t">' + esc(v.t || '') + '</span>' +
      '<span class="sc-tag">' + esc(window.HUB_SCENE.tag(v.type)) + '</span></div>' +
      '<div class="sc-body">' + svg + '</div>' +
      (v.note ? '<button type="button" class="sc-note-btn" data-scn="1">💬 한 줄 해석</button><div class="sc-note">' + fmt(v.note) + '</div>' : '') +
      '</div>';
  }

  function termShort(t, ui, i) {
    if (ui && ui.keys && ui.keys[i]) return ui.keys[i];
    const d = String(t.d || '').replace(/\*\*/g, '');
    return { i: '•', s: d.split(/[.。]/)[0].slice(0, 24) };
  }
  function ptShort(u, ui, i) {
    if (ui && ui.pts && ui.pts[i]) return ui.pts[i];
    const p = String((u.points || [])[i] || '').replace(/\*\*/g, '');
    return p.split(/[.。]/)[0].slice(0, 26);
  }

  function renderUnit(sub, u) {
    const idx = sub.units.findIndex((x) => x.id === u.id);
    const ui = uiOf(u.id);
    const banner = ui && ui.banner && window.HUB_SCENE ? window.HUB_SCENE.render(ui.banner) : '';
    $('#unitHead').innerHTML = `
      <div class="row" style="gap:6px;flex-wrap:wrap">
        <span class="pill" style="border-color:${sub.color};color:${sub.color};font-weight:900">${esc(sub.name)}</span>
        <span class="pill">${esc(u.no)}</span>
        <span class="pill">${ddayText(sub.examISO)}</span>
        ${isDone(u.id) ? '<span class="pill" style="background:var(--ok);border-color:var(--ok);color:#fff">완료</span>' : ''}
      </div>
      <h1 style="margin-top:8px">${esc(u.title)}</h1>
      ${ui && ui.form ? `<div class="formula"><span class="f-lbl">한 줄 공식</span><span class="f-v">${fmt(ui.form)}</span></div>` : ''}
      ${banner ? `<div class="basic-hero">${banner}</div>` : ''}`;

    // 기초 개념 — 초압축 스캔 카드
    const keys = (u.terms || []).map((t, i) => {
      const k = termShort(t, ui, i);
      return `<button type="button" class="key" data-kx="${i}">
        <span class="k-top"><span class="k-ic">${esc(k.i || '•')}</span><span class="k-name">${esc(t.t)}</span><span class="k-plus">+</span></span>
        <span class="k-short">${esc(k.s)}</span>
        <span class="k-more"><span class="k-def">${fmt(t.d)}</span>${t.a ? `<span class="k-ex">💡 ${fmt(t.a)}</span>` : ''}</span>
      </button>`;
    }).join('');
    const ptLines = (ui && ui.pts && ui.pts.length)
      ? ui.pts
      : (u.points || []).slice(0, 3).map((p, i) => ptShort(u, ui, i));
    const pts = ptLines.map((s, i) =>
      `<div class="pt"><span class="pt-n">${i + 1}</span><span>${esc(s)}</span></div>`).join('');
    const fullPts = (u.points || []).map((p) => `<li>${fmt(p)}</li>`).join('');
    $('#tab-basic').innerHTML =
      `<div class="blk-head"><h3>핵심 용어</h3><span>탭하면 설명</span></div>
       <div class="key-grid">${keys}</div>
       <div class="blk-head"><h3>핵심 포인트</h3><span>${ptLines.length}줄 요약</span></div>
       <div class="pt-list">${pts}</div>
       <button type="button" class="btn btn-ghost full" id="ptAllBtn">📄 원문 포인트 전체 보기</button>
       <div class="pt-full hidden" id="ptFull"><ul class="kp">${fullPts}</ul></div>
       <button type="button" class="vis-cta" id="goVisual"><span class="vc-ic">🖼</span><span class="grow" style="text-align:left"><b>시각 도식으로 한눈에</b><span class="vc-sub">그림 ${((ui && ui.scenes) || []).length}개 · 구조부터 잡기</span></span><span class="vc-ar">›</span></button>`;

    // 시각 도식 — SVG 장면
    const scenes = (ui && ui.scenes) || [];
    const vis = scenes.length
      ? scenes.map(sceneHTML).join('')
      : (u.visuals || []).map((v) => renderVisual(v)).join('');
    $('#tab-visual').innerHTML = (vis || '<div class="empty">시각 자료 준비 중</div>') +
      '<div class="vis-hint">그림을 덮고 스스로 다시 그려 보세요</div>';

    // 심화·함정 — ❌ vs ⭕ 대비 칩
    const deep = (u.deep || []).map((d) => `
      <div class="deep-card">
        <div class="dc-h"><span class="dc-n">🎯</span><span>${fmt(d.h)}</span></div>
        ${d.trap ? `<div class="chip bad"><span class="ch-i">❌</span><span><b>흔한 오답</b> ${fmt(d.trap)}</span></div>` : ''}
        ${d.tip ? `<div class="chip good"><span class="ch-i">⭕</span><span><b>시험 정답</b> ${fmt(d.tip)}</span></div>` : ''}
        ${d.b ? `<button type="button" class="dc-more-btn" data-dc="1">왜 그런가? +</button><div class="dc-b">${fmt(d.b)}</div>` : ''}
      </div>`).join('');
    $('#tab-deep').innerHTML = deep || '<div class="empty">준비 중</div>';

    // 퀴즈
    $('#tab-quiz').innerHTML = renderQuiz(u);

    $$('#unitTabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === (route.tab || 'basic')));
    ['basic', 'visual', 'deep', 'quiz'].forEach((t) => $('#tab-' + t).classList.toggle('hidden', t !== (route.tab || 'basic')));
    $('#unitHead').classList.toggle('compact', (route.tab || 'basic') !== 'basic');

    // 이전/다음
    const prev = sub.units[idx - 1], next = sub.units[idx + 1];
    $('#unitPrevBtn').disabled = !prev;
    $('#unitPrevBtn').style.opacity = prev ? 1 : .45;
    $('#unitNextBtn').disabled = !next;
    $('#unitNextBtn').style.opacity = next ? 1 : .45;
    $('#unitPrevBtn').onclick = () => prev && goUnit(prev.id, true, true);
    $('#unitNextBtn').onclick = () => next && goUnit(next.id, true, true);
    const doneBtn = $('#unitDoneBtn');
    doneBtn.textContent = isDone(u.id) ? '✓ 완료 취소' : '학습 완료';
    doneBtn.onclick = () => {
      if (isDone(u.id)) { delete state.done[u.id]; toast('완료를 취소했어요'); }
      else { state.done[u.id] = Date.now(); toast('소단원 학습 완료! 🎉'); }
      save(); renderUnit(sub, u);
    };

    const pv = $('#goVisual');
    if (pv) pv.onclick = () => setTab('visual');
    const pa = $('#ptAllBtn');
    if (pa) pa.onclick = () => {
      const b = $('#ptFull');
      const open = b.classList.contains('hidden');
      b.classList.toggle('hidden', !open);
      pa.textContent = open ? '📄 원문 포인트 접기' : '📄 원문 포인트 전체 보기';
    };

    bindQuiz(u);
  }

  /* ----------------------------- 시각 도식 렌더러 ----------------------------- */
  function visWrap(v, body) {
    return `<div class="vis">
      <div class="vis-title"><span>${esc(v.title || '')}</span><span class="vt-tag">${visTag(v.type)}</span></div>
      <div class="vis-body">${body}</div>
      ${v.note ? `<div class="vis-note">${fmt(v.note)}</div>` : ''}
    </div>`;
  }
  function visTag(t) {
    return { flow: '흐름도', compare: '비교표', bars: '막대그래프', line: '꺾은선', timeline: '타임라인', tree: '구조도', cycle: '순환도', quadrant: '2×2 매트릭스', spectrum: '스펙트럼', gloss: '원문·직역', stats: '핵심 수치', layers: '층위도', steps: '단계' }[t] || '도식';
  }

  function renderVisual(v) {
    if (!v) return '';
    try {
      switch (v.type) {
        case 'flow': return visWrap(v, renderFlow(v));
        case 'compare': return visWrap(v, renderCompare(v));
        case 'bars': return visWrap(v, renderBars(v));
        case 'line': return visWrap(v, renderLine(v));
        case 'timeline': return visWrap(v, renderTimeline(v));
        case 'tree': return visWrap(v, renderTree(v));
        case 'cycle': return visWrap(v, renderCycle(v));
        case 'quadrant': return visWrap(v, renderQuadrant(v));
        case 'spectrum': return visWrap(v, renderSpectrum(v));
        case 'gloss': return visWrap(v, renderGloss(v));
        case 'stats': return visWrap(v, renderStats(v));
        case 'layers': return visWrap(v, renderLayers(v));
        default: return visWrap(v, `<div class="small sub">${fmt(v.note || '')}</div>`);
      }
    } catch (e) {
      return visWrap(v, '<div class="small muted">도식을 표시할 수 없습니다.</div>');
    }
  }

  function renderFlow(v) {
    const steps = (v.steps || []).map((s, i) => `
      <div class="flow-step" data-flow-step>
        <div><span class="fs-k">${esc(s.k || (i + 1))}</span><span class="fs-t">${fmt(s.t)}</span></div>
        <div class="fs-d">${fmt(s.d || '')}</div>
      </div>`);
    const arrow = '<div class="flow-arrow">▼</div>';
    if (v.dir === 'h') {
      return `<div class="flow-track">${steps.map((s, i) => s + (i < steps.length - 1 ? '<div class="flow-arrow">▶</div>' : '')).join('')}</div>
        <div class="gloss-hint" style="margin-top:7px">단계를 누르면 설명이 펼쳐집니다</div>`;
    }
    return `<div class="flow">${steps.join(arrow)}</div>
      <div class="gloss-hint" style="margin-top:7px">단계를 누르면 설명이 펼쳐집니다</div>`;
  }

  function renderCompare(v) {
    const cols = v.cols || [];
    const head = `<thead><tr>${cols.map((c, i) => `<th${i === 0 ? ' style="min-width:64px"' : ''}>${fmt(c)}</th>`).join('')}</tr></thead>`;
    const rows = (v.rows || []).map((r) => `<tr>${r.map((c, i) => i === 0 ? `<th>${fmt(c)}</th>` : `<td>${fmt(c)}</td>`).join('')}</tr>`).join('');
    return `<div class="cmp-wrap"><table class="cmp">${head}<tbody>${rows}</tbody></table></div>`;
  }

  function renderBars(v) {
    const items = v.items || [];
    const max = v.max || Math.max.apply(null, items.map((x) => x.value).concat([1])) * 1.08;
    return `<div class="bars">${items.map((it, i) => {
      const w = Math.max(3, (it.value / max) * 100);
      const cls = ['', 'alt', 'alt2', 'alt3'][i % 4];
      return `<div class="bar-row ${cls}">
        <div class="bl">${fmt(it.label)}</div>
        <div class="bar-track"><i style="width:${w.toFixed(1)}%">${fmt(it.text || (it.value + (v.unit || '')))}</i></div>
      </div>${it.note ? `<div class="bar-row"><div></div><div class="bn">${fmt(it.note)}</div></div>` : ''}`;
    }).join('')}</div>${v.caption ? `<div class="vis-note">${fmt(v.caption)}</div>` : ''}`;
  }

  function renderLine(v) {
    const W = 320, H = 138, P = 22, PB = 24;
    const series = (v.series || []).map((s) => s.pts || []);
    const all = series.reduce((a, b) => a.concat(b), []);
    const yMin = v.yMin != null ? v.yMin : Math.min.apply(null, all.concat([0]));
    const yMax = v.yMax != null ? v.yMax : Math.max.apply(null, all.concat([1]));
    const n = Math.max(1, (v.x || []).length - 1);
    const scaleX = (i) => P + (i * (W - P - 8)) / n;
    const scaleY = (val) => H - PB - ((val - yMin) / (yMax - yMin || 1)) * (H - PB - 10);
    const colors = ['var(--accent)', 'var(--sci)', 'var(--warn)'];
    const paths = series.map((pts, si) => {
      const d = pts.map((val, i) => `${i ? 'L' : 'M'}${scaleX(i).toFixed(1)},${scaleY(val).toFixed(1)}`).join(' ');
      const dots = pts.map((val, i) => `<circle cx="${scaleX(i).toFixed(1)}" cy="${scaleY(val).toFixed(1)}" r="2.6" fill="${colors[si % 3]}"></circle>`).join('');
      return `<path d="${d}" fill="none" stroke="${colors[si % 3]}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" opacity=".95"></path>${dots}`;
    }).join('');
    const xlab = (v.x || []).map((x, i) => `<text x="${scaleX(i).toFixed(1)}" y="${H - 8}" font-size="8" fill="var(--muted)" text-anchor="middle">${esc(x)}</text>`).join('');
    const gridY = [0, .5, 1].map((f) => {
      const val = yMin + (yMax - yMin) * f, y = scaleY(val);
      return `<line x1="${P - 4}" x2="${W - 6}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--grid)" stroke-width=".7" stroke-dasharray="2 3"></line>
        <text x="2" y="${(y + 2.5).toFixed(1)}" font-size="7.5" fill="var(--muted)">${Math.round(val * 10) / 10}</text>`;
    }).join('');
    const legend = (v.series || []).map((s, i) => `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:9px;font-size:10px;font-weight:800;color:var(--sub)"><i style="width:9px;height:3px;border-radius:2px;background:${colors[i % 3]};display:inline-block"></i>${esc(s.name)}</span>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block">${gridY}${paths}${xlab}</svg>
      <div style="margin-top:4px">${legend}${v.yLabel ? `<span class="tiny muted">(${esc(v.yLabel)})</span>` : ''}</div>${v.caption ? `<div class="vis-note">${fmt(v.caption)}</div>` : ''}`;
  }

  function renderTimeline(v) {
    return `<div class="tl">${(v.items || []).map((it) => `
      <div class="tl-item ${it.mark ? 'mark' : ''}">
        <div class="tw">${fmt(it.when)}</div>
        <div class="tt">${fmt(it.t)}</div>
        ${it.d ? `<div class="td">${fmt(it.d)}</div>` : ''}
      </div>`).join('')}</div>`;
  }

  function renderTree(v) {
    const branches = (v.branches || []).map((b) => `
      <div class="tree-branch"><div class="tb-t">${fmt(b.t)}</div>
        ${(b.leaves || []).length ? `<div class="tb-l">${b.leaves.map((l) => `<span>${fmt(l)}</span>`).join('')}</div>` : ''}
        ${b.d ? `<div class="tiny muted" style="margin-top:5px">${fmt(b.d)}</div>` : ''}
      </div>`).join('');
    return `<div class="tree-root">${fmt(v.root)}</div><div class="tree-stem"></div><div class="tree-branches">${branches}</div>`;
  }

  function renderCycle(v) {
    const nodes = v.nodes || [];
    const S = 240, cx = S / 2, cy = S / 2, R = 82;
    const pos = nodes.map((_, i) => {
      const a = (-Math.PI / 2) + (i * 2 * Math.PI) / nodes.length;
      return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
    });
    const arcs = pos.map((p, i) => {
      const q = pos[(i + 1) % pos.length];
      const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
      const k = 0.18;
      const cX = cx + (mx - cx) * (1 - k), cY = cy + (my - cy) * (1 - k);
      return `<path d="M${p.x.toFixed(1)},${p.y.toFixed(1)} Q${cX.toFixed(1)},${cY.toFixed(1)} ${q.x.toFixed(1)},${q.y.toFixed(1)}" fill="none" stroke="var(--accent)" stroke-width="1.6" opacity=".55" marker-end="url(#ah)"></path>`;
    }).join('');
    const boxes = pos.map((p, i) => {
      const n = nodes[i];
      const w = 74, h = 30;
      return `<g><rect x="${(p.x - w / 2).toFixed(1)}" y="${(p.y - h / 2).toFixed(1)}" width="${w}" height="${h}" rx="8" fill="var(--tile)" stroke="var(--border)"></rect>
        <text x="${p.x.toFixed(1)}" y="${(p.y + 3.5).toFixed(1)}" font-size="9.5" font-weight="800" fill="var(--text)" text-anchor="middle">${esc(n.t)}</text></g>`;
    }).join('');
    const center = v.center ? `<text x="${cx}" y="${cy + 3}" font-size="10" font-weight="900" fill="var(--muted)" text-anchor="middle">${esc(v.center)}</text>` : '';
    const desc = nodes.map((n) => n.d ? `<div class="tiny" style="margin-top:5px;color:var(--sub);line-height:1.55"><b>${esc(n.t)}</b> — ${fmt(n.d)}</div>` : '').join('');
    return `<svg viewBox="0 0 ${S} ${S}" style="width:100%;max-width:280px;height:auto;display:block;margin:0 auto">
      <defs><marker id="ah" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="var(--accent)" opacity=".7"></path></marker></defs>
      ${arcs}${center}${boxes}</svg><div>${desc}</div>`;
  }

  function renderQuadrant(v) {
    const S = 250, pad = 26;
    const items = (v.items || []).map((it) => {
      const x = pad + Math.max(0, Math.min(1, it.x)) * (S - pad * 2);
      const y = (S - pad) - Math.max(0, Math.min(1, it.y)) * (S - pad * 2);
      return `<g><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.5" fill="${it.c || 'var(--accent)'}" opacity=".9"></circle>
        <text x="${x.toFixed(1)}" y="${(y - 8).toFixed(1)}" font-size="8.5" font-weight="800" fill="var(--text)" text-anchor="middle">${esc(it.t)}</text></g>`;
    }).join('');
    const q = v.q || ['', '', '', ''];
    return `<svg viewBox="0 0 ${S} ${S}" style="width:100%;max-width:290px;height:auto;display:block;margin:0 auto">
      <rect x="${pad}" y="${pad}" width="${S - pad * 2}" height="${S - pad * 2}" fill="none" stroke="var(--border)"></rect>
      <line x1="${S / 2}" y1="${pad}" x2="${S / 2}" y2="${S - pad}" stroke="var(--grid)" stroke-dasharray="3 3"></line>
      <line x1="${pad}" y1="${S / 2}" x2="${S - pad}" y2="${S / 2}" stroke="var(--grid)" stroke-dasharray="3 3"></line>
      <text x="${pad + (S - pad * 2) / 4}" y="${pad + 11}" font-size="7.5" fill="var(--muted)" text-anchor="middle">${esc(q[0])}</text>
      <text x="${pad + (S - pad * 2) * 3 / 4}" y="${pad + 11}" font-size="7.5" fill="var(--muted)" text-anchor="middle">${esc(q[1])}</text>
      <text x="${pad + (S - pad * 2) / 4}" y="${S - pad - 4}" font-size="7.5" fill="var(--muted)" text-anchor="middle">${esc(q[2])}</text>
      <text x="${pad + (S - pad * 2) * 3 / 4}" y="${S - pad - 4}" font-size="7.5" fill="var(--muted)" text-anchor="middle">${esc(q[3])}</text>
      <text x="${S - 4}" y="${S / 2 + 3}" font-size="7.5" fill="var(--sub)" text-anchor="end" font-weight="800">${esc(v.xlab || '')} →</text>
      <text x="${S / 2}" y="12" font-size="7.5" fill="var(--sub)" text-anchor="middle" font-weight="800">↑ ${esc(v.ylab || '')}</text>
      ${items}</svg>${v.caption ? `<div class="vis-note">${fmt(v.caption)}</div>` : ''}`;
  }

  function renderSpectrum(v) {
    const marks = (v.marks || []).map((m) => `<div class="mark" style="left:${(m.pos * 100).toFixed(1)}%"><b>${fmt(m.label)}</b><i></i><span>${fmt(m.d || '')}</span></div>`).join('');
    return `<div class="spectrum">
      <div class="end" style="left:0">${esc(v.left || '')}</div>
      <div class="end" style="right:0">${esc(v.right || '')}</div>
      <div class="line"></div>${marks}</div>${v.caption ? `<div class="vis-note">${fmt(v.caption)}</div>` : ''}`;
  }

  function renderGloss(v) {
    const lines = (v.lines || []).map((l) => `
      <div class="gloss-line" data-gloss>
        <div class="go">${(l.orig || '').split('**').map((seg, i) => i % 2 ? `<mark>${esc(seg)}</mark>` : esc(seg)).join('')}</div>
        ${l.read ? `<div class="gr">${esc(l.read)}</div>` : ''}
        ${l.trans ? `<div class="gt">${esc(l.trans)}</div>` : ''}
      </div>`).join('');
    return `<div class="row" style="justify-content:space-between;margin-bottom:7px">
        <span class="gloss-hint">줄을 누르면 현대어 풀이가 열립니다</span>
        <button type="button" class="btn" style="padding:5px 9px;font-size:10.5px" data-gloss-all>전체 보기</button>
      </div><div class="gloss">${lines}</div>${v.caption ? `<div class="vis-note">${fmt(v.caption)}</div>` : ''}`;
  }

  function renderStats(v) {
    return `<div class="stats">${(v.items || []).map((it) => `
      <div class="stat"><div class="sv">${fmt(it.v)}</div><div class="sl">${fmt(it.l)}</div>${it.d ? `<div class="tiny muted" style="margin-top:3px">${fmt(it.d)}</div>` : ''}</div>`).join('')}</div>`;
  }

  function renderLayers(v) {
    const total = (v.items || []).reduce((a, x) => a + (x.w || 1), 0) || 1;
    return `<div class="layers">${(v.items || []).map((it, i) => {
      const w = Math.max(28, ((it.w || 1) / total) * 100);
      return `<div class="layer" style="width:${w}%;opacity:${1 - i * 0.12}">${fmt(it.t)}${it.d ? ` <span style="font-weight:700;opacity:.85">· ${fmt(it.d)}</span>` : ''}</div>`;
    }).join('')}</div>${v.caption ? `<div class="vis-note">${fmt(v.caption)}</div>` : ''}`;
  }

  /* ----------------------------- 퀴즈 엔진 v2 ----------------------------- */
  const LV = { basic: '기초', real: '실전', deep: '심화' };
  const QS = { filter: 'all', onlyWrong: false, immediate: true };
  let sess = null;

  function renderQuiz(u) {
    const qs = (sess && sess.u.id === u.id) ? sess.u.quiz : (u.quiz || []);
    if (!qs.length) return '<div class="empty">퀴즈 준비 중</div>';
    const prev = state.quiz[u.id];
    const wrong = (state.wrong && state.wrong[u.id]) || [];
    const counts = { all: qs.length, basic: 0, real: 0, deep: 0 };
    qs.forEach((q) => { counts[q.lv || 'real']++; });
    return `<div class="quiz-toolbar">
        <div class="quiz-head">
          <div class="small strong">총 ${qs.length}문항</div>
          <div class="small muted tnum">${prev ? '최고 ' + prev.correct + '/' + prev.total : '미응시'}${wrong.length ? ' · 오답 ' + wrong.length : ''}</div>
        </div>
        <div class="filters" id="quizFilters">
          ${['all', 'basic', 'real', 'deep'].map((k) => `<button type="button" class="fchip ${QS.filter === k ? 'on' : ''}" data-filter="${k}">${k === 'all' ? '전체' : LV[k]}<span class="fc-n">${counts[k]}</span></button>`).join('')}
        </div>
        <div class="row" style="justify-content:space-between;margin-top:7px;gap:8px">
          <label class="switch"><input type="checkbox" id="immToggle" ${QS.immediate ? 'checked' : ''}><span>즉시 해설</span></label>
          <button type="button" class="btn" id="wrongOnlyBtn" style="padding:5px 9px;font-size:10.5px" ${wrong.length ? '' : 'disabled'}>오답만 다시 풀기${wrong.length ? ' (' + wrong.length + ')' : ''}</button>
        </div>
      </div>
      <div id="quizCards"></div>
      <div id="quizResult"></div>
      <div class="row" style="gap:8px;margin-top:10px">
        <button type="button" class="btn grow" id="quizResetBtn">전체 다시 풀기</button>
        <button type="button" class="btn btn-primary grow" id="quizShowAll">정답·해설 전체</button>
      </div>`;
  }

  function qCardHTML(q, i) {
    const lv = q.lv || 'real';
    const stem = `<div class="q-stem"><span class="q-lv lv-${lv}">${LV[lv]}</span><span class="qn">${i + 1}</span>${fmt(q.q)}</div>`;
    if (q.ox) {
      return `<div class="q-card" data-q="${i}">${stem}
        <div class="ox-row"><button type="button" class="ox-btn" data-oxv="O">O</button><button type="button" class="ox-btn" data-oxv="X">X</button></div>
        <div class="exp hidden"></div></div>`;
    }
    if (q.short) {
      return `<div class="q-card" data-q="${i}">${stem}
        <div class="short-row"><input type="text" class="short-input" placeholder="답 입력" data-short autocomplete="off"><button type="button" class="btn btn-primary" data-short-go>확인</button></div>
        <div class="exp hidden"></div></div>`;
    }
    return `<div class="q-card" data-q="${i}">${stem}
      <div class="opts">${(q.opts || []).map((o, oi) => `<button type="button" class="opt" data-op="${oi}"><span class="ok-mark">${'①②③④⑤'[oi] || '-'}</span><span>${fmt(o)}</span></button>`).join('')}</div>
      <div class="exp hidden"></div></div>`;
  }

  function bindQuiz(u) {
    const pane = $('#tab-quiz');
    if (!pane) return;
    const all = u.quiz || [];
    if (!all.length) return;

    if (!sess || sess.uid !== u.id) {
      sess = { uid: u.id, u, answered: {}, right: {}, wrongIdx: [], done: false };
    }

    const norm = (s) => String(s || '').replace(/\s+/g, '').replace(/[.,!?~]/g, '').toLowerCase();

    function visibleIdx() {
      let idx = all.map((_, i) => i);
      idx = idx.filter((i) => QS.filter === 'all' || (all[i].lv || 'real') === QS.filter);
      if (QS.onlyWrong) {
        const w = (state.wrong && state.wrong[u.id]) || [];
        idx = idx.filter((i) => w.indexOf(i) >= 0);
      }
      return idx;
    }

    function reveal(card, q, right) {
      card.querySelector('.exp').innerHTML = `<b>${right ? '정답입니다' : '오답'}</b> · 정답 ${q.ox ? (q.ans ? 'O' : 'X') : q.short ? esc((q.accept || []).slice(0, 2).join(' / ')) : ('②③④⑤①'[q.ans] || '')} — ${fmt(q.exp || '')}`;
      card.querySelector('.exp').classList.remove('hidden');
    }

    function record(card, idx, right, q) {
      if (sess.answered[idx]) return;
      sess.answered[idx] = true;
      if (right) sess.right[idx] = true; else sess.wrongIdx.push(idx);
      if (QS.immediate) reveal(card, q, right);
      if (!right) {
        state.wrong = state.wrong || {};
        const set = new Set(state.wrong[u.id] || []);
        set.add(idx);
        state.wrong[u.id] = Array.from(set);
        save();
        const wt = document.querySelector('#wrongOnlyBtn');
        if (wt) {
          const n = (state.wrong[u.id] || []).length;
          wt.disabled = !n;
          wt.textContent = '오답만 다시 풀기' + (n ? ' (' + n + ')' : '');
        }
      }
      updateProgressBar();
      if (visibleIdx().every((i) => sess.answered[i])) finish();
    }

    function updateProgressBar() {
      const idxs = visibleIdx();
      const answered = idxs.filter((i) => sess.answered[i]).length;
      const el = $('#quizProgressText');
      if (el) el.textContent = answered + ' / ' + idxs.length;
      const bar = $('#quizProgressBar');
      if (bar) bar.style.width = (idxs.length ? (answered / idxs.length) * 100 : 0) + '%';
    }

    function finish() {
      const idxs = visibleIdx();
      const correct = idxs.filter((i) => sess.right[i]).length;
      const total = idxs.length;
      const pct = total ? Math.round((correct / total) * 100) : 0;
      const prev = state.quiz[u.id];
      const better = !prev || correct * (prev.total || 1) > prev.correct * total || (prev && correct === prev.correct && total > prev.total);
      if (better) state.quiz[u.id] = { correct, total, at: Date.now() };
      // 정답을 맞힌 문항은 오답 목록에서 제거
      const w = new Set(state.wrong[u.id] || []);
      idxs.forEach((i) => { if (sess.right[i]) w.delete(i); });
      state.wrong[u.id] = Array.from(w);
      save();
      const res = $('#quizResult');
      if (!res) return;
      res.innerHTML = `<div class="quiz-result" style="margin-top:8px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
          <div>결과 <b>${correct} / ${total}</b> (${pct}%)</div>
          <div class="pill" style="background:${pct === 100 ? 'var(--ok)' : 'var(--tile)'};border-color:${pct === 100 ? 'var(--ok)' : 'var(--border)'};color:${pct === 100 ? '#fff' : 'var(--sub)'}">${pct === 100 ? '만점' : pct >= 80 ? '우수' : pct >= 60 ? '보통' : '복습 필요'}</div>
        </div>
        <div style="margin-top:5px;font-weight:700;color:var(--sub)">${pct === 100 ? '이 단원은 시험장에서 그대로 나옵니다. 완벽해요! 🎉' : pct >= 80 ? '틀린 문항만 ' + (total - correct) + '개 다시 확인하면 1등급권입니다.' : '해설을 읽고 오답만 다시 풀어 보세요.'}</div>
        ${pct === 100 && !isDone(u.id) ? '<div style="margin-top:7px"><button type="button" class="btn btn-ok" id="quizDoneBtn">학습 완료로 표시</button></div>' : ''}
        ${(state.wrong[u.id] || []).length && pct !== 100 ? '<div style="margin-top:7px"><button type="button" class="btn" id="againWrongBtn">오답 ' + state.wrong[u.id].length + '개 다시 풀기</button></div>' : ''}
      </div>`;
      const db = $('#quizDoneBtn');
      if (db) db.onclick = () => { state.done[u.id] = Date.now(); save(); toast('학습 완료! 🎉'); goUnit(u.id, false); };
      const aw = $('#againWrongBtn');
      if (aw) aw.onclick = () => { QS.onlyWrong = true; QS.filter = 'all'; sess = null; goUnit(u.id, false); setTab('quiz'); };
    }

    function drawCards() {
      const idxs = visibleIdx();
      const box = $('#quizCards');
      if (!box) return;
      if (!idxs.length) {
        box.innerHTML = '<div class="empty">이 조건에 해당하는 문항이 없습니다</div>';
        updateProgressBar();
        return;
      }
      box.innerHTML = `<div class="quiz-progress">
          <div class="row" style="justify-content:space-between"><span class="tiny muted strong">진행</span><span class="tiny strong tnum" id="quizProgressText">0 / ${idxs.length}</span></div>
          <div class="bar" style="margin-top:4px"><i id="quizProgressBar" style="width:0%"></i></div>
        </div>` + idxs.map((i) => qCardHTML(all[i], i)).join('');

      idxs.forEach((i) => {
        const q = all[i];
        const card = box.querySelector('[data-q="' + i + '"]');
        if (!card) return;
        const isDone = !!sess.answered[i];
        if (q.ox) {
          card.querySelectorAll('[data-oxv]').forEach((btn) => {
            if (isDone) {
              if ((btn.dataset.oxv === 'O') === !!q.ans) btn.classList.add('right');
              else if (sess.right[i] === false) btn.classList.add('wrong');
              return;
            }
            btn.addEventListener('click', () => {
              const picked = btn.dataset.oxv === 'O';
              const right = picked === !!q.ans;
              if (right) btn.classList.add('right'); else {
                btn.classList.add('wrong');
                card.querySelectorAll('[data-oxv]').forEach((b) => { if ((b.dataset.oxv === 'O') === !!q.ans) b.classList.add('right'); });
              }
              record(card, i, right, q);
            });
          });
          if (isDone && QS.immediate) reveal(card, q, !!sess.right[i]);
        } else if (q.short) {
          const input = card.querySelector('[data-short]');
          const go = card.querySelector('[data-short-go]');
          if (isDone) {
            input.disabled = true; go.disabled = true;
            input.value = sess.shortAns && sess.shortAns[i] != null ? sess.shortAns[i] : '';
          }
          const submit = () => {
            if (sess.answered[i]) return;
            const val = input.value;
            sess.shortAns = sess.shortAns || {};
            sess.shortAns[i] = val;
            const accept = (q.accept || []).map(norm);
            const right = accept.indexOf(norm(val)) >= 0 || accept.some((a) => a && norm(val).indexOf(a) >= 0);
            input.classList.add(right ? 'right' : 'wrong');
            go.disabled = true;
            record(card, i, right, q);
          };
          go.addEventListener('click', submit);
          input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
          if (isDone && QS.immediate) reveal(card, q, !!sess.right[i]);
        } else {
          card.querySelectorAll('[data-op]').forEach((btn) => {
            const oi = +btn.dataset.op;
            if (isDone) {
              if (oi === q.ans) btn.classList.add('right');
              if (sess.pick && sess.pick[i] === oi && oi !== q.ans) btn.classList.add('wrong');
              return;
            }
            btn.addEventListener('click', () => {
              sess.pick = sess.pick || {};
              sess.pick[i] = oi;
              const right = oi === q.ans;
              if (right) btn.classList.add('right'); else btn.classList.add('wrong');
              card.querySelectorAll('[data-op]').forEach((b) => { if (+b.dataset.op === q.ans) b.classList.add('right'); });
              record(card, i, right, q);
            });
          });
          if (isDone && QS.immediate) reveal(card, q, !!sess.right[i]);
        }
      });
      updateProgressBar();
    }

    // 필터
    pane.querySelectorAll('#quizFilters [data-filter]').forEach((b) => b.addEventListener('click', () => {
      QS.filter = b.dataset.filter; QS.onlyWrong = false; sess = null;
      goUnit(u.id, false); setTab('quiz');
    }));
    const wt = $('#wrongOnlyBtn');
    if (wt) wt.addEventListener('click', () => { QS.onlyWrong = true; QS.filter = 'all'; sess = null; goUnit(u.id, false); setTab('quiz'); });
    const imm = $('#immToggle');
    if (imm) imm.addEventListener('change', () => {
      QS.immediate = imm.checked;
      if (QS.immediate) {
        Object.keys(sess.answered).forEach((k) => {
          const i = +k; const card = pane.querySelector('[data-q="' + i + '"]');
          if (card) reveal(card, all[i], !!sess.right[i]);
        });
      }
    });
    const sa = $('#quizShowAll');
    if (sa) sa.addEventListener('click', () => {
      visibleIdx().forEach((i) => {
        const q = all[i];
        const card = pane.querySelector('[data-q="' + i + '"]');
        if (!card) return;
        card.querySelector('.exp').innerHTML = `<b>정답</b> ${q.ox ? (q.ans ? 'O' : 'X') : q.short ? esc((q.accept || []).slice(0, 3).join(' / ')) : ('②③④⑤①'[q.ans] || '')} — ${fmt(q.exp || '')}`;
        card.querySelector('.exp').classList.remove('hidden');
        if (q.ox) card.querySelectorAll('[data-oxv]').forEach((b) => { if ((b.dataset.oxv === 'O') === !!q.ans) b.classList.add('right'); });
        else if (q.short) { const inp = card.querySelector('[data-short]'); if (inp) inp.value = (q.accept || [''])[0]; }
        else card.querySelectorAll('[data-op]').forEach((b) => { if (+b.dataset.op === q.ans) b.classList.add('right'); });
      });
    });
    const rb = $('#quizResetBtn');
    if (rb) rb.addEventListener('click', () => { QS.filter = 'all'; QS.onlyWrong = false; sess = null; goUnit(u.id, false); setTab('quiz'); });

    drawCards();
  }

  /* ----------------------------- 진도 화면 ----------------------------- */
  function renderProgress() {
    const o = overallStats();
    $('#progressSummary').innerHTML = `
      <div class="row" style="gap:14px">
        <div style="flex:0 0 auto">${ring(o.pct, 74, o.pct + '%', '완료').replace('rgba(255,255,255,.22)', 'var(--seg-bg)').replace('#7dd3fc', 'var(--accent)').replace('color:#fff', 'color:var(--text)')}</div>
        <div class="grow">
          <div class="small sub">완료 <b>${o.done}</b> / ${o.total} 소단원</div>
          <div class="bar" style="margin:8px 0"><i style="width:${o.pct}%"></i></div>
          <div class="small sub">퀴즈 응시 <b>${o.quizCount}</b>개 소단원 · 정답률 <b>${o.quizCount ? o.acc + '%' : '—'}</b></div>
        </div>
      </div>`;
    $('#progressBySubject').innerHTML = SUBJECTS.map((s) => {
      const st = subjectStats(s);
      return `<button type="button" class="card" style="text-align:left;width:100%" data-sub="${s.id}">
        <div class="row" style="justify-content:space-between">
          <div class="strong" style="font-size:12.5px">${s.emoji || ''} ${esc(s.name)}</div>
          <div class="tiny strong" style="color:${s.color}">${st.pct}%</div>
        </div>
        <div class="bar" style="margin-top:7px"><i style="width:${st.pct}%;background:${s.color}"></i></div>
        <div class="tiny muted" style="margin-top:5px">${st.done}/${st.total} 완료 · 퀴즈 ${st.quizCount ? st.acc + '%' : '미응시'} · ${ddayText(s.examISO)}</div>
      </button>`;
    }).join('');
    $$('#progressBySubject [data-sub]').forEach((b) => b.addEventListener('click', () => goSubject(b.dataset.sub, true)));

    const logs = Object.keys(state.quiz).map((id) => ({ id, q: state.quiz[id], hit: findUnit(id) })).filter((x) => x.hit);
    logs.sort((a, b) => (b.q.at || 0) - (a.q.at || 0));
    $('#quizLog').innerHTML = logs.length ? logs.map((l) => `
      <button type="button" class="unit-row" data-unit="${l.id}">
        <span class="unit-no" style="color:${l.hit.sub.color}">${esc(l.hit.unit.no)}</span>
        <span class="unit-name">${esc(l.hit.unit.title)}<span class="tiny muted" style="display:block;font-weight:700;margin-top:2px">${esc(l.hit.sub.name)}</span></span>
        <span class="pill" style="background:${l.q.correct === l.q.total ? 'var(--ok)' : 'var(--tile)'};color:${l.q.correct === l.q.total ? '#fff' : 'var(--sub)'};border-color:${l.q.correct === l.q.total ? 'var(--ok)' : 'var(--border)'}">${l.q.correct}/${l.q.total}</span>
      </button>`).join('') : '<div class="empty">아직 퀴즈 기록이 없습니다</div>';
    $$('#quizLog [data-unit]').forEach((b) => b.addEventListener('click', () => goUnit(b.dataset.unit, true)));
  }

  /* ----------------------------- 이벤트 ----------------------------- */
  document.addEventListener('click', (e) => {
    const key = e.target.closest('[data-kx]');
    if (key) { if (e.target.closest('.k-more')) return; key.classList.toggle('open'); return; }
    const dcm = e.target.closest('[data-dc]');
    if (dcm) {
      const card = dcm.closest('.deep-card');
      card.classList.toggle('open');
      dcm.textContent = card.classList.contains('open') ? '설명 접기 −' : '왜 그런가? +';
      return;
    }
    const scn = e.target.closest('[data-scn]');
    if (scn) {
      const sc = scn.closest('.scene');
      sc.classList.toggle('open');
      scn.textContent = sc.classList.contains('open') ? '해석 접기' : '💬 한 줄 해석';
      return;
    }
    const step = e.target.closest('[data-flow-step]');
    if (step) { step.classList.toggle('open'); return; }
    const gl = e.target.closest('[data-gloss]');
    if (gl) { gl.classList.toggle('open'); return; }
    const all = e.target.closest('[data-gloss-all]');
    if (all) {
      const box = all.closest('.vis-body');
      const open = box.querySelectorAll('.gloss-line.open').length === 0;
      box.querySelectorAll('.gloss-line').forEach((l) => l.classList.toggle('open', open));
      all.textContent = open ? '전체 접기' : '전체 보기';
    }
  });

  $('#backBtn').addEventListener('click', () => {
    if (route.view === 'unit') {
      const hit = findUnit(route.uid);
      hit ? goSubject(hit.sub.id, false) : goHome(false);
    } else if (route.view === 'subject') goHome(false);
    else goHome(false);
  });
  $('#themeBtn').addEventListener('click', cycleTheme);
  $$('#unitTabs button').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
  $$('nav.bottom button[data-nav]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.nav === 'home') goHome(true); else goProgress(true);
  }));
  $('#resetBtn').addEventListener('click', () => {
    if (!confirm('학습 완료 체크와 퀴즈 기록을 모두 지울까요? (되돌릴 수 없습니다)')) return;
    state.done = {}; state.quiz = {}; save(); renderProgress(); toast('진도를 초기화했습니다');
  });
  window.addEventListener('popstate', () => {
    // 해시 없는 히스토리: 간단히 홈으로 복귀 (앱 내 내비게이션 유지)
    if (route.view === 'unit') {
      const hit = findUnit(route.uid); if (hit) return goSubject(hit.sub.id, false);
    }
    if (route.view === 'subject') return goHome(false);
    goHome(false);
  });

  /* ----------------------------- 부트 ----------------------------- */
  applyTheme(state.theme || 'light');
  goHome(false);
  if (state.lastSubject && !state.lastUnit) { /* 홈 유지 */ }
  window.HUB_GO = { home: goHome, subject: goSubject, unit: goUnit };
})();
