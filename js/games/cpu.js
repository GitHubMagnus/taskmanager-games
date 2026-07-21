"use strict";
/* ===========================================================================
   SPIEL — CPU: "Hillclimb auf der Auslastungskurve"
   Die CPU-Kurve ist die Fahrbahn. Gemächliches Grundtempo, weiches Gas,
   Hügel kosten Schwung. Langer Radstand für ruhige, gut lesbare Steuerung;
   die Kamera folgt vertikal, damit hohe Berge und Sprünge im Bild bleiben.
   Crashen ist unmöglich — Punkte gibt es für Distanz, Datenpunkte, Flips
   (Bonus für perfekte Landungen) und Turbo-Pads geben kurze Schub-Momente.
   =========================================================================== */
const CPUGame = {
  paused: false, state: 'start',   // start | play (kein Game Over)
  score: 0, best: 0,
  MAXSPEED: 150,                   // Grundlimit in Welt-Einheiten/s
  BOOSTSPEED: 210,                 // Limit während Turbo
  WHEELBASE: 14,                   // langer Radstand -> stabileres Fahrgefühl
  reset() {
    this.best = Math.max(this.best || 0, this.score || 0);
    this.state = 'start';
    this.noise = makeNoise();
    this.car = { x: 60, y: 0, vx: 30, vy: 0, angle: 0, angVel: 0, onGround: true, wheelR: 8 };
    this.camX = 0; this.camY = 0;
    this.score = 0; this.distance = 0;
    this.stunts = 0; this.stuntPoints = 0; this.coins = 0;
    this.airRot = 0; this.airTime = 0; this.speedDisplay = 0;
    this.worldScale = 3.2;         // Pixel pro Welt-Einheit horizontal
    this.flashTxt = ''; this.flashT = 0;
    this.coinList = []; this.nextCoinX = 160;
    this.padList = []; this.nextPadX = 320;
    this.boostT = 0;
  },
  flash(t) { this.flashTxt = t; this.flashT = 1.1; },

  /* Terrain: sanfte Hügel + gelegentliche steilere Rampen (CPU-Spikes). */
  terrain(x) {
    const n = this.noise;
    let h = 42
      + (n(x * 0.008) - 0.5) * 46
      + (n(x * 0.028 + 10) - 0.5) * 16
      + (n(x * 0.09 + 40) - 0.5) * 5;
    const spike = n(x * 0.005 + 200);
    if (spike > 0.72) h += (spike - 0.72) * 210;   // Sprungrampen
    return h;
  },
  terrainSlope(x) { const d = 1.2; return (this.terrain(x + d) - this.terrain(x - d)) / (2 * d); },
  // Fahrbahnwinkel aus beiden Radaufstandspunkten (ruhiger als Punkt-Steigung)
  groundAngleAt(x) {
    const hb = this.terrain(x - this.WHEELBASE / 2);
    const hf = this.terrain(x + this.WHEELBASE / 2);
    return Math.atan2(hf - hb, this.WHEELBASE);
  },

  /* Datenpunkte vorausgenerieren: Reihen auf der Fahrbahn, Bögen über Kuppen. */
  spawnCoins() {
    const aheadX = this.camX + CW / this.worldScale + 60;
    while (this.nextCoinX < aheadX) {
      const x0 = this.nextCoinX;
      if (Math.random() < 0.35) {
        for (let i = 0; i < 5; i++) {
          const cx = x0 + i * 7;
          this.coinList.push({ x: cx, y: this.terrain(cx) + 14 + Math.sin(i / 4 * Math.PI) * 10 });
        }
        this.nextCoinX = x0 + rand(130, 230);
      } else {
        for (let i = 0; i < 3; i++) {
          const cx = x0 + i * 8;
          this.coinList.push({ x: cx, y: this.terrain(cx) + 7 });
        }
        this.nextCoinX = x0 + rand(90, 180);
      }
    }
    this.coinList = this.coinList.filter(c => !c.taken && c.x > this.camX - 20);
    // Turbo-Pads auf der Fahrbahn
    while (this.nextPadX < aheadX) {
      this.padList.push({ x: this.nextPadX });
      this.nextPadX += rand(260, 420);
    }
    this.padList = this.padList.filter(p => !p.taken && p.x > this.camX - 20);
  },

  start() { if (this.state !== 'play') { this.reset(); this.state = 'play'; overlay.classList.add('hidden'); } },
  onKeyDown(code) {
    if (this.state === 'start' && (code in keyMap)) this.start();
    else if (this.state === 'play' && code === 'KeyR') { this.reset(); this.start(); }  // frische Strecke
  },

  update(dt) {
    if (this.state !== 'play') return;
    const car = this.car;
    const g = 480;                  // niedrige Gravitation -> genug Luftzeit für Flips
    if (this.boostT > 0) this.boostT -= dt;
    const effMax = this.boostT > 0 ? this.BOOSTSPEED : this.MAXSPEED;

    if (car.onGround) {
      if (Keys.up)        car.vx += 140 * dt;
      else if (Keys.down) car.vx -= 210 * dt;
      else {
        car.vx -= Math.sign(car.vx) * 50 * dt;   // Rollwiderstand
        if (Math.abs(car.vx) < 4) car.vx = 0;
      }
      car.vx = clamp(car.vx, -70, effMax);
    } else {
      let tq = 0;
      if (Keys.left)  tq += 1;   // Backflip
      if (Keys.right) tq -= 1;   // Frontflip
      car.angVel += tq * 44 * dt;
      if (tq === 0) car.angVel *= (1 - 1.6 * dt);
      car.angVel = clamp(car.angVel, -14, 14);
    }

    // Physik-Integration
    car.vy -= g * dt;
    car.x += car.vx * dt;
    car.y += car.vy * dt;

    const gh = this.terrain(car.x);
    const slope = this.terrainSlope(car.x);
    const groundAngle = this.groundAngleAt(car.x);

    if (car.y <= gh) {
      const wasAir = !car.onGround;
      if (wasAir) {
        // KEIN Crash: Flips zählen (mit ~55° Toleranz), Auto richtet sich auf.
        const flips = Math.floor(Math.abs(this.airRot) / (Math.PI * 2) + 0.15);
        car.angle = normAngle(car.angle);
        if (flips >= 1) {
          let pts = flips * 100;
          const perfect = Math.abs(normAngle(car.angle - groundAngle)) < 0.35;
          if (perfect) pts += 50;
          this.stunts += flips; this.stuntPoints += pts;
          this.flash(flips + '× FLIP' + (perfect ? ' · Perfekt!' : '') + '   +' + pts);
          S.bonus();
        } else if (this.airTime > 0.6) {
          this.stuntPoints += 20; this.flash('Big Air   +20');
          S.pop();
        }
        car.angVel = 0;
      }
      car.onGround = true;
      car.y = gh;
      car.angle = lerp(car.angle, groundAngle, clamp(dt * 14, 0, 1));
      // Hügel wirken deutlich: bergauf kostet Schwung, bergab schiebt an
      car.vx -= (slope / Math.sqrt(1 + slope * slope)) * g * 0.5 * dt;
      car.vx = clamp(car.vx, -70, effMax);
      const followVy = car.vx * slope;
      if (car.vy < followVy) car.vy = followVy;
      this.airRot = 0; this.airTime = 0;
    } else {
      car.onGround = false;
      car.angle += car.angVel * dt;
      this.airRot += car.angVel * dt;
      this.airTime += dt;
    }

    // Datenpunkte + Turbo-Pads
    this.spawnCoins();
    for (const c of this.coinList) {
      if (!c.taken && Math.abs(c.x - car.x) < 5 && Math.abs(c.y - (car.y + 6)) < 9) {
        c.taken = true; this.coins++; this.stuntPoints += 25;
        this.flash('+25 Datenpunkt');
        S.coin();
      }
    }
    for (const p of this.padList) {
      if (!p.taken && car.onGround && Math.abs(p.x - car.x) < 6) {
        p.taken = true;
        car.vx = Math.min(car.vx + 55, this.BOOSTSPEED);
        this.boostT = 1.8;
        this.flash('TURBO!');
        S.turbo();
      }
    }

    if (car.x - 60 > this.distance) this.distance = car.x - 60;
    this.camX = car.x - CW * 0.30 / this.worldScale;
    // vertikale Kamera: hohen Bergen und Sprüngen folgen, Auto bleibt im Bild
    const focus = Math.max(car.y, gh);
    const camTgt = clamp(focus - 58, 0, 90);
    this.camY = lerp(this.camY, camTgt, clamp(dt * 6, 0, 1));
    // harte Untergrenze: das Auto darf der Kamera beim Steigen nie entkommen
    this.camY = Math.max(this.camY, car.y - 78);

    this.speedDisplay = lerp(this.speedDisplay, Math.max(0, car.vx), 0.15);
    if (this.flashT > 0) this.flashT -= dt;
    this.score = Math.floor(this.distance) + this.stuntPoints;
  },

  draw() {
    ctx.clearRect(0, 0, CW, CH);
    drawGrid();
    const ws = this.worldScale;
    const toY = wy => CH - ((wy - this.camY) / 100) * CH;
    const toX = wx => (wx - this.camX) * ws;

    // Fahrbahn als gefüllte blaue CPU-Kurve
    ctx.beginPath();
    ctx.moveTo(0, CH);
    for (let sx = 0; sx <= CW; sx += 3) {
      ctx.lineTo(sx, toY(this.terrain(this.camX + sx / ws)));
    }
    ctx.lineTo(CW, CH); ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, CH);
    grad.addColorStop(0, 'rgba(23,160,224,.30)');
    grad.addColorStop(1, 'rgba(23,160,224,.05)');
    ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath();
    for (let sx = 0; sx <= CW; sx += 3) {
      const y = toY(this.terrain(this.camX + sx / ws));
      sx ? ctx.lineTo(sx, y) : ctx.moveTo(sx, y);
    }
    ctx.strokeStyle = '#17a0e0'; ctx.lineWidth = 2; ctx.stroke();

    // Turbo-Pads (Doppel-Chevron auf der Fahrbahn)
    for (const p of this.padList) {
      if (p.taken) continue;
      const px = toX(p.x), py = toY(this.terrain(p.x) + 3);
      if (px < -20 || px > CW + 20) continue;
      ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 2.5;
      for (const off of [0, 8]) {
        ctx.beginPath();
        ctx.moveTo(px - 6 + off, py - 5);
        ctx.lineTo(px + off, py);
        ctx.lineTo(px - 6 + off, py + 5);
        ctx.stroke();
      }
    }

    // Datenpunkte
    for (const c of this.coinList) {
      if (c.taken) continue;
      const cx = toX(c.x), cy = toY(c.y);
      if (cx < -10 || cx > CW + 10) continue;
      ctx.fillStyle = '#0078d7';
      circle(ctx, cx, cy, 4); ctx.fill();
      ctx.fillStyle = '#fff';
      circle(ctx, cx, cy, 1.6); ctx.fill();
    }

    // Auto (langer Radstand)
    const car = this.car;
    const sx = toX(car.x), sy = toY(car.y);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(-car.angle);        // Screen-Y ist invertiert
    // Turbo-Flamme
    if (this.boostT > 0) {
      ctx.fillStyle = Math.random() < 0.5 ? '#e8590c' : '#f0b400';
      ctx.beginPath();
      ctx.moveTo(-27, -10); ctx.lineTo(-38 - Math.random() * 6, -13); ctx.lineTo(-27, -16);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#e81123';
    roundRect(ctx, -26, -20, 52, 14, 3); ctx.fill();
    ctx.fillStyle = '#c50f1f';
    roundRect(ctx, -14, -28, 26, 9, 2); ctx.fill();   // Kabine
    const spin = car.x * 0.8;
    for (const wx of [-20, 20]) {
      ctx.fillStyle = '#222'; circle(ctx, wx, -6, car.wheelR); ctx.fill();
      ctx.fillStyle = '#888'; circle(ctx, wx, -6, 3); ctx.fill();
      ctx.strokeStyle = '#999'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(wx + Math.cos(spin) * 6, -6 + Math.sin(spin) * 6);
      ctx.lineTo(wx - Math.cos(spin) * 6, -6 - Math.sin(spin) * 6);
      ctx.stroke();
    }
    ctx.restore();

    // Live-Rotationsanzeige in der Luft
    if (!car.onGround && Math.abs(this.airRot) > 0.4) {
      const deg = Math.round(Math.abs(this.airRot) * 180 / Math.PI);
      ctx.fillStyle = '#0067b8'; ctx.font = '600 13px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.fillText(deg + '°', sx, sy - 46); ctx.textAlign = 'left';
    }
    // Bonus-Einblendung
    if (this.flashT > 0) {
      ctx.globalAlpha = clamp(this.flashT / 1.1, 0, 1);
      ctx.fillStyle = '#e8590c'; ctx.font = '700 15px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.fillText(this.flashTxt, CW / 2, 34);
      ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }
    scoreBadge.textContent = 'Score ' + this.score;
  },

  infoFields() {
    const pct = clamp(Math.round(this.speedDisplay / this.MAXSPEED * 100), 0, 100);
    return [
      { k:'Auslastung', v: pct + '%' },
      { k:'Geschwindigkeit', v: (this.speedDisplay / this.MAXSPEED * 3.3 + 0.6).toFixed(2) + ' GHz' },
      { k:'Distanz', v: Math.floor(this.distance) + ' m' },
      { k:'Stunts', v: this.stunts + ' Flips' },
      { k:'Datenpunkte', v: this.coins, small:true },
      { k:'Stunt-Punkte', v: this.stuntPoints, small:true },
      { k:'Turbo', v: this.boostT > 0 ? 'aktiv' : '—', small:true },
      { k:'Betriebszeit', v: uptimeStr(), small:true },
    ];
  }
};
