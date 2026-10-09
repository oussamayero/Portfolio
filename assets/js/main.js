(function () {
  var d = document;
  var rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var save = navigator.connection && navigator.connection.saveData;

  /* en-tête */
  var hdr = d.getElementById('hdr');
  function onScroll() { hdr.classList.toggle('solid', window.scrollY > 40); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* vidéos : lecture seulement si visibles, sans réduction de mouvement, sans pause demandée */
  var vids = [].slice.call(d.querySelectorAll('video'));
  var paused = new WeakSet();
  function label(v) {
    [].slice.call(d.querySelectorAll('[data-video-toggle="' + v.id + '"]')).forEach(function (b) {
      var isP = v.paused;
      b.textContent = isP ? 'Lecture' : (v.id === 'bg-video' ? 'Pause vidéo' : 'Pause');
      b.setAttribute('aria-pressed', isP ? 'true' : 'false');
    });
  }
  function sync(v) {
    if (v._vis === false || paused.has(v) || rm || save) { v.pause(); }
    else { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    label(v);
  }
  vids.forEach(function (v) {
    v._vis = true;
    if (rm || save) { v.removeAttribute('autoplay'); v.pause(); }
    v.addEventListener('play', function () { label(v); });
    v.addEventListener('pause', function () { label(v); });
    label(v);
  });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target._vis = e.isIntersecting; sync(e.target); });
    }, { threshold: 0.2 });
    vids.forEach(function (v) { io.observe(v); });
  }
  [].slice.call(d.querySelectorAll('[data-video-toggle]')).forEach(function (b) {
    b.addEventListener('click', function () {
      var v = d.getElementById(b.getAttribute('data-video-toggle'));
      if (!v) return;
      if (v.paused) { paused.delete(v); var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      else { paused.add(v); v.pause(); }
      label(v);
    });
  });

  /* scène : timecode et tête de lecture synchronisés avec la vidéo */
  var sv = d.getElementById('stage-video'), ph = d.getElementById('playhead'), tc = d.getElementById('tc');
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function fmt(t) { return '00:' + p2(Math.floor(t / 60)) + ':' + p2(Math.floor(t) % 60) + ':' + p2(Math.floor((t % 1) * 24)); }
  function tick() {
    if (!sv || !ph || !tc) return;
    var dur = sv.duration || 4.04;
    ph.style.left = Math.min(100, (sv.currentTime / dur) * 100) + '%';
    tc.textContent = fmt(sv.currentTime);
    if (!sv.paused) requestAnimationFrame(tick);
  }
  if (sv) {
    sv.addEventListener('play', tick);
    sv.addEventListener('seeked', tick);
    sv.addEventListener('timeupdate', function () { if (sv.paused) tick(); });
  }

  /* scène : mise en avant d'une couche */
  var stage = d.getElementById('stage');
  var tabs = [].slice.call(d.querySelectorAll('[role="tab"]'));
  var caps = [].slice.call(d.querySelectorAll('.caps p'));
  function pick(i, focus) {
    tabs.forEach(function (t, j) { t.setAttribute('aria-selected', j === i ? 'true' : 'false'); t.tabIndex = j === i ? 0 : -1; });
    var layer = tabs[i].getAttribute('data-layer');
    stage.setAttribute('data-layer', layer);
    caps.forEach(function (c) { c.hidden = c.getAttribute('data-layer') !== layer; });
    if (focus) tabs[i].focus();
  }
  if (tabs.length) {
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { pick(i); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); pick(n, true); }
      });
    });
    pick(0);
  }

  /* planche de plans : cliquer un plan lit la vidéo à cet endroit */
  var mv = d.getElementById('motion-video');
  var frs = [].slice.call(d.querySelectorAll('.fr'));
  function mark() {
    if (!mv) return;
    var dur = mv.duration || 4.04;
    var idx = Math.min(frs.length - 1, Math.floor((mv.currentTime / dur) * frs.length));
    frs.forEach(function (f, i) { f.setAttribute('aria-current', i === idx ? 'true' : 'false'); });
  }
  if (mv) mv.addEventListener('timeupdate', mark);
  frs.forEach(function (f) {
    f.addEventListener('click', function () {
      if (!mv) return;
      mv.currentTime = parseFloat(f.getAttribute('data-t'));
      paused.delete(mv);
      var p = mv.play(); if (p && p.catch) p.catch(function () {});
      mark();
    });
  });

  /* copie de l'adresse */
  var cb = d.getElementById('copy-mail'), mt = d.getElementById('mail-text');
  function selectText() {
    var r = d.createRange(); r.selectNodeContents(mt);
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  if (cb && mt) {
    cb.addEventListener('click', function () {
      var done = function () { cb.textContent = 'Copié'; setTimeout(function () { cb.textContent = "Copier l'adresse"; }, 1800); };
      try { navigator.clipboard.writeText(mt.textContent).then(done, selectText); }
      catch (e) { selectText(); }
    });
  }
})();
