/**
 * Tests for supabase client singleton.
 * Verifies the client is created with env vars and exported as a singleton.
 */

const mockCreateClient = jest.fn().mockReturnValue({
  auth: {},
  from: jest.fn(),
});

jest.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

describe('supabase client', () => {
  beforeAll(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  afterAll(() => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  });

  it('exports a supabase client object', () => {
    const { supabase } = require('../supabase');
    expect(supabase).toBeDefined();
  });

  it('calls createClient with URL and anon key', () => {
    require('../supabase');
    expect(mockCreateClient).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        }),
      }),
    );
  });

  it('provides a SecureStore storage adapter on native', () => {
    require('../supabase');
    const authConfig = mockCreateClient.mock.calls[0][2].auth;
    expect(authConfig.storage).toBeDefined();
    expect(typeof authConfig.storage.getItem).toBe('function');
    expect(typeof authConfig.storage.setItem).toBe('function');
    expect(typeof authConfig.storage.removeItem).toBe('function');
  });

  it('returns the same singleton across imports', () => {
    const { supabase: a } = require('../supabase');
    const { supabase: b } = require('../supabase');
    expect(a).toBe(b);
  });
});
