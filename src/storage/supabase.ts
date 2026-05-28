/**
 * Supabase client singleton.
 * Uses expo-secure-store for auth token persistence on device.
 */

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required before importing @raeduslabs/core/storage.`);
  }
  return value;
}

const SUPABASE_URL = readRequiredEnv('EXPO_PUBLIC_SUPABASE_URL');
const SUPABASE_ANON_KEY = readRequiredEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');

/**
 * SecureStore adapter for Supabase auth token persistence.
 * Falls back to no-op on web (uses localStorage via Supabase default).
 */
const secureStoreAdapter =
  Platform.OS !== 'web'
    ? {
        getItem: (key: string) => SecureStore.getItemAsync(key),
        setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
        removeItem: (key: string) => SecureStore.deleteItemAsync(key),
      }
    : undefined;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
