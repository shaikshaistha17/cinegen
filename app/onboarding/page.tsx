"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Film, CheckCircle, ArrowRight, ArrowLeft, Sparkles, Upload,
  Plus, X, Star, Zap, User, Briefcase, MapPin, DollarSign
} from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { storage } from "@/lib/storage";
import { toast } from "sonner";

const AI_TOOLS = [
  "Midjourney", "Runway", "Kling", "Veo", "Sora", "Pika",
  "Luma", "Flux", "ComfyUI", "Stable Diffusion", "ElevenLabs",
  "Suno", "HeyGen", "Topaz", "Higgsfield", "Adobe Firefly",
];

const SPECIALIZATIONS = [
  "Short-form Video", "Long-form Video", "Animation",
  "Motion Graphics", "Image Campaign", "Social Media Pack", "Brand Film",
];

const AVAILABILITY = ["Available", "Limited", "Booked"] as const;

const STEPS = ["Profile", "Tools & Skills", "Availability & Rate", "Done"];

export default function OnboardingPage() {
  const { session } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Form state
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [tools, setTools] = useState<string[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [skill, setSkill] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [rate, setRate] = useState("");
  const [availability, setAvailability] = useState<"Available" | "Limited" | "Booked">("Available");
  const [saving, setSaving] = useState(false);

  const toggleTool = (t: string) =>
    setTools((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  const toggleSpec = (s: string) =>
    setSpecializations((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const addSkill = () => {
    const trimmed = skill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
      setSkill("");
    }
  };

  const handleFinish = async () => {
    if (!session) { router.push("/login"); return; }
    setSaving(true);

    try {
      // Create profile in database via API
      const response = await fetch('/api/creators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: session.email.split('@')[0],
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.userId}`,
          coverUrl: `https://picsum.photos/seed/${session.userId}cover/800/300`,
          headline: headline || `${session.name} — AI Content Creator`,
          bio: bio || "AI content creator specializing in generative media.",
          location: location || "Remote",
          hourlyRateUsd: Number(rate) || 50,
          availability,
          specializations,
          skills,
          verifiedTools: tools.map(t => ({ name: t, proficiency: 'Intermediate', verified: false })),
          languages: ['English'],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create profile');
      }

      setStep(3);
      toast.success("Profile saved! Welcome to CineGen.");
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (error: any) {
      console.error('Onboarding error:', error);
      toast.error(error.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Please sign in first</p>
          <Link href="/login" className="text-violet-400 hover:text-violet-300">Go to login →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <Film className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-2xl">Cine<span className="gradient-text">Gen</span></span>
          </Link>
          <h1 className="font-display font-bold text-3xl mb-1">Set up your creator profile</h1>
          <p className="text-muted-foreground text-sm">Hey {session.name}! Let brands discover you. Takes 2 minutes.</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.slice(0, 3).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < step ? "bg-green-500 text-white" :
                i === step ? "bg-gradient-to-br from-violet-500 to-cyan-500 text-white ring-2 ring-violet-500/30" :
                "bg-white/5 text-muted-foreground border border-white/10"
              }`}>
                {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i === step ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s}</span>
              {i < 2 && <div className={`w-8 h-px mx-1 ${i < step ? "bg-green-500" : "bg-white/10"}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 0 — Profile */}
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="glass rounded-2xl border border-white/10 p-6 space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-violet-400" />
                <h2 className="font-semibold text-lg">Your Creator Profile</h2>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Professional Headline *</label>
                <input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. AI Filmmaker & Cinematic Visual Storyteller"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 placeholder:text-muted-foreground transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  placeholder="Tell brands about yourself, your style, and what makes your AI work unique..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 placeholder:text-muted-foreground transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> Location
                </label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Mumbai, India / Remote"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 placeholder:text-muted-foreground transition-all"
                />
              </div>

              <button
                onClick={() => { if (!headline.trim()) { toast.error("Please add a headline"); return; } setStep(1); }}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-violet-600 to-cyan-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Step 1 — Tools & Skills */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="glass rounded-2xl border border-white/10 p-6 space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                <h2 className="font-semibold text-lg">Tools & Specializations</h2>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">AI Tools you use *</label>
                <div className="flex flex-wrap gap-2">
                  {AI_TOOLS.map((t) => (
                    <button key={t} onClick={() => toggleTool(t)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                        tools.includes(t)
                          ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                          : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground"
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
                {tools.length > 0 && (
                  <p className="text-xs text-cyan-400 mt-2">{tools.length} tool{tools.length > 1 ? "s" : ""} selected</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Specializations *</label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALIZATIONS.map((s) => (
                    <button key={s} onClick={() => toggleSpec(s)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                        specializations.includes(s)
                          ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                          : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground"
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Additional Skills</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {skills.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-white/10 rounded-full">
                      {s}
                      <button onClick={() => setSkills(skills.filter((x) => x !== s))}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={skill}
                    onChange={(e) => setSkill(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addSkill()}
                    placeholder="e.g. Color grading, Prompt engineering (Enter to add)"
                    className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50 transition-all placeholder:text-muted-foreground"
                  />
                  <button onClick={addSkill} className="px-4 py-2.5 bg-violet-500/20 border border-violet-500/30 text-violet-300 rounded-xl hover:bg-violet-500/30 transition-all">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="flex items-center gap-1 px-4 py-3 glass border border-white/10 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-all">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => { if (tools.length === 0) { toast.error("Select at least one AI tool"); return; } setStep(2); }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2 — Rate & Availability */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="glass rounded-2xl border border-white/10 p-6 space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                <h2 className="font-semibold text-lg">Availability & Rate</h2>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Availability Status</label>
                <div className="flex gap-3">
                  {AVAILABILITY.map((a) => (
                    <button key={a} onClick={() => setAvailability(a)}
                      className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                        availability === a
                          ? a === "Available" ? "bg-green-500/20 border-green-500/40 text-green-300"
                            : a === "Limited" ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                            : "bg-red-500/20 border-red-500/40 text-red-300"
                          : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground"
                      }`}>
                      {a === "Available" ? "✅" : a === "Limited" ? "⚡" : "🔴"} {a}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-muted-foreground" /> Hourly Rate (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <input
                    type="number"
                    min={5}
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder="50"
                    className="w-full pl-8 pr-16 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">/hr</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Average on CineGen: $85/hr. You can update this anytime.</p>
              </div>

              {/* Summary */}
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Profile Summary</p>
                <div className="text-sm"><span className="text-muted-foreground">Name: </span><span className="font-medium">{session.name}</span></div>
                <div className="text-sm"><span className="text-muted-foreground">Headline: </span><span className="font-medium">{headline || "—"}</span></div>
                <div className="text-sm"><span className="text-muted-foreground">Tools: </span><span className="font-medium">{tools.join(", ") || "—"}</span></div>
                <div className="text-sm"><span className="text-muted-foreground">Specializations: </span><span className="font-medium">{specializations.join(", ") || "—"}</span></div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex items-center gap-1 px-4 py-3 glass border border-white/10 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-all">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg disabled:opacity-50"
                >
                  {saving ? <span className="animate-pulse">Saving...</span> : <><Sparkles className="w-4 h-4" /> Launch My Profile</>}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3 — Done */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center glass rounded-2xl border border-white/10 p-10">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="font-display font-bold text-3xl mb-2">You're live! 🎉</h2>
              <p className="text-muted-foreground mb-2">Your creator profile is set up.</p>
              <p className="text-sm text-muted-foreground">Taking you to your dashboard...</p>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-xs text-muted-foreground mt-6">
          <button onClick={() => router.push("/dashboard")} className="hover:text-foreground transition-colors underline underline-offset-2">
            Skip for now — I'll fill this in later
          </button>
        </p>
      </div>
    </div>
  );
}
