"use client";
import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, CheckCircle, Shield, X,
  ArrowLeft, Zap, Play, Eye
} from "lucide-react";
import { useCreator } from "@/hooks/useCreators";
import { useSession } from "@/hooks/useSession";
import { PortfolioItem, WorkflowStep } from "@/types";
import { toast } from "sonner";
import { StyleDNA } from "@/components/creators/StyleDNA";

const BADGE_CONFIG = {
  Studio: { color: "from-violet-500 to-violet-600", text: "Studio Verified", icon: "★" },
  Verified: { color: "from-cyan-500 to-cyan-600", text: "Verified Creator", icon: "✓" },
  Rising: { color: "from-amber-500 to-amber-600", text: "Rising Creator", icon: "↑" },
  Unverified: { color: "from-white/10 to-white/5", text: "Unverified", icon: "?" },
};

const PROF_COLORS = {
  Expert: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
  Advanced: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
  Intermediate: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  Beginner: "bg-white/10 text-white/60",
};

function WorkflowTimeline({ steps }: { steps: WorkflowStep[] }) {
  return (
    <div className="relative space-y-4">
      {steps.map((step, i) => (
        <div key={step.step} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 z-10">
              {step.step}
            </div>
            {i < steps.length - 1 && (
              <div className="w-px h-full bg-gradient-to-b from-violet-500/40 to-transparent mt-1 flex-1" />
            )}
          </div>
          <div className="pb-4 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-violet-300">{step.tool}</span>
            </div>
            {step.prompt && (
              <div className="mb-2 p-2 bg-black/30 border border-white/5 rounded-lg">
                <p className="text-xs text-muted-foreground font-mono italic">"{step.prompt}"</p>
              </div>
            )}
            {step.note && <p className="text-xs text-muted-foreground">{step.note}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function PortfolioModal({ item, onClose }: { item: PortfolioItem; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="glass border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 glass border-b border-white/5 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="font-display font-semibold text-lg">{item.title}</h2>
              <p className="text-xs text-muted-foreground">{item.contentType} · {item.aspectRatio} · {item.year}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Media preview */}
            <div className={`relative rounded-xl overflow-hidden bg-black ${
              item.aspectRatio === "9:16" ? "max-w-xs mx-auto" : ""
            }`}>
              {item.mediaType === "video" ? (
                <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ paddingBottom: item.aspectRatio === "9:16" ? "177.78%" : "56.25%" }}>
                  <div className="absolute inset-0">
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-full h-full object-cover opacity-75"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    {/* Play button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-2xl">
                        <Play className="w-7 h-7 text-white fill-white ml-1" />
                      </div>
                    </div>
                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 text-xs px-2.5 py-1 bg-violet-600/80 text-white rounded-full backdrop-blur-sm font-medium">
                      ✨ AI-Generated
                    </div>
                    {item.seedLogged && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 text-xs px-2 py-0.5 bg-green-500/20 border border-green-500/30 text-green-400 rounded-full backdrop-blur-sm">
                        <CheckCircle className="w-3 h-3" /> Workflow Logged
                      </div>
                    )}
                    {/* Bottom label */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                      <span className="text-xs text-white/70">{item.aspectRatio} · {item.contentType}</span>
                      <span className="text-xs text-white/50">{item.year}</span>
                    </div>
                  </div>
                </div>
              ) : item.mediaType === "animation" ? (
                <div className="relative" style={{ aspectRatio: item.aspectRatio.replace(":", "/"), maxHeight: "300px" }}>
                  <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-3">
                    <span className="text-xs px-2 py-0.5 bg-violet-600/80 text-white rounded-full backdrop-blur-sm font-medium">✨ Animation Preview</span>
                  </div>
                </div>
              ) : (
                <div style={{ aspectRatio: item.aspectRatio.replace(":", "/"), maxHeight: "300px" }}>
                  <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                </div>
              )}
              {item.seedLogged && item.mediaType !== "video" && (
                <div className="absolute top-2 left-2 flex items-center gap-1 text-xs px-2 py-0.5 bg-green-500/20 border border-green-500/30 text-green-400 rounded-full backdrop-blur-sm">
                  <CheckCircle className="w-3 h-3" /> AI Logged
                </div>
              )}
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>

            {/* Style tags */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Style</h3>
              <div className="flex flex-wrap gap-1.5">
                {item.styleTags.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-muted-foreground">#{tag}</span>
                ))}
              </div>
            </div>

            {/* Tools used */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tools Used</h3>
              <div className="flex flex-wrap gap-1.5">
                {item.toolsUsed.map((tool) => (
                  <span key={tool} className="text-xs px-2 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-300 rounded-lg">{tool}</span>
                ))}
              </div>
            </div>

            {/* Workflow */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Production Workflow</h3>
              <WorkflowTimeline steps={item.workflow} />
            </div>

            {/* Commercial use */}
            <div className="p-4 bg-white/3 border border-white/5 rounded-xl">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Commercial Use</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">License Tier</div>
                  <div className="text-sm font-semibold text-violet-300">{item.commercialUse.licenseTier}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">Model Indemnity</div>
                  <div className={`text-sm font-semibold ${item.commercialUse.modelIndemnity ? "text-green-400" : "text-red-400"}`}>
                    {item.commercialUse.modelIndemnity ? "✓ Included" : "✗ Not included"}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">Training Clean</div>
                  <div className={`text-sm font-semibold ${item.commercialUse.trainingDataClean ? "text-green-400" : "text-amber-400"}`}>
                    {item.commercialUse.trainingDataClean ? "✓ Clean" : "⚠ Unverified"}
                  </div>
                </div>
              </div>
            </div>

            {/* Request this workflow */}
            <button
              onClick={() => { toast.success("Request sent! The creator will be notified."); onClose(); }}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-xl font-semibold hover:from-violet-500 hover:to-violet-400 transition-all"
            >
              Request This Workflow
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function CreatorProfilePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { creator } = useCreator(id);
  const { session } = useSession();
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);

  if (!creator) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-display text-2xl mb-3">Creator not found</h2>
          <Link href="/creators" className="text-violet-400 hover:text-violet-300 transition-colors">← Back to creators</Link>
        </div>
      </div>
    );
  }

  const badge = BADGE_CONFIG[creator.verification.badge as keyof typeof BADGE_CONFIG];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back */}
      <Link href="/creators" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to creators
      </Link>

      {/* Cover */}
      <div className="relative h-48 sm:h-64 rounded-2xl overflow-hidden mb-0">
        <img src={creator.coverUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className={`absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${badge.color} text-white text-xs font-semibold`}>
          {badge.icon} {badge.text}
        </div>
      </div>

      <div className="relative -mt-16 px-4 sm:px-6 pb-4 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6">
          <img
            src={creator.avatarUrl}
            alt={creator.name}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-4 border-background object-cover shadow-2xl"
          />
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-2xl sm:text-3xl">{creator.name}</h1>
            <p className="text-muted-foreground text-sm mb-1">{creator.handle} · <span className="text-foreground/70">{creator.location}</span></p>
            <p className="text-sm font-medium text-violet-300">{creator.headline}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-display font-bold">${creator.hourlyRateUsd}<span className="text-sm text-muted-foreground font-normal">/hr</span></div>
              <div className={`text-xs font-medium ${creator.availability === "Available" ? "text-green-400" : creator.availability === "Limited" ? "text-amber-400" : "text-red-400"}`}>
                ● {creator.availability}
              </div>
            </div>
            {session?.role === "brand" && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => toast.success(`Invited ${creator.name} to your brief!`)}
                  className="px-4 py-2 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-xl text-sm font-semibold hover:from-violet-500 hover:to-violet-400 transition-all"
                >
                  Invite to Brief
                </button>
                <Link
                  href="/briefs/new"
                  className="px-4 py-2 glass border border-white/10 text-sm font-medium text-center rounded-xl hover:bg-white/5 transition-all"
                >
                  Post a Brief
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Bio */}
          <div className="glass rounded-2xl border border-white/5 p-6">
            <h2 className="font-display font-semibold text-lg mb-3">About</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{creator.bio}</p>
          </div>

          {/* Portfolio */}
          <div>
            <h2 className="font-display font-semibold text-xl mb-4">Portfolio</h2>
            <div className="columns-1 sm:columns-2 gap-4 space-y-4">
              {creator.portfolio.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  onClick={() => setSelectedItem(item)}
                  className="break-inside-avoid glass rounded-xl border border-white/5 hover:border-violet-500/30 transition-all cursor-pointer overflow-hidden group"
                >
                  <div className="relative overflow-hidden rounded-t-xl" style={{
                    aspectRatio: item.aspectRatio === "9:16" ? "9/16" : item.aspectRatio === "4:5" ? "4/5" : "16/9",
                    maxHeight: "220px",
                  }}>
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        {item.mediaType === "video" ? <Play className="w-4 h-4 text-white fill-white ml-0.5" /> : <Eye className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 text-xs px-1.5 py-0.5 bg-black/60 text-white/80 rounded-full capitalize">
                      {item.mediaType === "video" ? "▶ video" : item.mediaType}
                    </div>
                    {item.mediaType === "video" && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-sm mb-1">{item.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.toolsUsed.slice(0, 3).map((t) => (
                        <span key={t} className="text-xs px-1.5 py-0.5 bg-violet-500/10 text-violet-300 rounded">{t}</span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Stats */}
          <div className="glass rounded-2xl border border-white/5 p-5">
            <h3 className="font-semibold text-sm mb-4">Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-white/3 rounded-xl">
                <div className="text-xl font-display font-bold text-violet-300">{creator.stats.projectsCompleted}</div>
                <div className="text-xs text-muted-foreground">Projects</div>
              </div>
              <div className="text-center p-3 bg-white/3 rounded-xl">
                <div className="text-xl font-display font-bold text-amber-400">{creator.stats.avgRating}★</div>
                <div className="text-xs text-muted-foreground">Rating</div>
              </div>
              <div className="text-center p-3 bg-white/3 rounded-xl">
                <div className="text-xl font-display font-bold text-green-400">{creator.stats.repeatClientRate}%</div>
                <div className="text-xs text-muted-foreground">Repeat Clients</div>
              </div>
              <div className="text-center p-3 bg-white/3 rounded-xl">
                <div className="text-sm font-bold text-cyan-300">{creator.stats.responseTime}</div>
                <div className="text-xs text-muted-foreground">Response</div>
              </div>
            </div>
          </div>

          {/* Verification Panel */}
          <div className="glass rounded-2xl border border-white/5 p-5">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-violet-400" />
              Verification & Evidence
            </h3>
            <div className="space-y-4">
              {[
                {
                  key: "toolsVerified",
                  label: "Tools Verified",
                  desc: "Tool usage confirmed via API logs or portfolio evidence",
                  evidence: ["ComfyUI node graph exported", "Runway API usage logs", "Midjourney job IDs on file"],
                },
                {
                  key: "workflowVerified",
                  label: "Workflow Verified",
                  desc: "Full production pipeline reviewed and validated",
                  evidence: ["Step-by-step process screenshots", "Intermediate render passes", "Prompt seed manifests"],
                },
                {
                  key: "pastWorkVerified",
                  label: "Past Work Verified",
                  desc: "Client references and work history confirmed",
                  evidence: ["2 client references confirmed", "Invoice history reviewed", "Portfolio authenticity checked"],
                },
              ].map((v) => {
                const verified = creator.verification[v.key as keyof typeof creator.verification] as boolean;
                return (
                  <div key={v.key} className={`p-3 rounded-xl border ${verified ? "bg-green-500/5 border-green-500/20" : "bg-white/3 border-white/5"}`}>
                    <div className="flex items-start gap-3 mb-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0 ${verified ? "bg-green-500/20" : "bg-white/10"}`}>
                        {verified ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <X className="w-3 h-3 text-muted-foreground" />}
                      </div>
                      <div className="flex-1">
                        <div className={`text-sm font-medium ${verified ? "text-foreground" : "text-muted-foreground"}`}>{v.label}</div>
                        <div className="text-xs text-muted-foreground">{v.desc}</div>
                      </div>
                    </div>
                    {verified && (
                      <div className="ml-8 space-y-1">
                        {v.evidence.map((e, ei) => (
                          <div key={ei} className="flex items-center gap-1.5 text-xs text-green-400/80">
                            <div className="w-1 h-1 rounded-full bg-green-400/60" />
                            {e}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Tools */}
          <div className="glass rounded-2xl border border-white/5 p-5">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              AI Tools & Proficiency
            </h3>
            <div className="space-y-2">
              {creator.verifiedTools.map((t) => (
                <div key={t.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {t.verified && <CheckCircle className="w-3 h-3 text-green-400" />}
                    <span className="text-sm">{t.name}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${PROF_COLORS[t.proficiency]}`}>
                    {t.proficiency}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div className="glass rounded-2xl border border-white/5 p-5">
            <h3 className="font-semibold text-sm mb-3">Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {creator.skills.map((s) => (
                <span key={s} className="text-xs px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-muted-foreground">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Style DNA */}
          <StyleDNA creator={creator} />

          {/* Languages */}
          <div className="glass rounded-2xl border border-white/5 p-5">
            <h3 className="font-semibold text-sm mb-3">Languages</h3>
            <div className="flex flex-wrap gap-1.5">
              {creator.languages.map((l) => (
                <span key={l} className="text-xs px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 rounded-lg">
                  {l}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio Modal */}
      {selectedItem && (
        <PortfolioModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}
