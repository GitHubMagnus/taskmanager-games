"use strict";
/* ===========================================================================
   SPIEL — GPU: "Render-Defense"
   Render-Jobs fallen Richtung Frame-Linie, die GPU-Karte schießt Shader-
   Impulse nach oben. Neu: drei Job-Typen (normal, schwerer 4K-Job mit
   2 Trefferpunkten, flinker Glitch-Job) und VRAM-Drops von zerstörten
   Jobs — eingesammelt geben sie +20 FPS zurück oder 6 s Dreifach-Schuss.
   =========================================================================== */
const GpuGame = {
  paused: false, state: 'start', score: 0, best: 0,
  reset() {
    this.best = this.best || 0;
    this.ship = { x: CW / 2, w: 36, h: 14, vx: 0 };
    this.bullets = []; this.jobs = []; this.drops = [];
    this.spawnT = 1.6; this.cool = 0;
    this.fps = 60; this.kills = 0; this.score = 0; this.elapsed = 0;
    this.jobSpeed = 36; this.bg = makeNoise();
    this.tripleT = 0; this.dropsCaught = 0;
    this.flashTxt = ''; this.flashCol = '#e81123'; this.flashT = 0;
    this.state = 'start';
  },
  start() { if (this.state !== 'play') { this.reset(); this.state = 'play'; overlay.classList.add('hidden'); } },
  onKeyDown(code) {
    if (this.state === 'start' && (code in keyMap)) { this.start(); return; }
    if (this.state === 'over' && code === 'KeyR') { this.reset(); this.start(); }
  },
  onClick() { this.shoot(); },
  flash(t, col) { this.flashTxt = t; this.flashCol = col || '#e81123'; this.flashT = 0.9; },
  shoot() {
    if (this.cool <= 0 && this.state === 'play') {
      this.bullets.push({ x: this.ship.x, y: CH - 34 });
      if (this.tripleT > 0) {
        this.bullets.push({ x: this.ship.x - 9, y: CH - 34 });
        this.bullets.push({ x: this.ship.x + 9, y: CH - 34 });
      }
      this.cool = 0.18;          // hohe Feuerrate (~5,5 Schuss/s)
      S.shoot();
    }
  },
  gameOver() {
    this.state = 'over';
    this.best = Math.max(this.best, this.score);
    showGameOver('GPU überlastet — 0 FPS!', this.score, this.best, this.kills + ' Jobs gerendert');
  },
  update(dt) {
    if (this.state !== 'play') return;
    this.elapsed += dt;
    this.jobSpeed += 1.1 * dt;
    if (this.tripleT > 0) this.tripleT -= dt;
    if (this.flashT > 0) this.flashT -= dt;

    // Karte bewegen
    const sh = this.ship, acc = 2600, maxV = 520;
    if (Keys.left)       sh.vx -= acc * dt;
    else if (Keys.right) sh.vx += acc * dt;
    else                 sh.vx *= (1 - 12 * dt);
    sh.vx = clamp(sh.vx, -maxV, maxV);
    sh.x += sh.vx * dt;
    if (sh.x < sh.w / 2)      { sh.x = sh.w / 2; sh.vx = 0; }
    if (sh.x > CW - sh.w / 2) { sh.x = CW - sh.w / 2; sh.vx = 0; }

    // Feuern: Halten = Dauerfeuer mit Abklingzeit
    this.cool -= dt;
    if (Keys.jump) this.shoot();

    // Jobs spawnen: normal / schwer (2 HP) / flink
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      const r = Math.random();
      let job;
      if (r < 0.15) {
        job = { x: rand(28, CW - 28), y: -24, w: 34, h: 24, hp: 2, pts: 40,
                vy: this.jobSpeed * rand(0.55, 0.75), col: '#5b3fae', kind: 'heavy' };
      } else if (r < 0.35) {
        job = { x: rand(20, CW - 20), y: -14, w: 16, h: 12, hp: 1, pts: 25,
                vy: this.jobSpeed * rand(1.5, 1.9), col: '#e8590c', kind: 'fast' };
      } else {
        job = { x: rand(24, CW - 24), y: -18, w: 26, h: 18, hp: 1, pts: 15,
                vy: this.jobSpeed * rand(0.8, 1.3),
                col: ['#7a5cd6', '#4aa3df'][Math.floor(rand(0, 2))], kind: 'normal' };
      }
      this.jobs.push(job);
      // ruhiger Einstieg (~1,5–2,4 s Abstand), zieht über ~90 s spürbar an
      this.spawnT = rand(1.0, 1.6) * clamp(55 / (28 + this.elapsed), 0.5, 1.5);
    }

    // Schüsse bewegen
    for (const b of this.bullets) b.y -= 430 * dt;

    // Jobs bewegen + Treffer/Durchbruch
    for (const j of this.jobs) {
      j.y += j.vy * dt;
      for (const b of this.bullets) {
        if (!b.hit && !j.dead && b.x > j.x - j.w / 2 && b.x < j.x + j.w / 2 && b.y > j.y && b.y < j.y + j.h) {
          b.hit = true;
          j.hp--;
          if (j.hp <= 0) {
            j.dead = true; this.kills++; this.score += j.pts;
            S.pop();
            // VRAM-Drop: fällt herunter, mit der Karte einsammeln
            if (Math.random() < 0.2) {
              this.drops.push({ x: j.x, y: j.y + j.h / 2, vy: 130,
                                type: Math.random() < 0.5 ? 'fps' : 'triple' });
            }
          }
        }
      }
      if (!j.dead && j.y + j.h >= CH - 18) {
        j.dead = true;
        this.fps -= 20;
        this.flash('Frame Drop! −20 FPS');
        S.hit();
        if (this.fps <= 0) { this.fps = 0; this.gameOver(); return; }
      }
    }
    this.jobs = this.jobs.filter(j => !j.dead);
    this.bullets = this.bullets.filter(b => b.y > -12 && !b.hit);

    // Drops fallen + einsammeln
    for (const d of this.drops) {
      d.y += d.vy * dt;
      if (!d.done && d.y >= CH - 32 && d.y <= CH - 12 && Math.abs(d.x - sh.x) < sh.w / 2 + 8) {
        d.done = true; this.dropsCaught++;
        S.bonus();
        if (d.type === 'fps') {
          this.fps = Math.min(60, this.fps + 20);
          this.flash('+20 FPS!', '#2e9c34');
        } else {
          this.tripleT = 6;
          this.flash('Dreifach-Shader!', '#e8590c');
        }
      }
      if (d.y > CH + 10) d.done = true;
    }
    this.drops = this.drops.filter(d => !d.done);
  },
  draw() {
    ctx.clearRect(0, 0, CW, CH);
    drawGrid('#f6e3da');

    // Frame-Linie
    ctx.strokeStyle = '#e81123'; ctx.setLineDash([6, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, CH - 18 + .5); ctx.lineTo(CW, CH - 18 + .5); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#e81123'; ctx.font = '10px "Segoe UI", Arial, sans-serif';
    ctx.fillText('Frame-Linie', 6, CH - 22);

    // Render-Jobs (Vierecke mit Drahtgitter-Dreieck; schwere zeigen Risse)
    for (const j of this.jobs) {
      ctx.fillStyle = j.col;
      roundRect(ctx, j.x - j.w / 2, j.y, j.w, j.h, 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(j.x, j.y + 3);
      ctx.lineTo(j.x + j.w / 2 - 4, j.y + j.h - 3);
      ctx.lineTo(j.x - j.w / 2 + 4, j.y + j.h - 3);
      ctx.closePath(); ctx.stroke();
      if (j.kind === 'heavy') {
        ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = '700 9px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.fillText(j.hp === 2 ? '4K' : '4K!', j.x, j.y - 3); ctx.textAlign = 'left';
        if (j.hp === 1) {   // angeschlagen: Riss
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(j.x - j.w / 2 + 3, j.y + 4);
          ctx.lineTo(j.x - 2, j.y + j.h / 2);
          ctx.lineTo(j.x + j.w / 2 - 5, j.y + j.h - 4);
          ctx.stroke();
        }
      }
    }

    // VRAM-Drops
    for (const d of this.drops) {
      if (d.type === 'fps') {
        ctx.fillStyle = '#2e9c34';
        roundRect(ctx, d.x - 8, d.y - 6, 16, 12, 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '700 8px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.fillText('FPS', d.x, d.y + 3); ctx.textAlign = 'left';
      } else {
        ctx.fillStyle = '#e8590c';
        roundRect(ctx, d.x - 8, d.y - 6, 16, 12, 2); ctx.fill();
        ctx.fillStyle = '#fff';
        for (const off of [-4, 0, 4]) { ctx.fillRect(d.x + off - 1, d.y - 3, 2, 6); }
      }
    }

    // Schüsse (Shader-Impulse)
    ctx.fillStyle = '#e8590c';
    for (const b of this.bullets) ctx.fillRect(b.x - 1.5, b.y - 8, 3, 8);

    // GPU-Karte mit zwei Lüftern
    const sh = this.ship, sy = CH - 30;
    ctx.fillStyle = '#d35400';
    roundRect(ctx, sh.x - sh.w / 2, sy, sh.w, sh.h, 3); ctx.fill();
    ctx.fillStyle = '#a33e00';
    circle(ctx, sh.x - 8, sy + 7, 5); ctx.fill();
    circle(ctx, sh.x + 8, sy + 7, 5); ctx.fill();
    ctx.fillStyle = '#fff';
    circle(ctx, sh.x - 8, sy + 7, 1.5); ctx.fill();
    circle(ctx, sh.x + 8, sy + 7, 1.5); ctx.fill();
    ctx.fillStyle = '#d35400';
    ctx.fillRect(sh.x - 2, sy - 6, 4, 6);   // Mündung
    if (this.tripleT > 0) {                 // Dreifach-Schuss sichtbar machen
      ctx.fillRect(sh.x - 11, sy - 4, 3, 4);
      ctx.fillRect(sh.x + 8, sy - 4, 3, 4);
    }

    // FPS-Anzeige
    ctx.font = '600 12px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = this.fps >= 50 ? '#2e9c34' : this.fps >= 30 ? '#e8590c' : '#e81123';
    ctx.fillText('FPS ' + this.fps, 8, 16);

    // Einblendung
    if (this.flashT > 0) {
      ctx.globalAlpha = clamp(this.flashT / 0.9, 0, 1);
      ctx.fillStyle = this.flashCol; ctx.font = '700 14px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.fillText(this.flashTxt, CW / 2, 40);
      ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }

    scoreBadge.textContent = 'Score ' + this.score;
  },
  infoFields() {
    return [
      { k:'FPS', v: this.fps },
      { k:'Gerendert', v: this.kills + ' Jobs' },
      { k:'Score', v: this.score },
      { k:'Shader', v: this.tripleT > 0 ? 'Dreifach (' + this.tripleT.toFixed(0) + ' s)' : 'Standard' },
      { k:'VRAM-Drops', v: this.dropsCaught, small:true },
      { k:'Temperatur', v: (48 + Math.min(this.kills, 30)) + ' °C', small:true },
      { k:'Treiberversion', v: '551.86', small:true },
      { k:'Betriebszeit', v: uptimeStr(), small:true },
    ];
  }
};
