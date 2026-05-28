/**
 * Tests that NotificationService throws before configureNotifications() is called.
 * Isolated in its own file to get a fresh module state without interference.
 */

jest.mock('expo-notifications');
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));
jest.mock('@react-native-async-storage/async-storage');

// Import WITHOUT calling configureNotifications first
import { loadReminderPreferences } from '../NotificationService';

describe('NotificationService (unconfigured)', () => {
  it('throws "not configured" when calling functions before configure', async () => {
    await expect(loadReminderPreferences()).rejects.toThrow(/not configured/i);
  });
});
