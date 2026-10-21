"use client";

import { useState, useRef } from "react";
import { Upload, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";
import InspectionResults from "./InspectionResults";

interface DeliveryUploadProps {
  agreementId: string;
  onUploadComplete: () => void;
}

const ALLOWED_EXTENSIONS = [".mp4", ".mov", ".webm", ".jpg", ".png", ".webp"];
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export default function DeliveryUpload({
  agreementId,
  onUploadComplete,
}: DeliveryUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [inspecting, setInspecting] = useState(false);
  const [uploadedDelivery, setUploadedDelivery] = useState<any | null>(null);
  const [showResults, setShowResults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const validateFile = (selectedFile: File): string | null => {
    // Check file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      return `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    }

    // Check extension
    const extension = selectedFile.name
      .toLowerCase()
      .substring(selectedFile.name.lastIndexOf("."));
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return `File type not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(
        ", "
      )}`;
    }

    return null;
  };

  const handleFileSelect = (selectedFile: File) => {
    const error = validateFile(selectedFile);
    if (error) {
      toast.error(error);
      return;
    }

    setFile(selectedFile);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);
      setProgress(0);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("agreementId", agreementId);

      const response = await fetch("/api/deliveries", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setUploading(false);
      setInspecting(true);

      // Inspection happens server-side, results are in the response
      setTimeout(() => {
        setInspecting(false);
        setUploadedDelivery(data.delivery);
        setShowResults(true);
        toast.success("Upload complete");
      }, 1000);
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message);
      setUploading(false);
      setInspecting(false);
      setProgress(0);
    }
  };

  const handleCloseResults = () => {
    setShowResults(false);
    setFile(null);
    setUploadedDelivery(null);
    setProgress(0);
    onUploadComplete();
  };

  const getFilePreview = () => {
    if (!file) return null;

    const extension = file.name
      .toLowerCase()
      .substring(file.name.lastIndexOf("."));
    const isImage = [".jpg", ".png", ".webp"].includes(extension);

    if (isImage) {
      return (
        <img
          src={URL.createObjectURL(file)}
          alt="Preview"
          className="w-full h-32 object-cover rounded-lg"
        />
      );
    }

    return (
      <div className="w-full h-32 bg-gray-100 dark:bg-white/5 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {file.name}
          </p>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Upload Delivery
        </h3>

        {!file ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
              focus:outline-none focus:ring-2 focus:ring-purple-500
              ${
                dragActive
                  ? "border-purple-500 bg-purple-50 dark:bg-purple-500/10"
                  : "border-gray-300 dark:border-white/20 hover:border-purple-400 dark:hover:border-purple-500"
              }
            `}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-900 dark:text-white font-medium mb-2">
              Drop your file here, or click to browse
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Supported: MP4, MOV, WEBM, JPG, PNG, WEBP (max 500MB)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_EXTENSIONS.join(",")}
              onChange={(e) =>
                e.target.files?.[0] && handleFileSelect(e.target.files[0])
              }
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-4">
            {getFilePreview()}

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              {!uploading && !inspecting && (
                <button
                  onClick={() => setFile(null)}
                  className="ml-3 p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              )}
            </div>

            {(uploading || inspecting) && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {inspecting ? "Inspecting..." : "Uploading..."}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {progress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {!uploading && !inspecting && (
              <button
                onClick={handleUpload}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-lg"
              >
                <Upload className="w-4 h-4" />
                Upload Delivery
              </button>
            )}
          </div>
        )}
      </div>

      {/* Inspection Results Modal */}
      <Dialog.Root open={showResults} onOpenChange={setShowResults}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-[#0F0F1A] rounded-2xl border border-gray-200 dark:border-white/10 p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto z-50 focus:outline-none">
            <div className="flex items-start justify-between mb-4">
              <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white">
                Inspection Results
              </Dialog.Title>
              <Dialog.Close className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors">
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </Dialog.Close>
            </div>

            {uploadedDelivery && (
              <InspectionResults
                inspectionStatus={uploadedDelivery.inspection_status}
                inspectionResults={uploadedDelivery.inspection_results}
              />
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleCloseResults}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                Close
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
