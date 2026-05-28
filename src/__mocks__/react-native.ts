/** Mock for react-native */

export const Platform = {
  OS: 'android' as 'android' | 'ios' | 'web',
  select: jest.fn((obj: Record<string, unknown>) => obj.android ?? obj.default),
};
