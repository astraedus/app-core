/**
 * Tests for useAuth hook.
 * Mocks supabase client to verify auth method delegation.
 */

// Mock supabase before importing useAuth
const mockGetSession = jest.fn().mockResolvedValue({
  data: { session: null },
});
const mockOnAuthStateChange = jest.fn().mockReturnValue({
  data: { subscription: { unsubscribe: jest.fn() } },
});
const mockSignUp = jest.fn().mockResolvedValue({ data: { user: null }, error: null });
const mockSignInWithPassword = jest.fn().mockResolvedValue({ error: null });
const mockSignInWithOAuth = jest.fn().mockResolvedValue({ data: { url: null }, error: null });
const mockResetPasswordForEmail = jest.fn().mockResolvedValue({ error: null });
const mockSignOut = jest.fn().mockResolvedValue({});
const mockUpsert = jest.fn().mockResolvedValue({ error: null });

jest.mock('@core/storage', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signInWithOAuth: mockSignInWithOAuth,
      resetPasswordForEmail: mockResetPasswordForEmail,
      signOut: mockSignOut,
    },
    from: jest.fn().mockReturnValue({ upsert: mockUpsert }),
  },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

// Minimal React hooks mock for non-DOM testing
let hookResult: ReturnType<typeof import('../useAuth').useAuth>;

jest.mock('react', () => {
  const actualReact = jest.requireActual('react');
  return {
    ...actualReact,
    useState: (initial: unknown) => {
      // Simple mock: returns initial value, setter is no-op in sync tests
      return [initial, jest.fn()];
    },
    useEffect: (fn: () => void) => fn(),
    useCallback: (fn: unknown) => fn,
  };
});

import { useAuth } from '../useAuth';

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    hookResult = useAuth();
  });

  it('returns the expected interface shape', () => {
    expect(hookResult).toHaveProperty('user');
    expect(hookResult).toHaveProperty('session');
    expect(hookResult).toHaveProperty('loading');
    expect(hookResult).toHaveProperty('signUp');
    expect(hookResult).toHaveProperty('signIn');
    expect(hookResult).toHaveProperty('signInWithGoogle');
    expect(hookResult).toHaveProperty('resetPassword');
    expect(hookResult).toHaveProperty('signOut');
  });

  it('calls getSession on mount (via useEffect)', () => {
    expect(mockGetSession).toHaveBeenCalled();
  });

  it('subscribes to auth state changes', () => {
    expect(mockOnAuthStateChange).toHaveBeenCalled();
  });

  describe('signIn', () => {
    it('calls supabase.auth.signInWithPassword', async () => {
      await hookResult.signIn('test@example.com', 'password123');
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('returns null error on success', async () => {
      const result = await hookResult.signIn('test@example.com', 'pass');
      expect(result.error).toBeNull();
    });

    it('returns error message on failure', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        error: { message: 'Invalid credentials' },
      });
      const result = await hookResult.signIn('bad@example.com', 'wrong');
      expect(result.error).toBe('Invalid credentials');
    });
  });

  describe('signUp', () => {
    it('calls supabase.auth.signUp', async () => {
      await hookResult.signUp('new@example.com', 'password123');
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
      });
    });

    it('returns error message on failure', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Email taken' },
      });
      const result = await hookResult.signUp('taken@example.com', 'pass');
      expect(result.error).toBe('Email taken');
    });
  });

  describe('signOut', () => {
    it('calls supabase.auth.signOut', async () => {
      await hookResult.signOut();
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('calls supabase.auth.resetPasswordForEmail', async () => {
      await hookResult.resetPassword('user@example.com');
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('user@example.com');
    });

    it('returns null error on success', async () => {
      const result = await hookResult.resetPassword('user@example.com');
      expect(result.error).toBeNull();
    });
  });
});
