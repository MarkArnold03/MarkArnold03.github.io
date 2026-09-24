(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const t = document.documentElement.lang === 'sv'
    ? { open: 'Öppna meny', close: 'Stäng meny', copied: 'E-postadressen har kopierats' }
    : { open: 'Open menu', close: 'Close menu', copied: 'Email address copied' };
  $$('.year').forEach(el => el.textContent = new Date().getFullYear());

  /* split headline into words */
  $$('[data-split]').forEach(h => {
    const text = h.textContent.trim();
    h.setAttribute('aria-label', text);
    h.replaceChildren(...text.split(' ').flatMap((w, i) => {
      const outer = document.createElement('span'), inner = document.createElement('span');
      outer.className = 'w';
      outer.setAttribute('aria-hidden', 'true');
      inner.style.setProperty('--i', i);
      inner.textContent = w;
      outer.append(inner);
      return i ? [' ', outer] : [outer];
    }));
  });
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('loaded')));

  /* reveal */
  $$('[data-stagger]').forEach(g => $$('.reveal', g).forEach((el, i) => el.style.setProperty('--d', `${(i % 4) * 90}ms`)));
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    const t = en.target;
    t.classList.add('in');
    setTimeout(() => t.classList.add('done'), 1000 + (parseInt(t.style.getPropertyValue('--d')) || 0));
    io.unobserve(t);
  }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  /* nav state, progress, back to top */
  const nav = $('.nav'), bar = $('.progress'), top = $('.totop');
  let ticking = false;
  const onScroll = () => {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    nav.classList.toggle('scrolled', y > 8);
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    top.classList.toggle('show', y > innerHeight * 0.9);
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  top.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

  /* mobile menu */
  const burger = $('.burger'), menu = $('#menu');
  const setMenu = open => {
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? t.close : t.open);
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', !open);
    menu.inert = !open;
    document.body.classList.toggle('locked', open);
    if (open) $('a', menu).focus();
  };
  menu.inert = true;
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); burger.focus(); } });
  matchMedia('(min-width: 761px)').addEventListener('change', e => e.matches && setMenu(false));

  /* copy email */
  const toast = $('.toast');
  let tt;
  const showToast = msg => { toast.textContent = msg; toast.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('show'), 2200); };
  $$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); showToast(t.copied); }
    catch { showToast(b.dataset.copy); }
  }));
})();
