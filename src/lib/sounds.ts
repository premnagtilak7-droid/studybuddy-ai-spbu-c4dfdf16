// Centralized sound system using Web Audio API
// All sounds are synthesized — no external files needed

const VOLUME_KEY = "sppu_sound_volume";

export function getSoundVolume(): number {
  try {
    const v = localStorage.getItem(VOLUME_KEY);
    return v ? parseFloat(v) : 0.8;
  } catch { return 0.8; }
}

export function setSoundVolume(v: number) {
  localStorage.setItem(VOLUME_KEY, String(Math.max(0, Math.min(1, v))));
}

function getCtx(): AudioContext | null {
  try { return new AudioContext(); } catch { return null; }
}

function vol() { return getSoundVolume(); }

// ── ALARM BELL (loud, for timer finish) ──
export function playAlarmBell() {
  const ctx = getCtx(); if (!ctx) return;
  const v = vol();
  // 3 descending bell tones repeated
  [0, 0.4, 0.8, 1.5, 1.9, 2.3].forEach((t, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(i % 3 === 0 ? 1200 : i % 3 === 1 ? 1000 : 800, ctx.currentTime + t);
    gain.gain.setValueAtTime(v * 0.6, ctx.currentTime + t);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + t + 0.35);
    osc.start(ctx.currentTime + t);
    osc.stop(ctx.currentTime + t + 0.35);
  });
}

// ── POMODORO FOCUS END (triumphant bell) ──
export function playPomodoroFocusEnd() {
  const ctx = getCtx(); if (!ctx) return;
  const v = vol();
  [880, 1100, 1320, 1760].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
    gain.gain.setValueAtTime(v * 0.5, ctx.currentTime + i * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.4);
    osc.start(ctx.currentTime + i * 0.15);
    osc.stop(ctx.currentTime + i * 0.15 + 0.4);
  });
}

// ── POMODORO BREAK END (gentle alert) ──
export function playPomodoroBreakEnd() {
  const ctx = getCtx(); if (!ctx) return;
  const v = vol();
  [660, 880, 660].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.2);
    gain.gain.setValueAtTime(v * 0.5, ctx.currentTime + i * 0.2);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.2 + 0.3);
    osc.start(ctx.currentTime + i * 0.2);
    osc.stop(ctx.currentTime + i * 0.2 + 0.3);
  });
}

// ── STUDY REMINDER (urgent notification) ──
export function playReminderSound() {
  const ctx = getCtx(); if (!ctx) return;
  const v = vol();
  [0, 0.3, 0.6, 1.2, 1.5, 1.8].forEach((t, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(i % 2 === 0 ? 1000 : 1200, ctx.currentTime + t);
    gain.gain.setValueAtTime(v * 0.4, ctx.currentTime + t);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + t + 0.2);
    osc.start(ctx.currentTime + t);
    osc.stop(ctx.currentTime + t + 0.2);
  });
}

// ── ACHIEVEMENT/BADGE (reward fanfare) ──
export function playRewardSound() {
  const ctx = getCtx(); if (!ctx) return;
  const v = vol();
  [523, 659, 784, 1047].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
    gain.gain.setValueAtTime(v * 0.4, ctx.currentTime + i * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.5);
    osc.start(ctx.currentTime + i * 0.12);
    osc.stop(ctx.currentTime + i * 0.12 + 0.5);
  });
}

// ── MESSAGE RECEIVED (chat ping) ──
export function playMessageSound() {
  const ctx = getCtx(); if (!ctx) return;
  const v = vol();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(1200, ctx.currentTime);
  osc.frequency.setValueAtTime(900, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(v * 0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.2);
}

// ── USER JOIN (ascending chime) ──
export function playJoinSound() {
  const ctx = getCtx(); if (!ctx) return;
  const v = vol();
  [600, 800, 1000].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
    gain.gain.setValueAtTime(v * 0.25, ctx.currentTime + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.3);
    osc.start(ctx.currentTime + i * 0.1);
    osc.stop(ctx.currentTime + i * 0.1 + 0.3);
  });
}

// ── TOPIC COMPLETE (pop) ──
export function playCompleteSound() {
  const ctx = getCtx(); if (!ctx) return;
  const v = vol();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(v * 0.35, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.25);
}

// ── ERROR (buzz) ──
export function playErrorSound() {
  const ctx = getCtx(); if (!ctx) return;
  const v = vol();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.setValueAtTime(150, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(v * 0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
}

// ── GENERIC NOTIFICATION (the existing beep, louder) ──
export function playNotificationSound() {
  const ctx = getCtx(); if (!ctx) return;
  const v = vol();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
  osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
  gain.gain.setValueAtTime(v * 0.5, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.5);
}
