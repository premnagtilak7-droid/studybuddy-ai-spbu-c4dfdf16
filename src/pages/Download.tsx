import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function Download() {
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-indigo-600/15 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-cyan-500/15 blur-[120px]" />
      </div>
      <header className="px-6 py-5 max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-400 grid place-items-center text-[10px] font-bold">✦</span>
          <span className="font-semibold">ProStudyBuddy</span>
        </Link>
        <Link to="/" className="text-sm text-zinc-400 hover:text-white">← Back</Link>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-20 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-xs text-zinc-300">
            ✦ Available on iOS & Android
          </div>
          <h1 className="mt-8 text-4xl md:text-6xl font-bold tracking-tight">
            Get ProStudyBuddy on<br/>
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-300 bg-clip-text text-transparent">Your Device</span>
          </h1>
          <p className="mt-6 text-zinc-400 max-w-xl mx-auto">Take your AI tutor, flashcards, and study plan with you. Offline mode included.</p>
        </motion.div>

        <div className="mt-16 grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {[
            { os: "iOS App", store: "App Store", logo: "", rating: "4.9★ · 12K reviews", grad: "from-zinc-100 to-zinc-300" },
            { os: "Android App", store: "Google Play", logo: "▶", rating: "4.8★ · 18K reviews", grad: "from-cyan-200 to-indigo-300" },
          ].map((c, i) => (
            <motion.div key={c.os} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
              className="relative rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-8 group hover:border-white/20 transition-all">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition -z-10" />
              <motion.div animate={{ y: [-6, 6, -6] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="mx-auto w-40 h-72 rounded-[2rem] border border-white/15 bg-gradient-to-b from-zinc-900 to-black p-2">
                <div className="w-full h-full rounded-[1.6rem] bg-gradient-to-br from-indigo-950 via-black to-cyan-950 grid place-items-center">
                  <span className={`text-5xl bg-gradient-to-br ${c.grad} bg-clip-text text-transparent`}>{c.logo}</span>
                </div>
              </motion.div>
              <div className="mt-8 text-2xl font-semibold">{c.os}</div>
              <div className="mt-1 text-sm text-zinc-500">{c.rating}</div>
              <a href="#" className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-black font-medium hover:scale-[1.02] transition-transform">
                <motion.span animate={{ y: [0, 3, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>↓</motion.span>
                {c.store === "App Store" ? "Download on the App Store" : "Get it on Google Play"}
              </a>
            </motion.div>
          ))}
        </div>

        <div className="mt-16">
          <Link to="/" className="text-sm text-zinc-400 hover:text-white">Or use the web version →</Link>
        </div>
      </main>
    </div>
  );
}
