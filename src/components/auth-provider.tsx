"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type AuthUser = {
  id: string;
  role: "admin" | "member";
  name: string;
  email: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    const data = await res.json();
    setUser(data?.user ?? null);
    setLoading(false);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      if (!active) return;
      setUser(data?.user ?? null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => ({ user, loading, refresh, logout }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
