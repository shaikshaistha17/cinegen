"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle, Info, Lightbulb, X, Shield, Zap, ChevronDown, ChevronUp } from "lucide-react";

type FormData = {
  campaignTitle: string;
  objective: string;
  contentType: string;
  style: string;
  aspectRatios: string[];
  budgetMin: number;
  budgetMax: number;
  deadline: string;
  toolsPreferred: string[];
  commercialUse: {
    licenseTier: string;
    modelIndemnityRequired: boolean;
    workflowHandoffRequired: boolean;
    usageRegions: string[];
    exclusivity: boolean;
  };
  negativeKeywords: string[];
  quantity: number;
  durationSeconds?: number;
};

type Issue = {
  type: "error" | "warning" | "suggestion";
  field: string;
  message: string;
  fix?: string;
};

function analyzeBrief(form: FormData): Issue[] {
  const issues: Issue[] = [];

  // Hard errors
  if (!form.campaignTitle?.trim())
    issues.push({ type: "error", field: "Title", message: "Campaign title is missing", fix: "Add a descriptive title so creators understand the project" });
  if (!form.objective?.trim())
    issues.push({ type: "error", field: "Objective", message: "No campaign objective defined", fix: "Describe what you want this content to achieve" });
  if (!form.style?.trim())
    issues.push({ type: "error", field: "Visual Style", message: "Visual style is not specified", fix: "Add keywords like 'cinematic', 'neon', 'minimal', 'luxury'" });
  if (form.budgetMin === 0 || form.budgetMax === 0)
    issues.push({ type: "error", field: "Budget", message: "Budget range is missing", fix: "Set a realistic budget so creators can decide if it's a fit" });
  if (form.budgetMin > form.budgetMax && form.budgetMax > 0)
    issues.push({ type: "error", field: "Budget", message: "Min budget is higher than max budget", fix: "Flip the values — min should be lower than max" });

  // Part 3: Conflicting spec check
  if (form.contentType === "Short-form Video" && form.durationSeconds && form.durationSeconds > 60) {
    issues.push({ 
      type: "error", 
      field: "Duration", 
      message: "Short-form video with duration over 60 seconds is contradictory", 
      fix: "Either change content type to Brand Film or reduce duration to ≤60 seconds" 
    });
  }

  // Warnings
  if (form.aspectRatios.length === 0)
    issues.push({ type: "warning", field: "Aspect Ratio", message: "No aspect ratio selected", fix: "Pick at least one — 16:9 for YouTube, 9:16 for Reels/TikTok" });
  if (!form.commercialUse?.licenseTier)
    issues.push({ type: "warning", field: "License", message: "No license tier selected", fix: "Add a license tier to avoid disputes after delivery" });
  if (form.commercialUse?.usageRegions?.length === 0)
    issues.push({ type: "warning", field: "Usage Regions", message: "Usage regions not specified", fix: "Add regions where content will be used (e.g. India, Worldwide)" });
  if (form.toolsPreferred.length === 0)
    issues.push({ type: "warning", field: "AI Tools", message: "No preferred AI tools specified", fix: "Adding tools like Runway or Midjourney helps match the right creator" });
  if (!form.deadline)
    issues.push({ type: "warning", field: "Deadline", message: "No deadline set", fix: "Set a deadline to attract creators who are available" });

  // Part 3: Missing exclusivity regions check
  if (form.commercialUse?.exclusivity && (!form.commercialUse.usageRegions || form.commercialUse.usageRegions.length === 0)) {
    issues.push({ 
      type: "warning", 
      field: "Exclusivity Regions", 
      message: "Exclusivity requested but no usage regions specified", 
      fix: "Specify the regions where exclusivity applies" 
    });
  }

  // Part 3: Budget/timeline feasibility (labeled as estimate)
  if (form.deadline && form.budgetMax > 0) {
    const daysUntilDeadline = (new Date(form.deadline).getTime() - Date.now()) / 86400000;
    if (daysUntilDeadline < 7 && form.budgetMax < 1000) {
      issues.push({ 
        type: "warning", 
        field: "Feasibility", 
        message: "⚠️ Estimate only (assumptions: 1 creator, standard delivery): tight deadline and low budget may limit creator availability", 
        fix: "Consider extending deadline to at least 2 weeks or increasing budget" 
      });
    }
  }

  // Suggestions
  if (form.budgetMax > 0 && form.budgetMax < 500)
    issues.push({ type: "suggestion", field: "Budget", message: "Budget seems low for AI production", fix: "Typical AI brand films start at $500–$1,000. Consider increasing." });
  if (!form.commercialUse?.modelIndemnityRequired)
    issues.push({ type: "suggestion", field: "Model Indemnity", message: "Model indemnity not required", fix: "For commercial campaigns, requiring model indemnity protects your brand" });
  if (form.negativeKeywords.length === 0)
    issues.push({ type: "suggestion", field: "Negative Keywords", message: "No negative keywords added", fix: "Add words like 'violence', 'political' to prevent unwanted content" });
  
  // Part 3: Missing revision allowance check
  const objectiveLower = form.objective?.toLowerCase() || '';
  const styleLower = form.style?.toLowerCase() || '';
  if (!objectiveLower.includes('revision') && !styleLower.includes('revision')) {
    issues.push({ 
      type: "suggestion", 
      field: "Revisions", 
      message: "No revision allowance mentioned in objective or style", 
      fix: "State how many revision rounds are included (e.g. '2 rounds of revisions')" 
    });
  }

  // Part 3: Multi-format validity - DON'T flag as contradictory when quantity > 1 and multiple aspect ratios
  // (This is explicitly requested and valid, so we removed any existing warning for this case)

  return issues;
}

function getScore(issues: Issue[]): number {
  const errors = issues.filter((i) => i.type === "error").length;
  const warnings = issues.filter((i) => i.type === "warning").length;
  const suggestions = issues.filter((i) => i.type === "suggestion").length;
  const score = Math.max(0, 100 - errors * 20 - warnings * 8 - suggestions * 3);
  return score;
}

export function BriefIntelligence({ form }: { form: FormData }) {
  const issues = analyzeBrief(form);
  const score = getScore(issues);
  const errors = issues.filter((i) => i.type === "error");
  const warnings = issues.filter((i) => i.type === "warning");
  const suggestions = issues.filter((i) => i.type === "suggestion");

  const [expandedSections, setExpandedSections] = useState({
    errors: true,
    warnings: true,
    suggestions: false,
  });

  const scoreColor = score >= 80 ? "text-green-400" : score >= 50 ? "text-amber-400" : "text-red-400";
  const scoreStroke = score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const scoreGradient = score >= 80 ? "from-green-500 to-emerald-500" : score >= 50 ? "from-amber-500 to-orange-500" : "from-red-500 to-red-600";
  const scoreLabel = score >= 80 ? "Strong Brief" : score >= 50 ? "Needs Work" : "Incomplete";

  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="glass-card rounded-2xl border border-white/10 p-6 space-y-5 bg-gradient-to-br from-purple-950/20 to-transparent">
      {/* Header with animated score ring */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Brief Intelligence</h3>
            <p className="text-xs text-muted-foreground">AI-powered real-time audit</p>
          </div>
        </div>

        {/* Animated score ring */}
        <div className="relative">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 120 120">
            {/* Background circle */}
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="8"
            />
            {/* Animated score circle */}
            <motion.circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke={scoreStroke}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </svg>
          {/* Score number with count-up */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              className={`text-3xl font-display font-bold ${scoreColor}`}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              {score}
            </motion.div>
            <div className={`text-[10px] font-medium ${scoreColor} -mt-1`}>{scoreLabel}</div>
          </div>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2">
        {errors.length > 0 && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1 text-xs px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full animate-pulse"
          >
            <X className="w-3 h-3" /> {errors.length} error{errors.length > 1 ? "s" : ""}
          </motion.span>
        )}
        {warnings.length > 0 && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-1 text-xs px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full"
          >
            <AlertTriangle className="w-3 h-3" /> {warnings.length} warning{warnings.length > 1 ? "s" : ""}
          </motion.span>
        )}
        {suggestions.length > 0 && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-1 text-xs px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full"
          >
            <Lightbulb className="w-3 h-3" /> {suggestions.length} tip{suggestions.length > 1 ? "s" : ""}
          </motion.span>
        )}
        {issues.length === 0 && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1 text-xs px-2.5 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full"
          >
            <CheckCircle className="w-3 h-3" /> All good!
          </motion.span>
        )}
      </div>

      {/* Expandable sections */}
      {errors.length > 0 && (
        <div>
          <button
            onClick={() => setExpandedSections(s => ({ ...s, errors: !s.errors }))}
            className="w-full flex items-center justify-between text-sm font-medium text-red-400 mb-2"
          >
            <span>Errors ({errors.length})</span>
            {expandedSections.errors ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <AnimatePresence>
            {expandedSections.errors && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2 overflow-hidden"
              >
                {errors.map((issue, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-3 rounded-xl border bg-red-500/5 border-red-500/20 text-xs space-y-1"
                  >
                    <div className="flex items-center gap-1.5">
                      <X className="w-3.5 h-3.5 text-red-400 flex-shrink-0 animate-pulse" />
                      <span className="font-semibold text-red-300">{issue.field}</span>
                      <span className="text-muted-foreground">— {issue.message}</span>
                    </div>
                    {issue.fix && (
                      <p className="text-muted-foreground pl-5 leading-relaxed">💡 {issue.fix}</p>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {warnings.length > 0 && (
        <div>
          <button
            onClick={() => setExpandedSections(s => ({ ...s, warnings: !s.warnings }))}
            className="w-full flex items-center justify-between text-sm font-medium text-amber-400 mb-2"
          >
            <span>Warnings ({warnings.length})</span>
            {expandedSections.warnings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <AnimatePresence>
            {expandedSections.warnings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2 overflow-hidden"
              >
                {warnings.map((issue, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-3 rounded-xl border bg-amber-500/5 border-amber-500/20 text-xs space-y-1"
                  >
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <span className="font-semibold text-amber-300">{issue.field}</span>
                      <span className="text-muted-foreground">— {issue.message}</span>
                    </div>
                    {issue.fix && (
                      <p className="text-muted-foreground pl-5 leading-relaxed">💡 {issue.fix}</p>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {suggestions.length > 0 && (
        <div>
          <button
            onClick={() => setExpandedSections(s => ({ ...s, suggestions: !s.suggestions }))}
            className="w-full flex items-center justify-between text-sm font-medium text-blue-400 mb-2"
          >
            <span>Tips ({suggestions.length})</span>
            {expandedSections.suggestions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <AnimatePresence>
            {expandedSections.suggestions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2 overflow-hidden"
              >
                {suggestions.map((issue, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-3 rounded-xl border bg-blue-500/5 border-blue-500/20 text-xs space-y-1"
                  >
                    <div className="flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      <span className="font-semibold text-blue-300">{issue.field}</span>
                      <span className="text-muted-foreground">— {issue.message}</span>
                    </div>
                    {issue.fix && (
                      <p className="text-muted-foreground pl-5 leading-relaxed">💡 {issue.fix}</p>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {score === 100 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl"
        >
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-xs text-green-300 font-medium">Perfect brief! Ready to attract top creators.</span>
        </motion.div>
      )}
    </div>
  );
}
