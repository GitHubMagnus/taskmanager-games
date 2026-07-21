"use strict";
/* ===========================================================================
   main.js — Sidebar-Kacheln, Panel-Verwaltung, Overlays, Fenster-Drag
   und die Hauptschleife. Lädt als letztes Skript.
   =========================================================================== */

/* ------------------------------------------------------------------ Kacheln */
const TILES = [
  { id:'cpu',  name:'CPU',                    sub:'20% 3,92 GHz',        color:'#17a0e0', game:'cpu'    },
  { id:'mem',  name:'Arbeitsspeicher',        sub:'9,7/15,9 GB (61%)',   color:'#a24bd3', game:'mem'    },
  { id:'disk', name:'Datenträger 0 (C: D:)',  sub:'SSD  1%',             color:'#4caf50', game:'disk'   },
  { id:'disk1',name:'Datenträger 1 (H:)',     sub:'SSD  0%',             color:'#2e9c34', game:'defrag' },
  { id:'eth',  name:'Ethernet',               sub:'S: 0 R: 1,6 Mbps',    color:'#e67e22', game:'net'    },
  { id:'gpu',  name:'GPU 0',                  sub:'NVIDIA GeForce  14%', color:'#d35400', game:'gpu'    },
];
const GAMES = { cpu: CPUGame, mem: MemGame, disk: DiskGame, defrag: DefragGame, net: NetGame, gpu: GpuGame };

const sidebar = document.getElementById('sidebar');
const tileState = {};

TILES.forEach(t => {
  const el = document.createElement('div');
  el.className = 'tile';
  el.dataset.id = t.id;
  el.innerHTML = `
    <canvas width="88" height="64"></canvas>
    <div class="meta">
      <div class="name">${t.name}</div>
      <div class="sub">${t.sub}</div>
    </div>`;
  el.addEventListener('click', () => selectTile(t.id));
  sidebar.appendChild(el);

  const c = el.querySelector('canvas');
  tileState[t.id] = {
    el, canvas: c, ctx: c.getContext('2d'),
    history: new Array(48).fill(rand(10, 30)),
    noise: makeNoise(), phase: rand(0, 100), color: t.color, value: 20
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
const PANEL_DEV = {
  cpu:  '11th Gen Intel(R) Core(TM) i5-11400F @ 2.60GHz',
  mem:  '15,9 GB DDR4',
  disk: 'Samsung SSD 970 EVO',
  disk1:'Crucial MX500 SSD',
  eth:  'Realtek PCIe GbE Family Controller',
  gpu:  'NVIDIA GeForce RTX 3060'
};
const PANEL_SUB = {
  cpu:'% Auslastung', mem:'Speicherauslastung', disk:'Aktive Zeit  (0 - 100%)',
  disk1:'Fragmentierung', eth:'Durchsatz', gpu:'GPU-Auslastung'
};

function selectTile(id) {
  currentTileId = id;
  document.querySelectorAll('.tile').forEach(el => el.classList.toggle('active', el.dataset.id === id));
  const t = TILES.find(x => x.id === id);

  if (activeGame) activeGame.paused = true;   // laufendes Spiel pausiert beim Wechsel

  panelTitle.textContent = t.name.replace(/\s*\(.*\)/, '');
  panelDev.textContent = PANEL_DEV[id] || '';
  panelSubTitle.textContent = PANEL_SUB[id] || '';

  activeGame = GAMES[t.game];
  activeGame.paused = false;
  activeGame.reset();
  showStartOverlay();
  renderInfo();
}

function renderInfo() {
  if (!activeGame) return;
  infoGrid.innerHTML = activeGame.infoFields().map(f =>
    `<div class="cell ${f.small ? 'small' : ''}"><div class="k">${f.k}</div><div class="v">${f.v}</div></div>`
  ).join('');
}

function currentGameKey() {
  return TILES.find(t => t.id === currentTileId).game;
}

/* ------------------------------------------------------------------ Overlays */
function showStartOverlay() {
  const meta = {
    cpu:  { title:'CPU · Hillclimb',
            desc:'Fahr über die Auslastungskurve, sammle blaue Datenpunkte und nimm die orangen Turbo-Pads mit. Flips in der Luft geben Stunt-Punkte, perfekte Landungen einen Bonus. Steile Hügel kosten Schwung — Crashen kannst du nicht.',
            keys:'<kbd>W</kbd>/<kbd>↑</kbd> Gas · <kbd>S</kbd>/<kbd>↓</kbd> Bremse · <kbd>A D</kbd>/<kbd>← →</kbd> in der Luft drehen · <kbd>R</kbd> neue Strecke' },
    mem:  { title:'Arbeitsspeicher · Dino-Run',
            desc:'Spring über die Speicherspitzen und sammle blaue Cache-Orbs in der Luft. Vorsicht vor schwebenden LEAK-Blöcken — da läufst du besser drunter durch. Doppelsprung inklusive, kurz tippen springt niedriger als halten.',
            keys:'<kbd>Leertaste</kbd> / <kbd>W</kbd> / <kbd>↑</kbd> Springen (auch Klick)' },
    disk: { title:'Datenträger 0 · Daten-Catcher',
            desc:'Sammle blaue Dateien und goldenen Cache, weiche den roten Bad Sectors aus. Fehlerfreie Serien steigern den Combo-Multiplikator bis ×5, und im I/O-Burst regnet es kurz Dateien. Drei Bad Sectors und die Platte ist hin.',
            keys:'<kbd>A</kbd>/<kbd>←</kbd> · <kbd>D</kbd>/<kbd>→</kbd> Lese-/Schreibkopf bewegen' },
    defrag:{ title:'Datenträger 1 · Defrag',
            desc:'Sammle die orangen Fragmente ein — die Kette hinter dir wächst. Goldene Fragmente geben +30, verschwinden aber nach 5 Sekunden, und nach jedem dritten Fragment blockiert ein neuer defekter Sektor die Platte.',
            keys:'<kbd>WASD</kbd> / <kbd>Pfeiltasten</kbd> lenken' },
    net:  { title:'Ethernet · Paket-Flug',
            desc:'Halte das Datenpaket mit kurzen Impulsen in der Luft und fliege durch die Firewall-Lücken. Goldene Bonus-Bytes in der Lückenmitte geben +15 — und später fangen manche Lücken an zu wandern.',
            keys:'<kbd>Leertaste</kbd> / <kbd>W</kbd> / <kbd>↑</kbd> Impuls (auch Klick)' },
    gpu:  { title:'GPU · Render-Defense',
            desc:'Schieß die Render-Jobs ab, bevor sie die Frame-Linie erreichen: schwere 4K-Jobs brauchen zwei Treffer, flinke Glitch-Jobs sind schnell. Zerstörte Jobs lassen manchmal VRAM fallen — fang es für +20 FPS oder Dreifach-Schuss.',
            keys:'<kbd>A</kbd>/<kbd>←</kbd> <kbd>D</kbd>/<kbd>→</kbd> bewegen · <kbd>Leertaste</kbd>/<kbd>W</kbd>/<kbd>↑</kbd> feuern' },
  }[currentGameKey()];
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <h2>${meta.title}</h2>
    <p>${meta.desc}</p>
    <div class="keys">${meta.keys}</div>
    <p class="hint">Klicke oder drücke eine Taste zum Starten</p>`;
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
