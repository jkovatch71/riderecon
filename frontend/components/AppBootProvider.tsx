"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type AppBootContextValue = {
  appReady: boolean;
  markAppReady: () => void;
};

const AppBootContext = createContext<AppBootContextValue | null>(null);

export function AppBootProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [appReady, setAppReady] = useState(false);

  const markAppReady = useCallback(() => {
    setAppReady(true);
  }, []);

  const value = useMemo(
    () => ({
      appReady,
      markAppReady,
    }),
    [appReady, markAppReady]
  );

  return (
    <AppBootContext.Provider value={value}>
      {children}
    </AppBootContext.Provider>
  );
}

export function useAppBoot() {
  const context = useContext(AppBootContext);

  if (!context) {
    throw new Error("useAppBoot must be used within an AppBootProvider");
  }

  return context;
}