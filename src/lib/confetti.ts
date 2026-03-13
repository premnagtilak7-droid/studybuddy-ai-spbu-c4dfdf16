import confetti from "canvas-confetti";

// Small celebration for topic/subtopic completion
export function celebrateComplete() {
  confetti({
    particleCount: 30,
    spread: 60,
    origin: { y: 0.7 },
    colors: ["hsl(217,91%,60%)", "hsl(38,92%,50%)", "hsl(142,71%,45%)"],
  });
}

// Medium celebration for unit completion
export function celebrateUnit() {
  const count = 80;
  const defaults = { origin: { y: 0.6 }, colors: ["#3b82f6", "#f59e0b", "#22c55e", "#a855f7", "#ef4444"] };
  confetti({ ...defaults, particleCount: count, spread: 80, scalar: 1.2 });
  setTimeout(() => confetti({ ...defaults, particleCount: count / 2, spread: 100 }), 200);
}

// Big celebration for subject completion (all units done)
export function celebrateSubject() {
  const duration = 2500;
  const end = Date.now() + duration;
  const colors = ["#3b82f6", "#f59e0b", "#22c55e", "#a855f7", "#ef4444", "#ec4899"];
  const frame = () => {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}
