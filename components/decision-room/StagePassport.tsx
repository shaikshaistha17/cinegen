"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Calendar, DollarSign, CheckCircle2, Shield, AlertCircle, Loader2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface PassportData {
  agreement: {
    id: string;
    status: string;
    deliverables: any;
    price: number;
    created_at: string;
  };
  brief: {
    campaign_title: string;
    objective: string;
    content_type: string;
  };
  delivery: {
    file_name: string;
    created_at: string;
    brand_approved_at: string;
  };
  creator: {
    name: string;
    handle: string;
  };
  room: {
    selected_direction: any;
    requirements: any;
  };
}

interface StagePassportProps {
  roomId: string;
}

export default function StagePassport({ roomId }: StagePassportProps) {
  const [passportData, setPassportData] = useState<PassportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchPassportData();
  }, [roomId]);
  
  const fetchPassportData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch decision room
      const roomRes = await fetch(`/api/decision-room/${roomId}`);
      if (!roomRes.ok) throw new Error('Failed to fetch decision room');
      const roomData = await roomRes.json();
      const room = roomData.room;
      
      // Check delivery status
      const statusRes = await fetch(`/api/decision-room/${roomId}/delivery-status`);
      if (!statusRes.ok) throw new Error('Failed to fetch delivery status');
      const statusData = await statusRes.json();
      
      if (statusData.status !== 'delivery_found' || !statusData.delivery?.brand_approved_at) {
        setError('Project not completed yet. Approve the delivery to view the passport.');
        setLoading(false);
        return;
      }
      
      // Fetch creator info
      const creatorRes = await fetch(`/api/creators/${statusData.agreement.creator_id}`);
      const creatorData = creatorRes.ok ? await creatorRes.json() : null;
      
      // Fetch brief info
      const briefRes = await fetch(`/api/briefs/${room.linked_brief_id}`);
      const briefData = briefRes.ok ? await briefRes.json() : null;
      
      setPassportData({
        agreement: statusData.agreement,
        brief: briefData?.brief || {},
        delivery: statusData.delivery,
        creator: creatorData?.creator || { name: 'Unknown', handle: 'unknown' },
        room: {
          selected_direction: room.selected_direction,
          requirements: room.requirements
        }
      });
    } catch (err: any) {
      console.error('Failed to fetch passport data:', err);
      setError(err.message || 'Failed to load passport');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
        <p className="text-gray-400">Loading production passport...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto" />
        <p className="text-gray-400">{error}</p>
      </div>
    );
  }
  
  if (!passportData) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-gray-500 mx-auto" />
        <p className="text-gray-400">No passport data available</p>
      </div>
    );
  }
  
  const { agreement, brief, delivery, creator, room } = passportData;
  
  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <p className="text-sm text-yellow-300">
          <strong>Project Record</strong> — This is not a legal certificate or proof of ownership/licensing. 
          It summarizes project details for reference only.
        </p>
      </div>
      
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-white/10 rounded-xl space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Production Passport</h2>
            <p className="text-sm text-gray-300">Project completed successfully</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
          <div>
            <div className="text-xs text-gray-400 mb-1">Project</div>
            <div className="font-semibold text-white">{brief.campaign_title || 'Untitled'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Creator</div>
            <div className="font-semibold text-white">@{creator.handle}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Completed</div>
            <div className="font-semibold text-white">{formatDate(delivery.brand_approved_at)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Budget</div>
            <div className="font-semibold text-white">{formatCurrency(agreement.price)}</div>
          </div>
        </div>
      </motion.div>
      
      {/* Project Info */}
      <div className="p-6 bg-white/5 border border-white/10 rounded-xl space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Project Information
        </h3>
        
        <div className="space-y-3 text-sm">
          <div>
            <div className="text-gray-400 mb-1">Objective</div>
            <div className="text-white">{brief.objective || 'Not specified'}</div>
          </div>
          <div>
            <div className="text-gray-400 mb-1">Content Type</div>
            <div className="text-white">{brief.content_type || 'Not specified'}</div>
          </div>
        </div>
      </div>
      
      {/* Creative Direction */}
      {room.selected_direction && (
        <div className="p-6 bg-white/5 border border-white/10 rounded-xl space-y-4">
          <h3 className="text-lg font-semibold text-white">Creative Direction</h3>
          
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-gray-400 mb-1">Approach</div>
              <div className="text-white font-medium">{room.selected_direction.title}</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Concept</div>
              <div className="text-white">{room.selected_direction.concept}</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Scope */}
      <div className="p-6 bg-white/5 border border-white/10 rounded-xl space-y-4">
        <h3 className="text-lg font-semibold text-white">Scope</h3>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-400 mb-1">Deliverables</div>
            <div className="text-white">{agreement.deliverables?.quantity || 'Not specified'}</div>
          </div>
          <div>
            <div className="text-gray-400 mb-1">Aspect Ratio</div>
            <div className="text-white">{agreement.deliverables?.aspectRatios?.join(', ') || 'Not specified'}</div>
          </div>
        </div>
      </div>
      
      {/* Delivery */}
      <div className="p-6 bg-white/5 border border-white/10 rounded-xl space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          Delivery
        </h3>
        
        <div className="space-y-3 text-sm">
          <div>
            <div className="text-gray-400 mb-1">File Name</div>
            <div className="text-white font-mono">{delivery.file_name}</div>
          </div>
          <div>
            <div className="text-gray-400 mb-1">Approved On</div>
            <div className="text-white">{formatDate(delivery.brand_approved_at)}</div>
          </div>
        </div>
      </div>
      
      {/* Timeline */}
      <div className="p-6 bg-white/5 border border-white/10 rounded-xl space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Timeline
        </h3>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Agreement Created</span>
            <span className="text-white">{formatDate(agreement.created_at)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Delivery Submitted</span>
            <span className="text-white">{formatDate(delivery.created_at)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Delivery Approved</span>
            <span className="text-white">{formatDate(delivery.brand_approved_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
