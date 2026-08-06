import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, AuthResponse } from '../types';
import { api, setAccessToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const initAuth = async () => {
    const refreshToken = localStorage.getItem('dcspms_refresh_token');
    if (refreshToken) {
      try {
        const { data } = await api.post<AuthResponse>('/auth/refresh', { refreshToken });
        setUser(data.user);
        setAccessToken(data.accessToken);
        localStorage.setItem('dcspms_refresh_token', data.refreshToken);
      } catch (_err) {
        localStorage.removeItem('dcspms_refresh_token');
        setAccessToken(null);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
    setUser(data.user);
    setAccessToken(data.accessToken);
    localStorage.setItem('dcspms_refresh_token', data.refreshToken);
  };

  const logout = () => {
    api.post('/auth/logout').catch(() => {});
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('dcspms_refresh_token');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
