// Neighborly Acre sounds, all made live with Web Audio (no sound files to download).
//   Engine: diesel tractor / combine that idles when parked and revs up with speed, plus start-up and shut-off.
//   Effects: harvest crunch, planting tick, coins, level-up jingle, animal collect.
// The 🔊 button (or the M key) mutes/unmutes; the choice is remembered on this device.
let ctx = null, master = null, eng = null, muted = false, lastHarvest = 0, lastPlant = 0;
try { muted = localStorage.getItem('na_sound') === 'off'; } catch (e) {}

function ac() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return ctx; }
  const A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
  ctx = new A(); master = ctx.createGain(); master.gain.value = muted ? 0 : .8; master.connect(ctx.destination);
  return ctx;
}
// browsers only allow sound after a tap/key/button press
['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, () => ac(), { passive: true }));
addEventListener('gamepadconnected', () => ac());
document.addEventListener('visibilitychange', () => { if (!ctx) return; document.hidden ? ctx.suspend().catch(() => {}) : ctx.resume().catch(() => {}); });

let noiseBuf = null;
function noise() {
  if (noiseBuf) return noiseBuf;
  const n = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate); const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return noiseBuf;
}
function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
function tone(f, t, dur, type = 'sine', vol = .2, f2) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  env(g, t, .01, vol, dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .05);
}
function burst(t, dur, freq, q, vol) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noise(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  env(g, t, .005, vol, dur); s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + .05);
}

// ---------------------------------------------------------------- engine
// Two detuned oscillators (the engine's firing note) run through a low-pass filter, pulsed by an LFO for the diesel "chug",
// with filtered noise on top for exhaust rumble. rpm (0..1) moves pitch, chug rate, brightness and loudness together.
function buildEngine() {
  const e = {}, t = ctx.currentTime;
  e.out = ctx.createGain(); e.out.gain.value = 0; e.out.connect(master);
  e.lp = ctx.createBiquadFilter(); e.lp.type = 'lowpass'; e.lp.frequency.value = 400; e.lp.Q.value = 3; e.lp.connect(e.out);
  e.pulse = ctx.createGain(); e.pulse.gain.value = .6; e.pulse.connect(e.lp);
  e.o1 = ctx.createOscillator(); e.o1.type = 'sawtooth'; e.o2 = ctx.createOscillator(); e.o2.type = 'square';
  const g1 = ctx.createGain(), g2 = ctx.createGain(); g1.gain.value = .5; g2.gain.value = .25;
  e.o1.connect(g1); e.o2.connect(g2); g1.connect(e.pulse); g2.connect(e.pulse);
  e.lfo = ctx.createOscillator(); e.lfo.type = 'square'; e.lfoG = ctx.createGain(); e.lfoG.gain.value = .4; e.lfo.connect(e.lfoG); e.lfoG.connect(e.pulse.gain);
  e.n = ctx.createBufferSource(); e.n.buffer = noise(); e.n.loop = true; e.nf = ctx.createBiquadFilter(); e.nf.type = 'bandpass'; e.nf.frequency.value = 180; e.nf.Q.value = 1.2;
  e.ng = ctx.createGain(); e.ng.gain.value = .35; e.n.connect(e.nf); e.nf.connect(e.ng); e.ng.connect(e.pulse);
  // combine only: high whine of the cutter reel / threshing drum
  e.wh = ctx.createOscillator(); e.wh.type = 'triangle'; e.whG = ctx.createGain(); e.whG.gain.value = 0; e.wh.connect(e.whG); e.whG.connect(e.out);
  [e.o1, e.o2, e.lfo, e.n, e.wh].forEach(o => o.start(t));
  e.on = false; e.rpm = 0; e.kind = 'tractor';
  return e;
}
function applyRpm(e, rpm, at) {
  const big = e.kind === 'combine', base = big ? 24 : 30, top = big ? 58 : 78, f = base + (top - base) * rpm, T = at || ctx.currentTime, k = .12;
  e.o1.frequency.setTargetAtTime(f, T, k); e.o2.frequency.setTargetAtTime(f * .503, T, k);
  e.lfo.frequency.setTargetAtTime(f / 2, T, k);                         // 4-stroke: a pop every other turn
  e.lp.frequency.setTargetAtTime((big ? 260 : 320) + 1300 * rpm, T, k);
  e.nf.frequency.setTargetAtTime(140 + 500 * rpm, T, k);
  e.wh.frequency.setTargetAtTime(big ? 520 + 380 * rpm : 0, T, k); e.whG.gain.setTargetAtTime(big && e.on ? .025 + .03 * rpm : 0, T, .3);
}

export const Sound = {
  get muted() { return muted; },
  setMuted(m) {
    muted = !!m; try { localStorage.setItem('na_sound', muted ? 'off' : 'on'); } catch (e) {}
    if (master) master.gain.setTargetAtTime(muted ? 0 : .8, ctx.currentTime, .05);
  },
  toggle() { this.setMuted(!muted); return muted; },

  // call when getting into a vehicle
  startEngine(kind = 'tractor') {
    if (!ac()) return; if (!eng) eng = buildEngine();
    const t = ctx.currentTime; eng.kind = kind; eng.on = true; eng.rpm = 0;
    // starter motor whirr, a couple of coughs, then the engine catches and settles to idle
    tone(160, t, .5, 'sawtooth', .05, 240); burst(t + .35, .12, 260, 1.5, .25); burst(t + .55, .12, 220, 1.5, .3);
    eng.out.gain.cancelScheduledValues(t); eng.out.gain.setValueAtTime(0, t); eng.out.gain.setValueAtTime(0, t + .6); eng.out.gain.linearRampToValueAtTime(.55, t + .75);
    applyRpm(eng, .45, t); applyRpm(eng, 0, t + .9);
  },
  // call when getting out
  stopEngine() {
    if (!eng || !eng.on) return; const t = ctx.currentTime; eng.on = false;
    eng.o1.frequency.setTargetAtTime(14, t, .25); eng.o2.frequency.setTargetAtTime(7, t, .25); eng.lfo.frequency.setTargetAtTime(6, t, .25);
    eng.out.gain.setTargetAtTime(0, t, .25); eng.whG.gain.setTargetAtTime(0, t, .15);
    burst(t + .5, .15, 200, 1.2, .18);                                  // last clunk as it stops
  },
  // every frame while driving: speed01 = 0 (idle) .. 1 (flat out)
  engine(speed01, working) {
    if (!eng || !eng.on || !ctx) return;
    const want = Math.min(1, Math.max(0, speed01 * .85 + (working ? .15 : 0)));
    eng.rpm += (want - eng.rpm) * .08;
    applyRpm(eng, eng.rpm);
    eng.out.gain.setTargetAtTime(.45 + .35 * eng.rpm, ctx.currentTime, .1);
  },

  harvest() { if (!ac() || performance.now() - lastHarvest < 70) return; lastHarvest = performance.now(); const t = ctx.currentTime; burst(t, .09, 2200 + Math.random() * 800, 2, .22); burst(t + .03, .12, 900, 1.5, .15); },
  plant() { if (!ac() || performance.now() - lastPlant < 60) return; lastPlant = performance.now(); const t = ctx.currentTime; burst(t, .05, 1200, 3, .14); tone(320 + Math.random() * 60, t, .06, 'sine', .05); },
  coin(gain = true) { if (!ac()) return; const t = ctx.currentTime; if (gain) { tone(1320, t, .09, 'square', .05); tone(1980, t + .07, .18, 'square', .05); } else { tone(700, t, .08, 'triangle', .1); tone(520, t + .06, .12, 'triangle', .08); } },
  levelUp() { if (!ac()) return; const t = ctx.currentTime; [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * .11, .35, 'triangle', .14)); tone(1568, t + .48, .6, 'sine', .08); },
  collect(what) {
    if (!ac()) return; const t = ctx.currentTime;
    if (what === 'egg') { tone(900, t, .08, 'square', .05, 1300); tone(1100, t + .1, .1, 'square', .05, 700); }          // cluck
    else if (what === 'milk') { tone(180, t, .7, 'sawtooth', .09, 120); }                                                // moo
    else if (what === 'wool') { const o = ctx.createOscillator(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = 340; l.frequency.value = 9; lg.gain.value = 30; l.connect(lg); lg.connect(o.frequency); env(g, t, .02, .07, .55); o.connect(g); g.connect(master); o.start(t); l.start(t); o.stop(t + .6); l.stop(t + .6); }   // baa
    else tone(880, t, .15, 'sine', .08);
  }
};
window.__farmSound = Sound;
