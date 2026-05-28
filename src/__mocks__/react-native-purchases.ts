/** Mock for react-native-purchases (RevenueCat) */

export const LOG_LEVEL = {
  VERBOSE: 'VERBOSE' as const,
  DEBUG: 'DEBUG' as const,
  INFO: 'INFO' as const,
  WARN: 'WARN' as const,
  ERROR: 'ERROR' as const,
};

const mockCustomerInfo = {
  entitlements: {
    active: {},
    all: {},
  },
  activeSubscriptions: [],
  allPurchasedProductIdentifiers: [],
  latestExpirationDate: null,
  firstSeen: '2026-01-01T00:00:00Z',
  originalAppUserId: 'test-user',
  requestDate: '2026-01-01T00:00:00Z',
  allExpirationDates: {},
  allPurchaseDates: {},
  originalApplicationVersion: null,
  originalPurchaseDate: null,
  managementURL: null,
  nonSubscriptionTransactions: [],
};

const Purchases = {
  setLogLevel: jest.fn(),
  configure: jest.fn(),
  getCustomerInfo: jest.fn().mockResolvedValue(mockCustomerInfo),
  purchasePackage: jest.fn().mockResolvedValue({ customerInfo: mockCustomerInfo }),
  restorePurchases: jest.fn().mockResolvedValue(mockCustomerInfo),
  getOfferings: jest.fn().mockResolvedValue({ current: { availablePackages: [] } }),
};

export default Purchases;

export type CustomerInfo = typeof mockCustomerInfo;
export type PurchasesPackage = {
  identifier: string;
  packageType: string;
  product: { identifier: string; priceString: string };
  offeringIdentifier: string;
};
