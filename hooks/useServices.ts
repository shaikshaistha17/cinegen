"use client";
import { useState, useEffect, useCallback } from "react";
import { CreatorService } from "@/types";
import { createClient } from "@/lib/supabase";

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

export function useServices(creatorId?: string) {
  const [services, setServices] = useState<CreatorService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setServices([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      // Build URL with query params
      const url = new URL("/api/services", window.location.origin);
      if (creatorId) {
        url.searchParams.append("creatorId", creatorId);
        url.searchParams.append("isActive", "false"); // Get all services for creator
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error("Failed to fetch services");
      }

      const data = await response.json();
      setServices(data.services || []);
    } catch (err: any) {
      console.error("Error fetching services:", err);
      setError(err.message || "Failed to fetch services");
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [creatorId]);

  useEffect(() => {
    fetchServices();

    // Subscribe to real-time updates if Supabase is configured
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();
    const channel = supabase
      .channel("services_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "creator_services",
        },
        () => {
          fetchServices();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchServices]);

  const createService = useCallback(
    async (data: {
      title: string;
      description: string;
      skills: string[];
      priceRange: string;
      deliveryTime: string;
      portfolioItems?: { url: string; title: string }[];
    }) => {
      if (!isSupabaseConfigured()) {
        throw new Error("Supabase not configured");
      }

      try {
        const response = await fetch("/api/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to create service");
        }

        const result = await response.json();
        await fetchServices();
        return result.service;
      } catch (err: any) {
        console.error("Error creating service:", err);
        throw err;
      }
    },
    [fetchServices]
  );

  const updateService = useCallback(
    async (
      id: string,
      data: {
        title?: string;
        description?: string;
        skills?: string[];
        priceRange?: string;
        deliveryTime?: string;
        portfolioItems?: { url: string; title: string }[];
        isActive?: boolean;
      }
    ) => {
      if (!isSupabaseConfigured()) {
        throw new Error("Supabase not configured");
      }

      try {
        const response = await fetch(`/api/services/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update service");
        }

        const result = await response.json();
        await fetchServices();
        return result.service;
      } catch (err: any) {
        console.error("Error updating service:", err);
        throw err;
      }
    },
    [fetchServices]
  );

  const deleteService = useCallback(
    async (id: string) => {
      if (!isSupabaseConfigured()) {
        throw new Error("Supabase not configured");
      }

      try {
        const response = await fetch(`/api/services/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to delete service");
        }

        await fetchServices();
      } catch (err: any) {
        console.error("Error deleting service:", err);
        throw err;
      }
    },
    [fetchServices]
  );

  const toggleActive = useCallback(
    async (id: string) => {
      const service = services.find((s) => s.id === id);
      if (!service) {
        throw new Error("Service not found");
      }

      return updateService(id, { isActive: !service.isActive });
    },
    [services, updateService]
  );

  const refreshServices = useCallback(() => {
    return fetchServices();
  }, [fetchServices]);

  return {
    services,
    loading,
    error,
    createService,
    updateService,
    deleteService,
    toggleActive,
    refreshServices,
  };
}
