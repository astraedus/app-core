/**
 * Auth hook wrapping Supabase auth.
 * Returns current user, loading state, and auth methods.
 */

import { useState, useEffect, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@core/storage';

export interface AuthProfileConfig {
  table?: string;
  onConflict?: string;
  buildProfile: (params: {
    user: User;
    email: string;
  }) => Record<string, unknown> | Promise<Record<string, unknown>>;
}

export interface UseAuthOptions {
  profile?: AuthProfileConfig;
}

export interface UseAuthResult {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

async function createConfiguredProfile(
  user: User,
  email: string,
  profileConfig?: AuthProfileConfig,
): Promise<string | null> {
  if (!profileConfig) return null;

  try {
    const profile = await profileConfig.buildProfile({ user, email });
    const { error } = await supabase
      .from(profileConfig.table ?? 'profiles')
      .upsert(
        { ...profile, id: user.id },
        { onConflict: profileConfig.onConflict ?? 'id' },
      );

    return error?.message ?? null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Failed to create user profile';
  }
}

export function useAuth(options: UseAuthOptions = {}): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const profileConfig = options.profile;

  useEffect(() => {
    let mounted = true;

    async function loadInitialSession() {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(s);
        setUser(s?.user ?? null);
      } catch {
        if (!mounted) return;
        setSession(null);
        setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (!error && data.user) {
      const profileError = await createConfiguredProfile(data.user, email, profileConfig);
      if (profileError) return { error: profileError };
    }
    return { error: error?.message ?? null };
  }, [profileConfig]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      const { makeRedirectUri } = await import('expo-auth-session');
      const redirectTo = makeRedirectUri();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: typeof document === 'undefined',
        },
      });

      if (error || !data.url) {
        return { error: error?.message ?? 'Failed to start Google sign-in' };
      }

      if (typeof document !== 'undefined') {
        window.location.href = data.url;
        return { error: null };
      }

      const WebBrowser = await import('expo-web-browser');
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'success') {
        const url = new URL(result.url);
        const params = new URLSearchParams(url.hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          return { error: sessionError?.message ?? null };
        }
        return { error: 'No tokens received from Google sign-in' };
      }

      return { error: result.type === 'cancel' ? null : 'Sign-in failed' };
    } catch {
      return { error: 'Google sign-in is not available on this platform' };
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    resetPassword,
    signOut,
  };
}
