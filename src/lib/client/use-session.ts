"use client";

import { useEffect, useState } from "react";
import { api } from "./api";

export type SessionUser = { id: string; email: string; displayName: string | null; timezone: string; mealFrequencyBaseline: number };

export function useSession() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined); // undefined = loading
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const res = await api.me();
      setUser(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session");
      setUser(null);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { user, loading: user === undefined, error, refresh };
}
