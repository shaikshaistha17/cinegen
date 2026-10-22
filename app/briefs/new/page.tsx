"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Wand2, ChevronRight, X, Plus, Info, CheckCircle,
  Loader2, Eye, Send, Save, ArrowLeft
} from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { useBriefs } from "@/hooks/useBriefs";
import { Brief, ContentType, AspectRatio, AiTool, LicenseTier } from "@/types";
import { toast } from "sonner";
import Link from "next/link";
import { seedCreators } from "@/lib/seed/creators";
import { computeMatchScore } from "@/lib/matchScore";
import { BriefIntelligence } from "@/components/briefs/BriefIntelligence";

const CONTENT_TYPES: ContentType[] = ["Short-form Video", "Long-form Video", "Animation", "Motion Graphics", "Image Campaign", "Social Media Pack", "Brand Film"];
const ASPECT_RATIOS: AspectRatio[] = ["16:9", "9:16", "1:1", "4:5", "2.39:1"];
const AI_TOOLS: AiTool[] = ["Midjourney", "Runway", "Kling", "Veo", "Sora", "Pika", "Luma", "Flux", "ComfyUI", "Stable Diffusion", "ElevenLabs", "Suno", "HeyGen", "Topaz", "Higgsfield"];
const LICENSE_TIERS: LicenseTier[] = ["Full Buyout", "Commercial 1yr", "Editorial Only", "Royalty-Free", "Limited"];
const IDEA_EXAMPLES = [
  "A 30-second reel for my organic skincare brand targeting Gen-Z",
  "Luxury watch campaign for Instagram and print, premium feel",
  "Animated explainer for our fintech app launch",
  "High-energy sports drink ad for TikTok and YouTube Shorts",
  "Brand film showcasing our sustainable fashion collection",
];

type FormData = Omit<Brief, "id" | "brandId" | "createdAt" | "updatedAt">;

const DEFAULT_FORM: FormData = {
  brandName: "",
  campaignTitle: "",
  objective: "",
  contentType: "Short-form Video",
  style: "",
  aspectRatios: ["16:9"],
  durationSeconds: 30,
  resolution: "1080p",
  quantity: 1,
  toolsPreferred: [],
  referenceLinks: [],
  budgetMin: 0,
  budgetMax: 0,
  deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  commercialUse: {
    licenseTier: "Commercial 1yr",
    modelIndemnityRequired: false,
    workflowHandoffRequired: false,
    usageRegions: ["India"],
    usageDurationMonths: 12,
    exclusivity: false,
  },
  negativeKeywords: [],
  status: "Draft",
  generatedByAI: false,
  rawIdea: undefined,
};

function computeCompleteness(form: FormData): number {
  let filled = 0;
  const checks = [
    !!form.campaignTitle,
    !!form.objective,
    !!form.contentType,
    !!form.style,
    form.aspectRatios.length > 0,
    form.budgetMin > 0,
    form.budgetMax > 0,
    !!form.deadline,
    form.toolsPreferred.length > 0,
    !!form.commercialUse.licenseTier,
  ];
  checks.forEach((c) => { if (c) filled++; });
  return Math.round((filled / checks.length) * 100);
}

function NewBriefPageContent() {
  const { session } = useSession();
  const { saveBrief } = useBriefs();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [idea, setIdea] = useState("");
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [showPreview, setShowPreview] = useState(false);
  const [published, setPublished] = useState<string | null>(null);
  const [newKeyword, setNewKeyword] = useState("");
  const [newRegion, setNewRegion] = useState("");

  // Check for voice draft on mount
  useEffect(() => {
    const fromVoice = searchParams.get("from");
    if (fromVoice === "voice") {
      const voiceDraft = sessionStorage.getItem("cinegen_voice_draft");
      if (voiceDraft) {
        try {
          const draft = JSON.parse(voiceDraft);
          setForm((prev) => ({
            ...prev,
            ...draft,
            generatedByAI: true,
            rawIdea: draft.rawIdea || "Generated via voice",
          }));
          setMode("manual");
          toast.success("✨ Voice draft loaded!");
          // Clear the draft from storage
          sessionStorage.removeItem("cinegen_voice_draft");
        } catch (e) {
          console.error("Failed to load voice draft:", e);
        }
      }
    }
  }, [searchParams]);

  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setCommercial = <K extends keyof FormData["commercialUse"]>(key: K, value: FormData["commercialUse"][K]) =>
    setForm((f) => ({ ...f, commercialUse: { ...f.commercialUse, [key]: value } }));

  const toggleAspect = (ratio: AspectRatio) =>
    setField("aspectRatios", form.aspectRatios.includes(ratio)
      ? form.aspectRatios.filter((r) => r !== ratio)
      : [...form.aspectRatios, ratio]);

  const toggleTool = (tool: AiTool) =>
    setField("toolsPreferred", form.toolsPreferred.includes(tool)
      ? form.toolsPreferred.filter((t) => t !== tool)
      : [...form.toolsPreferred, tool]);

  const handleGenerate = async () => {
    if (!idea.trim()) { toast.error("Please enter an idea first"); return; }
    setGenerating(true);
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });
      const data = await res.json();
      if (data.brief) {
        const b = data.brief;
        // Animate field-by-field with small delays for "streaming" feel
        toast.success(data.source === "gemini" ? "✨ Brief generated with Gemini AI" : "✨ Brief generated with smart AI");
        setMode("manual");
        // Fill fields progressively
        setTimeout(() => setForm((prev) => ({ ...prev, campaignTitle: b.campaignTitle || prev.campaignTitle, generatedByAI: true, rawIdea: idea })), 100);
        setTimeout(() => setForm((prev) => ({ ...prev, objective: b.objective || prev.objective })), 300);
        setTimeout(() => setForm((prev) => ({ ...prev, contentType: b.contentType || prev.contentType, style: b.style || prev.style })), 500);
        setTimeout(() => setForm((prev) => ({ ...prev, aspectRatios: b.aspectRatios || prev.aspectRatios, durationSeconds: b.durationSeconds || prev.durationSeconds })), 700);
        setTimeout(() => setForm((prev) => ({ ...prev, toolsPreferred: b.toolsPreferred || prev.toolsPreferred })), 900);
        setTimeout(() => setForm((prev) => ({ ...prev, budgetMin: b.budgetMin || prev.budgetMin, budgetMax: b.budgetMax || prev.budgetMax, deadline: b.deadline || prev.deadline })), 1100);
        setTimeout(() => setForm((prev) => ({ ...prev, negativeKeywords: b.negativeKeywords || prev.negativeKeywords, resolution: b.resolution || prev.resolution, quantity: b.quantity || prev.quantity, commercialUse: b.commercialUse || prev.commercialUse })), 1300);
      }
    } catch {
      toast.error("Generation failed, please fill manually");
      setMode("manual");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = (status: "Draft" | "Open") => {
    if (!form.campaignTitle.trim()) { toast.error("Please add a campaign title"); return; }
    if (!session) { toast.error("Please log in first"); return; }

    const brief: Brief = {
      ...form,
      id: `brief-${Date.now()}`,
      brandId: session.brandId ?? session.userId,
      brandName: form.brandName || session.name,
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveBrief(brief);
    if (status === "Open") {
      setPublished(brief.id);
      toast.success("Brief published! Finding top creator matches...");
    } else {
      toast.success("Brief saved as draft");
      router.push("/briefs");
    }
  };

  const completeness = computeCompleteness(form);

  // Top matches after publish
  const topMatches = published
    ? seedCreators
        .map((c) => computeMatchScore(c, { ...form, id: published, brandId: "brand-001", createdAt: "", updatedAt: "" } as Brief))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
    : [];

  if (published) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="font-display font-bold text-3xl mb-2">Brief Published!</h1>
            <p className="text-muted-foreground">Your brief is live. Here are your top creator matches with explainable scores.</p>
          </div>

          <div className="space-y-3">
            {topMatches.map((match, i) => (
              <motion.div
                key={match.creator.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
                className="glass rounded-xl border border-white/5 hover:border-violet-500/30 transition-all p-4 flex items-center gap-4"
              >
                <div className="text-2xl font-display font-bold text-muted-foreground w-8">#{i + 1}</div>
                <img src={match.creator.avatarUrl} alt={match.creator.name} className="w-12 h-12 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{match.creator.name}</div>
                  {/* Explainable match breakdown */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {match.reasons.slice(0, 3).map((r, ri) => (
                      <span key={ri} className="text-xs px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 text-violet-300 rounded-full">{r}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    {/* Visual score ring */}
                    <div className="relative w-14 h-14">
                      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15.9" fill="none"
                          stroke={match.score >= 80 ? "#8b5cf6" : match.score >= 60 ? "#06b6d4" : "#f59e0b"}
                          strokeWidth="3"
                          strokeDasharray={`${match.score} 100`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold">{match.score}%</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">match</div>
                  </div>
                  <Link
                    href={`/creators/${match.creator.id}`}
                    className="px-3 py-2 bg-violet-500/20 border border-violet-500/30 text-violet-300 rounded-lg text-sm hover:bg-violet-500/30 transition-all"
                  >
                    View
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex gap-3 mt-8 justify-center">
            <Link href="/briefs" className="px-6 py-3 glass border border-white/10 rounded-xl text-sm font-medium hover:bg-white/5 transition-all">
              View all briefs
            </Link>
            <button onClick={() => { setPublished(null); setForm(DEFAULT_FORM); setIdea(""); setMode("ai"); }}
              className="px-6 py-3 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-xl text-sm font-semibold hover:from-violet-500 hover:to-violet-400 transition-all">
              Post another brief
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/briefs" className="p-2 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-display font-bold text-2xl">Create a Brief</h1>
          <p className="text-muted-foreground text-sm">Tell creators exactly what you need</p>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode("ai")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${mode === "ai" ? "bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-lg shadow-violet-500/25" : "glass border border-white/10 text-muted-foreground hover:text-foreground"}`}
        >
          <Sparkles className="w-4 h-4" /> AI Brief Builder
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${mode === "manual" ? "bg-white/10 text-foreground border border-white/20" : "glass border border-white/10 text-muted-foreground hover:text-foreground"}`}
        >
          <Wand2 className="w-4 h-4" /> Manual Form
        </button>
      </div>

      {/* Completeness bar */}
      {mode === "manual" && (
        <div className="mb-6 glass rounded-xl border border-white/5 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Brief Completeness</span>
            <span className={`text-sm font-bold ${completeness >= 80 ? "text-green-400" : completeness >= 50 ? "text-amber-400" : "text-muted-foreground"}`}>{completeness}%</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-2">
            <motion.div
              className={`h-2 rounded-full transition-all ${completeness >= 80 ? "bg-gradient-to-r from-green-500 to-emerald-500" : completeness >= 50 ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-gradient-to-r from-violet-500 to-violet-600"}`}
              animate={{ width: `${completeness}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          {completeness < 100 && (
            <p className="text-xs text-muted-foreground mt-1">
              {completeness < 50 ? "Add more details to attract better creators" : completeness < 80 ? "Almost there! A few more fields to go" : "Great brief! Ready to publish"}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {mode === "ai" && (
              <motion.div key="ai" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="glass rounded-2xl border border-violet-500/20 p-6 space-y-5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold">AI Brief Builder</h2>
                    <p className="text-xs text-muted-foreground">Describe your idea in plain language — AI handles the rest</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Your Campaign Idea</label>
                  <textarea
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder="e.g. A cinematic brand film for a luxury watch brand targeting HNIs, with golden hour aesthetics and Indian heritage elements..."
                    className="w-full h-32 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 resize-none placeholder:text-muted-foreground transition-all"
                  />
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Examples — click to use:</p>
                  <div className="flex flex-wrap gap-2">
                    {IDEA_EXAMPLES.map((ex) => (
                      <button
                        key={ex}
                        onClick={() => setIdea(ex)}
                        className="text-xs px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-violet-500/10 hover:border-violet-500/30 hover:text-violet-300 transition-all text-muted-foreground"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={generating || !idea.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-violet-500/25 relative overflow-hidden"
                >
                  {generating ? (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-cyan-500 to-violet-600 animate-pulse" />
                      <Loader2 className="w-4 h-4 animate-spin relative z-10" />
                      <span className="relative z-10">AI is thinking...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Brief with Gemini AI
                    </>
                  )}
                </button>

                <button
                  onClick={() => setMode("manual")}
                  className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip — fill manually instead →
                </button>
              </motion.div>
            )}

            {mode === "manual" && (
              <motion.div key="manual" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="space-y-5">
                {form.generatedByAI && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-violet-500/10 border border-violet-500/20 rounded-xl text-sm text-violet-300">
                    <Sparkles className="w-4 h-4" />
                    Generated by AI — review and edit below
                  </div>
                )}

                {/* Campaign */}
                <div className="glass rounded-2xl border border-white/5 p-5 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 text-xs flex items-center justify-center font-bold">1</span> Campaign Details</h3>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Campaign Title *</label>
                    <input value={form.campaignTitle} onChange={(e) => setField("campaignTitle", e.target.value)}
                      placeholder="e.g. Nexus Energy Drink — Urban Warriors Launch"
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-violet-500/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Campaign Objective *</label>
                    <textarea value={form.objective} onChange={(e) => setField("objective", e.target.value)}
                      placeholder="What do you want this content to achieve?"
                      className="w-full h-20 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-violet-500/50 transition-all resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Brand Name</label>
                    <input value={form.brandName} onChange={(e) => setField("brandName", e.target.value)}
                      placeholder="Your brand or company name"
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-violet-500/50 transition-all" />
                  </div>
                </div>

                {/* Content */}
                <div className="glass rounded-2xl border border-white/5 p-5 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 text-xs flex items-center justify-center font-bold">2</span> Content Specs</h3>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Content Type *</label>
                    <div className="flex flex-wrap gap-2">
                      {CONTENT_TYPES.map((ct) => (
                        <button key={ct} onClick={() => setField("contentType", ct)}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${form.contentType === ct ? "bg-violet-500/20 border-violet-500/40 text-violet-300" : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground"}`}>
                          {ct}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Visual Style *</label>
                    <input value={form.style} onChange={(e) => setField("style", e.target.value)}
                      placeholder="e.g. Dark cinematic, neon accents, slow motion, luxury feel"
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-violet-500/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Aspect Ratios *</label>
                    <div className="flex flex-wrap gap-2">
                      {ASPECT_RATIOS.map((ar) => (
                        <button key={ar} onClick={() => toggleAspect(ar)}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-mono ${form.aspectRatios.includes(ar) ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300" : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground"}`}>
                          {ar}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">Duration (sec)</label>
                      <input type="number" value={form.durationSeconds ?? ""} onChange={(e) => setField("durationSeconds", Number(e.target.value) || undefined)}
                        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-violet-500/50 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">Resolution</label>
                      <select value={form.resolution ?? "1080p"} onChange={(e) => setField("resolution", e.target.value)}
                        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-violet-500/50 transition-all cursor-pointer">
                        {["720p", "1080p", "4K", "8K"].map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">Quantity</label>
                      <input type="number" min={1} value={form.quantity} onChange={(e) => setField("quantity", Number(e.target.value))}
                        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-violet-500/50 transition-all" />
                    </div>
                  </div>
                </div>

                {/* Tools */}
                <div className="glass rounded-2xl border border-white/5 p-5 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 text-xs flex items-center justify-center font-bold">3</span> Preferred AI Tools</h3>
                  <div className="flex flex-wrap gap-2">
                    {AI_TOOLS.map((tool) => (
                      <button key={tool} onClick={() => toggleTool(tool)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${form.toolsPreferred.includes(tool) ? "bg-violet-500/20 border-violet-500/40 text-violet-300" : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground"}`}>
                        {tool}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Budget & Timeline */}
                <div className="glass rounded-2xl border border-white/5 p-5 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 text-xs flex items-center justify-center font-bold">4</span> Budget & Timeline</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">Min Budget (₹) *</label>
                      <input type="number" min={0} value={form.budgetMin || ""} onChange={(e) => setField("budgetMin", Number(e.target.value))}
                        placeholder="2000"
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-violet-500/50 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">Max Budget (₹) *</label>
                      <input type="number" min={0} value={form.budgetMax || ""} onChange={(e) => setField("budgetMax", Number(e.target.value))}
                        placeholder="8000"
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-violet-500/50 transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Deadline *</label>
                    <input type="date" value={form.deadline} onChange={(e) => setField("deadline", e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-violet-500/50 transition-all" />
                  </div>
                </div>

                {/* Commercial Use */}
                <div className="glass rounded-2xl border border-white/5 p-5 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 text-xs flex items-center justify-center font-bold">5</span> Commercial Use</h3>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">License Tier</label>
                    <div className="flex flex-wrap gap-2">
                      {LICENSE_TIERS.map((lt) => (
                        <button key={lt} onClick={() => setCommercial("licenseTier", lt)}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${form.commercialUse.licenseTier === lt ? "bg-violet-500/20 border-violet-500/40 text-violet-300" : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground"}`}>
                          {lt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.commercialUse.modelIndemnityRequired}
                        onChange={(e) => setCommercial("modelIndemnityRequired", e.target.checked)}
                        className="w-4 h-4 rounded accent-violet-500 cursor-pointer" />
                      <span className="text-sm">Require Model Indemnity</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.commercialUse.workflowHandoffRequired}
                        onChange={(e) => setCommercial("workflowHandoffRequired", e.target.checked)}
                        className="w-4 h-4 rounded accent-violet-500 cursor-pointer" />
                      <span className="text-sm">Require Workflow Handoff</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.commercialUse.exclusivity}
                        onChange={(e) => setCommercial("exclusivity", e.target.checked)}
                        className="w-4 h-4 rounded accent-violet-500 cursor-pointer" />
                      <span className="text-sm">Exclusivity Required</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Usage Regions</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {form.commercialUse.usageRegions.map((r) => (
                        <span key={r} className="flex items-center gap-1 text-xs px-2 py-0.5 bg-violet-500/10 text-violet-300 rounded-full">
                          {r}
                          <button onClick={() => setCommercial("usageRegions", form.commercialUse.usageRegions.filter((x) => x !== r))}><X className="w-2.5 h-2.5" /></button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input value={newRegion} onChange={(e) => setNewRegion(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && newRegion.trim()) { setCommercial("usageRegions", [...form.commercialUse.usageRegions, newRegion.trim()]); setNewRegion(""); } }}
                        placeholder="Add region (Enter to add)"
                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-violet-500/50 transition-all" />
                    </div>
                  </div>
                </div>

                {/* Negative keywords */}
                <div className="glass rounded-2xl border border-white/5 p-5 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 text-xs flex items-center justify-center font-bold">6</span> Negative Keywords</h3>
                  <p className="text-xs text-muted-foreground">What should this content avoid?</p>
                  <div className="flex flex-wrap gap-1.5">
                    {form.negativeKeywords.map((kw) => (
                      <span key={kw} className="flex items-center gap-1 text-xs px-2 py-0.5 bg-red-500/10 text-red-300 border border-red-500/20 rounded-full">
                        {kw}
                        <button onClick={() => setField("negativeKeywords", form.negativeKeywords.filter((k) => k !== kw))}><X className="w-2.5 h-2.5" /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && newKeyword.trim()) { setField("negativeKeywords", [...form.negativeKeywords, newKeyword.trim()]); setNewKeyword(""); } }}
                      placeholder="e.g. cartoon, childlike (Enter to add)"
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-violet-500/50 transition-all" />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button onClick={() => handleSave("Draft")}
                    className="flex items-center gap-2 px-5 py-3 glass border border-white/10 rounded-xl text-sm font-medium hover:bg-white/5 transition-all">
                    <Save className="w-4 h-4" /> Save Draft
                  </button>
                  <button onClick={() => handleSave("Open")}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-xl font-semibold hover:from-violet-500 hover:to-violet-400 transition-all shadow-lg shadow-violet-500/25">
                    <Send className="w-4 h-4" /> Publish Brief
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            {/* Brief Intelligence */}
            <BriefIntelligence form={form} />

            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Preview</h3>
            <div className="glass rounded-2xl border border-white/5 p-5 space-y-3">
              {form.generatedByAI && (
                <div className="flex items-center gap-1.5 text-xs px-2 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-300 rounded-lg w-fit">
                  <Sparkles className="w-3 h-3" /> AI Generated
                </div>
              )}
              <h4 className="font-semibold text-sm line-clamp-2">{form.campaignTitle || "Campaign Title"}</h4>
              <p className="text-xs text-muted-foreground line-clamp-3">{form.objective || "Campaign objective will appear here"}</p>
              <div className="flex flex-wrap gap-1">
                {form.aspectRatios.map((ar) => (
                  <span key={ar} className="text-xs px-1.5 py-0.5 bg-cyan-500/10 text-cyan-300 rounded font-mono">{ar}</span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {form.toolsPreferred.slice(0, 4).map((t) => (
                  <span key={t} className="text-xs px-1.5 py-0.5 bg-violet-500/10 text-violet-300 rounded">{t}</span>
                ))}
              </div>
              {(form.budgetMin > 0 || form.budgetMax > 0) && (
                <div className="text-sm font-semibold">
                  ${form.budgetMin.toLocaleString()} – ${form.budgetMax.toLocaleString()}
                  <span className="text-xs text-muted-foreground font-normal"> INR</span>
                </div>
              )}
              {form.contentType && (
                <span className="text-xs px-2 py-0.5 bg-white/5 rounded-full text-muted-foreground">{form.contentType}</span>
              )}
              <div className="pt-2 border-t border-white/5">
                <span className={`text-xs px-2 py-0.5 rounded-full ${form.status === "Draft" ? "bg-amber-500/10 text-amber-300" : "bg-green-500/10 text-green-300"}`}>
                  {form.status}
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4 text-center">
              Completeness: <span className={`font-bold ${completeness >= 80 ? "text-green-400" : "text-amber-400"}`}>{completeness}%</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function NewBriefPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    }>
      <NewBriefPageContent />
    </Suspense>
  );
}
