(() => {
  const d = document;
  const $ = (s, r = d) => r.querySelector(s);
  const $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- split-flap board ---------- */
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789♥';
  const flip = (el, text, delay = 0) => {
    const target = [...text];
    while (el.children.length < target.length) el.append(Object.assign(d.createElement('span'), { className: 'flap' }));
    while (el.children.length > target.length) el.lastChild.remove();
    [...el.children].forEach((f, i) => {
      const final = target[i] === ' ' ? ' ' : target[i];
      if (reduce) { f.textContent = final; return; }
      let n = final === ' ' ? 0 : 3 + Math.floor(Math.random() * 6);
      const step = () => {
        if (n-- > 0) { f.textContent = CHARS[Math.floor(Math.random() * CHARS.length)]; setTimeout(step, 55); }
        else f.textContent = final;
      };
      setTimeout(step, delay + i * 35);
    });
  };
  $$('.flaps').forEach((el, r) => flip(el, el.dataset.text, 300 + r * 250));
  const alt = $('.flaps[data-alt]');
  if (alt && !reduce) {
    let showAlt = false;
    setInterval(() => { showAlt = !showAlt; flip(alt, showAlt ? alt.dataset.alt : alt.dataset.text); }, 6000);
  }

  /* ---------- time together ---------- */
  const start = new Date(`${$('main').dataset.start}T00:00:00`);
  const pad = n => String(n).padStart(2, '0');
  const tick = () => {
    const ms = Math.max(0, Date.now() - start);
    const s = Math.floor(ms / 1000);
    $('.js-d').textContent = Math.floor(s / 86400);
    $('.js-h').textContent = pad(Math.floor(s / 3600) % 24);
    $('.js-m').textContent = pad(Math.floor(s / 60) % 60);
    $('.js-s').textContent = pad(s % 60);
  };
  tick();
  setInterval(tick, 1000);

  const today = new Date();
  $('.js-today').textContent = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  $('.js-year').textContent = today.getFullYear();

  /* ---------- packing list ---------- */
  $$('.crates button').forEach(b => b.addEventListener('click', () => {
    b.setAttribute('aria-expanded', String(b.getAttribute('aria-expanded') !== 'true'));
  }));

  /* ---------- hearts when the letter opens ---------- */
  const sky = $('.hearts');
  const burst = () => {
    if (reduce) return;
    for (let i = 0; i < 36; i++) {
      const h = d.createElement('span');
      h.className = 'heart';
      h.textContent = '♥';
      h.style.left = `${Math.random() * 100}%`;
      h.style.fontSize = `${14 + Math.random() * 26}px`;
      h.style.setProperty('--dx', `${(Math.random() - 0.5) * 200}px`);
      h.style.setProperty('--r', `${(Math.random() - 0.5) * 90}deg`);
      h.style.animationDuration = `${3 + Math.random() * 3}s`;
      h.style.animationDelay = `${Math.random() * 1.2}s`;
      h.addEventListener('animationend', () => h.remove());
      sky.append(h);
    }
  };
  $('.envelope').addEventListener('toggle', e => { if (e.target.open) burst(); });
})();
