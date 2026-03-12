// Web Worker for background timer — handles stopwatch, countdown, pomodoro
let intervalId = null;
let startTime = 0;
let elapsed = 0;
let mode = "stopwatch";
let targetSeconds = 0;
let pomodoroPhase = "focus";
let pomodoroSessionsDone = 0;

const POMODORO_DURATIONS = { focus: 25 * 60, "short-break": 5 * 60, "long-break": 15 * 60 };

function stopInterval() {
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
}

function tick() {
  const now = Date.now();
  const currentElapsed = Math.floor((now - startTime) / 1000);

  if (mode === "stopwatch") {
    self.postMessage({ type: "tick", elapsed: currentElapsed });
  } else if (mode === "countdown") {
    const remaining = Math.max(0, targetSeconds - currentElapsed);
    self.postMessage({ type: "tick", elapsed: currentElapsed, remaining });
    if (remaining <= 0) {
      stopInterval();
      self.postMessage({ type: "complete", mode: "countdown" });
    }
  } else if (mode === "pomodoro") {
    const phaseDuration = POMODORO_DURATIONS[pomodoroPhase] || 25 * 60;
    const remaining = Math.max(0, phaseDuration - currentElapsed);
    self.postMessage({ type: "tick", elapsed: currentElapsed, remaining, phase: pomodoroPhase });
    if (remaining <= 0) {
      stopInterval();
      // Auto-advance phase
      let nextPhase, nextSessions = pomodoroSessionsDone;
      if (pomodoroPhase === "focus") {
        nextSessions = pomodoroSessionsDone + 1;
        nextPhase = (nextSessions % 4 === 0) ? "long-break" : "short-break";
      } else {
        nextPhase = "focus";
      }
      self.postMessage({
        type: "pomodoro_phase_complete",
        completedPhase: pomodoroPhase,
        nextPhase,
        sessionsDone: nextSessions,
      });
      pomodoroPhase = nextPhase;
      pomodoroSessionsDone = nextSessions;
    }
  }
}

self.onmessage = function (e) {
  const { type, data } = e.data;

  switch (type) {
    case "start":
      stopInterval();
      mode = data.mode || "stopwatch";
      elapsed = data.elapsed || 0;
      targetSeconds = data.targetSeconds || 0;
      pomodoroPhase = data.pomodoroPhase || "focus";
      pomodoroSessionsDone = data.pomodoroSessionsDone || 0;
      startTime = Date.now() - elapsed * 1000;
      intervalId = setInterval(tick, 1000);
      tick(); // immediate first tick
      break;

    case "pause":
      stopInterval();
      elapsed = Math.floor((Date.now() - startTime) / 1000);
      self.postMessage({ type: "paused", elapsed });
      break;

    case "stop":
      stopInterval();
      elapsed = Math.floor((Date.now() - startTime) / 1000);
      self.postMessage({ type: "stopped", elapsed });
      elapsed = 0;
      break;

    case "reset":
      stopInterval();
      elapsed = 0;
      self.postMessage({ type: "reset" });
      break;
  }
};
