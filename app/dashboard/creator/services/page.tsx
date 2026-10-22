"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, X, Loader2 } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { useServices } from "@/hooks/useServices";
import { PriceRange } from "@/types";
import { toast } from "sonner";
import * as Switch from "@radix-ui/react-switch";

const SKILLS_OPTIONS = [
  "Video Editing",
  "Motion Graphics",
  "Color Grading",
  "Sound Design",
  "Scriptwriting",
  "Storyboarding",
  "3D Animation",
  "VFX",
  "AI Art Generation",
  "Video Production",
];

const PRICE_RANGES: PriceRange[] = [
  "₹50k-₹1L",
  "₹1L-₹2.5L",
  "₹2.5L-₹4L",
  "₹4L-₹8L",
  "₹8L+",
];

const DELIVERY_TIMES = ["1-2 days", "3-5 days", "1 week", "2 weeks", "Custom"];

interface ServiceFormData {
  title: string;
  description: string;
  skills: string[];
  priceRange: PriceRange | "";
  deliveryTime: string;
  portfolioItems: { url: string; title: string }[];
}

const EMPTY_FORM: ServiceFormData = {
  title: "",
  description: "",
  skills: [],
  priceRange: "",
  deliveryTime: "",
  portfolioItems: [],
};

function ServiceForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  initialData?: ServiceFormData;
  onSubmit: (data: ServiceFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState<ServiceFormData>(
    initialData || EMPTY_FORM
  );
  const [errors, setErrors] = useState<Partial<Record<keyof ServiceFormData, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ServiceFormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (formData.title.length > 100) {
      newErrors.title = "Title must be 100 characters or less";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.length > 500) {
      newErrors.description = "Description must be 500 characters or less";
    }

    if (formData.skills.length === 0) {
      newErrors.skills = "At least one skill is required";
    }

    if (!formData.priceRange) {
      newErrors.priceRange = "Price range is required";
    }

    if (!formData.deliveryTime) {
      newErrors.deliveryTime = "Delivery time is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      await onSubmit(formData);
    }
  };

  const toggleSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const addPortfolioItem = () => {
    if (formData.portfolioItems.length < 3) {
      setFormData((prev) => ({
        ...prev,
        portfolioItems: [...prev.portfolioItems, { url: "", title: "" }],
      }));
    }
  };

  const updatePortfolioItem = (index: number, field: "url" | "title", value: string) => {
    setFormData((prev) => ({
      ...prev,
      portfolioItems: prev.portfolioItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const removePortfolioItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      portfolioItems: prev.portfolioItems.filter((_, i) => i !== index),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Service Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          maxLength={100}
          placeholder="e.g., AI-powered 30-second product video"
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
        />
        <div className="flex justify-between mt-1">
          {errors.title && <p className="text-xs text-red-400">{errors.title}</p>}
          <p className="text-xs text-muted-foreground ml-auto">{formData.title.length}/100</p>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Description <span className="text-red-400">*</span>
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          maxLength={500}
          rows={4}
          placeholder="Describe what you offer, your process, and what clients can expect..."
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all resize-none"
        />
        <div className="flex justify-between mt-1">
          {errors.description && <p className="text-xs text-red-400">{errors.description}</p>}
          <p className="text-xs text-muted-foreground ml-auto">{formData.description.length}/500</p>
        </div>
      </div>

      {/* Skills */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Skills <span className="text-red-400">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {SKILLS_OPTIONS.map((skill) => (
            <button
              key={skill}
              type="button"
              onClick={() => toggleSkill(skill)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                formData.skills.includes(skill)
                  ? "bg-violet-500/20 text-violet-300 border-violet-500/40"
                  : "bg-white/5 text-muted-foreground border-white/10 hover:border-white/20"
              }`}
            >
              {skill}
            </button>
          ))}
        </div>
        {errors.skills && <p className="text-xs text-red-400 mt-1">{errors.skills}</p>}
      </div>

      {/* Price Range and Delivery Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Price Range <span className="text-red-400">*</span>
          </label>
          <select
            value={formData.priceRange}
            onChange={(e) =>
              setFormData({ ...formData, priceRange: e.target.value as PriceRange })
            }
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
          >
            <option value="">Select price range</option>
            {PRICE_RANGES.map((range) => (
              <option key={range} value={range}>
                {range}
              </option>
            ))}
          </select>
          {errors.priceRange && <p className="text-xs text-red-400 mt-1">{errors.priceRange}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Delivery Time <span className="text-red-400">*</span>
          </label>
          <select
            value={formData.deliveryTime}
            onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
          >
            <option value="">Select delivery time</option>
            {DELIVERY_TIMES.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
          {errors.deliveryTime && <p className="text-xs text-red-400 mt-1">{errors.deliveryTime}</p>}
        </div>
      </div>

      {/* Portfolio Items (optional) */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Portfolio Items <span className="text-muted-foreground text-xs">(Optional, up to 3)</span>
        </label>
        <div className="space-y-2">
          {formData.portfolioItems.map((item, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={item.title}
                onChange={(e) => updatePortfolioItem(index, "title", e.target.value)}
                placeholder="Title"
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
              />
              <input
                type="url"
                value={item.url}
                onChange={(e) => updatePortfolioItem(index, "url", e.target.value)}
                placeholder="URL"
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
              />
              <button
                type="button"
                onClick={() => removePortfolioItem(index)}
                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          {formData.portfolioItems.length < 3 && (
            <button
              type="button"
              onClick={addPortfolioItem}
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              + Add Portfolio Item
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-xl text-sm font-semibold hover:from-violet-500 hover:to-violet-400 transition-all shadow-lg shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Service"
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2.5 glass border border-white/10 text-sm font-medium rounded-xl hover:bg-white/5 transition-all disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ServiceCard({
  service,
  index,
  onEdit,
  onDelete,
  onToggle,
}: {
  service: any;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -4, scale: 1.01 }}
      className="glass-card rounded-xl border border-white/5 hover:border-violet-500/20 transition-all p-5 relative overflow-hidden group"
    >
      {/* Gradient background on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative">
        {/* Header with title and active toggle */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base mb-1 truncate">{service.title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {service.description}
            </p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-2">
            <Switch.Root
              checked={service.isActive}
              onCheckedChange={onToggle}
              className="w-11 h-6 bg-white/10 rounded-full relative border border-white/10 data-[state=checked]:bg-violet-500 transition-colors"
            >
              <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
            </Switch.Root>
          </div>
        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {service.skills.map((skill: string) => (
            <span
              key={skill}
              className="text-xs px-2 py-1 bg-violet-500/20 text-violet-300 rounded-full border border-violet-500/30"
            >
              {skill}
            </span>
          ))}
        </div>

        {/* Price and Delivery */}
        <div className="flex items-center gap-3 mb-4 text-sm">
          <span className="px-2.5 py-1 bg-green-500/20 text-green-300 rounded-lg font-semibold border border-green-500/30">
            {service.priceRange}
          </span>
          <span className="text-muted-foreground flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-muted-foreground" />
            {service.deliveryTime}
          </span>
        </div>

        {/* Active status badge */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              service.isActive
                ? "bg-green-500/20 text-green-300 border border-green-500/30"
                : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
            }`}
          >
            {service.isActive ? "● Active" : "○ Inactive"}
          </span>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="p-2 text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors"
              title="Edit service"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Delete service"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function ServicesPage() {
  const router = useRouter();
  const { session } = useSession();
  const [creatorId, setCreatorId] = useState<string | undefined>(undefined);
  const { services, loading, createService, updateService, deleteService, toggleActive } =
    useServices(creatorId);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Check authentication
    if (!session) {
      router.push("/login");
      return;
    }

    // Check if user is creator
    if (session.role !== "creator") {
      toast.error("Only creators can access this page");
      router.push("/dashboard");
      return;
    }

    // Fetch creator profile ID from Supabase
    const fetchCreatorId = async () => {
      try {
        const { createClient } = await import("@/lib/supabase");
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data, error } = await supabase
            .from("creator_profiles")
            .select("id")
            .eq("user_id", user.id)
            .single();

          if (data && !error) {
            setCreatorId(data.id);
          }
        }
      } catch (error) {
        console.error("Error fetching creator profile:", error);
      }
    };

    fetchCreatorId();
  }, [session, router]);

  const handleCreateService = async (data: ServiceFormData) => {
    setIsSubmitting(true);
    try {
      await createService({
        title: data.title,
        description: data.description,
        skills: data.skills,
        priceRange: data.priceRange as PriceRange,
        deliveryTime: data.deliveryTime,
        portfolioItems: data.portfolioItems.filter((item) => item.url && item.title),
      });
      toast.success("Service created successfully!");
      setShowForm(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to create service");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateService = async (data: ServiceFormData) => {
    if (!editingService) return;

    setIsSubmitting(true);
    try {
      await updateService(editingService.id, {
        title: data.title,
        description: data.description,
        skills: data.skills,
        priceRange: data.priceRange as PriceRange,
        deliveryTime: data.deliveryTime,
        portfolioItems: data.portfolioItems.filter((item) => item.url && item.title),
      });
      toast.success("Service updated successfully!");
      setEditingService(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to update service");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;

    try {
      await deleteService(id);
      toast.success("Service deleted successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete service");
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await toggleActive(id);
      toast.success("Service status updated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update service status");
    }
  };

  if (!session || session.role !== "creator") {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-3xl mb-1">My Services</h1>
          <p className="text-muted-foreground">
            Manage your service offerings and attract more clients
          </p>
        </div>
        {!showForm && !editingService && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-xl text-sm font-semibold hover:from-violet-500 hover:to-violet-400 transition-all shadow-lg shadow-violet-500/25"
          >
            <Plus className="w-4 h-4" />
            Post New Service
          </motion.button>
        )}
      </div>

      {/* Service Form Modal */}
      <AnimatePresence>
        {(showForm || editingService) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass rounded-2xl border border-white/10 p-6 mb-8"
          >
            <h2 className="font-display font-semibold text-xl mb-5">
              {editingService ? "Edit Service" : "Post New Service"}
            </h2>
            <ServiceForm
              initialData={
                editingService
                  ? {
                      title: editingService.title,
                      description: editingService.description,
                      skills: editingService.skills,
                      priceRange: editingService.priceRange,
                      deliveryTime: editingService.deliveryTime,
                      portfolioItems: editingService.portfolioItems || [],
                    }
                  : undefined
              }
              onSubmit={editingService ? handleUpdateService : handleCreateService}
              onCancel={() => {
                setShowForm(false);
                setEditingService(null);
              }}
              isSubmitting={isSubmitting}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Services Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        </div>
      ) : services.length === 0 ? (
        <div className="glass rounded-2xl border border-dashed border-white/10 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-violet-500/10 flex items-center justify-center">
            <Plus className="w-8 h-8 text-violet-400" />
          </div>
          <h3 className="font-semibold text-lg mb-2">No services yet</h3>
          <p className="text-muted-foreground text-sm mb-6">
            Create your first service offering to start attracting clients
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-xl text-sm font-semibold hover:from-violet-500 hover:to-violet-400 transition-all shadow-lg shadow-violet-500/25"
          >
            <Plus className="w-4 h-4" />
            Post Your First Service
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service, index) => (
            <ServiceCard
              key={service.id}
              service={service}
              index={index}
              onEdit={() => setEditingService(service)}
              onDelete={() => handleDeleteService(service.id)}
              onToggle={() => handleToggleActive(service.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
