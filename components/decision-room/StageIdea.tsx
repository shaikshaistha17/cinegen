"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, XCircle, Save, Loader2 } from "lucide-react";
import type { RequirementStatus } from "@/types";

interface StageIdeaProps {
  roomId: string;
  initialIdea?: string;
  initialRequirements?: Record<string, any>;
  onSave: (idea: string, requirements: Record<string, any>) => Promise<void>;
}

export default function StageIdea({ roomId, initialIdea = '', initialRequirements = {}, onSave }: StageIdeaProps) {
  const [ideaText, setIdeaText] = useState(initialIdea);
  const [requirements, setRequirements] = useState<Record<string, any>>(initialRequirements);
  const [saving, setSaving] = useState(false);
  const [issues, setIssues] = useState<Array<{ what: string; why: string; fix: string }>>([]);
  
  // Analyze requirements and identify issues
  useEffect(() => {
    const foundIssues: Array<{ what: string; why: string; fix: string }> = [];
    
    if (!requirements.deliverables || requirements.deliverables.length === 0) {
      foundIssues.push({
        what: 'Missing deliverable quantity',
        why: 'Creator needs to know how many videos/images to produce',
        fix: 'Specify the number and type of deliverables (e.g., "2 videos, 5 images")'
      });
    }
    
    if (!requirements.deadline) {
      foundIssues.push({
        what: 'Missing deadline',
        why: 'Timeline affects creator availability and project planning',
        fix: 'Add a target completion date'
      });
    }
    
    if (!requirements.budget || requirements.budget <= 0) {
      foundIssues.push({
        what: 'Missing budget',
        why: 'Budget determines scope and creator matching',
        fix: 'Specify your budget range in INR'
      });
    }
    
    if (requirements.aspectRatio && requirements.resolution) {
      // Check for contradictory aspect ratio and resolution
      const resolution = requirements.resolution?.toLowerCase() || '';
      const aspectRatio = requirements.aspectRatio?.toLowerCase() || '';
      
      if (resolution.includes('1920x1080') && aspectRatio.includes('9:16')) {
        foundIssues.push({
          what: 'Contradictory dimensions',
          why: '1920x1080 is 16:9, but you specified 9:16 aspect ratio',
          fix: 'Use 1080x1920 for vertical 9:16 video'
        });
      }
    }
    
    // Check for ambiguous phrases
    const ambiguousPhrases = ['viral', 'premium', 'professional', 'high-quality'];
    const ideaLower = ideaText.toLowerCase();
    const foundAmbiguous = ambiguousPhrases.filter(phrase => ideaLower.includes(phrase));
    
    if (foundAmbiguous.length > 0) {
      foundIssues.push({
        what: `Ambiguous terms: ${foundAmbiguous.join(', ')}`,
        why: 'These terms mean different things to different people',
        fix: 'Describe specific visual style, production values, or reference examples'
      });
    }
    
    setIssues(foundIssues);
  }, [requirements, ideaText]);
  
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(ideaText, requirements);
    } finally {
      setSaving(false);
    }
  };
  
  const updateRequirement = (field: string, value: any) => {
    setRequirements(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const requirementFields = [
    { key: 'product', label: 'Product/Subject', type: 'text' },
    { key: 'goal', label: 'Goal & Audience', type: 'text' },
    { key: 'deliverables', label: 'Deliverables', type: 'text', placeholder: 'e.g., 2 videos, 5 images' },
    { key: 'duration', label: 'Duration (seconds)', type: 'number' },
    { key: 'aspectRatio', label: 'Aspect Ratio', type: 'select', options: ['16:9', '9:16', '1:1', '4:5', '2.39:1'] },
    { key: 'platform', label: 'Platform', type: 'text', placeholder: 'e.g., Instagram, YouTube' },
    { key: 'style', label: 'Style', type: 'text', placeholder: 'e.g., cinematic, minimal, energetic' },
    { key: 'budget', label: 'Budget (INR)', type: 'number' },
    { key: 'deadline', label: 'Deadline', type: 'date' },
    { key: 'tools', label: 'Preferred Tools', type: 'text', placeholder: 'e.g., Runway, Midjourney' },
    { key: 'revisions', label: 'Revisions Expected', type: 'number' }
  ];
  
  const getRequirementStatus = (field: string): 'confirmed' | 'suggested' | 'missing' => {
    if (!requirements[field]) return 'missing';
    if (requirements[`${field}_confirmed`]) return 'confirmed';
    return 'suggested';
  };
  
  return (
    <div className="space-y-6">
      {/* Idea Input */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Your Idea
        </label>
        <textarea
          value={ideaText}
          onChange={(e) => setIdeaText(e.target.value)}
          placeholder="Describe your video idea... (or use voice input below)"
          rows={4}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
        />
      </div>
      
      {/* Requirements Grid */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Requirements</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requirementFields.map(field => {
            const status = getRequirementStatus(field.key);
            
            return (
              <div key={field.key} className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                  {field.label}
                  {status === 'confirmed' && (
                    <span title="User confirmed">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    </span>
                  )}
                  {status === 'suggested' && (
                    <span title="AI suggested">
                      <AlertCircle className="w-4 h-4 text-yellow-400" />
                    </span>
                  )}
                  {status === 'missing' && (
                    <span title="Missing">
                      <XCircle className="w-4 h-4 text-red-400" />
                    </span>
                  )}
                </label>
                
                {field.type === 'select' ? (
                  <select
                    value={requirements[field.key] || ''}
                    onChange={(e) => updateRequirement(field.key, e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">Select...</option>
                    {field.options?.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    value={requirements[field.key] || ''}
                    onChange={(e) => updateRequirement(field.key, field.type === 'number' ? parseFloat(e.target.value) || '' : e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Issues */}
      {issues.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <h3 className="text-lg font-semibold text-white">Issues to Address</h3>
          {issues.map((issue, idx) => (
            <div key={idx} className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg space-y-2">
              <div className="font-medium text-yellow-300">{issue.what}</div>
              <div className="text-sm text-gray-400">
                <strong>Why:</strong> {issue.why}
              </div>
              <div className="text-sm text-gray-300">
                <strong>Fix:</strong> {issue.fix}
              </div>
            </div>
          ))}
        </motion.div>
      )}
      
      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg font-semibold hover:from-violet-500 hover:to-violet-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            Save Idea & Requirements
          </>
        )}
      </button>
    </div>
  );
}
