"use strict";
/* ===========================================================================
   sound.js — kleine WebAudio-Synth-Effekte, keine Audiodateien nötig.
   Die Spiele melden Ereignisse an S.* (S.coin(), S.hit(), ...).
   M oder Klick auf das Lautsprecher-Symbol in der Fußzeile schaltet stumm.
   Der AudioContext entsteht erst nach der ersten Nutzereingabe
   (Autoplay-Policy der Browser).
   =========================================================================== */
const S = (() => {
  let ac = null, ok = true, muted = false, noiseBuf = null;

  function ctx() {
    if (!ok) return null;
    if (!ac) {
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { ok = false; return null; }
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  /* Oszillator mit Exponential-Hüllkurve; slide zieht die Frequenz Richtung Zielwert. */
  function tone(freq, dur, opt = {}) {
    if (muted) return;
    const a = ctx(); if (!a) return;
    const { type = 'square', vol = 0.1, slide = 0, delay = 0 } = opt;
    const t0 = a.currentTime + delay;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g).connect(a.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  /* kurzes, tiefpass-gefiltertes Rauschen für Treffer */
  function noise(dur, opt = {}) {
    if (muted) return;
    const a = ctx(); if (!a) return;
    const { vol = 0.12, delay = 0 } = opt;
    if (!noiseBuf) {
      noiseBuf = a.createBuffer(1, Math.floor(a.sampleRate * 0.3), a.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t0 = a.currentTime + delay;
    const src = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
    src.buffer = noiseBuf;
    f.type = 'lowpass'; f.frequency.value = 900;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(a.destination);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }

  const api = {
    start()  { tone(440, .08, { vol:.08 }); tone(660, .10, { vol:.08, delay:.09 }); },
    jump()   { tone(280, .12, { slide:260, vol:.07 }); },
    coin()   { tone(880, .06, { vol:.06 }); tone(1318, .08, { vol:.06, delay:.05 }); },
    bonus()  { tone(660, .07, { vol:.08 }); tone(880, .07, { vol:.08, delay:.07 }); tone(1318, .10, { vol:.08, delay:.14 }); },
    turbo()  { tone(220, .30, { type:'sawtooth', slide:660, vol:.09 }); },
    shoot()  { tone(950, .05, { type:'triangle', slide:-500, vol:.05 }); },
    pop()    { tone(500, .06, { slide:-260, vol:.07 }); },
    miss()   { tone(220, .10, { slide:-80, vol:.05 }); },
    hit()    { noise(.20, { vol:.14 }); tone(140, .18, { type:'sawtooth', slide:-60, vol:.10 }); },
    over()   { tone(392, .15, { vol:.09 }); tone(311, .15, { vol:.09, delay:.16 }); tone(233, .30, { vol:.09, delay:.32 }); },
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      const el = document.getElementById('sndToggle');
      if (el) el.textContent = muted ? '\u{1F507}' : '\u{1F50A}';
    }
  };

  // M schaltet stumm; Klick auf das Lautsprecher-Symbol ebenso
  window.addEventListener('keydown', e => { if (e.code === 'KeyM' && !e.repeat) api.toggle(); });
  const el = document.getElementById('sndToggle');
  if (el) el.addEventListener('click', () => api.toggle());

  return api;
})();
