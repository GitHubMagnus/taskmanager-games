"use strict";
/* ===========================================================================
   SPIEL — Ethernet: "Paket-Flug"
   Flappy-Prinzip: Das Datenpaket sinkt ständig, kurze Impulse halten es in
   der Luft. Durch die Lücken der Firewall-Wände fliegen. Neu: Bonus-Bytes
   in den Lücken belohnen präzises Fliegen, und ab ~15 s wandern manche
   Lücken langsam auf und ab.
   =========================================================================== */
const NetGame = {
  paused: false, state: 'start', score: 0, best: 0,
  reset() {
    this.best = this.best || 0;
    this.pkt = { x: 90, y: CH * 0.45, vy: 0, r: 10 };
    this.walls = []; this.spawnT = 1.2;
    this.speed = 120; this.gap = 105;
    this.passed = 0; this.score = 0; this.elapsed = 0;
    this.bytes = 0;
    this.bg = makeNoise();
    this.state = 'start';
  },
  start() { if (this.state !== 'play') { this.reset(); this.state = 'play'; overlay.classList.add('hidden'); } },
  onKeyDown(code) {
    if (this.state === 'start' && (code in keyMap)) { this.start(); this.flap(); return; }
    if (this.state === 'over' && code === 'KeyR') { this.reset(); this.start(); return; }
    if (this.state === 'play' && jumpAlias.includes(code)) this.flap();
  },
  onClick() { this.flap(); },
  flap() { this.pkt.vy = -255; },
  gameOver(msg) {
    this.state = 'over';
    this.best = Math.max(this.best, this.score);
    showGameOver(msg, this.score, this.best,
      this.passed + ' Pakete zugestellt · ' + this.bytes + ' Bonus-Bytes');
  },
  update(dt) {
    if (this.state !== 'play') return;
    this.elapsed += dt;
    this.speed += 4 * dt;                          // wird langsam schneller
    this.gap = Math.max(72, 105 - this.elapsed * 0.5);
    const p = this.pkt;
    p.vy = Math.min(p.vy + 680 * dt, 420);
    p.y += p.vy * dt;
    if (p.y < p.r || p.y > CH - p.r) { this.gameOver('Verbindung getrennt!'); return; }

    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      const gapY = rand(40, Math.max(50, CH - 40 - this.gap));
      const w = { x: CW + 30, w: 34, gapY, gap: this.gap, passed: false,
                  hasByte: Math.random() < 0.65, byteTaken: false };
      // ab 15 s: manche Lücken wandern langsam auf und ab
      if (this.elapsed > 15 && Math.random() < 0.45) {
        w.base = gapY; w.amp = rand(14, 26); w.ph = rand(0, 6);
      }
      this.walls.push(w);
      this.spawnT = Math.max(0.75, (CW * 0.55) / this.speed);   // konstanter Wand-Abstand
    }
    for (const w of this.walls) {
      w.x -= this.speed * dt;
      if (w.base !== undefined) {
        w.gapY = clamp(w.base + Math.sin(this.elapsed * 1.6 + w.ph) * w.amp, 20, CH - 20 - w.gap);
      }
      if (p.x + p.r > w.x && p.x - p.r < w.x + w.w &&
          (p.y - p.r < w.gapY || p.y + p.r > w.gapY + w.gap)) {
        this.gameOver('Paketverlust — Firewall!'); return;
      }
      // Bonus-Byte in der Lückenmitte einsammeln
      if (w.hasByte && !w.byteTaken &&
          Math.abs(p.x - (w.x + w.w / 2)) < 15 && Math.abs(p.y - (w.gapY + w.gap / 2)) < 17) {
        w.byteTaken = true; this.bytes++; this.score += 15;
      }
      if (!w.passed && w.x + w.w < p.x - p.r) { w.passed = true; this.passed++; this.score += 10; }
    }
    this.walls = this.walls.filter(w => w.x > -50);
  },
  draw() {
    ctx.clearRect(0, 0, CW, CH);
    drawGrid('#f6e8dc');
    // orangefarbene Durchsatz-Sparkline im Hintergrund
    ctx.beginPath();
    for (let x = 0; x <= CW; x += 6) {
      const v = 30 + (this.bg((x + this.elapsed * 80) * 0.02) - 0.5) * 40;
      const y = CH - v / 100 * CH;
      x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = 'rgba(230,126,34,.35)'; ctx.lineWidth = 1.5; ctx.stroke();

    // Firewall-Wände (gemauerte Balken; wandernde mit hellerem Rand markiert)
    for (const w of this.walls) {
      ctx.fillStyle = '#e67e22';
      ctx.fillRect(w.x, 0, w.w, w.gapY);
      ctx.fillRect(w.x, w.gapY + w.gap, w.w, CH - w.gapY - w.gap);
      ctx.strokeStyle = 'rgba(140,70,10,.45)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = 10; y < CH; y += 12) {
        if (y < w.gapY || y > w.gapY + w.gap) { ctx.moveTo(w.x, y + .5); ctx.lineTo(w.x + w.w, y + .5); }
      }
      ctx.stroke();
      if (w.base !== undefined) {
        // Pfeil-Marker an wandernden Lücken
        ctx.fillStyle = '#a35010';
        ctx.beginPath();
        ctx.moveTo(w.x + w.w / 2 - 4, w.gapY - 6); ctx.lineTo(w.x + w.w / 2 + 4, w.gapY - 6); ctx.lineTo(w.x + w.w / 2, w.gapY - 12);
        ctx.closePath(); ctx.fill();
      }
      // Bonus-Byte
      if (w.hasByte && !w.byteTaken) {
        const bx = w.x + w.w / 2, by = w.gapY + w.gap / 2;
        ctx.fillStyle = '#f0b400';
        circle(ctx, bx, by, 7); ctx.fill();
        ctx.fillStyle = '#7a5200'; ctx.font = '700 9px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.fillText('B', bx, by + 3); ctx.textAlign = 'left';
      }
    }

    // Paket als Briefumschlag (neigt sich mit der Fallgeschwindigkeit)
    const p = this.pkt;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(clamp(p.vy / 600, -0.45, 0.6));
    ctx.fillStyle = '#0078d7';
    roundRect(ctx, -12, -8, 24, 16, 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-11, -7); ctx.lineTo(0, 2); ctx.lineTo(11, -7);
    ctx.stroke();
    ctx.restore();

    scoreBadge.textContent = 'Score ' + this.score;
  },
  infoFields() {
    return [
      { k:'Zugestellt', v: this.passed + ' Pakete' },
      { k:'Bonus-Bytes', v: this.bytes },
      { k:'Durchsatz', v: (this.speed / 60).toFixed(1) + ' Mbps' },
      { k:'Score', v: this.score },
      { k:'Firewall-Lücke', v: Math.round(this.gap) + ' px', small:true },
      { k:'Adaptername', v: 'Ethernet', small:true },
      { k:'IPv4-Adresse', v: '192.168.178.42', small:true },
      { k:'Betriebszeit', v: uptimeStr(), small:true },
    ];
  }
};
