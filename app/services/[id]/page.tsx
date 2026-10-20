"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  DollarSign,
  User,
  Mail,
  Star,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { CreatorService } from "@/types";
import { toast } from "sonner";

export default function ServiceDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { session } = useSession();
  const [service, setService] = useState<CreatorService | null>(null);
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchService() {
      try {
        // Fetch service
        const response = await fetch(`/api/services/${id}`);
        if (!response.ok) {
          throw new Error("Service not found");
        }
        const data = await response.json();
        setService(data.service);

        // Fetch creator profile
        if (data.service.creatorId) {
          const creatorResponse = await fetch(`/api/creators/${data.service.creatorId}`);
          if (creatorResponse.ok) {
            const creatorData = await creatorResponse.json();
            setCreator(creatorData.creator);
          }
        }
      } catch (error: any) {
        console.error("Error fetching service:", error);
        toast.error("Failed to load service");
      } finally {
        setLoading(false);
      }
    }

    fetchService();
  }, [id]);

  const handleContactCreator = () => {
    if (!session) {
      toast.error("Please login to contact creators");
      router.push("/login");
      return;
    }
    toast.success(`Message sent to ${service?.creatorName}!`);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/5 rounded w-64" />
          <div className="h-64 bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="font-display text-2xl mb-3">Service not found</h2>
        <Link href="/services" className="text-violet-400 hover:text-violet-300 transition-colors">
          ← Back to services
        </Link>
      </div>
    );
  }

  const priceColor =
    service.priceRange === "$10k+"
      ? "from-amber-500 to-amber-600"
      : service.priceRange === "$5k-$10k"
      ? "from-violet-500 to-violet-600"
      : "from-cyan-500 to-cyan-600";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/services" className="hover:text-foreground transition-colors">
          Services
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground truncate">{service.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column - Service Details (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Back button */}
          <Link
            href="/services"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to services
          </Link>

          {/* Service Title */}
          <div>
            <h1 className="font-display font-bold text-3xl mb-3">
              <span className="gradient-text">{service.title}</span>
            </h1>
          </div>

          {/* Description */}
          <div className="glass rounded-2xl border border-white/5 p-6">
            <h2 className="font-display font-semibold text-lg mb-3 border-b border-white/5 pb-3">
              About This Service
            </h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {service.description}
            </p>
          </div>

          {/* Skills */}
          <div className="glass rounded-2xl border border-white/5 p-6">
            <h2 className="font-display font-semibold text-lg mb-4 border-b border-white/5 pb-3">
              Skills & Expertise
            </h2>
            <div className="flex flex-wrap gap-2">
              {service.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 text-violet-300 rounded-lg text-sm font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Pricing & Timeline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass rounded-2xl border border-white/5 p-6">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5 text-violet-400" />
                <h3 className="font-semibold">Price Range</h3>
              </div>
              <div className={`inline-block px-4 py-2 bg-gradient-to-r ${priceColor} rounded-xl text-white font-bold text-xl`}>
                {service.priceRange}
              </div>
            </div>

            <div className="glass rounded-2xl border border-white/5 p-6">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-cyan-400" />
                <h3 className="font-semibold">Delivery Time</h3>
              </div>
              <p className="text-xl font-bold text-cyan-300">{service.deliveryTime}</p>
            </div>
          </div>

          {/* Portfolio Samples */}
          {service.portfolioItems && service.portfolioItems.length > 0 && (
            <div className="glass rounded-2xl border border-white/5 p-6">
              <h2 className="font-display font-semibold text-lg mb-4 border-b border-white/5 pb-3">
                Portfolio Samples
              </h2>
              <div className="space-y-3">
                {service.portfolioItems.map((item, index) => (
                  <a
                    key={index}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-white/3 rounded-xl hover:bg-white/5 transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-violet-400" />
                      <span className="text-sm font-medium group-hover:text-violet-300 transition-colors">
                        {item.title}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column - Creator Profile Card (1/3 width) */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            {/* Creator Profile Card */}
            <div className="glass rounded-2xl border border-white/5 p-6">
              <div className="text-center mb-6">
                {/* Avatar */}
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-xl">
                  {service.creatorName?.charAt(0) || "?"}
                </div>

                {/* Name & Badge */}
                <h3 className="font-display font-bold text-xl mb-1">
                  {service.creatorName || "Unknown Creator"}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {service.creatorHandle || "@creator"}
                </p>

                {creator?.verification?.badge && (
                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-semibold mb-4">
                    {creator.verification.badge === "Studio" && "★ "}
                    {creator.verification.badge}
                    {creator.verification.badge === "Verified" && <CheckCircle className="w-3 h-3" />}
                  </div>
                )}
              </div>

              {/* Bio */}
              {creator?.bio && (
                <div className="mb-4 pb-4 border-b border-white/5">
                  <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                    {creator.bio}
                  </p>
                </div>
              )}

              {/* Stats */}
              {creator?.stats && (
                <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-white/5">
                  <div className="text-center p-2 bg-white/3 rounded-lg">
                    <div className="text-lg font-bold text-amber-400">
                      {creator.stats.avgRating}★
                    </div>
                    <div className="text-xs text-muted-foreground">Rating</div>
                  </div>
                  <div className="text-center p-2 bg-white/3 rounded-lg">
                    <div className="text-lg font-bold text-violet-400">
                      {creator.stats.projectsCompleted}
                    </div>
                    <div className="text-xs text-muted-foreground">Projects</div>
                  </div>
                </div>
              )}

              {/* Hourly Rate */}
              {creator?.hourlyRateUsd && (
                <div className="mb-4 pb-4 border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Hourly Rate</span>
                    <span className="font-bold text-lg">
                      ${creator.hourlyRateUsd}
                      <span className="text-sm text-muted-foreground font-normal">/hr</span>
                    </span>
                  </div>
                </div>
              )}

              {/* View Full Profile */}
              {creator && (
                <Link
                  href={`/creators/${service.creatorId}`}
                  className="block w-full py-2.5 mb-3 glass border border-white/10 text-center rounded-xl text-sm font-medium hover:bg-white/5 transition-all"
                >
                  View Full Profile
                </Link>
              )}

              {/* Contact Creator Button */}
              <button
                onClick={handleContactCreator}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-xl font-semibold hover:from-violet-500 hover:to-violet-400 transition-all shadow-lg shadow-violet-500/25"
              >
                <Mail className="w-4 h-4 inline mr-2" />
                Contact Creator
              </button>
            </div>

            {/* Book Service CTA */}
            <div className="glass rounded-2xl border border-violet-500/30 p-6 bg-gradient-to-br from-violet-600/10 to-cyan-600/5">
              <h3 className="font-semibold text-lg mb-2">Ready to get started?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Book this service and start working with {service.creatorName?.split(" ")[0] || "this creator"}
              </p>
              <button
                onClick={handleContactCreator}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-cyan-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-xl shadow-violet-500/30"
              >
                Book Service
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
