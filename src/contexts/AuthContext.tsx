import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  user_id: string;
  role: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  genre: string | null;
  profile_complete: boolean | null;
  onboarding_steps: Record<string, boolean> | null;
  rate_min: number | null;
  rate_max: number | null;
  subscription_plan: string | null;
  trial_ends_at?: string | null;
  youtube: string | null;
  streaming_stats: Record<string, any> | null;
  website: string | null;
  instagram: string | null;
  slug: string | null;
  completion_score: number | null;
};

type SubscriptionInfo = {
  subscribed: boolean;
  product_id: string | null;
  subscription_end: string | null;
  is_trial?: boolean;
  trial_days_remaining?: number;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  subscription: SubscriptionInfo | null;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  checkSubscription: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    setProfile(data as Profile | null);
  };

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    setIsAdmin(!!data);
  };

  const checkSubscription = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) {
        console.error("Subscription check error:", error);
        return;
      }
      setSubscription(data as SubscriptionInfo);
      
      // Fetch latest user from session directly to avoid stale closures
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const currentUser = currentSession?.user;
      
      if (currentUser) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", currentUser.id)
          .single();
        setProfile(profileData as Profile | null);
      }
    } catch (err) {
      console.error("Subscription check failed:", err);
    }
  }, []);

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    // getSession() is the single source of truth for initial load.
    // onAuthStateChange handles all subsequent events (sign-in, sign-out, token refresh).
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await Promise.all([
          fetchProfile(session.user.id),
          checkAdminRole(session.user.id),
        ]);
      }
      setLoading(false);
    });

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // INITIAL_SESSION is already handled by getSession() above — skip it to
        // prevent a double profile-fetch race on first load.
        if (event === "INITIAL_SESSION") return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // On SIGNED_IN (new signup) the handle_new_user trigger may still be
          // running. Wait 600 ms so the profile row exists before fetching.
          const delay = event === "SIGNED_IN" ? 600 : 0;
          setTimeout(async () => {
            await Promise.all([
              fetchProfile(session.user.id),
              checkAdminRole(session.user.id),
            ]);
          }, delay);
        } else {
          setProfile(null);
          setSubscription(null);
          setIsAdmin(false);
        }
      }
    );

    return () => authSub.unsubscribe();
  }, []);

  // Check subscription on login and periodically
  useEffect(() => {
    if (!user) return;
    checkSubscription();
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setSubscription(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, subscription, isAdmin, signOut, refreshProfile, checkSubscription }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
