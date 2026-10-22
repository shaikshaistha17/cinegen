"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check, Edit2, Undo, Loader2 } from "lucide-react";
import type { CreativeDirection } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface StageDirectionsProps {
  roomId: string;
  selectedDirection?: CreativeDirection | null;
  onSelect: (direction: CreativeDirection) => Promise<void>;
}

export default function StageDirections({ roomId, selectedDirection, onSelect }: StageDirectionsProps) {
  const [directions, setDirections] = useState<CreativeDirection[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedDirection, setEditedDirection] = useState<CreativeDirection | null>(null);
  const [combineMode, setCombineMode] = useState(false);
  const [selectedForCombine, setSelectedForCombine] = useState<number[]>([]);
  
  // Generate directions on mount if not already generated
  useEffect(() => {
    if (directions.length === 0 && !loading) {
      handleGenerate();
    }
  }, []);
  
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/decision-room/${roomId}/directions`, {
        method: 'POST'
      });
      
      if (!res.ok) {
        throw new Error('Failed to generate directions');
      }
      
      const data = await res.json();
      setDirections(data.directions || []);
      setIsFallback(data.fallback || false);
    } catch (err) {
      console.error('Failed to generate directions:', err);
    } finally {
      setGenerating(false);
    }
  };
  
  const handleSelectDirection = async (direction: CreativeDirection) => {
    setLoading(true);
    try {
      await onSelect(direction);
    } finally {
      setLoading(false);
    }
  };
  
  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditedDirection({ ...directions[index] });
  };
  
  const cancelEdit = () => {
    setEditingIndex(null);
    setEditedDirection(null);
  };
  
  const saveEdit = () => {
    if (editingIndex !== null && editedDirection) {
      const updated = [...directions];
      updated[editingIndex] = editedDirection;
      setDirections(updated);
      setEditingIndex(null);
      setEditedDirection(null);
    }
  };
  
  const updateEditField = (field: keyof CreativeDirection, value: any) => {
    if (editedDirection) {
      setEditedDirection({ ...editedDirection, [field]: value });
    }
  };
  
  const toggleCombineSelection = (index: number) => {
    setSelectedForCombine(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };
  
  const combinSelected = () => {
    if (selectedForCombine.length < 2) return;
    
    const selected = selectedForCombine.map(i => directions[i]);
    const combined: CreativeDirection = {
      type: 'practical',
      title: 'Combined Approach',
      concept: selected.map(d => d.concept).join(' '),
      opening: selected[0].opening,
      main_moment: selected.map(d => d.main_moment).join(' → '),
      ending: selected[selected.length - 1].ending,
      deliverables: Array.from(new Set(selected.flatMap(d => d.deliverables))),
      required_assets: Array.from(new Set(selected.flatMap(d => d.required_assets))),
      required_skills: Array.from(new Set(selected.flatMap(d => d.required_skills))),
      assumptions: Array.from(new Set(selected.flatMap(d => d.assumptions))),
      questions: Array.from(new Set(selected.flatMap(d => d.questions)))
    };
    
    setDirections([...directions, combined]);
    setSelectedForCombine([]);
    setCombineMode(false);
  };
  
  const getDirectionColor = (type: string) => {
    switch (type) {
      case 'practical': return 'from-green-500/20 to-green-600/20 border-green-500/30';
      case 'ambitious': return 'from-orange-500/20 to-orange-600/20 border-orange-500/30';
      case 'experimental': return 'from-purple-500/20 to-purple-600/20 border-purple-500/30';
      default: return 'from-violet-500/20 to-violet-600/20 border-violet-500/30';
    }
  };
  
  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
        <p className="text-gray-400">Generating creative directions...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {isFallback && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-sm text-yellow-300">
            <strong>Preset concepts:</strong> AI generation unavailable. These are preset templates—customize them to fit your needs.
          </p>
        </div>
      )}
      
      {/* Combine Mode Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Creative Approaches</h3>
        <button
          onClick={() => setCombineMode(!combineMode)}
          className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
        >
          {combineMode ? 'Exit Combine Mode' : 'Combine Elements'}
        </button>
      </div>
      
      {combineMode && selectedForCombine.length >= 2 && (
        <button
          onClick={combinSelected}
          className="w-full px-4 py-3 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-500 transition-colors"
        >
          Combine {selectedForCombine.length} Selected Directions
        </button>
      )}
      
      {/* Directions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {directions.map((direction, index) => {
          const isEditing = editingIndex === index;
          const dir = isEditing ? editedDirection! : direction;
          const isSelected = selectedDirection?.title === direction.title;
          
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative p-6 bg-gradient-to-br ${getDirectionColor(dir.type)} border rounded-xl space-y-4 ${
                isSelected ? 'ring-2 ring-violet-500' : ''
              }`}
            >
              {combineMode && (
                <input
                  type="checkbox"
                  checked={selectedForCombine.includes(index)}
                  onChange={() => toggleCombineSelection(index)}
                  className="absolute top-4 right-4 w-5 h-5 rounded border-white/20"
                />
              )}
              
              {/* Type Badge */}
              <div className="inline-block px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-white uppercase">
                {dir.type}
              </div>
              
              {/* Title */}
              {isEditing ? (
                <input
                  type="text"
                  value={dir.title}
                  onChange={(e) => updateEditField('title', e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white font-bold text-xl"
                />
              ) : (
                <h4 className="text-xl font-bold text-white">{dir.title}</h4>
              )}
              
              {/* Concept */}
              {isEditing ? (
                <textarea
                  value={dir.concept}
                  onChange={(e) => updateEditField('concept', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-gray-300 text-sm resize-none"
                />
              ) : (
                <p className="text-gray-300 text-sm">{dir.concept}</p>
              )}
              
              {/* Structure */}
              <div className="space-y-2 text-sm">
                <div>
                  <strong className="text-gray-400">Opening:</strong>
                  <p className="text-gray-300">{dir.opening}</p>
                </div>
                <div>
                  <strong className="text-gray-400">Main Moment:</strong>
                  <p className="text-gray-300">{dir.main_moment}</p>
                </div>
                <div>
                  <strong className="text-gray-400">Ending:</strong>
                  <p className="text-gray-300">{dir.ending}</p>
                </div>
              </div>
              
              {/* Deliverables */}
              <div>
                <strong className="text-gray-400 text-sm">Deliverables:</strong>
                <ul className="mt-1 space-y-1">
                  {dir.deliverables.map((item, i) => (
                    <li key={i} className="text-gray-300 text-sm">• {item}</li>
                  ))}
                </ul>
              </div>
              
              {/* Required Assets & Skills */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <strong className="text-gray-400">Assets:</strong>
                  <ul className="mt-1 space-y-1">
                    {dir.required_assets.slice(0, 3).map((asset, i) => (
                      <li key={i} className="text-gray-300 text-xs">• {asset}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong className="text-gray-400">Skills:</strong>
                  <ul className="mt-1 space-y-1">
                    {dir.required_skills.slice(0, 3).map((skill, i) => (
                      <li key={i} className="text-gray-300 text-xs">• {skill}</li>
                    ))}
                  </ul>
                </div>
              </div>
              
              {/* Budget Allocation */}
              {dir.budget_allocation && (
                <div className="p-3 bg-white/5 rounded-lg space-y-2">
                  <div className="text-xs text-gray-400 italic">{dir.budget_allocation.disclaimer}</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-gray-400">Pre</div>
                      <div className="text-white font-semibold">{formatCurrency(dir.budget_allocation.pre)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Production</div>
                      <div className="text-white font-semibold">{formatCurrency(dir.budget_allocation.production)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Post</div>
                      <div className="text-white font-semibold">{formatCurrency(dir.budget_allocation.post)}</div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={saveEdit}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-500 transition-colors"
                    >
                      <Check className="w-4 h-4 inline mr-1" />
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleSelectDirection(direction)}
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg text-sm font-semibold hover:bg-white/20 disabled:opacity-50 transition-colors"
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-4 h-4 inline mr-1" />
                          Selected
                        </>
                      ) : (
                        'Select This'
                      )}
                    </button>
                    <button
                      onClick={() => startEdit(index)}
                      className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {/* Regenerate Button */}
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="w-full px-6 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        <Sparkles className="w-4 h-4" />
        {generating ? 'Generating...' : 'Generate New Directions'}
      </button>
    </div>
  );
}
