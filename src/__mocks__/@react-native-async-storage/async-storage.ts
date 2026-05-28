/** Mock for @react-native-async-storage/async-storage */

const store: Record<string, string> = {};

const AsyncStorage = {
  getItem: jest.fn(async (key: string) => store[key] ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: jest.fn(async (key: string) => {
    delete store[key];
  }),
  multiGet: jest.fn(async (keys: string[]) =>
    keys.map((key) => [key, store[key] ?? null] as [string, string | null]),
  ),
  multiSet: jest.fn(async (pairs: [string, string][]) => {
    for (const [key, value] of pairs) {
      store[key] = value;
    }
  }),
  clear: jest.fn(async () => {
    for (const key of Object.keys(store)) {
      delete store[key];
    }
  }),
};

export default AsyncStorage;
