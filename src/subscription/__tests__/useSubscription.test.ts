/**
 * Tests for useSubscription hook.
 * Mocks RevenueCat Purchases SDK to verify purchase/restore flows.
 */

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

jest.mock('react-native-purchases');

import Purchases from 'react-native-purchases';
import type { PurchasesPackage } from 'react-native-purchases';

// Mock React hooks for non-DOM testing
let capturedEffects: Array<() => void> = [];
let stateStore: Record<string, unknown> = {};
let stateCounter = 0;

jest.mock('react', () => ({
  useState: (initial: unknown) => {
    const key = `state_${stateCounter++}`;
    if (!(key in stateStore)) {
      stateStore[key] = initial;
    }
    return [stateStore[key], (v: unknown) => { stateStore[key] = v; }];
  },
  useEffect: (fn: () => void) => { capturedEffects.push(fn); },
  useCallback: (fn: unknown) => fn,
}));

import { useSubscription, __resetForTesting } from '../useSubscription';

describe('useSubscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedEffects = [];
    stateStore = {};
    stateCounter = 0;
    __resetForTesting();
    process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY = 'test-rc-key';
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
  });

  it('returns expected interface shape', () => {
    const result = useSubscription();

    expect(result).toHaveProperty('isPro');
    expect(result).toHaveProperty('loading');
    expect(result).toHaveProperty('customerInfo');
    expect(result).toHaveProperty('initialize');
    expect(result).toHaveProperty('purchase');
    expect(result).toHaveProperty('restore');
    expect(result).toHaveProperty('getOfferings');

    expect(typeof result.purchase).toBe('function');
    expect(typeof result.restore).toBe('function');
    expect(typeof result.getOfferings).toBe('function');
    expect(typeof result.initialize).toBe('function');
  });

  it('starts with loading=true and isPro=false', () => {
    const result = useSubscription();
    expect(result.loading).toBe(true);
    expect(result.isPro).toBe(false);
  });

  describe('initialize', () => {
    it('configures Purchases with the platform API key', async () => {
      const result = useSubscription();
      await result.initialize();

      expect(Purchases.setLogLevel).toHaveBeenCalled();
      expect(Purchases.configure).toHaveBeenCalledWith({
        apiKey: 'test-rc-key',
        appUserID: undefined,
      });
    });

    it('passes userId when provided', async () => {
      const result = useSubscription();
      await result.initialize('user-123');

      expect(Purchases.configure).toHaveBeenCalledWith({
        apiKey: 'test-rc-key',
        appUserID: 'user-123',
      });
    });

    it('does not initialize twice', async () => {
      const result = useSubscription();
      await result.initialize();
      await result.initialize();

      expect(Purchases.configure).toHaveBeenCalledTimes(1);
    });

    it('skips initialization when API key is missing', async () => {
      delete process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
      stateStore = {};
      stateCounter = 0;
      __resetForTesting();

      const result = useSubscription();
      await result.initialize();

      expect(Purchases.configure).not.toHaveBeenCalled();
    });
  });

  describe('purchase', () => {
    it('calls Purchases.purchasePackage', async () => {
      const result = useSubscription();
      const mockPkg = {
        identifier: 'monthly',
        packageType: 'MONTHLY',
        product: { identifier: 'pro_monthly', priceString: '$4.99' },
        offeringIdentifier: 'default',
      } as PurchasesPackage;

      await result.purchase(mockPkg);

      expect(Purchases.purchasePackage).toHaveBeenCalledWith(mockPkg);
    });

    it('returns true when pro entitlement is active', async () => {
      (Purchases.purchasePackage as jest.Mock).mockResolvedValueOnce({
        customerInfo: {
          entitlements: { active: { pro: { isActive: true } } },
        },
      });

      const result = useSubscription();
      const success = await result.purchase({} as PurchasesPackage);
      expect(success).toBe(true);
    });

    it('returns false when purchase has no pro entitlement', async () => {
      const result = useSubscription();
      const success = await result.purchase({} as PurchasesPackage);
      expect(success).toBe(false);
    });

    it('returns false on purchase error', async () => {
      (Purchases.purchasePackage as jest.Mock).mockRejectedValueOnce(
        new Error('User cancelled'),
      );

      const result = useSubscription();
      const success = await result.purchase({} as PurchasesPackage);
      expect(success).toBe(false);
    });
  });

  describe('restore', () => {
    it('calls Purchases.restorePurchases', async () => {
      const result = useSubscription();
      await result.restore();
      expect(Purchases.restorePurchases).toHaveBeenCalled();
    });

    it('returns true when restore finds pro entitlement', async () => {
      (Purchases.restorePurchases as jest.Mock).mockResolvedValueOnce({
        entitlements: { active: { pro: { isActive: true } } },
      });

      const result = useSubscription();
      const success = await result.restore();
      expect(success).toBe(true);
    });

    it('returns false on restore error', async () => {
      (Purchases.restorePurchases as jest.Mock).mockRejectedValueOnce(
        new Error('Network error'),
      );

      const result = useSubscription();
      const success = await result.restore();
      expect(success).toBe(false);
    });
  });

  describe('getOfferings', () => {
    it('returns available packages', async () => {
      const mockPackages = [
        { identifier: 'monthly', product: { priceString: '$4.99' } },
      ];
      (Purchases.getOfferings as jest.Mock).mockResolvedValueOnce({
        current: { availablePackages: mockPackages },
      });

      const result = useSubscription();
      const packages = await result.getOfferings();
      expect(packages).toEqual(mockPackages);
    });

    it('returns empty array when no offerings', async () => {
      (Purchases.getOfferings as jest.Mock).mockResolvedValueOnce({
        current: null,
      });

      const result = useSubscription();
      const packages = await result.getOfferings();
      expect(packages).toEqual([]);
    });

    it('returns empty array on error', async () => {
      (Purchases.getOfferings as jest.Mock).mockRejectedValueOnce(
        new Error('Network error'),
      );

      const result = useSubscription();
      const packages = await result.getOfferings();
      expect(packages).toEqual([]);
    });
  });
});
