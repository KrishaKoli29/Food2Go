/**
 * AuthContext
 *
 * Provides app-wide auth state (token, userId, role) stored in AsyncStorage.
 * - Restores session on app restart by reading from AsyncStorage.
 * - Validates the stored token against /api/auth/me on startup.
 * - Exposes login(), logout() helpers.
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_AUTH } from "./constants/api";

const STORAGE_KEY = "@food2go_auth";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState({
    token: null,
    role: null,
    userId: null,
    loading: true, // true while we're restoring from AsyncStorage
  });

  // ─── Restore session on mount ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!stored) {
          setAuthState({ token: null, role: null, userId: null, loading: false });
          return;
        }

        const { token, role, userId } = JSON.parse(stored);

        // Validate token is still good against the server
        const res = await fetch(`${API_AUTH}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          setAuthState({ token, role, userId, loading: false });
        } else {
          // Token expired / revoked — clear storage
          await AsyncStorage.removeItem(STORAGE_KEY);
          setAuthState({ token: null, role: null, userId: null, loading: false });
        }
      } catch (_) {
        // Network error on startup — keep stored session (offline tolerance)
        try {
          const stored = await AsyncStorage.getItem(STORAGE_KEY);
          if (stored) {
            const { token, role, userId } = JSON.parse(stored);
            setAuthState({ token, role, userId, loading: false });
            return;
          }
        } catch (_2) { /* ignore */ }
        setAuthState({ token: null, role: null, userId: null, loading: false });
      }
    })();
  }, []);

  // ─── Login: persist token + role + userId ──────────────────────────────────
  const login = async ({ token, role, userId }) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ token, role, userId }));
    setAuthState({ token, role, userId, loading: false });
  };

  // ─── Logout: clear storage ─────────────────────────────────────────────────
  const logout = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setAuthState({ token: null, role: null, userId: null, loading: false });
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Convenience hook */
export function useAuth() {
  return useContext(AuthContext);
}
