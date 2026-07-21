"use strict";
/* ===========================================================================
   SPIEL — Datenträger 1: "Defrag" (Snake)
   Der Lesekopf sammelt Datei-Fragmente ein, die Kette wächst. Neu:
   goldene Fragmente erscheinen zeitweise (+30, verschwinden nach 5 s —
   Zeitdruck!) und nach jedem dritten Fragment materialisiert sich ein
   defekter Sektor als festes Hindernis auf der Platte.
   =========================================================================== */
const DefragGame = {
  paused: false, state: 'start', score: 0, best: 0,
  reset() {
    this.best = this.best || 0;
    this.cell = 20;
    this.cols = Math.max(10, Math.floor(CW / this.cell));
    this.rows = Math.max(8, Math.floor(CH / this.cell));
    this.offX = Math.floor((CW - this.cols * this.cell) / 2);
    this.offY = Math.floor((CH - this.rows * this.cell) / 2);
    const cy = Math.floor(this.rows / 2);
    this.snake = [{ x: 4, y: cy }, { x: 3, y: cy }, { x: 2, y: cy }];
    this.dir = { x: 1, y: 0 }; this.nextDir = { x: 1, y: 0 };
    this.tickT = 0; this.tickLen = 0.13;      // Sekunden pro Raster-Schritt
    this.frags = 0; this.score = 0; this.elapsed = 0;
    this.bad = [];                            // defekte Sektoren (Hindernisse)
    this.gold = null; this.goldIn = rand(6, 10);
    this.placeFood();
    this.state = 'start';
  },
  cellFree(f) {
    return !this.snake.some(s => s.x === f.x && s.y === f.y)
        && !this.bad.some(b => b.x === f.x && b.y === f.y)
        && !(this.food && this.food.x === f.x && this.food.y === f.y)
        && !(this.gold && this.gold.x === f.x && this.gold.y === f.y);
  },
  randFree() {
    let f;
    do { f = { x: Math.floor(rand(0, this.cols)), y: Math.floor(rand(0, this.rows)) }; }
    while (!this.cellFree(f));
    return f;
  },
  placeFood() { this.food = null; this.food = this.randFree(); },
  start() { if (this.state !== 'play') { this.reset(); this.state = 'play'; overlay.classList.add('hidden'); } },
  onKeyDown(code) {
    if (this.state === 'over' && code === 'KeyR') { this.reset(); this.start(); return; }
    if (this.state === 'start' && (code in keyMap)) this.start();
    const dirs = { up:{x:0,y:-1}, down:{x:0,y:1}, left:{x:-1,y:0}, right:{x:1,y:0} };
    const d = dirs[keyMap[code]];
    if (this.state === 'play' && d && !(d.x === -this.dir.x && d.y === -this.dir.y)) this.nextDir = d;
  },
  gameOver(msg) {
    this.state = 'over';
    this.best = Math.max(this.best, this.score);
    showGameOver(msg, this.score, this.best, this.frags + ' Fragmente · Länge ' + this.snake.length);
  },
  update(dt) {
    if (this.state !== 'play') return;
    this.elapsed += dt; this.tickT += dt;
    // goldenes Fragment: erscheint periodisch, verschwindet nach 5 s
    if (this.gold) {
      this.gold.ttl -= dt;
      if (this.gold.ttl <= 0) { this.gold = null; this.goldIn = rand(6, 10); }
    } else {
      this.goldIn -= dt;
      if (this.goldIn <= 0) {
        const f = this.randFree();
        this.gold = { x: f.x, y: f.y, ttl: 5 };
      }
    }
    while (this.tickT >= this.tickLen && this.state === 'play') {
      this.tickT -= this.tickLen;
      this.step();
    }
  },
  step() {
    this.dir = this.nextDir;
    const h = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };
    if (h.x < 0 || h.y < 0 || h.x >= this.cols || h.y >= this.rows) { this.gameOver('Lesekopf über den Plattenrand hinaus!'); return; }
    if (this.snake.some(s => s.x === h.x && s.y === h.y)) { this.gameOver('Fragmentkette verhakt!'); return; }
    if (this.bad.some(b => b.x === h.x && b.y === h.y)) { this.gameOver('Defekten Sektor getroffen!'); return; }
    this.snake.unshift(h);
    let ate = false;
    if (h.x === this.food.x && h.y === this.food.y) {
      ate = true;
      this.frags++; this.score += 10;
      this.tickLen = Math.max(0.065, this.tickLen * 0.975);   // wird schneller
      this.placeFood();
      S.coin();
      // nach jedem dritten Fragment: neuer defekter Sektor
      if (this.frags % 3 === 0) this.bad.push(this.randFree());
    } else if (this.gold && h.x === this.gold.x && h.y === this.gold.y) {
      ate = true;
      this.frags++; this.score += 30;
      this.tickLen = Math.max(0.065, this.tickLen * 0.975);
      this.gold = null; this.goldIn = rand(6, 10);
      S.bonus();
    }
    if (!ate) this.snake.pop();
  },
  draw() {
    ctx.clearRect(0, 0, CW, CH);
    drawGrid('#e5f3e8');
    // Spielfeldrahmen
    ctx.strokeStyle = '#9ccc9f'; ctx.lineWidth = 1;
    ctx.strokeRect(this.offX + .5, this.offY + .5, this.cols * this.cell, this.rows * this.cell);
    const px = gx => this.offX + gx * this.cell;
    const py = gy => this.offY + gy * this.cell;

    // defekte Sektoren
    for (const b of this.bad) {
      ctx.fillStyle = '#5a6772';
      roundRect(ctx, px(b.x) + 2, py(b.y) + 2, this.cell - 4, this.cell - 4, 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px(b.x) + 6, py(b.y) + 6);               ctx.lineTo(px(b.x) + this.cell - 6, py(b.y) + this.cell - 6);
      ctx.moveTo(px(b.x) + this.cell - 6, py(b.y) + 6);   ctx.lineTo(px(b.x) + 6, py(b.y) + this.cell - 6);
      ctx.stroke();
    }

    // Fragment (orange, „zersplittert“ gezeichnet)
    const f = this.food;
    ctx.fillStyle = '#f0a030';
    ctx.fillRect(px(f.x) + 3, py(f.y) + 3, this.cell - 11, this.cell - 11);
    ctx.fillStyle = '#c97d1a';
    ctx.fillRect(px(f.x) + this.cell - 10, py(f.y) + this.cell - 10, 7, 7);

    // goldenes Fragment (pulsiert, tickt ab)
    if (this.gold) {
      const pulse = 0.7 + 0.3 * Math.sin(this.elapsed * 8);
      ctx.globalAlpha = this.gold.ttl < 1.5 ? pulse * 0.7 : pulse;   // kurz vorm Verschwinden flackern
      ctx.fillStyle = '#f0b400';
      roundRect(ctx, px(this.gold.x) + 2, py(this.gold.y) + 2, this.cell - 4, this.cell - 4, 3); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff'; ctx.font = '700 11px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★', px(this.gold.x) + this.cell / 2, py(this.gold.y) + this.cell / 2 + 4);
      ctx.textAlign = 'left';
    }

    // Kette (Kopf dunkler)
    for (let i = this.snake.length - 1; i >= 0; i--) {
      const s = this.snake[i];
      ctx.fillStyle = i === 0 ? '#1f6f24' : '#2e9c34';
      roundRect(ctx, px(s.x) + 2, py(s.y) + 2, this.cell - 4, this.cell - 4, 3); ctx.fill();
    }
    // Lesekopf-Punkte
    const hd = this.snake[0];
    ctx.fillStyle = '#fff';
    circle(ctx, px(hd.x) + this.cell / 2 - 3, py(hd.y) + this.cell / 2, 1.8); ctx.fill();
    circle(ctx, px(hd.x) + this.cell / 2 + 3, py(hd.y) + this.cell / 2, 1.8); ctx.fill();

    scoreBadge.textContent = 'Score ' + this.score;
  },
  infoFields() {
    return [
      { k:'Fragmentierung', v: Math.max(0, 34 - this.frags) + '%' },
      { k:'Fragmente', v: this.frags },
      { k:'Kettenlänge', v: this.snake.length + ' Blöcke' },
      { k:'Score', v: this.score },
      { k:'Defekte Sektoren', v: this.bad.length, small:true },
      { k:'Tempo', v: (1 / this.tickLen).toFixed(1) + ' Blöcke/s', small:true },
      { k:'Gold-Fragment', v: this.gold ? this.gold.ttl.toFixed(1) + ' s' : '—', small:true },
      { k:'Betriebszeit', v: uptimeStr(), small:true },
    ];
  }
};
