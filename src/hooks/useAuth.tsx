import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import type { AuthUser } from "../types";
import { fetchMe, logout as apiLogout } from "../api/auth";

interface AuthContextValue {
  user: AuthUser | null;
  hasAnonymousData: boolean;
  loading: boolean;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  hasAnonymousData: false,
  loading: true,
  logout: () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hasAnonymousData, setHasAnonymousData] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await fetchMe();
    setUser(data.user);
    setHasAnonymousData(data.hasAnonymousData ?? false);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const logout = useCallback(() => {
    apiLogout(); // redirects to CF Access logout
  }, []);

  return (
    <AuthContext.Provider value={{ user, hasAnonymousData, loading, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
