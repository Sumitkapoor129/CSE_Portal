import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/auth';
import { clearStoredToken, getStoredToken, setStoredToken } from '../api/client';
import type { AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  initializing: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  const reload = useCallback(async () => {
    if (!getStoredToken()) {
      setUser(null);
      return;
    }
    try {
      const me = await authApi.me();
      setUser({ id: me.id, name: me.name, email: me.email, role: me.role, isActive: me.isActive });
    } catch {
      clearStoredToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    reload().finally(() => setInitializing(false));
  }, [reload]);

  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setStoredToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, initializing, login, logout, reload }),
    [user, initializing, login, logout, reload]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
