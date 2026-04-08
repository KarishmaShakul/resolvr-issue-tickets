import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";

export type AppRole = "admin" | "user";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  department?: string;
  phone?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: { full_name?: string; department?: string; phone?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchAppUser(supabaseUser: SupabaseUser): Promise<AppUser> {
  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", supabaseUser.id)
    .single();

  // Fetch role
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", supabaseUser.id)
    .single();

  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? "",
    name: profile?.full_name ?? supabaseUser.email ?? "",
    role: (roleData?.role as AppRole) ?? "user",
    department: profile?.department ?? undefined,
    phone: profile?.phone ?? undefined,
    avatarUrl: profile?.avatar_url ?? undefined,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        // Use setTimeout to avoid potential deadlocks with Supabase client
        setTimeout(async () => {
          const appUser = await fetchAppUser(newSession.user);
          setUser(appUser);
          setIsLoading(false);
        }, 0);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    // THEN check existing session
    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      setSession(existingSession);
      if (existingSession?.user) {
        const appUser = await fetchAppUser(existingSession.user);
        setUser(appUser);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }, []);

  const signup = useCallback(async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const updateProfile = useCallback(async (data: { full_name?: string; department?: string; phone?: string }) => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update(data)
      .eq("user_id", user.id);

    // Refresh user data
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();
    if (supabaseUser) {
      const appUser = await fetchAppUser(supabaseUser);
      setUser(appUser);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, session, isAuthenticated: !!user, isLoading, login, signup, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
