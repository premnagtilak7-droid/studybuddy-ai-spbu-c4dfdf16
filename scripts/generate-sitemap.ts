// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.

import { writeFileSync } from "fs"
import { resolve } from "path"

const BASE_URL = "https://studybuddy-ai-spbu.lovable.app"

interface SitemapEntry {
  path: string
  lastmod?: string
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"
  priority?: string
}

const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/timetable", changefreq: "weekly", priority: "0.8" },
  { path: "/subjects", changefreq: "weekly", priority: "0.8" },
  { path: "/subject-management", changefreq: "weekly", priority: "0.7" },
  { path: "/ai-solver", changefreq: "weekly", priority: "0.7" },
  { path: "/study-plan", changefreq: "weekly", priority: "0.8" },
  { path: "/study-room", changefreq: "weekly", priority: "0.7" },
  { path: "/exam-dates", changefreq: "weekly", priority: "0.8" },
  { path: "/mock-test", changefreq: "weekly", priority: "0.8" },
  { path: "/answer-checker", changefreq: "weekly", priority: "0.7" },
  { path: "/formula-sheet", changefreq: "weekly", priority: "0.7" },
  { path: "/exam-predictor", changefreq: "weekly", priority: "0.7" },
  { path: "/performance", changefreq: "weekly", priority: "0.7" },
  { path: "/study-groups", changefreq: "weekly", priority: "0.7" },
  { path: "/doubt-forum", changefreq: "weekly", priority: "0.7" },
  { path: "/study-buddy", changefreq: "weekly", priority: "0.7" },
  { path: "/share-progress", changefreq: "weekly", priority: "0.6" },
  { path: "/batch-feed", changefreq: "weekly", priority: "0.6" },
  { path: "/flashcards", changefreq: "weekly", priority: "0.7" },
  { path: "/formula-bank", changefreq: "weekly", priority: "0.7" },
  { path: "/attendance", changefreq: "weekly", priority: "0.7" },
  { path: "/marks", changefreq: "weekly", priority: "0.7" },
  { path: "/assignments", changefreq: "weekly", priority: "0.7" },
  { path: "/focus", changefreq: "weekly", priority: "0.7" },
  { path: "/study-timer", changefreq: "weekly", priority: "0.8" },
  { path: "/previous-year-papers", changefreq: "weekly", priority: "0.8" },
  { path: "/notifications", changefreq: "weekly", priority: "0.5" },
  { path: "/profile", changefreq: "weekly", priority: "0.5" },
  { path: "/pricing", changefreq: "weekly", priority: "0.8" },
  { path: "/privacy", changefreq: "monthly", priority: "0.5" },
  { path: "/terms", changefreq: "monthly", priority: "0.5" },
  { path: "/change-password", changefreq: "monthly", priority: "0.4" },
]

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  )

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n")
}

writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries))
console.log(`sitemap.xml written (${entries.length} entries)`)
