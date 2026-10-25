'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getAuthToken, setAuthToken, clearAuthToken } from '../lib/api';

export interface UserTeam {
  id: string;
  teamName: string;
  email: string;
  members: string[];
  role: 'participant' | 'admin';
  adminRole?: 'primary_admin' | 'event_admin';
  permissions?: string[];
  isPrimaryAdmin?: boolean;
  createdAt: string;
}

export interface AuthContextType {
  user: UserTeam | null;
  token: string | null;
  isLoading: boolean;
  login: (emailOrTeamName: string, password: string) => Promise<UserTeam>;
  register: (data: { teamName: string; email: string; password: string; members: string[] }) => Promise<UserTeam>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState<UserTeam | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = useCallback(async () => {
    const savedToken = getAuthToken();
    if (!savedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await apiFetch<{ team: UserTeam }>('/auth/me', { token: savedToken });
      setUser(data.team);
      setToken(savedToken);
    } catch {
      console.warn('Session verification failed, clearing credentials.');
      clearAuthToken();
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const login = async (emailOrTeamName: string, password: string): Promise<UserTeam> => {
    const res = await apiFetch<{ token: string; team: UserTeam }>('/auth/login', {
      method: 'POST',
      body: { emailOrTeamName, password }
    });

    setAuthToken(res.token);
    setToken(res.token);
    setUser(res.team);
    return res.team;
  };

  const register = async (data: { teamName: string; email: string; password: string; members: string[] }): Promise<UserTeam> => {
    const res = await apiFetch<{ token: string; team: UserTeam }>('/auth/register', {
      method: 'POST',
      body: data
    });

    setAuthToken(res.token);
    setToken(res.token);
    setUser(res.team);
    return res.team;
  };

  const logout = () => {
    clearAuthToken();
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
