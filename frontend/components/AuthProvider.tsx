"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getProfileByUserId, type MyProfile } from "@/lib/profiles";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  authLoading: boolean;
  profile: MyProfile | null;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadProfile = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);

    try {
      const nextProfile = await getProfileByUserId(nextUser.id);
      setProfile(nextProfile);
    } catch (error) {
      console.error("Failed to load profile:", error);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);

    try {
      const nextProfile = await getProfileByUserId(user.id);
      setProfile(nextProfile);
    } catch (error) {
      console.error("Failed to refresh profile:", error);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (!active) return;

        const initialUser = initialSession?.user ?? null;

        setSession(initialSession ?? null);
        setUser(initialUser);

        await loadProfile(initialUser);
      } catch (error) {
        console.error("Failed to initialize auth:", error);

        if (!active) return;

        setSession(null);
        setUser(null);
        setProfile(null);
        setProfileLoading(false);
      } finally {
        if (active) {
          setAuthLoading(false);
        }
      }
    }

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!active) return;

      const nextUser = nextSession?.user ?? null;

      setSession(nextSession ?? null);
      setUser(nextUser);

      if (active) {
        setAuthLoading(false);
      }

      await loadProfile(nextUser);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo(
    () => ({
      session,
      user,
      authLoading,
      profile,
      profileLoading,
      refreshProfile,
    }),
    [session, user, authLoading, profile, profileLoading, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}