"use strict";
/* ===========================================================================
   SPIEL — Datenträger 0: "Daten-Catcher" (Einsammeln & Ausweichen)
   Der Lese-/Schreibkopf (Paddle) fährt unten hin und her.
   Blaue Dateien einsammeln, goldener Cache gibt Bonus, rote Bad Sectors
   kosten einen von drei Sektoren. Neu: Combo-Multiplikator für Serien
   ohne Fehler (bis ×5) und regelmäßige I/O-Bursts — kurze, dichte
   Datei-Schauer als Ernte-Momente.
   =========================================================================== */
const DiskGame = {
  paused: false, state: 'start',
  reset() {
    this.paddle = { x: CW / 2, w: 84, h: 12, vx: 0 };
    this.items = [];
    this.spawnTimer = 0;
    this.fallSpeed = 150;
    this.score = 0; this.best = this.best || 0;
    this.lives = 3;                 // „Sektoren“
    this.elapsed = 0;
    this.collected = 0;
    this.combo = 0;                 // Serien-Zähler (Multiplikator = min(combo,5))
    this.burstT = 0;                // Restdauer des laufenden I/O-Bursts
    this.burstIn = rand(11, 15);    // Zeit bis zum nächsten Burst
    this.bg = makeNoise();
    this.flashTxt = ''; this.flashCol = '#e81123'; this.flashT = 0;
    this.state = 'start';
  },
  start() { if (this.state !== 'play') { this.reset(); this.state = 'play'; overlay.classList.add('hidden'); } },
  onKeyDown(code) {
    if (this.state === 'start' && (code in keyMap)) this.start();
    if (this.state === 'over'  && code === 'KeyR') { this.reset(); this.start(); }
  },
  flash(txt, col) { this.flashTxt = txt; this.flashCol = col; this.flashT = 0.8; },
  gameOver() {
    this.state = 'over';
    this.best = Math.max(this.best, this.score);
    showGameOver('Zu viele defekte Sektoren!', this.score, this.best,
      Math.floor(this.elapsed) + ' s  ·  ' + this.collected + ' Dateien');
  },
  update(dt) {
    if (this.state !== 'play') return;
    this.elapsed += dt;
    if (this.flashT > 0) this.flashT -= dt;

    // I/O-Burst-Taktung
    if (this.burstT > 0) {
      this.burstT -= dt;
    } else {
      this.burstIn -= dt;
      if (this.burstIn <= 0) {
        this.burstT = 3.5;
        this.burstIn = rand(13, 18);
        this.flash('I/O-Burst!', '#0067b8');
        S.turbo();
      }
    }

    // Paddle: leicht träge Beschleunigung für flüssiges Fahrgefühl
    const pd = this.paddle, acc = 3000, maxV = 640;
    if (Keys.left)       pd.vx -= acc * dt;
    else if (Keys.right) pd.vx += acc * dt;
    else                 pd.vx *= (1 - 12 * dt);
    pd.vx = clamp(pd.vx, -maxV, maxV);
    pd.x += pd.vx * dt;
    if (pd.x < pd.w / 2)      { pd.x = pd.w / 2; pd.vx = 0; }
    if (pd.x > CW - pd.w / 2) { pd.x = CW - pd.w / 2; pd.vx = 0; }

    // Spawns: Tempo steigt langsam; im Burst dichter und datei-lastiger
    this.fallSpeed += 5 * dt;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const r = Math.random();
      let kind = 'good';
      if (this.burstT > 0) {
        if (r < 0.12)      kind = 'bad';
        else if (r > 0.90) kind = 'bonus';
      } else {
        if (r < 0.34)      kind = 'bad';
        else if (r > 0.92) kind = 'bonus';
      }
      const w = 20;
      this.items.push({ x: rand(14, CW - 14 - w), y: -14, w, h: 14, kind,
                        vy: this.fallSpeed * rand(0.9, 1.15) });
      const base = rand(0.5, 0.85) * (150 / this.fallSpeed) + 0.14;
      this.spawnTimer = this.burstT > 0 ? base * 0.45 : base;
    }

    // Fallen + Fang-/Treffer-Prüfung
    const py = CH - 22;
    for (const it of this.items) {
      // Bad Sectors driften später leicht seitlich
      if (this.elapsed > 20 && it.kind === 'bad') it.x += Math.sin(this.elapsed * 2.5 + it.y * 0.05) * 26 * dt;
      it.y += it.vy * dt;
      if (!it.done &&
          it.y + it.h >= py && it.y <= py + pd.h &&
          it.x + it.w > pd.x - pd.w / 2 && it.x < pd.x + pd.w / 2) {
        it.done = true;
        if (it.kind === 'good') {
          this.combo++;
          const pts = 10 * Math.min(this.combo, 5);
          this.score += pts; this.collected++;
          this.flash('+' + pts + (this.combo >= 2 ? '  ×' + Math.min(this.combo, 5) : ''), '#1a86d0');
          S.coin();
        }
        if (it.kind === 'bonus') {
          this.combo++;
          this.score += 50; this.collected++;
          this.flash('+50 Cache!', '#f0b400');
          S.bonus();
        }
        if (it.kind === 'bad') {
          this.lives--; this.combo = 0;
          this.flash('Bad Sector!', '#e81123');
          S.hit();
        }
      }
      if (it.y > CH + 20) {
        it.done = true;
        if (it.kind === 'good') {          // verpasste Datei: Punktabzug + Combo weg
          this.score = Math.max(0, this.score - 5);
          this.combo = 0;
          this.flash('-5 verpasst', '#8a8a8a');
          S.miss();
        }
      }
    }
    this.items = this.items.filter(it => !it.done);

    if (this.lives <= 0) { this.gameOver(); return; }
  },
  draw() {
    ctx.clearRect(0, 0, CW, CH);
    drawGrid('#e5f3e8');

    // Hintergrund: Disk-Aktivitätsbalken (im Burst sichtbar dichter)
    ctx.fillStyle = this.burstT > 0 ? 'rgba(76,175,80,.22)' : 'rgba(76,175,80,.12)';
    for (let x = 0; x < CW; x += 10) {
      const v = Math.max(0, (this.bg((x + this.elapsed * 40) * 0.05) - 0.35)) * 130;
      ctx.fillRect(x, CH - v, 7, v);
    }
    if (this.burstT > 0) {
      ctx.fillStyle = 'rgba(0,103,184,.75)'; ctx.font = '600 12px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.fillText('I/O-Burst', CW / 2, 16); ctx.textAlign = 'left';
    }

    // fallende Items
    for (const it of this.items) {
      if (it.kind === 'good') {
        ctx.fillStyle = '#1a86d0';
        roundRect(ctx, it.x, it.y, it.w, it.h, 2); ctx.fill();
        ctx.fillStyle = '#0f5f9c';                       // umgeknickte Datei-Ecke
        ctx.beginPath();
        ctx.moveTo(it.x + it.w - 6, it.y); ctx.lineTo(it.x + it.w, it.y + 6);
        ctx.lineTo(it.x + it.w - 6, it.y + 6); ctx.closePath(); ctx.fill();
      } else if (it.kind === 'bad') {
        ctx.fillStyle = '#e05252';
        roundRect(ctx, it.x, it.y, it.w, it.h, 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath();   // weißes X
        ctx.moveTo(it.x + 4, it.y + 3);        ctx.lineTo(it.x + it.w - 4, it.y + it.h - 3);
        ctx.moveTo(it.x + it.w - 4, it.y + 3); ctx.lineTo(it.x + 4, it.y + it.h - 3);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#f0b400';
        roundRect(ctx, it.x, it.y, it.w, it.h, 3); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '700 11px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.fillText('★', it.x + it.w / 2, it.y + 11); ctx.textAlign = 'left';
      }
    }

    // Paddle (Lese-/Schreibkopf) mit Fangschalen-Kanten
    const pd = this.paddle, py = CH - 22;
    ctx.fillStyle = '#2e9c34';
    roundRect(ctx, pd.x - pd.w / 2, py, pd.w, pd.h, 3); ctx.fill();
    ctx.strokeStyle = '#1f6f24'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pd.x - pd.w / 2, py); ctx.lineTo(pd.x - pd.w / 2, py - 5);
    ctx.moveTo(pd.x + pd.w / 2, py); ctx.lineTo(pd.x + pd.w / 2, py - 5);
    ctx.stroke();
    // Combo-Anzeige am Paddle
    if (this.combo >= 2) {
      ctx.fillStyle = '#1a86d0'; ctx.font = '700 12px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.fillText('×' + Math.min(this.combo, 5), pd.x, py + 11);
      ctx.textAlign = 'left';
    }

    // Leben („Sektoren“) oben links
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < this.lives ? '#2e9c34' : '#d3dbde';
      roundRect(ctx, 8 + i * 16, 8, 12, 12, 2); ctx.fill();
    }
    ctx.fillStyle = '#555'; ctx.font = '11px "Segoe UI", Arial, sans-serif'; ctx.fillText('Sektoren', 8, 34);

    // Bonus-/Treffer-Einblendung am Paddle
    if (this.flashT > 0) {
      ctx.globalAlpha = clamp(this.flashT / 0.8, 0, 1);
      ctx.fillStyle = this.flashCol; ctx.font = '700 14px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.fillText(this.flashTxt, pd.x, py - 14); ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }

    scoreBadge.textContent = 'Score ' + this.score;
  },
  infoFields() {
    return [
      { k:'Aktive Zeit', v: clamp(18 + this.items.length * 11, 0, 100) + '%' },
      { k:'Gesammelt', v: this.collected + ' Dateien' },
      { k:'Combo', v: '×' + Math.max(1, Math.min(this.combo, 5)) },
      { k:'Score', v: this.score },
      { k:'Sektoren', v: '♥ '.repeat(Math.max(0, this.lives)).trim() || '—', small:true },
      { k:'Schreibgeschw.', v: Math.round(this.fallSpeed) + ' MB/s', small:true },
      { k:'Nächster Burst', v: this.burstT > 0 ? 'läuft!' : Math.ceil(this.burstIn) + ' s', small:true },
      { k:'Betriebszeit', v: uptimeStr(), small:true },
    ];
  }
};
