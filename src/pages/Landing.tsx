import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  Bot, BookOpen, FileText, BarChart3, Target, MessagesSquare,
  Check, Star, Sparkles, ArrowRight, Play, Twitter, Github, Linkedin,
} from "lucide-react";

/* ---------------- Particle Network ---------------- */
function ParticleNetwork() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);
    const N = 60;
    const pts = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3 * dpr,
      vy: (Math.random() - 0.5) * 0.3 * dpr,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      }
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d = Math.hypot(dx, dy);
          if (d < 140 * dpr) {
            ctx.strokeStyle = `rgba(139, 92, 246, ${0.18 * (1 - d / (140 * dpr))})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
          }
        }
      }
      for (const p of pts) {
        ctx.fillStyle = "rgba(59, 130, 246, 0.7)";
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.6 * dpr, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}

/* ---------------- Typewriter ---------------- */
function Typewriter({ words }: { words: string[] }) {
  const [i, setI] = useState(0);
  const [text, setText] = useState("");
  const [del, setDel] = useState(false);
  useEffect(() => {
    const cur = words[i % words.length];
    const t = setTimeout(() => {
      if (!del) {
        setText(cur.slice(0, text.length + 1));
        if (text.length + 1 === cur.length) setTimeout(() => setDel(true), 1400);
      } else {
        setText(cur.slice(0, text.length - 1));
        if (text.length - 1 === 0) { setDel(false); setI(i + 1); }
      }
    }, del ? 40 : 80);
    return () => clearTimeout(t);
  }, [text, del, i, words]);
  return (
    <span className="bg-gradient-to-r from-[#3B82F6] via-[#8B5CF6] to-[#06B6D4] bg-clip-text text-transparent">
      {text}<span className="ml-1 inline-block h-[0.9em] w-[3px] -mb-1 animate-pulse bg-[#8B5CF6]" />
    </span>
  );
}

/* ---------------- Counter ---------------- */
function Counter({ to, suffix = "", decimals = 0 }: { to: number; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now(); const dur = 1800;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min((t - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(to * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);
  return <span ref={ref}>{val.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}{suffix}</span>;
}

/* ---------------- Tilt Card ---------------- */
function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const x = useMotionValue(0); const y = useMotionValue(0);
  const rx = useSpring(useTransform(y, [-50, 50], [10, -10]), { stiffness: 200, damping: 15 });
  const ry = useSpring(useTransform(x, [-50, 50], [-10, 10]), { stiffness: 200, damping: 15 });
  return (
    <motion.div
      style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - r.left - r.width / 2);
        y.set(e.clientY - r.top - r.height / 2);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      className={`group relative rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_0_40px_-5px_rgba(139,92,246,0.5)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-[#3B82F6]/0 via-[#8B5CF6]/0 to-[#06B6D4]/0 opacity-0 transition-opacity duration-500 group-hover:opacity-20" />
      <div style={{ transform: "translateZ(40px)" }}>{children}</div>
    </motion.div>
  );
}

/* ---------------- Section ---------------- */
function Section({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={`relative px-6 py-24 sm:px-10 lg:px-16 ${className}`}
    >
      {children}
    </motion.section>
  );
}

/* ---------------- Navbar ---------------- */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll); return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <motion.nav
      initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? "border-b border-white/10 bg-[#0A0A0F]/70 backdrop-blur-xl" : "bg-transparent"}`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#" className="text-xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-[#3B82F6] via-[#8B5CF6] to-[#06B6D4] bg-clip-text text-transparent">ProStudyBuddy</span>
        </a>
        <div className="hidden items-center gap-8 text-sm text-white/70 md:flex">
          {[
            ["Features", "#features"], ["How It Works", "#how"], ["Pricing", "#pricing"], ["Testimonials", "#testimonials"],
          ].map(([l, h]) => (
            <a key={l} href={h} className="transition-colors hover:text-white">{l}</a>
          ))}
        </div>
        <Link to="/auth" className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] px-5 py-2 text-sm font-medium text-white shadow-[0_0_20px_-5px_rgba(139,92,246,0.6)] transition-shadow hover:shadow-[0_0_30px_-2px_rgba(139,92,246,0.9)]">
          <Sparkles className="h-4 w-4" /> Start Free
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        </Link>
      </div>
    </motion.nav>
  );
}

/* ---------------- Hero ---------------- */
function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden pt-32">
      {/* Floating orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-20 h-[400px] w-[400px] rounded-full bg-[#3B82F6]/30 blur-[120px] [animation:float_18s_ease-in-out_infinite]" />
        <div className="absolute right-0 top-40 h-[500px] w-[500px] rounded-full bg-[#8B5CF6]/30 blur-[140px] [animation:float_22s_ease-in-out_infinite_reverse]" />
        <div className="absolute bottom-0 left-1/3 h-[350px] w-[350px] rounded-full bg-[#06B6D4]/20 blur-[120px] [animation:float_26s_ease-in-out_infinite]" />
      </div>
      <ParticleNetwork />

      <div className="relative mx-auto max-w-6xl px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/70 backdrop-blur-md">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#06B6D4]" />
          AI-powered study, reimagined
        </motion.div>

        <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
          The AI Study Platform <br /> That Gets You{" "}
          <Typewriter words={["Results", "Smarter", "Faster", "Top Marks"]} />
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg text-white/60">
          Join 50,000+ students using ProStudyBuddy to study smarter, retain more, and ace every exam.
        </p>

        <div className="mb-16 flex flex-wrap items-center justify-center gap-4">
          <Link to="/auth" className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] px-7 py-3.5 text-base font-semibold text-white shadow-[0_0_30px_-5px_rgba(139,92,246,0.7)] transition-all hover:scale-[1.03] hover:shadow-[0_0_40px_0px_rgba(139,92,246,1)]">
            <span className="absolute inset-0 animate-pulse bg-gradient-to-r from-[#3B82F6]/0 via-white/10 to-[#8B5CF6]/0" />
            Get Started Free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </Link>
          <a href="#how" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-base font-medium text-white/90 backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/10">
            <Play className="h-4 w-4" /> Watch Demo
          </a>
        </div>

        {/* Floating mockup */}
        <motion.div
          animate={{ y: [0, -12, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="relative mx-auto max-w-4xl"
        >
          <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-2 shadow-[0_0_80px_-20px_rgba(139,92,246,0.5)] backdrop-blur-xl">
            <div className="rounded-xl bg-[#0A0A0F]/70 p-6">
              <div className="mb-4 flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { l: "Study Streak", v: "47 days", c: "from-[#3B82F6] to-[#06B6D4]" },
                  { l: "Mastery", v: "82%", c: "from-[#8B5CF6] to-[#3B82F6]" },
                  { l: "Today's XP", v: "+340", c: "from-[#06B6D4] to-[#8B5CF6]" },
                ].map((s) => (
                  <div key={s.l} className="rounded-lg border border-white/10 bg-white/5 p-4 text-left">
                    <div className="text-xs text-white/50">{s.l}</div>
                    <div className={`mt-1 bg-gradient-to-r ${s.c} bg-clip-text text-2xl font-bold text-transparent`}>{s.v}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {[["Calculus II", 78], ["Organic Chem", 64], ["Linear Algebra", 91]].map(([n, p]) => (
                  <div key={n as string}>
                    <div className="mb-1 flex justify-between text-xs text-white/60"><span>{n}</span><span>{p}%</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <motion.div initial={{ width: 0 }} whileInView={{ width: `${p}%` }} viewport={{ once: true }} transition={{ duration: 1.4, ease: "easeOut" }} className="h-full bg-gradient-to-r from-[#3B82F6] via-[#8B5CF6] to-[#06B6D4]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------------- Stats ---------------- */
function Stats() {
  const stats = [
    { n: 50000, s: "+", l: "Students" },
    { n: 98, s: "%", l: "Pass Rate" },
    { n: 200, s: "+", l: "Subjects" },
    { n: 4.9, s: "★", l: "Rating", d: 1 },
  ];
  return (
    <Section className="!py-16">
      <div className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-10 backdrop-blur-xl">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.l} className="text-center">
              <div className="bg-gradient-to-r from-[#3B82F6] via-[#8B5CF6] to-[#06B6D4] bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
                <Counter to={s.n} suffix={s.s} decimals={s.d ?? 0} />
              </div>
              <div className="mt-1 text-sm text-white/60">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ---------------- Features ---------------- */
function Features() {
  const items = [
    { i: Bot, t: "AI Tutor", d: "Ask anything, get instant explanations", c: "from-[#3B82F6] to-[#06B6D4]" },
    { i: BookOpen, t: "Smart Flashcards", d: "Spaced repetition powered by AI", c: "from-[#8B5CF6] to-[#3B82F6]" },
    { i: FileText, t: "Practice Tests", d: "Exam-style questions in every subject", c: "from-[#06B6D4] to-[#8B5CF6]" },
    { i: BarChart3, t: "Progress Tracking", d: "Visualize your growth in real time", c: "from-[#3B82F6] to-[#8B5CF6]" },
    { i: Target, t: "Personalized Plans", d: "AI builds your custom study schedule", c: "from-[#8B5CF6] to-[#06B6D4]" },
    { i: MessagesSquare, t: "Study Groups", d: "Collaborate with students worldwide", c: "from-[#06B6D4] to-[#3B82F6]" },
  ];
  return (
    <Section id="features">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-5xl">Everything You Need to Succeed</h2>
          <p className="mt-3 text-white/60">Six powerful tools, one seamless experience.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" style={{ perspective: 1200 }}>
          {items.map((f, idx) => (
            <motion.div key={f.t} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.07 }}>
              <TiltCard>
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.c} shadow-lg`}>
                  <f.i className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-white">{f.t}</h3>
                <p className="text-sm text-white/60">{f.d}</p>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ---------------- How it works ---------------- */
function HowItWorks() {
  const steps = [
    { n: "01", t: "Create Account", d: "Sign up free in under 30 seconds." },
    { n: "02", t: "Choose Your Subjects", d: "Pick your courses and goals." },
    { n: "03", t: "Start Learning with AI", d: "Personalized study, every day." },
  ];
  return (
    <Section id="how">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-5xl">Start Studying in 3 Simple Steps</h2>
        </div>
        <div className="relative grid gap-8 md:grid-cols-3">
          <div className="absolute left-0 right-0 top-10 hidden h-px md:block">
            <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: "easeOut" }} className="h-full origin-left bg-gradient-to-r from-[#3B82F6] via-[#8B5CF6] to-[#06B6D4]" />
          </div>
          {steps.map((s, i) => (
            <motion.div key={s.n} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.2 }}
              className="relative rounded-2xl border border-white/10 bg-[#0A0A0F]/80 p-6 backdrop-blur-xl">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] text-sm font-bold text-white shadow-[0_0_20px_-2px_rgba(139,92,246,0.7)]">{s.n}</div>
              <h3 className="mb-2 text-xl font-semibold text-white">{s.t}</h3>
              <p className="text-sm text-white/60">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ---------------- AI Demo ---------------- */
function AIDemo() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const full = "Photosynthesis is how plants convert sunlight into food using chlorophyll. Sunlight + CO₂ + water → glucose + oxygen. It's the engine that powers nearly all life on Earth.";
  const [text, setText] = useState("");
  useEffect(() => {
    if (!inView) return;
    let i = 0; const id = setInterval(() => { setText(full.slice(0, i++)); if (i > full.length) clearInterval(id); }, 22);
    return () => clearInterval(id);
  }, [inView]);
  return (
    <Section>
      <div className="mx-auto max-w-4xl" ref={ref}>
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-5xl">See the AI in Action</h2>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_0_60px_-15px_rgba(59,130,246,0.6)] backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-2 border-b border-white/10 pb-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
            <span className="ml-2 text-xs text-white/50">prostudybuddy.ai · live chat</span>
          </div>
          <div className="space-y-4">
            <div className="flex justify-end">
              <div className="max-w-md rounded-2xl rounded-br-sm bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] px-4 py-2.5 text-sm text-white">
                Explain photosynthesis simply
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#06B6D4] to-[#8B5CF6]">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="max-w-lg rounded-2xl rounded-bl-sm border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/90">
                {text}
                <span className="ml-1 inline-block h-3 w-[2px] animate-pulse bg-[#06B6D4]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ---------------- Testimonials ---------------- */
function Testimonials() {
  const t = [
    { n: "Aarav Mehta", u: "IIT Bombay", q: "ProStudyBuddy turned my exam prep around. The AI tutor is like a 24/7 study partner.", c: "from-[#3B82F6] to-[#8B5CF6]" },
    { n: "Sara Khan", u: "Stanford University", q: "The flashcards adapt to exactly what I forget. I retained more in 4 weeks than a full semester.", c: "from-[#8B5CF6] to-[#06B6D4]" },
    { n: "Diego Ruiz", u: "MIT", q: "Practice tests feel real. I walked into finals knowing exactly what to expect.", c: "from-[#06B6D4] to-[#3B82F6]" },
  ];
  return (
    <Section id="testimonials">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-5xl">Students Love ProStudyBuddy</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {t.map((x, i) => (
            <motion.div key={x.n} initial={{ opacity: 0, x: i === 0 ? -40 : i === 2 ? 40 : 0, y: 20 }} whileInView={{ opacity: 1, x: 0, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.1 }}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
              <div className="mb-3 flex gap-0.5 text-[#FBBF24]">
                {Array.from({ length: 5 }).map((_, k) => <Star key={k} className="h-4 w-4 fill-current" />)}
              </div>
              <p className="mb-6 text-sm leading-relaxed text-white/80">"{x.q}"</p>
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${x.c} text-sm font-semibold text-white`}>
                  {x.n.split(" ").map(w => w[0]).join("")}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{x.n}</div>
                  <div className="text-xs text-white/50">{x.u}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ---------------- Pricing ---------------- */
function Pricing() {
  const plans = [
    { n: "Free", p: "$0", per: "forever", f: ["AI tutor (50/mo)", "10 flashcard decks", "Basic progress tracking", "Community access"], cta: "Start Free", hl: false },
    { n: "Pro", p: "$9.99", per: "per month", f: ["Unlimited AI tutor", "Unlimited flashcards", "Practice tests", "Personalized study plans", "Priority support"], cta: "Go Pro", hl: true },
    { n: "Team", p: "$19.99", per: "per month", f: ["Everything in Pro", "Up to 10 members", "Group analytics", "Shared resources", "Admin dashboard"], cta: "Start Team", hl: false },
  ];
  return (
    <Section id="pricing">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-5xl">Simple, Transparent Pricing</h2>
          <p className="mt-3 text-white/60">No hidden fees. Cancel anytime.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((pl) => (
            <motion.div key={pl.n} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className={`relative rounded-2xl p-[1px] ${pl.hl ? "bg-gradient-to-br from-[#3B82F6] via-[#8B5CF6] to-[#06B6D4] shadow-[0_0_50px_-10px_rgba(139,92,246,0.7)]" : "bg-white/10"}`}>
              {pl.hl && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] px-3 py-1 text-xs font-semibold text-white">
                  Most Popular
                </div>
              )}
              <div className="h-full rounded-2xl bg-[#0A0A0F]/90 p-7 backdrop-blur-xl">
                <h3 className="mb-1 text-lg font-semibold text-white">{pl.n}</h3>
                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{pl.p}</span>
                  <span className="text-sm text-white/50">/{pl.per}</span>
                </div>
                <ul className="mb-8 space-y-3">
                  {pl.f.map((x) => (
                    <li key={x} className="flex items-start gap-2 text-sm text-white/80">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#06B6D4]" /> {x}
                    </li>
                  ))}
                </ul>
                <Link to="/auth" className={`block w-full rounded-full py-3 text-center text-sm font-semibold transition-all ${pl.hl ? "bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white shadow-[0_0_25px_-5px_rgba(139,92,246,0.7)] hover:shadow-[0_0_35px_-2px_rgba(139,92,246,1)]" : "border border-white/15 bg-white/5 text-white hover:bg-white/10"}`}>
                  {pl.cta}
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ---------------- CTA Banner ---------------- */
function CTABanner() {
  return (
    <Section>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
        className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#3B82F6] via-[#8B5CF6] to-[#06B6D4] p-12 text-center shadow-[0_0_80px_-10px_rgba(139,92,246,0.6)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2),transparent_50%)]" />
        <h2 className="relative text-3xl font-bold text-white sm:text-5xl">Ready to Transform Your Study Game?</h2>
        <p className="relative mx-auto mt-4 max-w-xl text-white/85">Join 50,000+ students learning smarter with AI. Free forever — no credit card required.</p>
        <Link to="/auth" className="relative mt-8 inline-flex items-center gap-2 rounded-full bg-[#0A0A0F] px-8 py-4 text-base font-semibold text-white transition-all hover:scale-[1.04] hover:bg-black">
          Get Started Free <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>
    </Section>
  );
}

/* ---------------- Footer ---------------- */
function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0A0A0F] px-6 py-14 sm:px-10 lg:px-16">
      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-4">
        <div>
          <div className="mb-3 text-lg font-bold">
            <span className="bg-gradient-to-r from-[#3B82F6] via-[#8B5CF6] to-[#06B6D4] bg-clip-text text-transparent">ProStudyBuddy</span>
          </div>
          <p className="text-sm text-white/50">The AI study platform built for students who want results.</p>
          <div className="mt-4 flex gap-3">
            {[Twitter, Github, Linkedin].map((I, i) => (
              <a key={i} href="#" className="rounded-full border border-white/10 p-2 text-white/60 transition-colors hover:border-white/30 hover:text-white">
                <I className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        {[
          { t: "Product", l: ["Features", "Pricing", "Demo"] },
          { t: "Company", l: ["About", "Blog", "Contact"] },
          { t: "Legal", l: ["Privacy", "Terms", "Security"] },
        ].map((c) => (
          <div key={c.t}>
            <div className="mb-3 text-sm font-semibold text-white">{c.t}</div>
            <ul className="space-y-2 text-sm text-white/60">
              {c.l.map((x) => <li key={x}><a href="#" className="transition-colors hover:text-white">{x}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-10 max-w-6xl border-t border-white/10 pt-6 text-center text-xs text-white/40">
        © {new Date().getFullYear()} ProStudyBuddy. All rights reserved.
      </div>
    </footer>
  );
}

/* ---------------- Page ---------------- */
export default function Landing() {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    return () => { document.documentElement.style.scrollBehavior = ""; };
  }, []);
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white antialiased [color-scheme:dark]">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, -30px) scale(1.08); }
        }
      `}</style>
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <AIDemo />
      <Testimonials />
      <Pricing />
      <CTABanner />
      <Footer />
    </div>
  );
}
