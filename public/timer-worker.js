// Web Worker for background timer
let intervalId = null;
let startTime = 0;
let elapsed = 0;
let mode = "stopwatch"; // stopwatch | countdown | pomodoro
let targetSeconds = 0;

self.onmessage = function (e) {
  const { type, data } = e.data;

  switch (type) {
    case "start":
      mode = data.mode || "stopwatch";
      elapsed = data.elapsed || 0;
      targetSeconds = data.targetSeconds || 0;
      startTime = Date.now() - elapsed * 1000;
      
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        const now = Date.now();
        const currentElapsed = Math.floor((now - startTime) / 1000);
        
        if (mode === "stopwatch") {
          self.postMessage({ type: "tick", elapsed: currentElapsed });
        } else {
          const remaining = Math.max(0, targetSeconds - currentElapsed);
          self.postMessage({ type: "tick", elapsed: currentElapsed, remaining });
          if (remaining <= 0) {
            clearInterval(intervalId);
            intervalId = null;
            self.postMessage({ type: "complete" });
          }
        }
      }, 1000);
      break;

    case "pause":
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      elapsed = Math.floor((Date.now() - startTime) / 1000);
      self.postMessage({ type: "paused", elapsed });
      break;

    case "stop":
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      elapsed = Math.floor((Date.now() - startTime) / 1000);
      self.postMessage({ type: "stopped", elapsed });
      elapsed = 0;
      break;

    case "reset":
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      elapsed = 0;
      self.postMessage({ type: "reset" });
      break;
  }
};
