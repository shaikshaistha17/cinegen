"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, AlertTriangle, CheckCircle, X, Scan, ArrowRight, Info, Zap } from "lucide-react";
import Link from "next/link";

type Risk = {
  level: "high" | "medium" | "low";
  title: string;
  description: string;
  recommendation: string;
  clause: string;
};

function analyzeRisks(config: {
  platform: string[];
  usage: string;
  hasModels: boolean;
  licenseType: string;
  region: string;
  aiTools: string[];
  duration: string;
}): Risk[] {
  const risks: Risk[] = [];

  if (config.platform.includes("TV") || config.platform.includes("OTT")) {
    risks.push({
      level: "high",
      title: "Broadcast Commercial License Required",
      description: "TV and OTT distribution requires Full Commercial Buyout or Worldwide Perpetual license. Standard digital licenses are insufficient.",
      recommendation: "Require 'Full Buyout' license tier from your creator. Ensure contract includes broadcast rights.",
      clause: "Commercial Rights & Licensing → License Tier: Full Buyout",
    });
  }

  if (config.hasModels && !config.usage.includes("editorial")) {
    risks.push({
      level: "high",
      title: "AI-Generated Human Likeness — Model Indemnity Needed",
      description: "Content featuring AI-generated human faces or likenesses requires explicit model indemnity to protect against identity/IP claims.",
      recommendation: "Enable 'Model Indemnity Required' in your brief. Creator must confirm no real person's likeness was used without consent.",
      clause: "Commercial Use → Model Indemnity: Required",
    });
  }

  if (config.region === "worldwide" && config.licenseType !== "full-buyout") {
    risks.push({
      level: "high",
      title: "Geographic Scope Mismatch",
      description: "Worldwide usage with a non-buyout license creates IP exposure in jurisdictions with different IP laws.",
      recommendation: "Upgrade to Full Buyout or explicitly list all usage territories and get per-territory licensing.",
      clause: "Commercial Use → Usage Regions: Specify all territories",
    });
  }

  if (config.aiTools.includes("Stable Diffusion") || config.aiTools.includes("Midjourney")) {
    risks.push({
      level: "medium",
      title: "Training Data Provenance Unverified",
      description: "Stable Diffusion and Midjourney models are trained on scraped web data. Commercial use may carry residual IP risk for certain style references.",
      recommendation: "Request 'Training Data Clean' certification from creator. Avoid specific artist style prompts for commercial campaigns.",
      clause: "Portfolio → Commercial Use → Training Data: Clean",
    });
  }

  if (config.duration === "perpetual" && config.licenseType === "commercial-1yr") {
    risks.push({
      level: "medium",
      title: "License Duration Mismatch",
      description: "You plan to use content indefinitely but selected a 1-year commercial license. Content use after expiry creates liability.",
      recommendation: "Either renew the license annually or upgrade to Full Buyout / Royalty-Free from the start.",
      clause: "Commercial Use → Usage Duration: Match your actual usage period",
    });
  }

  if (!config.platform.includes("TV") && config.usage.includes("product")) {
    risks.push({
      level: "medium",
      title: "Product Claim Liability",
      description: "AI-generated content showing product performance or benefits may require disclaimer for regulatory compliance (ASCI/FTC).",
      recommendation: "Add 'Simulated content' or 'AI-generated for illustrative purposes' disclaimer where required.",
      clause: "Brief → Negative Keywords: Add 'misleading claims'",
    });
  }

  if (config.aiTools.includes("ElevenLabs") || config.aiTools.includes("HeyGen")) {
    risks.push({
      level: "medium",
      title: "Synthetic Voice / Avatar Disclosure",
      description: "Content using AI-generated voice or talking avatars may require disclosure under emerging AI content laws.",
      recommendation: "Include AI content disclosure in final deliverable. Check platform-specific policies for synthetic media.",
      clause: "Deliverables → Add AI content disclosure requirement",
    });
  }

  if (config.licenseType === "editorial-only" && config.usage.includes("commercial")) {
    risks.push({
      level: "high",
      title: "Editorial License Used for Commercial Purpose",
      description: "Editorial-only licenses cannot be used for commercial advertising or brand promotion. This is a license violation.",
      recommendation: "Immediately upgrade to Commercial 1yr or Full Buyout license.",
      clause: "Commercial Rights → License Tier: Must be Commercial or higher",
    });
  }

  if (risks.length === 0) {
    risks.push({
      level: "low",
      title: "No Major Risks Detected",
      description: "Your campaign configuration appears commercially sound based on the provided parameters.",
      recommendation: "Always have a legal review for high-budget campaigns or with major brand implications.",
      clause: "General best practice",
    });
  }

  return risks;
}

export default function RiskScannerPage() {
  const [platforms, setPlatforms] = useState<string[]>(["Instagram"]);
  const [usage, setUsage] = useState("commercial");
  const [hasModels, setHasModels] = useState(false);
  const [licenseType, setLicenseType] = useState("commercial-1yr");
  const [region, setRegion] = useState("india");
  const [aiTools, setAiTools] = useState<string[]>([]);
  const [duration, setDuration] = useState("1yr");
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);

  const risks = useMemo(() => analyzeRisks({ platform: platforms, usage, hasModels, licenseType, region, aiTools, duration }), [platforms, usage, hasModels, licenseType, region, aiTools, duration]);

  const handleScan = async () => {
    setScanning(true);
    await new Promise((r) => setTimeout(r, 1200));
    setScanning(false);
    setScanned(true);
  };

  const togglePlatform = (p: string) =>
    setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  const toggleTool = (t: string) =>
    setAiTools((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  const high = risks.filter((r) => r.level === "high");
  const medium = risks.filter((r) => r.level === "medium");
  const low = risks.filter((r) => r.level === "low");

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-medium mb-4">
          <Shield className="w-4 h-4" /> Commercial Risk Scanner
        </div>
        <h1 className="font-display font-bold text-4xl mb-2">Is your campaign commercially safe?</h1>
        <p className="text-muted-foreground">Scan for IP, licensing, and compliance risks before you engage a creator</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Config */}
        <div className="space-y-5">
          <div className="glass rounded-2xl border border-white/10 p-5 space-y-4">
            <h2 className="font-semibold">Campaign Configuration</h2>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Distribution Platforms</label>
              <div className="flex flex-wrap gap-2">
                {["Instagram", "YouTube", "TikTok", "TV", "OTT", "Print"].map((p) => (
                  <button key={p} onClick={() => togglePlatform(p)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${platforms.includes(p) ? "bg-violet-500/20 border-violet-500/40 text-violet-300" : "glass border-white/10 text-muted-foreground hover:text-foreground"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Usage Type</label>
              <div className="flex gap-2">
                {["commercial", "editorial", "product", "awareness"].map((u) => (
                  <button key={u} onClick={() => setUsage(u)}
                    className={`px-3 py-1.5 rounded-lg border text-sm capitalize transition-all ${usage === u ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300" : "glass border-white/10 text-muted-foreground hover:text-foreground"}`}>
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">License Type</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "full-buyout", label: "Full Buyout" },
                  { id: "commercial-1yr", label: "Commercial 1yr" },
                  { id: "editorial-only", label: "Editorial Only" },
                  { id: "royalty-free", label: "Royalty-Free" },
                ].map((l) => (
                  <button key={l.id} onClick={() => setLicenseType(l.id)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${licenseType === l.id ? "bg-amber-500/20 border-amber-500/40 text-amber-300" : "glass border-white/10 text-muted-foreground hover:text-foreground"}`}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Usage Region</label>
              <div className="flex gap-2">
                {[{ id: "india", label: "India" }, { id: "asia", label: "Asia" }, { id: "worldwide", label: "Worldwide" }].map((r) => (
                  <button key={r.id} onClick={() => setRegion(r.id)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${region === r.id ? "bg-violet-500/20 border-violet-500/30 text-violet-300" : "glass border-white/10 text-muted-foreground hover:text-foreground"}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">AI Tools in Campaign</label>
              <div className="flex flex-wrap gap-2">
                {["Midjourney", "Stable Diffusion", "ElevenLabs", "HeyGen", "Runway", "Sora", "Flux"].map((t) => (
                  <button key={t} onClick={() => toggleTool(t)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${aiTools.includes(t) ? "bg-red-500/20 border-red-500/30 text-red-300" : "glass border-white/10 text-muted-foreground hover:text-foreground"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={hasModels} onChange={(e) => setHasModels(e.target.checked)}
                  className="w-4 h-4 rounded accent-violet-500" />
                <span className="text-sm">Content includes AI-generated human faces/likenesses</span>
              </label>
            </div>

            <button onClick={handleScan} disabled={scanning}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-red-600 to-orange-500 text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-red-500/20">
              {scanning ? (
                <><Scan className="w-4 h-4 animate-spin" /> Scanning for risks...</>
              ) : (
                <><Shield className="w-4 h-4" /> Run Risk Scan</>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        <div>
          <AnimatePresence>
            {!scanned && !scanning && (
              <div className="flex flex-col items-center justify-center h-64 glass rounded-2xl border border-white/5 text-center p-8">
                <Shield className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Configure your campaign and run the scan to see risk analysis</p>
              </div>
            )}
            {scanning && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-64 glass rounded-2xl border border-red-500/20 text-center p-8">
                <div className="w-16 h-16 rounded-full border-2 border-red-500/40 border-t-red-500 animate-spin mb-4" />
                <p className="text-sm text-muted-foreground">Analyzing IP risks, license conflicts, and compliance requirements...</p>
              </motion.div>
            )}
            {scanned && !scanning && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* Summary */}
                <div className={`p-4 rounded-2xl border ${high.length > 0 ? "bg-red-500/10 border-red-500/30" : medium.length > 0 ? "bg-amber-500/10 border-amber-500/30" : "bg-green-500/10 border-green-500/30"}`}>
                  <div className="flex items-center gap-3">
                    {high.length > 0 ? <AlertTriangle className="w-6 h-6 text-red-400" /> : medium.length > 0 ? <AlertTriangle className="w-6 h-6 text-amber-400" /> : <CheckCircle className="w-6 h-6 text-green-400" />}
                    <div>
                      <div className="font-semibold">{high.length > 0 ? `${high.length} High Risk${high.length > 1 ? "s" : ""} Found` : medium.length > 0 ? "Some Risks Detected" : "Commercially Safe"}</div>
                      <div className="text-xs text-muted-foreground">{risks.length} total findings · Address before publishing</div>
                    </div>
                    <div className="ml-auto flex gap-1.5">
                      {high.length > 0 && <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-300 rounded-full">{high.length} high</span>}
                      {medium.length > 0 && <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full">{medium.length} med</span>}
                      {low.length > 0 && <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-300 rounded-full">{low.length} ok</span>}
                    </div>
                  </div>
                </div>

                {/* Risk items */}
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {risks.map((risk, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                      className={`p-4 rounded-xl border space-y-2 ${
                        risk.level === "high" ? "bg-red-500/5 border-red-500/20" :
                        risk.level === "medium" ? "bg-amber-500/5 border-amber-500/20" :
                        "bg-green-500/5 border-green-500/20"
                      }`}>
                      <div className="flex items-start gap-2">
                        {risk.level === "high" ? <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" /> :
                         risk.level === "medium" ? <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" /> :
                         <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />}
                        <div>
                          <div className={`font-semibold text-sm ${risk.level === "high" ? "text-red-300" : risk.level === "medium" ? "text-amber-300" : "text-green-300"}`}>
                            {risk.title}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{risk.description}</p>
                        </div>
                      </div>
                      <div className="pl-6 space-y-1">
                        <div className="flex items-start gap-1.5 text-xs">
                          <Zap className="w-3 h-3 text-violet-400 mt-0.5 flex-shrink-0" />
                          <span className="text-violet-300">{risk.recommendation}</span>
                        </div>
                        <div className="flex items-start gap-1.5 text-xs">
                          <Info className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground font-mono">{risk.clause}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <Link href="/briefs/new"
                  className="w-full flex items-center justify-center gap-2 py-3 glass border border-violet-500/20 text-violet-300 rounded-xl text-sm font-medium hover:bg-violet-500/10 transition-all">
                  Apply these findings to my brief <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
