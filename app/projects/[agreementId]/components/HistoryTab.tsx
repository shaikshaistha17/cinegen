"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import ProductionPassport from "@/components/project/ProductionPassport";
import { ProductionPassport as PassportType } from "@/types";

interface HistoryTabProps {
  agreementId: string;
}

export default function HistoryTab({ agreementId }: HistoryTabProps) {
  const [passportData, setPassportData] = useState<PassportType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPassportData();
  }, [agreementId]);

  const fetchPassportData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/passport/${agreementId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch production passport");
      }

      setPassportData(data);
    } catch (err: any) {
      console.error("Error fetching passport data:", err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Loading production passport...
        </p>
      </div>
    );
  }

  if (error || !passportData) {
    return (
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-12 text-center">
        <p className="text-red-500 mb-4">
          {error || "Failed to load production passport"}
        </p>
        <button
          onClick={fetchPassportData}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          Retry
        </button>
      </div>
    );
  }

  return <ProductionPassport passportData={passportData} />;
}
