/* ==========================================================================
   기적패스 보강 적용기
   data/boost-*.js 의 HUB_BOOST 를 기존 소단원·문제은행에 합친다.
   로드 순서: meta → visuals → 과목 → q-* → boost-* → boost-apply → scene → app
   ========================================================================== */
(function () {
  'use strict';
  var B = window.HUB_BOOST || {};

  (window.HUB_SUBJECTS || []).forEach(function (s) {
    var bs = B[s.id];
    if (!bs) return;
    (s.units || []).forEach(function (u) {
      var b = bs[u.id];
      if (!b) return;
      if (b.terms && b.terms.length) u.terms = (u.terms || []).concat(b.terms);
      if (b.points && b.points.length) u.points = (u.points || []).concat(b.points);
      if (b.deep && b.deep.length) u.deep = (u.deep || []).concat(b.deep);
      if (b.src) u.srcNote = b.src;
    });
  });

  window.HUB_QUIZ = window.HUB_QUIZ || {};
  Object.keys(B).forEach(function (sid) {
    var bs = B[sid] || {};
    Object.keys(bs).forEach(function (uid) {
      var b = bs[uid] || {};
      if (b.quiz && b.quiz.length) {
        window.HUB_QUIZ[uid] = (window.HUB_QUIZ[uid] || []).concat(b.quiz);
      }
    });
  });
})();
