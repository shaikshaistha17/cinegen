"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, CheckCircle2, Circle, Lightbulb, Compass, UserCheck, FileCheck, Award } from "lucide-react";
import StageIdea from "@/components/decision-room/StageIdea";
import StageDirections from "@/components/decision-room/StageDirections";
import StageEvidence from "@/components/decision-room/StageEvidence";
import StageReview from "@/components/decision-room/StageReview";
import StagePassport from "@/components/decision-room/StagePassport";
import type { DecisionRoom, CreativeDirection } from "@/types";

interface DecisionRoomClientProps {
  roomId: string;
}

const stages = [
  { key: 'idea', label: 'Idea', icon: Lightbulb },
  { key: 'directions', label: 'Creative Directions', icon: Compass },
  { key: 'evidence', label: 'Creator Evidence', icon: UserCheck },
  { key: 'review', label: 'Delivery Review', icon: FileCheck },
  { key: 'passport', label: 'Passport', icon: Award }
] as const;

export default function DecisionRoomClient({ roomId }: DecisionRoomClientProps) {
  const [room, setRoom] = useState<DecisionRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedStage, setExpandedStage] = useState<string>('idea');
  
  useEffect(() => {
    fetchRoom();
  }, [roomId]);
  
  const fetchRoom = async () => {
    try {
      const res = await fetch(`/api/decision-room/${roomId}`);
      if (!res.ok) throw new Error('Failed to fetch room');
      
      const data = await res.json();
      setRoom(data.room);
      
      // Expand first incomplete stage
      const firstIncomplete = stages.find(s => !data.room.stage_progress[s.key]);
      if (firstIncomplete) {
        setExpandedStage(firstIncomplete.key);
      }
    } catch (err) {
      console.error('Failed to fetch room:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const updateRoom = async (updates: Partial<DecisionRoom>) => {
    try {
      const res = await fetch(`/api/decision-room/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!res.ok) throw new Error('Failed to update room');
      
      const data = await res.json();
      setRoom(data.room);
    } catch (err) {
      console.error('Failed to update room:', err);
      throw err;
    }
  };
  
  const handleSaveIdea = async (idea: string, requirements: Record<string, any>) => {
    await updateRoom({
      idea_text: idea,
      requirements,
      stage_progress: {
        ...room!.stage_progress,
        idea: true
      }
    });
  };
  
  const handleSelectDirection = async (direction: CreativeDirection) => {
    await updateRoom({
      selected_direction: direction,
      stage_progress: {
        ...room!.stage_progress,
        directions: true
      }
    });
  };
  
  const handleSelectCreator = async (creatorId: string) => {
    await updateRoom({
      selected_creator_id: creatorId,
      stage_progress: {
        ...room!.stage_progress,
        evidence: true
      }
    });
  };
  
  const toggleStage = (stageKey: string) => {
    setExpandedStage(expandedStage === stageKey ? '' : stageKey);
  };
  
  const isStageComplete = (stageKey: string) => {
    return room?.stage_progress[stageKey as keyof typeof room.stage_progress] || false;
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-gray-900 to-black flex items-center justify-center">
        <div className="text-gray-400">Loading Decision Room...</div>
      </div>
    );
  }
  
  if (!room) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-gray-900 to-black flex items-center justify-center">
        <div className="text-red-400">Failed to load Decision Room</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-gray-900 to-black">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="text-4xl font-bold text-white">
            Director's <span className="gradient-primary">Decision Room</span>
          </h1>
          <p className="text-gray-400">
            Clarify your idea, compare creative approaches, and choose the right creator
          </p>
        </motion.div>
        
        {/* Stages */}
        <div className="space-y-4">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            const isComplete = isStageComplete(stage.key);
            const isExpanded = expandedStage === stage.key;
            const isAccessible = index === 0 || isStageComplete(stages[index - 1].key);
            
            return (
              <motion.div
                key={stage.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white/5 border rounded-xl overflow-hidden transition-all ${
                  isComplete ? 'border-green-500/30' : 'border-white/10'
                } ${!isAccessible ? 'opacity-50' : ''}`}
              >
                {/* Stage Header */}
                <button
                  onClick={() => isAccessible && toggleStage(stage.key)}
                  disabled={!isAccessible}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors disabled:cursor-not-allowed"
                  aria-expanded={isExpanded}
                  aria-controls={`stage-${stage.key}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      isComplete ? 'bg-green-500/20' : 'bg-white/10'
                    }`}>
                      {isComplete ? (
                        <CheckCircle2 className="w-6 h-6 text-green-400" />
                      ) : (
                        <Icon className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-white">{stage.label}</h3>
                      <p className="text-sm text-gray-400">
                        {isComplete ? 'Complete' : isAccessible ? 'In progress' : 'Locked'}
                      </p>
                    </div>
                  </div>
                  
                  {isAccessible && (
                    isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )
                  )}
                </button>
                
                {/* Stage Content */}
                <AnimatePresence>
                  {isExpanded && isAccessible && (
                    <motion.div
                      id={`stage-${stage.key}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-white/10"
                    >
                      <div className="p-6">
                        {stage.key === 'idea' && (
                          <StageIdea
                            roomId={roomId}
                            initialIdea={room.idea_text || ''}
                            initialRequirements={room.requirements}
                            onSave={handleSaveIdea}
                          />
                        )}
                        
                        {stage.key === 'directions' && (
                          <StageDirections
                            roomId={roomId}
                            selectedDirection={room.selected_direction}
                            onSelect={handleSelectDirection}
                          />
                        )}
                        
                        {stage.key === 'evidence' && (
                          <StageEvidence
                            roomId={roomId}
                            selectedCreatorId={room.selected_creator_id}
                            onSelectCreator={handleSelectCreator}
                          />
                        )}
                        
                        {stage.key === 'review' && (
                          <StageReview roomId={roomId} />
                        )}
                        
                        {stage.key === 'passport' && (
                          <StagePassport roomId={roomId} />
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
