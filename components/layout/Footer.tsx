import Link from "next/link";
import { Film, Globe, ExternalLink, Share2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black/20 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                <Film className="w-4 h-4 text-white" />
              </div>
              <span className="font-display font-bold text-xl">
                Cine<span className="gradient-text">Gen</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              The AI-native marketplace where brands discover, brief, and hire the world's best AI content creators.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a href="#" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
                <Share2 className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
                <Globe className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Platform</h3>
            <ul className="space-y-2">
              {[
                { label: "Discover Creators", href: "/creators" },
                { label: "Post a Brief", href: "/briefs/new" },
                { label: "Browse Briefs", href: "/briefs" },
                { label: "Dashboard", href: "/dashboard" },
                { label: "Compare Creators", href: "/compare" },
                { label: "Creator Leaderboard", href: "/leaderboard" },
                { label: "Budget Estimator", href: "/estimator" },
                { label: "Risk Scanner", href: "/risk-scanner" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © 2025 CineGen. Built for Kampus.VC Hackathon — AI Content Creator Marketplace Challenge.
          </p>
          <p className="text-xs text-muted-foreground">
            Powered by Next.js 14 · Gemini AI · Vercel
          </p>
        </div>
      </div>
    </footer>
  );
}
