"use strict";
/* ===========================================================================
   SPIEL — Arbeitsspeicher: "Dino-Runner auf der RAM-Kurve"
   Chrome-Dino-Prinzip: Der RAM-Chip läuft auf der Grundlinie des Memory-
   Graphen, Hindernisse scrollen herein. Mit Doppelsprung, Sprung-Puffer
   (kurz vor der Landung gedrückt zählt trotzdem) und variabler Sprunghöhe
   (Taste loslassen kappt den Sprung).
   =========================================================================== */
const MemGame = {
  paused: false, state: 'start',
  reset() {
    this.groundY = CH - 40;         // Grundlinie
    this.player = { x: 70, y: 0, vy: 0, w: 22, h: 22, onGround: true, jumps: 0 };
    this.obstacles = [];
    this.spawnTimer = 0.8;
    this.speed = 230;
    this.dist = 0; this.score = 0; this.best = this.best || 0;
    this.ramGB = 9.7; this.bg = makeNoise();
    this.scroll = 0;
    this.jumpBuf = 0;
    this.state = 'start';
  },
  start() { if (this.state !== 'play') { this.reset(); this.state = 'play'; overlay.classList.add('hidden'); } },
  onKeyDown(code) {
    if (this.state === 'start' && (code in keyMap)) { this.start(); this.queueJump(); return; }
    if (this.state === 'over' && code === 'KeyR') { this.reset(); this.start(); return; }
    if (this.state === 'play' && jumpAlias.includes(code)) this.queueJump();
  },
  onClick() { this.queueJump(); },
  queueJump() { this.jumpBuf = 0.14; },
  gameOver() {
    this.state = 'over';
    this.score = Math.floor(this.dist / 10);
    this.best = Math.max(this.best, this.score);
    showGameOver('Speicher voll — Out of Memory!', this.score, this.best,
      'RAM ' + this.ramGB.toFixed(1) + ' / 15,9 GB');
  },
  update(dt) {
    if (this.state !== 'play') return;
    const p = this.player, gy = this.groundY;
    this.speed += 5.5 * dt;               // Tempo steigt stetig
    this.dist += this.speed * dt;
    this.scroll += this.speed * dt;

    // Sprung-Puffer abarbeiten
    this.jumpBuf -= dt;
    if (this.jumpBuf > 0) {
      if (p.onGround)      { p.vy = -430; p.onGround = false; p.jumps = 1; this.jumpBuf = 0; }
      else if (p.jumps < 2) { p.vy = -380; p.jumps = 2; this.jumpBuf = 0; }
    }

    // Physik Spieler
    p.vy += 1400 * dt;
    if (!Keys.jump && p.vy < -170) p.vy = -170;   // variable Sprunghöhe
    p.y += p.vy * dt;
    if (p.y >= 0) { p.y = 0; p.vy = 0; p.onGround = true; p.jumps = 0; }

    // Hindernis-Muster spawnen
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const r = Math.random();
      if (r < 0.55) {
        // einzelner Balken
        this.obstacles.push({ x: CW + 20, w: rand(14, 24), h: rand(18, 44), kind: Math.random() < .3 ? 'app' : 'bar' });
      } else if (r < 0.8) {
        // breiter Balken
        this.obstacles.push({ x: CW + 20, w: rand(30, 42), h: rand(16, 30), kind: 'bar' });
      } else {
        // Doppel mit Lücke — Fall für den Doppelsprung
        this.obstacles.push({ x: CW + 20, w: 16, h: rand(20, 36), kind: 'bar' });
        this.obstacles.push({ x: CW + 20 + rand(70, 95), w: 16, h: rand(20, 36), kind: 'app' });
      }
      this.spawnTimer = rand(0.85, 1.4) * (240 / this.speed) + 0.38;
    }
    for (const o of this.obstacles) o.x -= this.speed * dt;
    this.obstacles = this.obstacles.filter(o => o.x + o.w > -10);

    // Kollision
    const px = p.x, py = gy - p.h + p.y;
    for (const o of this.obstacles) {
      const oy = gy - o.h;
      if (px + p.w - 3 > o.x && px + 3 < o.x + o.w && py + p.h - 2 > oy) { this.gameOver(); return; }
    }
    // RAM-Verbrauch steigt mit dem Score (visuelle Schwierigkeit)
    this.ramGB = clamp(9.7 + this.dist / 4000, 9.7, 15.7);
    this.score = Math.floor(this.dist / 10);
  },
  draw() {
    ctx.clearRect(0, 0, CW, CH);
    drawGrid('#f0e6f6');
    const gy = this.groundY;

    // Hintergrund-Sparkline (Memory-Verlauf)
    ctx.beginPath();
    ctx.moveTo(0, CH);
    for (let x = 0; x <= CW; x += 6) {
      const v = 55 + (this.bg((x + this.scroll * 0.15) * 0.02) - 0.5) * 30;
      ctx.lineTo(x, CH - v / 100 * CH);
    }
    ctx.lineTo(CW, CH); ctx.closePath();
    ctx.fillStyle = 'rgba(162,75,211,.14)'; ctx.fill();

    // Grundlinie + scrollende Bodenmarkierungen (vermitteln Tempo)
    ctx.strokeStyle = '#a24bd3'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, gy + 0.5); ctx.lineTo(CW, gy + 0.5); ctx.stroke();
    ctx.strokeStyle = 'rgba(162,75,211,.35)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -(this.scroll % 26); x < CW; x += 26) { ctx.moveTo(x, gy + 8.5); ctx.lineTo(x + 10, gy + 8.5); }
    ctx.stroke();

    // Hindernisse
    for (const o of this.obstacles) {
      const oy = gy - o.h;
      if (o.kind === 'app') {
        ctx.fillStyle = '#7a2fb0';
        roundRect(ctx, o.x, oy, o.w, o.h, 3); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(o.x + o.w * .3, oy + o.h * .3, o.w * .4, o.h * .4);
      } else {
        ctx.fillStyle = '#b968e0';
        ctx.fillRect(o.x, oy, o.w, o.h);
        ctx.fillStyle = '#8e3fb8';
        ctx.fillRect(o.x, oy, o.w, 4);
      }
    }

    // Spieler (RAM-Chip)
    const p = this.player;
    const py = gy - p.h + p.y;
    ctx.fillStyle = '#0067b8';
    roundRect(ctx, p.x, py, p.w, p.h, 3); ctx.fill();
    ctx.fillStyle = '#004a86';
    for (let i = 0; i < 4; i++) { ctx.fillRect(p.x + 3 + i * 5, py + p.h, 3, 3); ctx.fillRect(p.x + 3 + i * 5, py - 3, 3, 3); }
    ctx.fillStyle = '#fff'; ctx.font = '700 9px "Segoe UI", Arial, sans-serif'; ctx.fillText('RAM', p.x + 2, py + 14);

    scoreBadge.textContent = 'Score ' + this.score;
  },
  infoFields() {
    const pct = (this.ramGB / 15.9 * 100).toFixed(0);
    return [
      { k:'Verwendet', v: this.ramGB.toFixed(1) + '/15,9 GB (' + pct + '%)' },
      { k:'Verfügbar', v: (15.9 - this.ramGB).toFixed(1) + ' GB' },
      { k:'Geschwindigkeit', v: Math.round(this.speed) + ' km/h', small:true },
      { k:'Committet', v: (this.ramGB + 4).toFixed(1) + '/22 GB', small:true },
      { k:'Score', v: this.score, small:true },
      { k:'Zwischengespeichert', v: '3,1 GB', small:true },
      { k:'Ausgelagerter Pool', v: '712 MB', small:true },
      { k:'Betriebszeit', v: uptimeStr(), small:true },
    ];
  }
};
