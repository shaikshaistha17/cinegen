"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, AlertCircle, Send, Loader2, FileCheck } from "lucide-react";

interface DeliveryStatus {
  status: string;
  message?: string;
  agreement?: {
    id: string;
    status: string;
    creator_id: string;
    deliverables: any;
  };
  delivery?: {
    id: string;
    version: number;
    file_name: string;
    file_size_bytes: number;
    inspection_status: string;
    inspection_results: any;
    inspected_at: string;
    brand_approved_at: string | null;
    created_at: string;
  };
}

interface StageReviewProps {
  roomId: string;
}

export default function StageReview({ roomId }: StageReviewProps) {
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [revisionRequest, setRevisionRequest] = useState('');
  const [sendingRevision, setSendingRevision] = useState(false);
  const [approving, setApproving] = useState(false);
  const [waiveChecks, setWaiveChecks] = useState(false);
  
  useEffect(() => {
    fetchDeliveryStatus();
  }, [roomId]);
  
  const fetchDeliveryStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/decision-room/${roomId}/delivery-status`);
      if (!res.ok) {
        throw new Error('Failed to fetch delivery status');
      }
      
      const data = await res.json();
      setDeliveryStatus(data);
      
      // Generate draft revision request if inspection failed
      if (data.delivery?.inspection_status === 'fail') {
        generateRevisionDraft(data.delivery.inspection_results);
      }
    } catch (err) {
      console.error('Failed to fetch delivery status:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const generateRevisionDraft = (inspectionResults: any) => {
    const failedChecks = inspectionResults.checks?.filter((c: any) => !c.passed) || [];
    
    if (failedChecks.length > 0) {
      const draft = `Thank you for the delivery. I've reviewed the file and noticed the following issues:\n\n${
        failedChecks.map((check: any, idx: number) => 
          `${idx + 1}. ${check.requirement}: Expected ${check.expected}, but received ${check.actual}`
        ).join('\n')
      }\n\nCould you please revise the delivery to match the agreed specifications?\n\nThank you!`;
      
      setRevisionRequest(draft);
    }
  };
  
  const handleSendRevision = async () => {
    if (!deliveryStatus?.delivery || !revisionRequest.trim()) return;
    
    setSendingRevision(true);
    try {
      const res = await fetch(`/api/deliveries/${deliveryStatus.delivery.id}/request-revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: revisionRequest })
      });
      
      if (!res.ok) {
        throw new Error('Failed to send revision request');
      }
      
      alert('Revision request sent to creator');
      setRevisionRequest('');
    } catch (err) {
      console.error('Failed to send revision:', err);
      alert('Failed to send revision request');
    } finally {
      setSendingRevision(false);
    }
  };
  
  const handleApprove = async () => {
    if (!deliveryStatus?.delivery) return;
    
    // Confirm if checks failed
    if (deliveryStatus.delivery.inspection_status === 'fail' && !waiveChecks) {
      if (!confirm('This delivery failed inspection checks. Are you sure you want to approve it?')) {
        return;
      }
    }
    
    setApproving(true);
    try {
      const res = await fetch(`/api/deliveries/${deliveryStatus.delivery.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          approval_notes: 'Approved from Decision Room',
          waive_failed_checks: waiveChecks
        })
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to approve delivery');
      }
      
      alert('Delivery approved! Project completed.');
      fetchDeliveryStatus(); // Refresh
    } catch (err: any) {
      console.error('Failed to approve:', err);
      alert(err.message || 'Failed to approve delivery');
    } finally {
      setApproving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
        <p className="text-gray-400">Checking delivery status...</p>
      </div>
    );
  }
  
  if (!deliveryStatus) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-gray-500 mx-auto" />
        <p className="text-gray-400">Unable to check delivery status</p>
      </div>
    );
  }
  
  // No brief linked
  if (deliveryStatus.status === 'no_brief') {
    return (
      <div className="p-8 text-center space-y-4">
        <FileCheck className="w-12 h-12 text-gray-500 mx-auto" />
        <p className="text-gray-400">{deliveryStatus.message}</p>
        <p className="text-sm text-gray-500">Complete the previous stages and create a brief to continue.</p>
      </div>
    );
  }
  
  // No agreement
  if (deliveryStatus.status === 'no_agreement') {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-gray-500 mx-auto" />
        <p className="text-gray-400">{deliveryStatus.message}</p>
        <p className="text-sm text-gray-500">Use the existing proposal workflow to hire a creator.</p>
      </div>
    );
  }
  
  // No delivery yet
  if (deliveryStatus.status === 'no_delivery') {
    return (
      <div className="p-8 text-center space-y-4">
        <Loader2 className="w-12 h-12 text-violet-400 mx-auto" />
        <p className="text-gray-400">{deliveryStatus.message}</p>
        <p className="text-sm text-gray-500">Waiting for creator to submit their work.</p>
      </div>
    );
  }
  
  // Delivery found
  const { delivery, agreement } = deliveryStatus;
  if (!delivery) return null;
  
  const inspectionChecks = delivery.inspection_results?.checks || [];
  const passedChecks = inspectionChecks.filter((c: any) => c.passed);
  const failedChecks = inspectionChecks.filter((c: any) => !c.passed);
  
  return (
    <div className="space-y-6">
      {/* Delivery Info */}
      <div className="p-6 bg-white/5 border border-white/10 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Delivery v{delivery.version}</h3>
          <div className="text-sm text-gray-400">
            {new Date(delivery.created_at).toLocaleDateString()}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-400">File Name</div>
            <div className="text-white font-medium">{delivery.file_name}</div>
          </div>
          <div>
            <div className="text-gray-400">File Size</div>
            <div className="text-white font-medium">{(delivery.file_size_bytes / 1024 / 1024).toFixed(2)} MB</div>
          </div>
        </div>
        
        {delivery.brand_approved_at && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-green-300 font-medium">Approved on {new Date(delivery.brand_approved_at).toLocaleDateString()}</span>
          </div>
        )}
      </div>
      
      {/* Inspection Results */}
      {delivery.inspection_status !== 'unsupported' && (
        <div className="p-6 bg-white/5 border border-white/10 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Inspection Results</h3>
            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
              delivery.inspection_status === 'pass' ? 'bg-green-500/20 text-green-300' :
              delivery.inspection_status === 'fail' ? 'bg-red-500/20 text-red-300' :
              'bg-yellow-500/20 text-yellow-300'
            }`}>
              {delivery.inspection_status.toUpperCase()}
            </div>
          </div>
          
          {/* Checks Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 text-gray-400 font-medium">Requirement</th>
                  <th className="text-left py-2 text-gray-400 font-medium">Expected</th>
                  <th className="text-left py-2 text-gray-400 font-medium">Received</th>
                  <th className="text-center py-2 text-gray-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {inspectionChecks.map((check: any, idx: number) => (
                  <tr key={idx} className="border-b border-white/5">
                    <td className="py-3 text-white">{check.requirement}</td>
                    <td className="py-3 text-gray-300">{check.expected}</td>
                    <td className="py-3 text-gray-300">{check.actual}</td>
                    <td className="py-3 text-center">
                      {check.passed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {failedChecks.length > 0 && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-300 text-sm">
                {failedChecks.length} check(s) failed. Review the delivery or request revisions.
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Actions */}
      {!delivery.brand_approved_at && (
        <div className="space-y-4">
          {/* Revision Request */}
          <div className="p-6 bg-white/5 border border-white/10 rounded-xl space-y-4">
            <h3 className="text-lg font-semibold text-white">Request Revision</h3>
            <textarea
              value={revisionRequest}
              onChange={(e) => setRevisionRequest(e.target.value)}
              placeholder="Describe what needs to be changed..."
              rows={6}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
            <button
              onClick={handleSendRevision}
              disabled={sendingRevision || !revisionRequest.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {sendingRevision ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Revision Request
                </>
              )}
            </button>
          </div>
          
          {/* Approve */}
          <div className="p-6 bg-white/5 border border-white/10 rounded-xl space-y-4">
            <h3 className="text-lg font-semibold text-white">Approve Delivery</h3>
            
            {failedChecks.length > 0 && (
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={waiveChecks}
                  onChange={(e) => setWaiveChecks(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20"
                />
                I acknowledge the failed checks and approve anyway
              </label>
            )}
            
            <button
              onClick={handleApprove}
              disabled={approving || (failedChecks.length > 0 && !waiveChecks)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg font-semibold hover:from-green-500 hover:to-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {approving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Approve Delivery
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
