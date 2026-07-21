"use strict";
/* ===========================================================================
   core.js — gemeinsame Basis für alle Spiele:
   Utilities, Tastatur-Eingabe (Pfeiltasten + WASD redundant), Canvas-
   Verwaltung, Zeichen-Helfer und geteilter Laufzeit-Zustand.
   Ladereihenfolge: core.js -> js/games/*.js -> main.js
   =========================================================================== */

/* ------------------------------------------------------------------ Utilities */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp  = (a, b, t) => a + (b - a) * t;
const rand  = (a, b) => a + Math.random() * (b - a);
const now   = () => performance.now();

// glättender Interpolant (smootherstep) für Value-Noise
const smoother = t => t * t * t * (t * (t * 6 - 15) + 10);

/* Deterministisches 1D-Value-Noise für organisch wirkende Kurven. */
function makeNoise(seed = Math.random() * 1000) {
  const grad = [];
  let s = seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < 2048; i++) grad.push(rnd());
  return function noise(x) {
    const xi = Math.floor(x);
    const t  = smoother(x - xi);
    const a  = grad[((xi % 2048) + 2048) % 2048];
    const b  = grad[(((xi + 1) % 2048) + 2048) % 2048];
    return lerp(a, b, t);
  };
}

/* ------------------------------------------------------------------ Eingabe */
const Keys = { up:false, down:false, left:false, right:false, jump:false, restart:false };
const keyMap = {
  ArrowUp:'up', KeyW:'up',
  ArrowDown:'down', KeyS:'down',
  ArrowLeft:'left', KeyA:'left',
  ArrowRight:'right', KeyD:'right',
  Space:'jump', KeyR:'restart'
};
// „jump“ liegt zusätzlich auf Up (springen/fliegen/schießen mit Up/W/Space)
const jumpAlias = ['ArrowUp', 'KeyW', 'Space'];

window.addEventListener('keydown', e => {
  if (!keyMap[e.code]) return;
  Keys[keyMap[e.code]] = true;
  if (jumpAlias.includes(e.code)) Keys.jump = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
  if (!e.repeat && activeGame && activeGame.onKeyDown) activeGame.onKeyDown(e.code);
});
window.addEventListener('keyup', e => {
  if (!keyMap[e.code]) return;
  Keys[keyMap[e.code]] = false;
  if (jumpAlias.includes(e.code)) Keys.jump = false;
});

/* ------------------------------------------------------------------ Canvas */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let CW = 0, CH = 0, DPR = 1;

function resizeCanvas() {
  DPR = window.devicePixelRatio || 1;
  const r = canvas.getBoundingClientRect();
  CW = r.width; CH = r.height;
  canvas.width = Math.round(CW * DPR);
  canvas.height = Math.round(CH * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resizeCanvas);

/* Task-Manager-Grid (dünnes Raster) im Graph-Bereich. */
function drawGrid(color = '#dbeaf3') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  const cols = 6, rows = 5;
  ctx.beginPath();
  for (let i = 1; i < cols; i++) { const x = Math.round(CW / cols * i) + .5; ctx.moveTo(x, 0); ctx.lineTo(x, CH); }
  for (let j = 1; j < rows; j++) { const y = Math.round(CH / rows * j) + .5; ctx.moveTo(0, y); ctx.lineTo(CW, y); }
  ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------------------ Zeichen-Helfer */
// Hex + Alpha -> rgba()
function hexA(hex, a) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
  return `rgba(${r},${g},${b},${a})`;
}
function roundRect(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.closePath(); }
// Winkel auf [-π, π] normalisieren
function normAngle(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }

/* ------------------------------------------------------------------ geteilter Zustand + Panel-Helfer */
let activeGame = null;        // wird von main.js gesetzt
let currentTileId = 'cpu';
const startTime = now();

const panelTitle    = document.getElementById('panelTitle');
const panelDev      = document.getElementById('panelDev');
const panelSubTitle = document.getElementById('panelSubTitle');
const scoreBadge    = document.getElementById('scoreBadge');
const overlay       = document.getElementById('overlay');
const infoGrid      = document.getElementById('infoGrid');

// Betriebszeit als h:mm:ss (zählt hoch, startet beim Task-Manager-typischen Wert)
function uptimeStr() {
  const s = Math.floor((now() - startTime) / 1000) + 3 * 3600 + 47 * 60;
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60;
  return `${h}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}

// Hält die Render-Funktion des aktuell sichtbaren Overlays, damit die
// Sprachumschaltung Start- und Game-Over-Screen neu aufbauen kann.
let overlayRerender = null;

/* Gemeinsamer Game-Over-Screen (Overlay über dem Graphen).
   reason/extra kommen als deutsche Quellstrings und werden über tr()
   lokalisiert; das Gerüst über t(). */
function showGameOver(reason, score, best, extra) {
  const wasHidden = overlay.classList.contains('hidden');
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <h2>${t('go_title')}</h2>
    <p>${tr(reason)}</p>
    <p class="big">${t('go_score')} <b>${score}</b>${extra ? ' · ' + tr(extra) : ''}</p>
    <p>${t('go_high')} ${best}</p>
    <p class="hint">${t('go_restart')}</p>`;
  if (typeof S !== 'undefined' && wasHidden) S.over();   // Jingle nur beim Auftauchen
  overlayRerender = () => showGameOver(reason, score, best, extra);
}
