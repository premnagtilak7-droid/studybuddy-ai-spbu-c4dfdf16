import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useSpring, useInView, useMotionValue, useTransform, AnimatePresence } from "framer-motion";

/* ---------- helpers ---------- */
const Counter = ({ to, suffix = "", decimals = 0 }: { to: number; suffix?: string; decimals?: number }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const dur = 1800;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(to * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);
  return <span ref={ref}>{val.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
};

const RevealWords = ({ text, className = "", gradient = false, delay = 0 }: { text: string; className?: string; gradient?: boolean; delay?: number }) => (
  <span className={className}>
    {text.split(" ").map((w, i) => (
      <span key={i} className="inline-block overflow-hidden align-bottom pr-[0.25em]">
        <motion.span
          className={"inline-block " + (gradient ? "bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-300 bg-clip-text text-transparent" : "")}
          initial={{ y: "110%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: delay + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          {w}
        </motion.span>
      </span>
    ))}
  </span>
);

/* ---------- nav ---------- */
const Nav = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const links = [
    { l: "Features", h: "#features" },
    { l: "How It Works", h: "#how" },
    { l: "Pricing", h: "#pricing" },
    { l: "Download App", h: "/download", route: true },
  ];
  return (
    <>
      <motion.header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? "backdrop-blur-xl bg-black/60 border-b border-white/[0.06]" : "bg-transparent"}`}
        initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="relative w-7 h-7 grid place-items-center">
              <span className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-400 rounded-md blur-md opacity-60 group-hover:opacity-90 transition" />
              <span className="relative w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-400 grid place-items-center text-[10px] font-bold text-white">✦</span>
            </span>
            <span className="font-semibold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">ProStudyBuddy</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            {links.map((l) => l.route ? (
              <Link key={l.l} to={l.h} className="hover:text-white transition-colors">{l.l}</Link>
            ) : (
              <a key={l.l} href={l.h} className="hover:text-white transition-colors">{l.l}</a>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <Link to="/auth" className="text-sm text-zinc-300 hover:text-white px-3 py-2">Sign In</Link>
            <Link to="/auth" className="relative text-sm text-white px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.6)] transition-all">Get Started</Link>
          </div>
          <button className="md:hidden text-white" onClick={() => setOpen(!open)} aria-label="Menu">
            <div className="w-6 h-[2px] bg-white mb-1.5" /><div className="w-6 h-[2px] bg-white mb-1.5" /><div className="w-4 h-[2px] bg-white" />
          </button>
        </div>
      </motion.header>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-40 bg-black/95 backdrop-blur-xl md:hidden flex flex-col items-center justify-center gap-8 text-xl"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {links.map((l) => l.route ? (
              <Link key={l.l} to={l.h} onClick={() => setOpen(false)} className="text-white">{l.l}</Link>
            ) : (
              <a key={l.l} href={l.h} onClick={() => setOpen(false)} className="text-white">{l.l}</a>
            ))}
            <Link to="/auth" onClick={() => setOpen(false)} className="px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 text-white">Get Started</Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/* ---------- hero ---------- */
const HeroMockup = () => {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0); const my = useMotionValue(0);
  const rx = useTransform(my, [-50, 50], [8, -8]);
  const ry = useTransform(mx, [-50, 50], [-8, 8]);
  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect(); if (!r) return;
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 100);
    my.set(((e.clientY - r.top) / r.height - 0.5) * 100);
  };
  return (
    <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={() => { mx.set(0); my.set(0); }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1200 }}
      initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.6 }}
      className="relative mx-auto mt-16 max-w-4xl">
      <div className="absolute -inset-8 bg-gradient-to-r from-indigo-500/30 via-violet-500/30 to-cyan-500/30 blur-3xl rounded-full" />
      <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-1 shadow-2xl">
        <div className="rounded-xl bg-gradient-to-br from-zinc-950 to-black p-6 border border-white/5">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-3 h-3 rounded-full bg-red-500/70" /><span className="w-3 h-3 rounded-full bg-yellow-500/70" /><span className="w-3 h-3 rounded-full bg-green-500/70" />
            <span className="ml-3 text-xs text-zinc-500 font-mono">prostudybuddy.app/dashboard</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-3">
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">AI Tutor</div>
                <div className="space-y-2 text-sm">
                  <div className="text-zinc-300">Explain quantum entanglement simply.</div>
                  <div className="text-indigo-300">Imagine two coins flipped at once — measuring one instantly tells you the other...</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  <div className="text-[10px] text-zinc-500 uppercase">Streak</div>
                  <div className="text-xl font-semibold text-white mt-1">47 days</div>
                </div>
                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  <div className="text-[10px] text-zinc-500 uppercase">Mastery</div>
                  <div className="text-xl font-semibold bg-gradient-to-r from-indigo-300 to-cyan-300 bg-clip-text text-transparent mt-1">86%</div>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <div className="text-[10px] uppercase text-zinc-500 mb-2">Today</div>
              {["Calculus", "Organic Chem", "Linear Alg"].map((s, i) => (
                <div key={s} className="flex items-center justify-between text-xs py-1.5">
                  <span className="text-zinc-300">{s}</span>
                  <span className="text-zinc-500">{[92, 78, 64][i]}%</span>
                </div>
              ))}
              <div className="mt-3 h-20 rounded bg-gradient-to-tr from-indigo-500/20 via-violet-500/20 to-cyan-500/20" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const Hero = () => (
  <section className="relative pt-40 pb-24 overflow-hidden">
    {/* aurora */}
    <div className="absolute inset-0 -z-10">
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-indigo-600/20 blur-[120px] animate-aurora-1" />
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-violet-600/20 blur-[120px] animate-aurora-2" />
      <div className="absolute bottom-0 left-1/2 w-[500px] h-[500px] rounded-full bg-cyan-500/15 blur-[120px] animate-aurora-3" />
    </div>
    {/* perspective grid */}
    <div className="absolute inset-x-0 bottom-0 h-[400px] -z-10 [perspective:600px] [perspective-origin:50%_0]">
      <div className="absolute inset-0 [transform:rotateX(60deg)] origin-top opacity-40"
        style={{ backgroundImage: "linear-gradient(rgba(139,92,246,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.15) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
    </div>
    {/* beam */}
    <div className="pointer-events-none absolute -top-20 left-0 w-full h-full overflow-hidden -z-10">
      <div className="absolute top-0 -left-1/2 w-[200%] h-32 bg-gradient-to-r from-transparent via-violet-400/10 to-transparent animate-beam" />
    </div>

    <div className="max-w-7xl mx-auto px-6 text-center relative">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-xs text-zinc-300 backdrop-blur-sm">
        <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">✦</span>
        Introducing AI Study Engine 2.0
      </motion.div>

      <h1 className="mt-8 text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05] text-white">
        <div><RevealWords text="Study Like the" /></div>
        <div><RevealWords text="Top 1% of Students" delay={0.3} /></div>
        <div><RevealWords text="— Powered by AI" gradient delay={0.7} /></div>
      </h1>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
        className="mt-8 max-w-2xl mx-auto text-lg text-zinc-400">
        ProStudyBuddy gives every student an unfair advantage. AI tutoring, smart flashcards, and personalized study plans — all in one platform.
      </motion.p>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.7 }}
        className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link to="/auth" className="group relative px-6 py-3 rounded-lg overflow-hidden">
          <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500" />
          <span className="absolute -inset-[2px] rounded-lg bg-[conic-gradient(from_0deg,#6366f1,#8b5cf6,#06b6d4,#6366f1)] animate-spin-slow opacity-80 -z-10" />
          <span className="absolute inset-[2px] rounded-[6px] bg-black/40 -z-10" />
          <span className="relative text-white font-medium flex items-center gap-2">Start for Free <span className="group-hover:translate-x-1 transition-transform">→</span></span>
        </Link>
        <Link to="/download" className="px-6 py-3 rounded-lg border border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06] transition-all">Download the App</Link>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
        className="mt-10 flex items-center justify-center gap-3 text-sm text-zinc-400">
        <div className="flex -space-x-2">
          {["#6366f1", "#8b5cf6", "#06b6d4", "#22d3ee", "#a78bfa"].map((c, i) => (
            <div key={i} className="w-7 h-7 rounded-full border-2 border-black" style={{ background: `linear-gradient(135deg, ${c}, #000)` }} />
          ))}
        </div>
        Trusted by 50,000+ students
      </motion.div>

      <HeroMockup />
    </div>
  </section>
);

/* ---------- logo strip ---------- */
const LogoStrip = () => {
  const unis = ["MIT", "Stanford", "Harvard", "Oxford", "IIT", "Yale", "Cambridge", "UCLA", "NUS", "Imperial College"];
  return (
    <section className="py-16 border-y border-white/[0.05]">
      <div className="text-center text-xs uppercase tracking-[0.2em] text-zinc-500 mb-8">Trusted by students from</div>
      <div className="relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent z-10" />
        <div className="flex gap-16 animate-marquee whitespace-nowrap">
          {[...unis, ...unis].map((u, i) => (
            <span key={i} className="text-2xl font-semibold text-zinc-600 hover:text-zinc-300 transition-colors">{u}</span>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ---------- stats ---------- */
const Stats = () => (
  <section className="py-20">
    <div className="max-w-6xl mx-auto px-6">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl p-10 grid grid-cols-2 md:grid-cols-4 gap-8">
        {[
          { v: 50000, s: "+", l: "Active Students" },
          { v: 98.3, s: "%", l: "Pass Rate", d: 1 },
          { v: 200, s: "+", l: "Subjects" },
          { v: 4.9, s: "★", l: "Avg Rating", d: 1 },
        ].map((s) => (
          <div key={s.l} className="text-center">
            <div className="text-4xl md:text-5xl font-bold bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent">
              <Counter to={s.v} suffix={s.s} decimals={s.d || 0} />
            </div>
            <div className="mt-2 text-sm text-zinc-500">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ---------- features ---------- */
const FEATURES = [
  { i: "🤖", t: "AI Tutor", d: "Instant concept explanations, 24/7. Ask anything, get a clear answer with worked examples in seconds." },
  { i: "🃏", t: "Smart Flashcards", d: "Spaced repetition that adapts to your memory curve — review what you'll forget, skip what you know." },
  { i: "📝", t: "Practice Exams", d: "Real exam simulations with timing, difficulty modeling, and per-question analytics." },
  { i: "📊", t: "Study Analytics", d: "See exactly where you're losing marks, by topic, by question type, by time of day." },
  { i: "🗓", t: "AI Study Planner", d: "A custom schedule built around your exam dates, your subjects, and your free hours." },
  { i: "👥", t: "Live Study Rooms", d: "Pomodoro with peers, shared whiteboards, voice rooms — accountability that actually works." },
];
const Features = () => {
  const [active, setActive] = useState(0);
  return (
    <section id="features" className="py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-xs uppercase tracking-[0.25em] text-indigo-400 mb-3">Capabilities</div>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white max-w-2xl">Built for how students actually learn</h2>
        <div className="mt-16 grid lg:grid-cols-2 gap-12">
          <div className="space-y-2">
            {FEATURES.map((f, i) => (
              <button key={f.t} onMouseEnter={() => setActive(i)} onClick={() => setActive(i)}
                className={`w-full text-left p-5 rounded-xl border transition-all ${active === i ? "border-white/15 bg-white/[0.04]" : "border-transparent hover:bg-white/[0.02]"}`}>
                <div className="flex items-start gap-4">
                  <div className={`text-2xl transition-transform ${active === i ? "scale-110" : ""}`}>{f.i}</div>
                  <div>
                    <div className="text-white font-medium">{f.t}</div>
                    <div className="text-sm text-zinc-500 mt-1">{f.d}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="lg:sticky lg:top-32 h-fit">
            <div className="relative aspect-square rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent backdrop-blur-xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-violet-500/10 to-cyan-500/10" />
              <AnimatePresence mode="wait">
                <motion.div key={active} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}
                  className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                  <div className="text-7xl mb-6">{FEATURES[active].i}</div>
                  <div className="text-2xl font-semibold text-white mb-3">{FEATURES[active].t}</div>
                  <div className="text-zinc-400 max-w-sm">{FEATURES[active].d}</div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ---------- how it works ---------- */
const HowItWorks = () => (
  <section id="how" className="py-32 relative">
    <div className="max-w-7xl mx-auto px-6">
      <div className="text-xs uppercase tracking-[0.25em] text-violet-400 mb-3">Process</div>
      <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white max-w-2xl">From zero to exam-ready in minutes</h2>
      <div className="mt-20 relative grid md:grid-cols-3 gap-8">
        <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
        {[
          { n: "01", t: "Create your profile", d: "Tell us your level, your goals, and how much time you have. 60 seconds, no card." },
          { n: "02", t: "Pick your subjects & exam date", d: "Choose from 200+ subjects. Add exam dates so the AI knows your timeline." },
          { n: "03", t: "Let AI build your study plan", d: "A day-by-day plan, calibrated to your strengths and gaps. Adapts as you learn." },
        ].map((s, i) => (
          <motion.div key={s.n} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
            className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-8 backdrop-blur-xl">
            <div className="w-12 h-12 rounded-lg grid place-items-center bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-mono font-bold">{s.n}</div>
            <div className="mt-5 text-xl font-semibold text-white">{s.t}</div>
            <div className="mt-2 text-sm text-zinc-400">{s.d}</div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

/* ---------- AI demo ---------- */
const AIDemo = () => {
  const [step, setStep] = useState(0);
  const messages = [
    { who: "user", t: "Explain photosynthesis in 2 lines." },
    { who: "ai", t: "Plants use sunlight to convert CO₂ and water into glucose, releasing O₂. The reaction happens in chloroplasts using chlorophyll." },
    { who: "user", t: "Quiz me on this." },
    { who: "ai", t: "Quick check: which molecule absorbs light to drive the reaction?" },
  ];
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  useEffect(() => {
    if (!inView) return;
    const id = setInterval(() => setStep((s) => (s + 1) % (messages.length + 1)), 2200);
    return () => clearInterval(id);
  }, [inView]);
  return (
    <section className="py-32">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-xs uppercase tracking-[0.25em] text-cyan-400 mb-3">Live Preview</div>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white max-w-2xl">Watch the AI tutor in real time</h2>
        <div ref={ref} className="mt-12 relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/30 via-violet-500/30 to-cyan-500/30 blur-2xl rounded-2xl" />
          <div className="relative rounded-2xl border border-white/10 bg-black/80 backdrop-blur-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" /><span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" /><span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
              <span className="ml-3 text-xs font-mono text-zinc-500">~/prostudybuddy/ai-tutor</span>
            </div>
            <div className="p-6 font-mono text-sm space-y-4 min-h-[320px]">
              {messages.slice(0, step).map((m, i) => (
                <div key={i} className={m.who === "user" ? "text-zinc-300" : "text-cyan-300"}>
                  <span className="text-zinc-600 mr-2">{m.who === "user" ? "you ›" : "ai  ›"}</span>{m.t}
                </div>
              ))}
              {step < messages.length && (
                <div className={messages[step].who === "user" ? "text-zinc-300" : "text-cyan-300"}>
                  <span className="text-zinc-600 mr-2">{messages[step].who === "user" ? "you ›" : "ai  ›"}</span>
                  <span className="inline-block w-2 h-4 bg-cyan-400 animate-pulse align-middle" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ---------- mobile section ---------- */
const MobileSection = () => (
  <section className="py-32">
    <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
      <div className="relative flex justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 blur-3xl" />
        <motion.div animate={{ y: [-8, 8, -8] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="relative w-64 h-[520px] rounded-[2.5rem] border border-white/15 bg-gradient-to-b from-zinc-900 to-black p-3 shadow-2xl">
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-10" />
          <div className="w-full h-full rounded-[2rem] bg-gradient-to-br from-indigo-950 via-black to-cyan-950 overflow-hidden p-5 pt-12">
            <div className="text-xs text-zinc-500">Good morning, Alex</div>
            <div className="text-xl font-semibold text-white mt-1">Today's plan</div>
            <div className="mt-5 space-y-3">
              {["Calculus · 45m", "Flashcards · 20m", "Mock test · 1h"].map((s, i) => (
                <div key={s} className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm text-zinc-200">{s}</div>
              ))}
            </div>
            <div className="mt-6 rounded-lg p-4 bg-gradient-to-br from-indigo-500/30 to-cyan-500/30 border border-white/10">
              <div className="text-[10px] uppercase text-zinc-300 tracking-widest">Streak</div>
              <div className="text-3xl font-bold text-white">47🔥</div>
            </div>
          </div>
        </motion.div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-[0.25em] text-cyan-400 mb-3">Mobile App</div>
        <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Study anywhere.<br/>iOS & Android.</h2>
        <ul className="mt-8 space-y-4 text-zinc-400">
          {["Full offline mode — flashcards and notes available without signal", "Background timer keeps your study session running", "Push reminders that match your AI study plan"].map((t) => (
            <li key={t} className="flex gap-3"><span className="text-cyan-400 mt-1">✓</span>{t}</li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link to="/download" className="flex items-center gap-3 px-5 py-3 rounded-lg bg-white text-black hover:scale-[1.02] transition-transform">
            <span className="text-2xl"></span>
            <div className="text-left"><div className="text-[10px] -mb-1">Download on the</div><div className="font-semibold">App Store</div></div>
          </Link>
          <Link to="/download" className="flex items-center gap-3 px-5 py-3 rounded-lg bg-white text-black hover:scale-[1.02] transition-transform">
            <span className="text-2xl">▶</span>
            <div className="text-left"><div className="text-[10px] -mb-1">GET IT ON</div><div className="font-semibold">Google Play</div></div>
          </Link>
        </div>
        <div className="mt-5 flex gap-4 text-sm text-zinc-500">
          <span>4.9★ App Store</span><span>4.8★ Google Play</span>
        </div>
      </div>
    </div>
  </section>
);

/* ---------- testimonials ---------- */
const TESTIMONIALS = [
  { n: "Sarah Chen", u: "Stanford University", q: "ProStudyBuddy turned my chaotic exam prep into a daily plan I actually follow. My GPA went from 3.2 to 3.8.", s: 5 },
  { n: "Arjun Patel", u: "IIT Bombay", q: "The AI tutor explains things better than half my professors. It's like having a 24/7 TA.", s: 5 },
  { n: "Emily Rodriguez", u: "Harvard", q: "Spaced flashcards alone are worth the price. I retain 3x more from a single session now.", s: 5 },
  { n: "Tom Williams", u: "Oxford", q: "The mock exams are eerily close to the real thing. I walked into finals knowing exactly what to expect.", s: 5 },
  { n: "Yuki Tanaka", u: "NUS", q: "Live study rooms keep me accountable. I finally stopped procrastinating.", s: 5 },
  { n: "Marcus Johnson", u: "MIT", q: "Analytics showed me I was wasting 4 hours a week on topics I'd already mastered. Game changer.", s: 5 },
];
const Testimonials = () => (
  <section className="py-32">
    <div className="max-w-7xl mx-auto px-6">
      <div className="text-xs uppercase tracking-[0.25em] text-violet-400 mb-3">Testimonials</div>
      <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight max-w-2xl">Students who stopped struggling</h2>
      <div className="mt-16 columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
        {TESTIMONIALS.map((t, i) => (
          <motion.div key={t.n} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 3) * 0.1 }}
            className="break-inside-avoid rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6 hover:border-white/20 transition-all">
            <div className="text-yellow-400 text-sm mb-3">{"★".repeat(t.s)}</div>
            <p className="text-zinc-300 leading-relaxed">"{t.q}"</p>
            <div className="mt-5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500" />
              <div><div className="text-sm font-medium text-white">{t.n}</div><div className="text-xs text-zinc-500">{t.u}</div></div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

/* ---------- pricing ---------- */
const Pricing = () => {
  const [annual, setAnnual] = useState(false);
  const tiers = [
    { name: "Free", price: 0, p: "Forever free", f: ["AI tutor (20 questions/day)", "Basic flashcards", "1 subject", "Community access"], cross: ["Practice exams", "AI study planner", "Live study rooms"] },
    { name: "Pro", price: annual ? 7.99 : 9.99, p: "Most popular", f: ["Unlimited AI tutor", "Smart flashcards", "Unlimited subjects", "AI study planner", "Practice exams", "Study analytics"], cross: ["Team collaboration"], featured: true },
    { name: "Teams", price: annual ? 19.99 : 24.99, p: "For study groups", f: ["Everything in Pro", "Up to 10 seats", "Shared study rooms", "Team analytics", "Priority support", "Custom integrations"], cross: [] },
  ];
  return (
    <section id="pricing" className="py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-xs uppercase tracking-[0.25em] text-indigo-400 mb-3 text-center">Pricing</div>
        <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight text-center">Invest in your future</h2>
        <div className="mt-10 flex items-center justify-center gap-3">
          <span className={`text-sm ${!annual ? "text-white" : "text-zinc-500"}`}>Monthly</span>
          <button onClick={() => setAnnual(!annual)} className="relative w-12 h-6 rounded-full bg-white/10 border border-white/15">
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all ${annual ? "left-[26px]" : "left-0.5"}`} />
          </button>
          <span className={`text-sm ${annual ? "text-white" : "text-zinc-500"}`}>Annual <span className="text-cyan-400 ml-1">−20%</span></span>
        </div>
        <div className="mt-14 grid md:grid-cols-3 gap-6">
          {tiers.map((t) => (
            <div key={t.name} className={`relative rounded-2xl p-8 backdrop-blur-xl ${t.featured ? "border-2 border-transparent bg-white/[0.03]" : "border border-white/10 bg-white/[0.02]"}`}>
              {t.featured && <div className="absolute -inset-[2px] rounded-2xl bg-[conic-gradient(from_0deg,#6366f1,#8b5cf6,#06b6d4,#6366f1)] animate-spin-slow opacity-70 -z-10" /> }
              {t.featured && <div className="absolute inset-[2px] rounded-2xl bg-black -z-10" /> }
              {t.featured && (
                <motion.div animate={{ y: [-2, 2, -2] }} transition={{ duration: 3, repeat: Infinity }}
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 text-white">Most Popular</motion.div>
              )}
              <div className="text-sm text-zinc-500">{t.p}</div>
              <div className="mt-2 text-2xl font-semibold text-white">{t.name}</div>
              <div className="mt-4 flex items-baseline gap-1">
                <motion.div key={t.price} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-5xl font-bold text-white">${t.price}</motion.div>
                <span className="text-zinc-500">/mo</span>
              </div>
              <Link to="/auth" className={`mt-6 block text-center py-3 rounded-lg font-medium transition-all ${t.featured ? "bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 text-white hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.6)]" : "border border-white/15 text-white hover:bg-white/[0.05]"}`}>
                {t.price === 0 ? "Get Started" : "Start Free Trial"}
              </Link>
              <div className="mt-7 space-y-3 text-sm">
                {t.f.map((f) => <div key={f} className="flex gap-2 text-zinc-300"><span className="text-cyan-400">✓</span>{f}</div>)}
                {t.cross.map((f) => <div key={f} className="flex gap-2 text-zinc-600"><span>✕</span>{f}</div>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ---------- final CTA ---------- */
const FinalCTA = () => (
  <section className="py-32 relative overflow-hidden">
    <div className="absolute inset-0 -z-10">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-gradient-to-r from-indigo-600/30 via-violet-600/30 to-cyan-600/30 blur-[120px]" />
    </div>
    <div className="max-w-4xl mx-auto px-6 text-center">
      <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="text-4xl md:text-6xl font-bold text-white tracking-tight">
        Your next exam is waiting.<br/>
        <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-300 bg-clip-text text-transparent">Are you ready?</span>
      </motion.h2>
      <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
        <Link to="/auth" className="px-8 py-4 rounded-lg bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 text-white font-medium hover:shadow-[0_0_40px_-5px_rgba(139,92,246,0.6)] transition-all">Start Free Today</Link>
        <Link to="/download" className="px-8 py-4 rounded-lg border border-white/15 text-white hover:bg-white/[0.05] transition-all">Download App</Link>
      </div>
    </div>
  </section>
);

/* ---------- footer ---------- */
const Footer = () => (
  <footer className="relative border-t border-white/[0.06] pt-20 pb-10">
    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
    <div className="max-w-7xl mx-auto px-6">
      <div className="grid md:grid-cols-5 gap-12">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-400 grid place-items-center text-[10px] font-bold text-white">✦</span>
            <span className="font-semibold text-white">ProStudyBuddy</span>
          </div>
          <p className="mt-4 text-sm text-zinc-500 max-w-xs">The AI-powered study platform built for students who want an unfair advantage.</p>
        </div>
        {[
          { h: "Product", l: ["Features", "Pricing", "Download", "Changelog"] },
          { h: "Company", l: ["About", "Blog", "Careers", "Contact"] },
          { h: "Resources", l: ["Help Center", "Guides", "Community", "Status"] },
          { h: "Legal", l: ["Privacy", "Terms", "Security", "Cookies"] },
        ].map((c) => (
          <div key={c.h}>
            <div className="text-sm font-semibold text-white mb-4">{c.h}</div>
            <ul className="space-y-2 text-sm text-zinc-500">
              {c.l.map((i) => <li key={i}><a href="#" className="hover:text-white transition-colors">{i}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-16 pt-8 border-t border-white/[0.05] flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-xs text-zinc-600">© {new Date().getFullYear()} ProStudyBuddy. All rights reserved.</div>
        <div className="flex gap-4 text-zinc-500">
          {["𝕏", "in", "ig", "yt"].map((s) => <a key={s} href="#" className="w-8 h-8 rounded-md border border-white/10 grid place-items-center text-xs hover:text-white hover:border-white/30 transition-all">{s}</a>)}
        </div>
      </div>
    </div>
  </footer>
);

/* ---------- page ---------- */
export default function Landing() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  return (
    <div className="min-h-screen bg-black text-white antialiased relative overflow-x-hidden">
      <style>{`
        @keyframes aurora-1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,-30px) scale(1.15); } }
        @keyframes aurora-2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-50px,40px) scale(1.1); } }
        @keyframes aurora-3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-20px) scale(1.2); } }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes beam { 0% { transform: translateX(-100%) skewX(-20deg); } 100% { transform: translateX(100%) skewX(-20deg); } }
        .animate-aurora-1 { animation: aurora-1 8s ease-in-out infinite alternate; }
        .animate-aurora-2 { animation: aurora-2 10s ease-in-out infinite alternate; }
        .animate-aurora-3 { animation: aurora-3 12s ease-in-out infinite alternate; }
        .animate-marquee { animation: marquee 35s linear infinite; }
        .animate-spin-slow { animation: spin-slow 6s linear infinite; }
        .animate-beam { animation: beam 6s ease-in-out infinite; }
      `}</style>
      {/* scroll progress */}
      <motion.div style={{ scaleX }} className="fixed top-0 inset-x-0 h-[2px] origin-left z-[60] bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400" />
      {/* grid bg */}
      <div className="fixed inset-0 -z-20 pointer-events-none opacity-[0.04]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      <Nav />
      <Hero />
      <LogoStrip />
      <Stats />
      <Features />
      <HowItWorks />
      <AIDemo />
      <MobileSection />
      <Testimonials />
      <Pricing />
      <FinalCTA />
      <Footer />
    </div>
  );
}
