/**
 * Subscription hook wrapping RevenueCat.
 * Checks entitlements and provides purchase/restore methods.
 */

import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';

const ENTITLEMENT_ID = 'pro';

interface UseSubscriptionResult {
  isPro: boolean;
  loading: boolean;
  customerInfo: CustomerInfo | null;
  initialize: (userId?: string) => Promise<void>;
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
  getOfferings: () => Promise<PurchasesPackage[]>;
}

let initialized = false;

/** Reset module state for testing. Not for production use. */
export function __resetForTesting() {
  initialized = false;
}

export function useSubscription(): UseSubscriptionResult {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const checkEntitlements = useCallback((info: CustomerInfo) => {
    const proEntitlement = info.entitlements.active[ENTITLEMENT_ID];
    setIsPro(proEntitlement !== undefined);
    setCustomerInfo(info);
  }, []);

  const initialize = useCallback(async (userId?: string) => {
    if (initialized) return;

    const apiKey = Platform.OS === 'ios'
      ? (process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '')
      : (process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '');
    if (!apiKey) {
      setLoading(false);
      return;
    }

    try {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      Purchases.configure({ apiKey, appUserID: userId });
      initialized = true;

      const info = await Purchases.getCustomerInfo();
      checkEntitlements(info);
    } catch {
      // RevenueCat not configured yet -- that's fine for dev
    }

    setLoading(false);
  }, [checkEntitlements]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const purchase = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      const { customerInfo: info } = await Purchases.purchasePackage(pkg);
      checkEntitlements(info);
      return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
    } catch {
      return false;
    }
  }, [checkEntitlements]);

  const restore = useCallback(async (): Promise<boolean> => {
    try {
      const info = await Purchases.restorePurchases();
      checkEntitlements(info);
      return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
    } catch {
      return false;
    }
  }, [checkEntitlements]);

  const getOfferings = useCallback(async (): Promise<PurchasesPackage[]> => {
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current?.availablePackages ?? [];
    } catch {
      return [];
    }
  }, []);

  return { isPro, loading, customerInfo, initialize, purchase, restore, getOfferings };
}
