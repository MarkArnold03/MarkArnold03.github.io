(() => {
  const d = document;
  const $ = (s, r = d) => r.querySelector(s);
  const $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  d.documentElement.classList.add('js');

  /* ---------- time together ---------- */
  const start = new Date(`${$('main').dataset.start}T00:00:00`);
  const pad = n => String(n).padStart(2, '0');
  const tick = () => {
    const s = Math.max(0, Math.floor((Date.now() - start) / 1000));
    $('.js-d').textContent = Math.floor(s / 86400);
    $('.js-h').textContent = pad(Math.floor(s / 3600) % 24);
    $('.js-m').textContent = pad(Math.floor(s / 60) % 60);
    $('.js-s').textContent = pad(s % 60);
  };
  tick();
  setInterval(tick, 1000);
  $('.js-date').textContent = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  /* ---------- reasons: a deck you go through one card at a time ---------- */
  const cards = $$('.cards li');
  const count = $('.count');
  let at = 0;
  const show = () => {
    cards.forEach((c, i) => {
      c.className = i === at ? 'top' : i === (at + 1) % cards.length ? 'under' : i === (at - 1 + cards.length) % cards.length ? 'gone' : '';
      c.setAttribute('aria-hidden', String(i !== at));
    });
    count.textContent = `${at + 1} / ${cards.length}`;
  };
  $('.next').addEventListener('click', () => { at = (at + 1) % cards.length; show(); });
  show();

  /* ---------- wishes ---------- */
  $$('.wishes button').forEach(b => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    if (on) hearts(8, b.getBoundingClientRect());
  }));

  /* ---------- hearts ---------- */
  const sky = $('.hearts');
  const COLORS = ['#e0244d', '#ff6fa5', '#ffb3cf', '#7b3fe4', '#a66bff'];
  function hearts(n, near) {
    if (reduce) return;
    for (let i = 0; i < n; i++) {
      const h = d.createElement('span');
      h.className = 'fh';
      h.textContent = '♥';
      h.style.left = near ? `${near.left + Math.random() * 60}px` : `${Math.random() * 100}%`;
      if (near) h.style.bottom = `${innerHeight - near.top}px`;
      h.style.color = COLORS[i % COLORS.length];
      h.style.fontSize = `${14 + Math.random() * 28}px`;
      h.style.setProperty('--dx', `${(Math.random() - 0.5) * 220}px`);
      h.style.setProperty('--r', `${(Math.random() - 0.5) * 90}deg`);
      h.style.animationDuration = `${near ? 1.6 + Math.random() : 3 + Math.random() * 3}s`;
      h.style.animationDelay = `${Math.random() * (near ? 0.2 : 1.2)}s`;
      h.addEventListener('animationend', () => h.remove());
      sky.append(h);
    }
  }

  /* ---------- letter: hold the heart to open ---------- */
  const hold = $('.hold');
  const ring = $('.ring', hold);
  const label = $('.hold-label', hold);
  const LEN = 2 * Math.PI * 54, NEED = 1400;
  let t0 = 0, raf = 0, done = false;
  const setRing = p => { ring.style.strokeDashoffset = LEN * (1 - p); };
  const open = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    hold.setAttribute('aria-expanded', 'true');
    $('.paper').classList.add('open');
    $('.letter').classList.add('opened');
    $('.paper').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    hearts(60);
  };
  const frame = now => {
    const p = Math.min(1, (now - t0) / NEED);
    setRing(p);
    if (p >= 1) open(); else raf = requestAnimationFrame(frame);
  };
  const press = e => {
    if (done || e.button > 0) return;
    e.preventDefault();
    hold.setPointerCapture?.(e.pointerId);
    hold.classList.add('pressing');
    label.textContent = 'Keep holding…';
    t0 = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const release = () => {
    if (done) return;
    cancelAnimationFrame(raf);
    hold.classList.remove('pressing');
    label.textContent = 'Hold the heart';
    setRing(0);
  };
  if (reduce) hold.addEventListener('click', open);
  else {
    hold.addEventListener('pointerdown', press);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => hold.addEventListener(ev, release));
    // Keyboard and screen readers: a plain activation opens it straight away.
    hold.addEventListener('click', e => { if (e.detail === 0) open(); });
  }
  hold.addEventListener('contextmenu', e => e.preventDefault());
})();
