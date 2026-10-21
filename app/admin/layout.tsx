"use client";
import { useSession } from "@/hooks/useSession";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

/**
 * Admin layout that enforces admin role requirement
 * Redirects non-admin users to dashboard
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!session || session.role !== "admin")) {
      router.push("/dashboard");
    }
  }, [session, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session || session.role !== "admin") {
    return null;
  }

  return <>{children}</>;
}
