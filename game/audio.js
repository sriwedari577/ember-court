// Ember Court: sound without sound files. Small synthesized tones
// through WebAudio, so the game loads nothing over the network and
// needs no audio assets. The first user gesture starts the context.
let ctx = null;
let muted = false;

export function setMuted(value) { muted = value; }

export function ensureAudio() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

function tone(freq, dur, type = 'sine', gain = 0.08, when = 0) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur);
}

export function playSound(kind) {
  if (!ctx || muted) return;
  if (kind === 'play') { tone(392, 0.12, 'triangle', 0.09); tone(523, 0.16, 'triangle', 0.07, 0.06); }
  else if (kind === 'attack') { tone(180, 0.1, 'sawtooth', 0.06); tone(120, 0.14, 'sawtooth', 0.06, 0.05); }
  else if (kind === 'spell') { tone(660, 0.1, 'sine', 0.08); tone(880, 0.18, 'sine', 0.07, 0.07); }
  else if (kind === 'turn') { tone(440, 0.09, 'triangle', 0.06); }
  else if (kind === 'win') { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.09, i * 0.12)); }
  else if (kind === 'lose') { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.24, 'sine', 0.08, i * 0.14)); }
  else if (kind === 'select') { tone(520, 0.06, 'sine', 0.05); }
  else if (kind === 'error') { tone(140, 0.12, 'square', 0.04); }
}
