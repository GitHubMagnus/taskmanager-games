"use strict";
/* ===========================================================================
   main.js — Sidebar-Kacheln, Panel-Verwaltung, Overlays, Fenster-Drag
   und die Hauptschleife. Lädt als letztes Skript.
   =========================================================================== */

/* ------------------------------------------------------------------ Kacheln */
// Namen/Untertitel kommen sprachabhängig aus i18n (tile_<id>_name / _sub).
const TILES = [
  { id:'cpu',   color:'#17a0e0', game:'cpu'    },
  { id:'mem',   color:'#a24bd3', game:'mem'    },
  { id:'disk',  color:'#4caf50', game:'disk'   },
  { id:'disk1', color:'#2e9c34', game:'defrag' },
  { id:'eth',   color:'#e67e22', game:'net'    },
  { id:'gpu',   color:'#d35400', game:'gpu'    },
];
const GAMES = { cpu: CPUGame, mem: MemGame, disk: DiskGame, defrag: DefragGame, net: NetGame, gpu: GpuGame };

// Start-Sound zentral: jeder erfolgreiche Spielstart klingt gleich
for (const key in GAMES) {
  const g = GAMES[key];
  const orig = g.start.bind(g);
  g.start = function () {
    const was = g.state;
    orig();
    if (was !== 'play' && g.state === 'play') S.start();
  };
}

const sidebar = document.getElementById('sidebar');
const tileState = {};

TILES.forEach(tile => {
  const el = document.createElement('div');
  el.className = 'tile';
  el.dataset.id = tile.id;
  el.innerHTML = `
    <canvas width="88" height="64"></canvas>
    <div class="meta">
      <div class="name">${t('tile_' + tile.id + '_name')}</div>
      <div class="sub">${t('tile_' + tile.id + '_sub')}</div>
    </div>`;
  el.addEventListener('click', () => selectTile(tile.id));
  sidebar.appendChild(el);

  const c = el.querySelector('canvas');
  tileState[tile.id] = {
    el, canvas: c, ctx: c.getContext('2d'),
    history: new Array(48).fill(rand(10, 30)),
    noise: makeNoise(), phase: rand(0, 100), color: tile.color, value: 20
  };
});

/* Sparkline in einer Sidebar-Kachel zeichnen. */
function drawSparkline(st) {
  const c = st.ctx, W = st.canvas.width, H = st.canvas.height;
  c.clearRect(0, 0, W, H);
  c.strokeStyle = '#eef3f6'; c.lineWidth = 1;
  c.beginPath();
  for (let i = 1; i < 4; i++) { const x = W / 4 * i; c.moveTo(x, 0); c.lineTo(x, H); }
  for (let j = 1; j < 3; j++) { const y = H / 3 * j; c.moveTo(0, y); c.lineTo(W, y); }
  c.stroke();
  const hist = st.history, n = hist.length;
  c.beginPath();
  c.moveTo(0, H);
  for (let i = 0; i < n; i++) c.lineTo(W * i / (n - 1), H - (hist[i] / 100) * H);
  c.lineTo(W, H); c.closePath();
  c.fillStyle = hexA(st.color, .18); c.fill();
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const x = W * i / (n - 1), y = H - (hist[i] / 100) * H;
    i ? c.lineTo(x, y) : c.moveTo(x, y);
  }
  c.strokeStyle = st.color; c.lineWidth = 1.4; c.stroke();
}

/* ------------------------------------------------------------------ Panel */
// Panel-Kopf aus i18n; Titel = Kachelname ohne Klammerzusatz.
function setPanelHead(id) {
  panelTitle.textContent = t('tile_' + id + '_name').replace(/\s*\(.*\)/, '');
  panelDev.textContent = t('dev_' + id);
  panelSubTitle.textContent = t('sub_' + id);
}

function selectTile(id) {
  currentTileId = id;
  document.querySelectorAll('.tile').forEach(el => el.classList.toggle('active', el.dataset.id === id));
  const tile = TILES.find(x => x.id === id);

  if (activeGame) activeGame.paused = true;   // laufendes Spiel pausiert beim Wechsel

  setPanelHead(id);
  activeGame = GAMES[tile.game];
  activeGame.paused = false;
  activeGame.reset();
  showStartOverlay();
  renderInfo();
}

function renderInfo() {
  if (!activeGame) return;
  infoGrid.innerHTML = activeGame.infoFields().map(f =>
    `<div class="cell ${f.small ? 'small' : ''}"><div class="k">${tr(f.k)}</div><div class="v">${tr(f.v)}</div></div>`
  ).join('');
}

function currentGameKey() {
  return TILES.find(x => x.id === currentTileId).game;
}

/* Sprachwechsel anwenden, ohne ein laufendes Spiel zurückzusetzen. */
function applyLang() {
  TILES.forEach(tile => {
    const el = tileState[tile.id].el;
    el.querySelector('.name').textContent = t('tile_' + tile.id + '_name');
    el.querySelector('.sub').textContent = t('tile_' + tile.id + '_sub');
  });
  setPanelHead(currentTileId);
  if (!overlay.classList.contains('hidden') && overlayRerender) overlayRerender();
  renderInfo();
}

/* ------------------------------------------------------------------ Overlays */
function showStartOverlay() {
  const key = currentGameKey();
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <h2>${t('ov_' + key + '_title')}</h2>
    <p>${t('ov_' + key + '_desc')}</p>
    <div class="keys">${t('ov_' + key + '_keys')}</div>
    <p class="hint">${t('start_hint')}</p>`;
  overlayRerender = showStartOverlay;   // Sprachwechsel kann neu rendern
}

// Klick in den Graph: Start / Neustart / Spiel-Aktion (springen, flattern, schießen)
canvas.addEventListener('click', () => {
  if (!activeGame) return;
  if (activeGame.state === 'start') activeGame.start();
  else if (activeGame.state === 'over') { activeGame.reset(); activeGame.start(); }
  else if (activeGame.onClick) activeGame.onClick();
});

/* ------------------------------------------------------------------ Fenster verschieben */
/* Das Task-Manager-Fenster lässt sich wie ein echtes Fenster an der
   Titelleiste greifen und verschieben (Pointer Events + Capture). */
(function enableWindowDrag() {
  const win = document.getElementById('tmWindow');
  const bar = document.getElementById('titlebar');
  bar.addEventListener('pointerdown', e => {
    if (e.target.closest('.winbtns')) return;
    const r = win.getBoundingClientRect();
    // beim ersten Griff aus dem Flex-Zentrieren in fixe Positionierung wechseln
    win.style.position = 'fixed';
    win.style.left = r.left + 'px';
    win.style.top = r.top + 'px';
    win.style.margin = '0';
    const offX = e.clientX - r.left, offY = e.clientY - r.top;
    try { bar.setPointerCapture(e.pointerId); } catch (_) {}
    const move = ev => {
      win.style.left = clamp(ev.clientX - offX, 80 - r.width, window.innerWidth - 80) + 'px';
      win.style.top  = clamp(ev.clientY - offY, 0, window.innerHeight - 40) + 'px';
    };
    const up = () => {
      try { bar.releasePointerCapture(e.pointerId); } catch (_) {}
      bar.removeEventListener('pointermove', move);
      bar.removeEventListener('pointerup', up);
    };
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', up);
    e.preventDefault();
  });
})();

/* ------------------------------------------------------------------ Hauptschleife */
let last = now();
let infoAccum = 0;

// Wert, den die Kachel eines laufenden Spiels als Sparkline zeigt
function gameSparkValue(key) {
  if (key === 'cpu')    return clamp(CPUGame.speedDisplay / CPUGame.MAXSPEED * 100, 2, 100);
  if (key === 'mem')    return clamp((MemGame.ramGB - 8) / 8 * 100, 5, 100);
  if (key === 'disk')   return clamp(18 + DiskGame.items.length * 11, 2, 100);
  if (key === 'defrag') return clamp(8 + DefragGame.snake.length * 4, 2, 100);
  if (key === 'net')    return clamp(NetGame.speed / 3, 2, 100);
  if (key === 'gpu')    return clamp(10 + GpuGame.jobs.length * 12, 2, 100);
  return 20;
}

function loop() {
  const t = now();
  let dt = (t - last) / 1000;
  last = t;
  dt = Math.min(dt, 0.05);          // Frame-Spikes abfangen

  // Sidebar-Sparklines: aktive Spielkachel spiegelt das Spiel, Rest lebt organisch
  for (const tl of TILES) {
    const st = tileState[tl.id];
    st.phase += dt;
    let target;
    if (activeGame === GAMES[tl.game] && activeGame.state === 'play' && !activeGame.paused) {
      target = gameSparkValue(tl.game);
    } else {
      target = 12 + st.noise(st.phase * 0.9) * 55;
    }
    st.value = lerp(st.value, target, 0.1);
    if (Math.random() < dt * 6) { st.history.push(st.value); if (st.history.length > 48) st.history.shift(); }
    drawSparkline(st);
  }

  // aktives Spiel
  if (activeGame && !activeGame.paused) {
    if (activeGame.state === 'play') activeGame.update(dt);
    activeGame.draw();
  }

  // Info-Panel ~5x/s aktualisieren
  infoAccum += dt;
  if (infoAccum > 0.2) { infoAccum = 0; renderInfo(); }

  requestAnimationFrame(loop);
}

/* ------------------------------------------------------------------ Bootstrap */
resizeCanvas();
selectTile('cpu');
requestAnimationFrame(loop);
