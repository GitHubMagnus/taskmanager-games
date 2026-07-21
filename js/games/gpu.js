"use strict";
/* ===========================================================================
   SPIEL — GPU: "Render-Defense"
   Render-Jobs fallen Richtung Frame-Linie. Die GPU-Karte fährt unten hin
   und her und schießt Shader-Impulse nach oben. Jeder Job, der durchkommt,
   kostet 20 FPS — bei 0 FPS ist Schluss.
   =========================================================================== */
const GpuGame = {
  paused: false, state: 'start', score: 0, best: 0,
  reset() {
    this.best = this.best || 0;
    this.ship = { x: CW / 2, w: 36, h: 14, vx: 0 };
    this.bullets = []; this.jobs = [];
    this.spawnT = 1.0; this.cool = 0;
    this.fps = 60; this.kills = 0; this.score = 0; this.elapsed = 0;
    this.jobSpeed = 42; this.bg = makeNoise();
    this.flashTxt = ''; this.flashT = 0;
    this.state = 'start';
  },
  start() { if (this.state !== 'play') { this.reset(); this.state = 'play'; overlay.classList.add('hidden'); } },
  onKeyDown(code) {
    if (this.state === 'start' && (code in keyMap)) { this.start(); return; }
    if (this.state === 'over' && code === 'KeyR') { this.reset(); this.start(); }
  },
  onClick() { this.shoot(); },
  flash(t) { this.flashTxt = t; this.flashT = 0.9; },
  shoot() {
    if (this.cool <= 0 && this.state === 'play') {
      this.bullets.push({ x: this.ship.x, y: CH - 34 });
      this.cool = 0.3;
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
    this.jobSpeed += 1.3 * dt;

    // Karte bewegen (gleiche träge Steuerung wie der Schreibkopf im Disk-Spiel)
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

    // Jobs spawnen (Dichte steigt langsam)
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.jobs.push({
        x: rand(24, CW - 24), y: -18, w: 26, h: 18,
        vy: this.jobSpeed * rand(0.8, 1.3),
        col: ['#7a5cd6', '#4aa3df', '#d35400'][Math.floor(rand(0, 3))]
      });
      this.spawnT = rand(0.75, 1.25) * clamp(50 / (35 + this.elapsed), 0.5, 1);
    }

    // Schüsse bewegen
    for (const b of this.bullets) b.y -= 430 * dt;

    // Jobs bewegen + Treffer/Durchbruch
    for (const j of this.jobs) {
      j.y += j.vy * dt;
      for (const b of this.bullets) {
        if (!b.hit && !j.dead && b.x > j.x - j.w / 2 && b.x < j.x + j.w / 2 && b.y > j.y && b.y < j.y + j.h) {
          b.hit = true; j.dead = true; this.kills++; this.score += 15;
        }
      }
      if (!j.dead && j.y + j.h >= CH - 18) {
        j.dead = true;
        this.fps -= 20;
        this.flash('Frame Drop! −20 FPS');
        if (this.fps <= 0) { this.fps = 0; this.gameOver(); return; }
      }
    }
    this.jobs = this.jobs.filter(j => !j.dead);
    this.bullets = this.bullets.filter(b => b.y > -12 && !b.hit);
    if (this.flashT > 0) this.flashT -= dt;
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

    // Render-Jobs (Vierecke mit Drahtgitter-Dreieck)
    for (const j of this.jobs) {
      ctx.fillStyle = j.col;
      roundRect(ctx, j.x - j.w / 2, j.y, j.w, j.h, 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(j.x, j.y + 3);
      ctx.lineTo(j.x + j.w / 2 - 4, j.y + j.h - 3);
      ctx.lineTo(j.x - j.w / 2 + 4, j.y + j.h - 3);
      ctx.closePath(); ctx.stroke();
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
    ctx.fillRect(sh.x - 2, sy - 6, 4, 6);   // Mündung der Render-Pipeline

    // FPS-Anzeige
    ctx.font = '600 12px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = this.fps >= 50 ? '#2e9c34' : this.fps >= 30 ? '#e8590c' : '#e81123';
    ctx.fillText('FPS ' + this.fps, 8, 16);

    // Treffer-Einblendung
    if (this.flashT > 0) {
      ctx.globalAlpha = clamp(this.flashT / 0.9, 0, 1);
      ctx.fillStyle = '#e81123'; ctx.font = '700 14px "Segoe UI", Arial, sans-serif';
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
      { k:'GPU-Takt', v: (1.71 + this.kills * 0.002).toFixed(2) + ' GHz' },
      { k:'Temperatur', v: (48 + Math.min(this.kills, 30)) + ' °C', small:true },
      { k:'Dedizierter Speicher', v: '2,1/12,0 GB', small:true },
      { k:'Treiberversion', v: '551.86', small:true },
      { k:'Betriebszeit', v: uptimeStr(), small:true },
    ];
  }
};
