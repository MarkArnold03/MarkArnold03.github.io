(() => {
  const d = document, root = d.documentElement;
  const $ = (s, r = d) => r.querySelector(s);
  const $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const smooth = reduce ? 'auto' : 'smooth';

  /* ---------- day / night shift ---------- */
  const shift = $('.shift');
  const dark = matchMedia('(prefers-color-scheme: dark)');
  const isNight = () => root.dataset.shift ? root.dataset.shift === 'night' : dark.matches;
  const paintShift = () => {
    const night = isNight();
    $('.shift-label', shift).textContent = night ? shift.dataset.night : shift.dataset.day;
    shift.setAttribute('aria-label', night ? shift.dataset.toDay : shift.dataset.toNight);
  };
  shift.addEventListener('click', () => {
    const next = isNight() ? 'day' : 'night';
    root.dataset.shift = next;
    try { localStorage.setItem('mw-shift', next); } catch {}
    paintShift();
  });
  dark.addEventListener('change', paintShift);
  paintShift();

  /* ---------- Stockholm clock ---------- */
  const fmt = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', hour: '2-digit', minute: '2-digit' });
  const clocks = $$('.js-clock');
  const tick = () => {
    const t = fmt.format(new Date());
    clocks.forEach(c => { if (c.textContent !== t) { c.textContent = t; c.dateTime = t; } });
  };
  tick();
  setInterval(tick, 10000);
  $$('.js-year').forEach(el => { el.textContent = new Date().getFullYear(); });

  /* ---------- split-flap departures board ---------- */
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ0123456789#-.';
  const cells = $$('.board .cell');
  cells.forEach(cell => {
    const w = +cell.dataset.w;
    cell.final = cell.textContent.padEnd(w).slice(0, w);
    cell.flaps = [...cell.final].map(ch => {
      const f = d.createElement('span');
      f.className = 'flap';
      f.textContent = ch;
      return f;
    });
    cell.replaceChildren(...cell.flaps);
  });
  const flap = f => f.animate?.([{ transform: 'scaleY(1)' }, { transform: 'scaleY(.12)' }, { transform: 'scaleY(1)' }], { duration: 70 });
  const flipTo = (cell, text, delay = 0, spins = 6) => {
    const target = text.padEnd(cell.flaps.length).slice(0, cell.flaps.length);
    cell.flaps.forEach((f, i) => {
      const final = target[i];
      if (reduce) { f.textContent = final; return; }
      let n = final === ' ' && f.textContent === ' ' ? 0 : 2 + Math.floor(Math.random() * spins);
      const step = () => {
        if (n-- > 0) { f.textContent = CHARS[Math.floor(Math.random() * CHARS.length)]; flap(f); setTimeout(step, 60); }
        else if (f.textContent !== final) { f.textContent = final; flap(f); }
      };
      setTimeout(step, delay + i * 22);
    });
  };
  if (!reduce) {
    cells.forEach(c => c.flaps.forEach(f => { f.textContent = ' '; }));
    const rows = $$('.board .row');
    rows.forEach((row, r) => $$('.cell', row).forEach((c, k) => flipTo(c, c.final, 250 + r * 140 + k * 60)));
    const alt = $('.board .c-status[data-alt]');
    if (alt) {
      let showAlt = false;
      setInterval(() => { showAlt = !showAlt; flipTo(alt, showAlt ? alt.dataset.alt : alt.final, 0, 3); }, 7000);
    }
    rows.forEach(row => {
      let busy = false;
      row.addEventListener('mouseenter', () => {
        if (busy) return;
        busy = true;
        const dest = $('.c-dest', row);
        flipTo(dest, dest.final, 0, 2);
        setTimeout(() => { busy = false; }, 900);
      });
    });
  }

  /* ---------- parcel tracking ---------- */
  const parcels = $$('.parcel');
  const codes = parcels.map(p => p.dataset.code);
  const chips = $$('.chip');
  const form = $('.track-form');
  const input = $('#track-q');
  const msg = $('.track-msg');
  const aliases = {
    'MW-LAPX-25': ['LAPX', 'PLATFORM', 'PLATTFORM', 'PWA', 'FIELD', 'FÄLT'],
    'MW-KYH-24': ['KYH', 'DEGREE', 'EXAM', 'EXAMEN', 'YH', 'SCHOOL', 'SKOLA', 'UTBILDNING'],
    'MW-RDRV-24': ['REDRIVER', 'RED RIVER', 'RDRV', 'INTERN', 'PRAKTIK'],
    'MW-BANK-23': ['BANK', 'MVC'],
    'MW-RROCK': ['RISING', 'ROCK', 'RROCK'],
    'MW-DEMO': ['DEMO', 'DISPATCH', 'SIMUL'],
    'MW-NEXT-26': ['NEXT', 'HIRE', 'YOU', 'JOB', 'TEAM', 'NÄSTA', 'ANSTÄLL', 'DITT', 'DIG'],
  };
  const find = raw => {
    const q = raw.trim().toUpperCase();
    if (!q) return null;
    const flat = q.replace(/[\s_-]/g, '');
    const exact = codes.find(c => c.replace(/-/g, '') === flat);
    if (exact) return exact;
    for (const [code, words] of Object.entries(aliases)) if (words.some(w => q.includes(w))) return code;
    return null;
  };
  const select = (code, { scroll = false, focus = false } = {}) => {
    const target = parcels.find(p => p.dataset.code === code);
    if (!target) return false;
    parcels.forEach(p => { p.hidden = p !== target; });
    chips.forEach(c => c.setAttribute('aria-current', String(c.dataset.code === code)));
    const leg = $('.leg', target);
    if (leg && !reduce) { leg.classList.remove('go'); void leg.offsetWidth; leg.classList.add('go'); }
    if (scroll) $('#track').scrollIntoView({ behavior: smooth });
    if (focus) target.focus({ preventScroll: true });
    return true;
  };
  const go = (code, opts) => {
    if (select(code, opts)) history.replaceState(null, '', '#' + code);
  };
  const fromHash = () => {
    const code = decodeURIComponent(location.hash.slice(1)).toUpperCase();
    return codes.includes(code) ? code : null;
  };
  const initial = fromHash();
  if (parcels.length) select(initial || codes[0], { scroll: !!initial });

  chips.forEach(c => c.addEventListener('click', e => { e.preventDefault(); go(c.dataset.code, { focus: true }); }));
  $$('.board .row').forEach(r => r.addEventListener('click', e => { e.preventDefault(); go(r.dataset.code, { scroll: true, focus: true }); }));
  addEventListener('hashchange', () => { const c = fromHash(); if (c) select(c, { scroll: true }); });
  form?.addEventListener('submit', e => {
    e.preventDefault();
    const code = find(input.value);
    if (code) {
      msg.textContent = '';
      input.value = code;
      go(code);
    } else {
      msg.textContent = form.dataset.notfound.replace('{q}', input.value.trim());
    }
  });
  addEventListener('keydown', e => {
    if (!input || e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    e.preventDefault();
    $('#track').scrollIntoView({ behavior: smooth });
    input.focus({ preventScroll: true });
  });

  /* ---------- active section in nav ---------- */
  const links = new Map($$('.nav a[href^="#"]').map(a => [a.getAttribute('href').slice(1), a]));
  const spy = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    links.forEach(a => a.classList.remove('on'));
    links.get(en.target.id)?.classList.add('on');
  }), { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((a, id) => { const s = d.getElementById(id); if (s) spy.observe(s); });

  /* ---------- draw the route lines when the map scrolls into view ---------- */
  const map = $('.route-svg');
  if (map && !reduce) {
    const lines = $$('.ln:not(.ln-future)', map);
    lines.forEach(l => {
      const len = l.getTotalLength();
      l.style.strokeDasharray = len;
      l.style.strokeDashoffset = len;
    });
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      lines.forEach((l, i) => {
        l.style.transition = `stroke-dashoffset 1.6s cubic-bezier(.4,.1,.2,1) ${l.classList.contains('ln-merged') ? 1.3 : i * 0.15}s`;
        l.style.strokeDashoffset = 0;
      });
      io.disconnect();
    }, { threshold: 0.35 });
    io.observe(map);
  }

  /* ---------- copy email ---------- */
  const toast = $('.toast');
  let tt;
  const say = text => {
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(tt);
    tt = setTimeout(() => toast.classList.remove('show'), 2200);
  };
  $$('.js-copy').forEach(b => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); say(b.dataset.done); }
    catch { say(b.dataset.copy); }
  }));

  /* ---------- booking email ---------- */
  const booking = $('.booking');
  booking?.addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(booking);
    const val = (k, fallback) => String(f.get(k) || '').trim() || fallback;
    const company = val('company', booking.dataset.company);
    const role = val('role', booking.dataset.role);
    const message = val('message', '');
    const fill = s => s.replaceAll('{company}', company).replaceAll('{role}', role).replaceAll('{message}', message);
    location.href = `mailto:${booking.dataset.email}?subject=${encodeURIComponent(fill(booking.dataset.subject))}&body=${encodeURIComponent(fill(booking.dataset.body))}`;
  });

  /* ---------- offline support: installable app + cache (see sw.js) ---------- */
  if ('serviceWorker' in navigator) {
    addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }
  addEventListener('offline', () => say(toast.dataset.offline));
  addEventListener('online', () => say(toast.dataset.online));

  /* ---------- keep the selected shipment when switching language ---------- */
  $('.lang').addEventListener('click', e => {
    if (location.hash) e.currentTarget.href = e.currentTarget.getAttribute('href').split('#')[0] + location.hash;
  });

  console.log('%cMW TERMINAL%c\nLooking under the hood? Plain HTML, CSS and JS, built with a small Node script.\nLet\'s talk: markanorld0@gmail.com',
    'background:#ff5a1f;color:#16150f;font:700 14px monospace;padding:4px 8px', 'font:12px monospace');
})();
