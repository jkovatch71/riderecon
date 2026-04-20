"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

  const mountedRef = useRef(true);
  const profileRequestIdRef = useRef(0);
  const profilePromiseRef = useRef<Promise<void> | null>(null);
  const lastProfileUserIdRef = useRef<string | null>(null);

  const clearProfileState = useCallback(() => {
    lastProfileUserIdRef.current = null;
    setProfile(null);
    setProfileLoading(false);
  }, []);

  const loadProfile = useCallback(async (nextUser: User | null, force = false) => {
    if (!mountedRef.current) return;

    if (!nextUser) {
      clearProfileState();
      return;
    }

    if (!force && lastProfileUserIdRef.current === nextUser.id && profile) {
      return;
    }

    if (profilePromiseRef.current && !force && lastProfileUserIdRef.current === nextUser.id) {
      return profilePromiseRef.current;
    }

    const requestId = ++profileRequestIdRef.current;
    lastProfileUserIdRef.current = nextUser.id;
    setProfileLoading(true);

    const promise = (async () => {
      try {
        const nextProfile = await getProfileByUserId(nextUser.id);
        console.log("Loaded profile:", nextProfile);

        if (!mountedRef.current || profileRequestIdRef.current !== requestId) return;

        setProfile(nextProfile);
      } catch (error) {
        if (!mountedRef.current || profileRequestIdRef.current !== requestId) return;

        console.error("Failed to load profile:", error);
        setProfile(null);
      } finally {
        if (!mountedRef.current || profileRequestIdRef.current !== requestId) return;

        setProfileLoading(false);
        profilePromiseRef.current = null;
      }
    })();

    profilePromiseRef.current = promise;
    return promise;
  }, [clearProfileState, profile]);

  const applySession = useCallback(
    (nextSession: Session | null) => {
      const nextUser = nextSession?.user ?? null;

      setSession(nextSession);
      setUser(nextUser);
      setAuthLoading(false);

      // Fire and forget profile loading so auth state is not blocked.
      void loadProfile(nextUser);
    },
    [loadProfile]
  );

  const refreshProfile = useCallback(async () => {
    if (!user) {
      clearProfileState();
      return;
    }

    await loadProfile(user, true);
  }, [user, loadProfile, clearProfileState]);

  useEffect(() => {
    mountedRef.current = true;

    async function initializeAuth() {
      try {
        const {
          data: { session: nextSession },
        } = await supabase.auth.getSession();

        if (!mountedRef.current) return;

        applySession(nextSession ?? null);
      } catch (error) {
        console.error("Failed to sync auth session:", error);

        if (!mountedRef.current) return;

        setSession(null);
        setUser(null);
        setProfile(null);
        setProfileLoading(false);
        setAuthLoading(false);
      }
    }

    void initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mountedRef.current) return;
      applySession(nextSession ?? null);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

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