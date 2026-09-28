/* Dispatch demo: a simulated fleet on a schematic Stockholm.
   Time runs in simulated minutes (1 real second = 1 minute at 1x speed).
   Everything that happens is an event; the dispatcher's view (map, lists, figures)
   is built from those events. While "offline", truck events wait in an IndexedDB
   outbox and replay in order on reconnect. */
(() => {
  const d = document;
  const app = d.querySelector('.dispatch');
  if (!app) return;

  const DATA = JSON.parse(d.getElementById('d-data').textContent);
  const T = DATA.t;
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (s, r = d) => r.querySelector(s);
  const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const SPEED = 45;       // map units per simulated minute
  const HANDLING = 4;     // minutes to load or unload
  const MAX_WAITING = 10; // jobs waiting before new ones stop appearing
  const TYPES = ['delivery', 'move', 'assembly'];

  /* ---------- seeded randomness: every run starts the same ---------- */
  const seeded = seed => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let rand;
  const pick = list => list[Math.floor(rand() * list.length)];

  /* ---------- road graph and shortest paths (Dijkstra) ---------- */
  const nodes = Object.fromEntries(DATA.nodes.map(n => [n.id, n]));
  const ids = Object.keys(nodes);
  const depot = DATA.nodes.find(n => n.depot).id;
  const adj = Object.fromEntries(ids.map(id => [id, []]));
  for (const [a, b] of DATA.edges) {
    const w = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y);
    adj[a].push([b, w]);
    adj[b].push([a, w]);
  }
  const routes = new Map();
  function route(from, to) {
    const key = from + '>' + to;
    if (routes.has(key)) return routes.get(key);
    const dist = Object.fromEntries(ids.map(id => [id, Infinity]));
    const prev = {};
    const open = new Set(ids);
    dist[from] = 0;
    while (open.size) {
      let u = null;
      for (const id of open) if (u === null || dist[id] < dist[u]) u = id;
      open.delete(u);
      if (u === to) break;
      for (const [v, w] of adj[u]) if (open.has(v) && dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; }
    }
    const path = [to];
    while (path[0] !== from) path.unshift(prev[path[0]]);
    const result = { path, length: dist[to] };
    routes.set(key, result);
    return result;
  }

  /* ---------- offline outbox in IndexedDB (memory copy as fallback) ---------- */
  const outbox = (() => {
    let mem = [];
    let dbp = null;
    const open = () => dbp ??= new Promise((resolve, reject) => {
      const req = indexedDB.open('mw-dispatch-demo', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('outbox', { autoIncrement: true });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const run = async (mode, fn) => {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('outbox', mode);
        const req = fn(tx.objectStore('outbox'));
        tx.oncomplete = () => resolve(req?.result);
        tx.onerror = () => reject(tx.error);
      });
    };
    return {
      get size() { return mem.length; },
      add(evt) { mem.push(evt); run('readwrite', s => s.add(evt)).catch(() => {}); },
      async drain() {
        let items = mem;
        try { items = await run('readonly', s => s.getAll()); } catch {}
        mem = [];
        run('readwrite', s => s.clear()).catch(() => {});
        return items;
      },
      clear() { mem = []; run('readwrite', s => s.clear()).catch(() => {}); },
    };
  })();

  /* ---------- simulation state ---------- */
  let sim, view;
  const ui = { running: !reduce, speed: 4, auto: true, selectedJob: null, dirty: true };

  function reset() {
    rand = seeded(20240801);
    sim = {
      t: 7 * 60,
      trucks: DATA.trucks.map(t => ({ ...t, node: depot, x: nodes[depot].x, y: nodes[depot].y, path: null, leg: 0, legDone: 0, phase: t.online ? 'idle' : 'off', job: null, until: 0 })),
      jobs: [],
      nextId: 1001,
      nextSpawn: 7 * 60 + 2,
      nextShift: 7 * 60 + 35,
      online: true,
    };
    view = { delivered: 0, waits: [], snapshot: null };
    ui.selectedJob = null;
    outbox.clear();
    feedEl.replaceChildren();
    for (let i = 0; i < 3; i++) spawnJob();
    ui.dirty = true;
  }

  /* ---------- events ---------- */
  // Dispatcher events (new job, assignment) are always seen. Field events come from
  // the trucks and are queued while the connection is cut.
  const FIELD = new Set(['pickedUp', 'delivered', 'shiftOn', 'shiftOff']);
  function emit(kind, vars) {
    const evt = { kind, t: sim.t, vars };
    if (FIELD.has(kind) && !sim.online) { outbox.add(evt); ui.dirty = true; return; }
    show(evt, false);
  }
  function show(evt, synced) {
    if (evt.kind === 'delivered') view.delivered++;
    if (evt.kind === 'pickedUp') view.waits.push(evt.vars.wait);
    const li = d.createElement('li');
    li.className = 'ev-' + evt.kind;
    const time = d.createElement('time');
    time.textContent = clock(evt.t);
    const text = d.createElement('span');
    text.textContent = fill(T.ev[evt.kind], evt.vars);
    li.append(time, text);
    if (synced) {
      const tag = d.createElement('em');
      tag.textContent = T.synced;
      li.append(tag);
    }
    feedEl.prepend(li);
    while (feedEl.children.length > 60) feedEl.lastChild.remove();
    ui.dirty = true;
  }

  /* ---------- jobs and trucks ---------- */
  const place = id => nodes[id].name;
  function spawnJob() {
    const from = pick(ids);
    let to = pick(ids);
    while (to === from) to = pick(ids);
    const job = { id: 'J-' + sim.nextId++, type: pick(TYPES), from, to, created: sim.t, state: 'waiting', truck: null };
    sim.jobs.push(job);
    emit('created', { job: job.id, type: T.types[job.type], from: place(from), to: place(to) });
    return job;
  }
  function drive(truck, to) {
    truck.path = route(truck.node, to).path;
    truck.leg = 0;
    truck.legDone = 0;
    if (truck.path.length === 1) arrive(truck);
  }
  function assign(job, truck) {
    job.state = 'assigned';
    job.truck = truck.id;
    truck.job = job;
    truck.phase = 'toPickup';
    emit('assigned', { job: job.id, truck: truck.id, driver: truck.driver });
    drive(truck, job.from);
  }
  function arrive(truck) {
    truck.node = truck.path[truck.path.length - 1];
    truck.path = null;
    truck.phase = truck.phase === 'toPickup' ? 'loading' : 'unloading';
    truck.until = sim.t + HANDLING;
  }
  function nearestFree(job) {
    let best = null, bestLen = Infinity;
    for (const t of sim.trucks) {
      if (t.phase !== 'idle') continue;
      const len = route(t.node, job.from).length;
      if (len < bestLen) { best = t; bestLen = len; }
    }
    return best;
  }

  function step(dt) {
    sim.t += dt;
    if (sim.t >= sim.nextSpawn) {
      if (sim.jobs.filter(j => j.state === 'waiting').length < MAX_WAITING) spawnJob();
      sim.nextSpawn = sim.t + 2 + rand() * 5;
    }
    if (sim.t >= sim.nextShift) {
      const t = pick(sim.trucks);
      const online = sim.trucks.filter(x => x.phase !== 'off').length;
      if (t.phase === 'off') { t.phase = 'idle'; emit('shiftOn', { driver: t.driver, truck: t.id }); }
      else if (t.phase === 'idle' && online > 3) { t.phase = 'off'; emit('shiftOff', { driver: t.driver, truck: t.id }); }
      sim.nextShift = sim.t + 25 + rand() * 25;
    }
    for (const t of sim.trucks) {
      if (t.path) {
        let move = SPEED * dt;
        while (move > 0 && t.path) {
          const a = nodes[t.path[t.leg]], b = nodes[t.path[t.leg + 1]];
          const len = Math.hypot(b.x - a.x, b.y - a.y);
          const left = len - t.legDone;
          if (move < left) {
            t.legDone += move;
            move = 0;
            const f = t.legDone / len;
            t.x = a.x + (b.x - a.x) * f;
            t.y = a.y + (b.y - a.y) * f;
          } else {
            move -= left;
            t.leg++;
            t.legDone = 0;
            t.x = b.x;
            t.y = b.y;
            if (t.leg >= t.path.length - 1) arrive(t);
          }
        }
      } else if (t.phase === 'loading' && sim.t >= t.until) {
        const job = t.job;
        job.state = 'picked';
        emit('pickedUp', { truck: t.id, job: job.id, place: place(job.from), wait: sim.t - job.created });
        t.phase = 'toDrop';
        drive(t, job.to);
      } else if (t.phase === 'unloading' && sim.t >= t.until) {
        const job = t.job;
        job.state = 'done';
        emit('delivered', { truck: t.id, job: job.id, place: place(job.to) });
        sim.jobs = sim.jobs.filter(j => j !== job);
        t.job = null;
        t.phase = 'idle';
      }
    }
    if (ui.auto && sim.online) {
      for (const job of sim.jobs.filter(j => j.state === 'waiting').sort((a, b) => a.created - b.created)) {
        const truck = nearestFree(job);
        if (!truck) break;
        assign(job, truck);
      }
    }
    ui.dirty = true;
  }

  /* ---------- connection ---------- */
  async function setOnline(on) {
    if (on === sim.online) return;
    if (!on) {
      sim.online = false;
      view.snapshot = sim.trucks.map(t => ({ id: t.id, x: t.x, y: t.y, phase: t.phase }));
      show({ kind: 'offline', t: sim.t, vars: {} }, false);
    } else {
      const queued = await outbox.drain();
      sim.online = true;
      view.snapshot = null;
      show({ kind: 'online', t: sim.t, vars: { n: queued.length } }, false);
      for (const evt of queued) show(evt, true);
    }
    netBtn.setAttribute('aria-pressed', String(!sim.online));
    netBtn.textContent = sim.online ? netBtn.dataset.cut : netBtn.dataset.reconnect;
    app.classList.toggle('is-offline', !sim.online);
    ui.dirty = true;
  }

  /* ---------- rendering ---------- */
  const svg = $('.d-svg', app);
  const jobsLayer = $('.d-jobs', svg), trucksLayer = $('.d-trucks', svg), routeEl = $('.d-route', svg);
  const feedEl = $('.d-feed', app), queueEl = $('.d-queue', app), hintEl = $('.d-hint', app);
  const offlineEl = $('.d-offline', app), outboxEl = $('.d-outbox', app);
  const netBtn = $('.d-net', app), runBtn = $('.d-run', app);
  const el = (tag, attrs = {}, parent) => {
    const e = d.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    parent?.append(e);
    return e;
  };
  const clock = t => {
    const m = Math.floor(t) % (24 * 60);
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  };

  const truckEls = new Map();
  for (const t of DATA.trucks) {
    const g = el('g', { class: 'truck', 'data-truck': t.id }, trucksLayer);
    el('rect', { x: -17, y: -11, width: 34, height: 22, rx: 5 }, g);
    const label = el('text', { y: 4.5 }, g);
    label.textContent = t.id.slice(2);
    g.addEventListener('click', () => chooseTruck(t.id));
    truckEls.set(t.id, g);
  }

  function renderMap() {
    const trucks = view.snapshot || sim.trucks;
    // Spread trucks that stand on the same spot so they don't hide each other.
    const stacks = {};
    for (const t of trucks) {
      const key = Math.round(t.x) + ',' + Math.round(t.y);
      const i = (stacks[key] = (stacks[key] ?? -1) + 1);
      const dx = i ? ((i % 2 ? 1 : -1) * Math.ceil(i / 2) * 18) : 0;
      const g = truckEls.get(t.id);
      g.setAttribute('transform', `translate(${(t.x + dx).toFixed(1)} ${t.y.toFixed(1)})`);
      g.setAttribute('class', `truck is-${t.phase}${view.snapshot ? ' is-stale' : ''}`);
    }
    // Remaining routes of moving trucks (live view only).
    routeEl.setAttribute('d', view.snapshot ? '' : sim.trucks.filter(t => t.path).map(t => {
      const rest = t.path.slice(t.leg + 1).map(id => `L${nodes[id].x} ${nodes[id].y}`).join('');
      return `M${t.x.toFixed(1)} ${t.y.toFixed(1)}${rest}`;
    }).join(''));
  }

  function renderJobs() {
    jobsLayer.replaceChildren();
    const perNode = {};
    for (const job of sim.jobs) {
      const a = nodes[job.from], b = nodes[job.to];
      const selected = ui.selectedJob === job.id;
      if (job.state !== 'waiting' || selected) {
        el('path', { class: 'job-line' + (selected ? ' is-selected' : ''), d: `M${a.x} ${a.y}L${b.x} ${b.y}` }, jobsLayer);
        el('circle', { class: 'job-drop', cx: b.x, cy: b.y, r: 9 }, jobsLayer);
      }
      if (job.state === 'waiting' || job.state === 'assigned') {
        const i = (perNode[job.from] = (perNode[job.from] ?? -1) + 1);
        const g = el('g', { class: 'job-pin' + (selected ? ' is-selected' : ''), transform: `translate(${a.x + 12 + i * 8} ${a.y + 10 + i * 8})` }, jobsLayer);
        el('rect', { x: -6, y: -6, width: 12, height: 12, rx: 2 }, g);
      }
    }
  }

  function renderLists() {
    const waiting = sim.jobs.filter(j => j.state === 'waiting');
    const trucks = view.snapshot || sim.trucks;
    $('.k-waiting', app).textContent = waiting.length;
    $('.k-active', app).textContent = trucks.filter(t => !['idle', 'off'].includes(t.phase)).length;
    $('.k-delivered', app).textContent = view.delivered;
    $('.k-wait', app).textContent = view.waits.length ? Math.round(view.waits.reduce((a, b) => a + b, 0) / view.waits.length) + ' ' + T.minutes : '–';
    $('.q-count', app).textContent = waiting.length;
    $('.d-clock', app).textContent = clock(sim.t);

    if (!waiting.length) {
      const li = d.createElement('li');
      li.className = 'd-empty';
      li.textContent = T.empty;
      queueEl.replaceChildren(li);
    } else {
      queueEl.replaceChildren(...waiting.map(job => {
        const li = d.createElement('li');
        const b = d.createElement('button');
        b.type = 'button';
        b.className = 'd-job';
        b.dataset.job = job.id;
        b.setAttribute('aria-pressed', String(ui.selectedJob === job.id));
        b.disabled = ui.auto;
        const id = d.createElement('b');
        id.textContent = job.id;
        const what = d.createElement('span');
        what.textContent = `${T.types[job.type]} · ${place(job.from)} → ${place(job.to)}`;
        const age = d.createElement('span');
        age.className = 'd-age';
        age.textContent = Math.floor(sim.t - job.created) + ' ' + T.minutes;
        b.append(id, what, age);
        li.append(b);
        return li;
      }));
    }

    for (const t of trucks) {
      const b = $(`.d-truck[data-truck="${t.id}"]`, app);
      b.className = `d-truck is-${t.phase}${view.snapshot ? ' is-stale' : ''}`;
      $('.d-state', b).textContent = T.status[t.phase];
    }

    const n = outbox.size;
    outboxEl.hidden = sim.online;
    outboxEl.textContent = fill(T.outbox, { n });
    offlineEl.hidden = sim.online;
    $('.d-offline-text', offlineEl).textContent = `${T.lastSeen} · ${fill(T.outbox, { n })}`;
    ui.dirty = false;
  }

  /* ---------- manual dispatch ---------- */
  const hint = text => { hintEl.textContent = text; };
  function chooseJob(id) {
    if (ui.auto) return;
    ui.selectedJob = ui.selectedJob === id ? null : id;
    hint(ui.selectedJob ? fill(T.pickTruck, { job: id }) : T.pickJob);
    ui.dirty = true;
    renderJobs();
  }
  function chooseTruck(id) {
    if (ui.auto || !ui.selectedJob) return;
    if (!sim.online) return hint(T.offlineNoAssign);
    const truck = sim.trucks.find(t => t.id === id);
    const job = sim.jobs.find(j => j.id === ui.selectedJob && j.state === 'waiting');
    if (!job) { ui.selectedJob = null; return hint(T.pickJob); }
    if (truck.phase !== 'idle') return hint(fill(T.busy, { truck: id }));
    assign(job, truck);
    ui.selectedJob = null;
    hint(T.pickJob);
    renderJobs();
  }
  queueEl.addEventListener('click', e => { const b = e.target.closest('.d-job'); if (b) chooseJob(b.dataset.job); });
  $('.d-fleet', app).addEventListener('click', e => { const b = e.target.closest('.d-truck'); if (b) chooseTruck(b.dataset.truck); });

  /* ---------- controls ---------- */
  const setRunning = on => {
    ui.running = on;
    runBtn.setAttribute('aria-pressed', String(on));
    runBtn.textContent = on ? runBtn.dataset.pause : runBtn.dataset.run;
  };
  runBtn.addEventListener('click', () => setRunning(!ui.running));
  app.querySelectorAll('.d-seg').forEach(b => b.addEventListener('click', () => {
    ui.speed = Number(b.dataset.speed);
    app.querySelectorAll('.d-seg').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  }));
  $('.d-auto', app).addEventListener('change', e => {
    ui.auto = e.target.checked;
    ui.selectedJob = null;
    hint(ui.auto ? '' : T.pickJob);
    ui.dirty = true;
    renderJobs();
  });
  $('.d-new', app).addEventListener('click', () => { spawnJob(); renderJobs(); });
  netBtn.addEventListener('click', () => setOnline(!sim.online));
  $('.d-reset', app).addEventListener('click', () => {
    sim.online = true;
    netBtn.setAttribute('aria-pressed', 'false');
    netBtn.textContent = netBtn.dataset.cut;
    app.classList.remove('is-offline');
    reset();
    hint(ui.auto ? '' : T.pickJob);
    renderJobs();
    renderMap();
    renderLists();
  });

  /* ---------- main loop ---------- */
  let last = performance.now(), lastLists = 0, lastJobs = 0;
  function frame(now) {
    const real = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (ui.running) {
      let left = real * ui.speed;
      while (left > 0) { const dt = Math.min(0.5, left); step(dt); left -= dt; }
    }
    renderMap();
    if (now - lastJobs > 200) { renderJobs(); lastJobs = now; }
    if (ui.dirty && now - lastLists > 250) { renderLists(); lastLists = now; }
    requestAnimationFrame(frame);
  }

  reset();
  setRunning(ui.running);
  renderJobs();
  renderLists();
  requestAnimationFrame(frame);
})();
