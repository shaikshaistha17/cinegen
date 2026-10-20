"use client";
import { useState, useEffect, useCallback } from "react";
import { Session, UserRole } from "@/types";
import { createClient } from "@/lib/supabase";

function setCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + 7 * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

function removeCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

// Global listeners so all components update together
const listeners = new Set<() => void>();

function notifyAll() {
  listeners.forEach((fn) => fn());
}

export function useSession() {
  const [session, setSessionState] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Check for localStorage session first (local mode)
    const localSession = localStorage.getItem('cinegen_session');
    if (localSession) {
      try {
        const sess = JSON.parse(localSession);
        setSessionState(sess);
        setCookie("cinegen_role", sess.role);
        setLoading(false);
        console.log('✅ Restored session from localStorage');
        return;
      } catch (e) {
        console.error('Failed to parse local session:', e);
      }
    }
    
    // Get initial session from Supabase
    supabase.auth.getSession().then(({ data: { session: authSession } }: any) => {
      if (authSession) {
        convertAuthSessionToSession(authSession).then((sess) => {
          setSessionState(sess);
          if (sess) {
            setCookie("cinegen_role", sess.role);
          }
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: string, authSession: any) => {
      if (authSession) {
        const sess = await convertAuthSessionToSession(authSession);
        setSessionState(sess);
        if (sess) {
          setCookie("cinegen_role", sess.role);
        }
        notifyAll();
      } else {
        setSessionState(null);
        removeCookie("cinegen_role");
        notifyAll();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Convert Supabase auth session to our Session type
  const convertAuthSessionToSession = async (
    authSession: any
  ): Promise<Session | null> => {
    if (!authSession?.user) return null;

    const user = authSession.user;
    const metadata = user.user_metadata || {};

    // Fetch user details from database
    const { data: userData } = await supabase
      .from("users")
      .select("id, email, role, name")
      .eq("id", user.id)
      .single();

    if (!userData) {
      return {
        userId: user.id,
        email: user.email || "",
        role: (metadata.role || "guest") as UserRole,
        name: metadata.name || user.email?.split("@")[0] || "User",
        loginAt: new Date().toISOString(),
        access_token: authSession.access_token,
        refresh_token: authSession.refresh_token,
        expires_at: authSession.expires_at,
      };
    }

    // Get profile ID
    let profileId: string | undefined;
    if (userData.role === "creator") {
      const { data: creatorProfile } = await supabase
        .from("creator_profiles")
        .select("id")
        .eq("user_id", userData.id)
        .single();
      profileId = creatorProfile?.id;
    } else if (userData.role === "brand") {
      const { data: brandProfile } = await supabase
        .from("brand_profiles")
        .select("id")
        .eq("user_id", userData.id)
        .single();
      profileId = brandProfile?.id;
    }

    return {
      userId: userData.id,
      email: userData.email,
      role: userData.role as UserRole,
      name: userData.name,
      loginAt: new Date().toISOString(),
      access_token: authSession.access_token,
      refresh_token: authSession.refresh_token,
      expires_at: authSession.expires_at,
      ...(userData.role === "creator" ? { creatorId: profileId } : {}),
      ...(userData.role === "brand" ? { brandId: profileId } : {}),
    };
  };

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      try {
        console.log('🔐 Login attempt for:', email);
        
        // Check localStorage users first (local mode)
        const localUsers = JSON.parse(localStorage.getItem('cinegen_users') || '[]');
        console.log('📦 Local users found:', localUsers.length);
        
        const hasLocalUsers = localUsers.length > 0;
        
        // LOCAL MODE: If we have local users, check them first
        if (hasLocalUsers) {
          const user = localUsers.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
          if (user) {
            console.log('✅ Found user in localStorage:', user.email);
            const sess: Session = {
              userId: user.id,
              email: user.email,
              role: user.role as UserRole,
              name: user.name,
              loginAt: new Date().toISOString(),
            };
            setSessionState(sess);
            setCookie("cinegen_role", sess.role);
            localStorage.setItem('cinegen_session', JSON.stringify(sess));
            notifyAll();
            console.log('✅ Logged in via localStorage');
            return true;
          } else {
            console.log('❌ User not found in localStorage');
          }
        }
        
        // Call our API endpoint which handles both demo and regular login
        console.log('🌐 Calling API login...');
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, localUsers: hasLocalUsers }),
        });

        if (!response.ok) {
          console.log('❌ API login failed');
          return false;
        }

        const data = await response.json();
        console.log('📥 API response:', data);

        // For demo accounts, we need to manually set the session
        if (data.isDemo) {
          // Create a session object from the API response
          const sess: Session = {
            userId: data.user.id,
            email: data.user.email,
            role: data.user.role as UserRole,
            name: data.user.name,
            loginAt: new Date().toISOString(),
            ...(data.user.role === "creator" ? { creatorId: data.profileId } : {}),
            ...(data.user.role === "brand" ? { brandId: data.profileId } : {}),
          };
          setSessionState(sess);
          setCookie("cinegen_role", sess.role);
          notifyAll();
          return true;
        }

        // For regular login, Supabase auth will handle the session via onAuthStateChange
        if (data.session) {
          await supabase.auth.setSession(data.session);
          return true;
        }

        return false;
      } catch (error) {
        console.error("Login error:", error);
        return false;
      }
    },
    [supabase]
  );

  const loginAsRole = useCallback(
    async (role: "brand" | "creator") => {
      const email =
        role === "brand" ? "brand@cinegen.demo" : "creator@cinegen.demo";
      await login(email, "Demo@123");
    },
    [login]
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSessionState(null);
    removeCookie("cinegen_role");
    notifyAll();
  }, [supabase]);

  const refreshSession = useCallback(async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error("Session refresh error:", error);
      return false;
    }
    return !!data.session;
  }, [supabase]);

  return { session, loading, login, loginAsRole, logout, refreshSession };
}
