/**
 * Tests for NotificationService.
 * Validates configuration gating, preference persistence, and notification scheduling.
 */

// Mocks must be set up before imports
jest.mock('expo-notifications');
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));
jest.mock('@react-native-async-storage/async-storage');

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage v3 types don't expose multiGet/multiSet on the default export,
// but the runtime implementation supports them. Cast to any for mock access.
const storage = AsyncStorage as any;
import {
  configureNotifications,
  configureNotificationHandler,
  setupAndroidChannel,
  requestPermissions,
  scheduleMorningReminder,
  cancelMorningReminder,
  loadReminderPreferences,
  saveReminderPreferences,
  setMorningReminderEnabled,
  updateReminderTime,
  type NotificationConfig,
} from '../NotificationService';

const TEST_CONFIG: NotificationConfig = {
  storagePrefix: '@test-app',
  channelId: 'test-reminders',
  channelName: 'Test Reminders',
  appName: 'Test App',
  messages: ['Message 1', 'Message 2'],
  accentColor: '#FF0000',
};

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear AsyncStorage mock state
    (storage.clear as jest.Mock).mockImplementation(async () => {});
    // Always configure before each test
    configureNotifications(TEST_CONFIG);
  });

  describe('configureNotifications', () => {
    it('stores config so subsequent calls succeed', async () => {
      // If config wasn't stored, this would throw
      await expect(scheduleMorningReminder(8, 0)).resolves.not.toThrow();
    });

    it('rejects empty message lists', () => {
      expect(() =>
        configureNotifications({
          ...TEST_CONFIG,
          messages: [],
        }),
      ).toThrow(/messages/);
    });

    it('rejects blank required config fields', () => {
      expect(() =>
        configureNotifications({
          ...TEST_CONFIG,
          channelId: '   ',
        }),
      ).toThrow(/channelId/);
    });
  });

  describe('configureNotificationHandler', () => {
    it('calls Notifications.setNotificationHandler', () => {
      configureNotificationHandler();
      expect(Notifications.setNotificationHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('setupAndroidChannel', () => {
    it('creates an Android notification channel', async () => {
      await setupAndroidChannel();
      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
        TEST_CONFIG.channelId,
        expect.objectContaining({
          name: TEST_CONFIG.channelName,
          importance: Notifications.AndroidImportance.HIGH,
          lightColor: TEST_CONFIG.accentColor,
        }),
      );
    });
  });

  describe('requestPermissions', () => {
    it('returns true when already granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
      });
      const result = await requestPermissions();
      expect(result).toBe(true);
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('requests permissions when not yet granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
      });

      const result = await requestPermissions();
      expect(result).toBe(true);
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('returns false when permission denied', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      });

      const result = await requestPermissions();
      expect(result).toBe(false);
    });
  });

  describe('scheduleMorningReminder', () => {
    it('cancels existing reminder before scheduling', async () => {
      await scheduleMorningReminder(9, 30);
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
        'morning-reminder',
      );
    });

    it('schedules a daily notification', async () => {
      await scheduleMorningReminder(9, 30);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: 'morning-reminder',
          content: expect.objectContaining({
            title: TEST_CONFIG.appName,
          }),
          trigger: expect.objectContaining({
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 9,
            minute: 30,
          }),
        }),
      );
    });

    it('uses a message from config', async () => {
      await scheduleMorningReminder(7, 0);
      const callArg = (Notifications.scheduleNotificationAsync as jest.Mock).mock
        .calls[0][0];
      expect(TEST_CONFIG.messages).toContain(callArg.content.body);
    });

    it('rejects out-of-range reminder times', async () => {
      await expect(scheduleMorningReminder(24, 0)).rejects.toThrow(/Reminder time/);
      await expect(scheduleMorningReminder(9, 60)).rejects.toThrow(/Reminder time/);
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });
  });

  describe('cancelMorningReminder', () => {
    it('cancels the morning-reminder notification', async () => {
      await cancelMorningReminder();
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
        'morning-reminder',
      );
    });
  });

  describe('loadReminderPreferences', () => {
    it('returns defaults when nothing stored', async () => {
      (storage.multiGet as jest.Mock).mockResolvedValueOnce([
        ['@test-app/reminder-enabled', null],
        ['@test-app/reminder-time', null],
      ]);

      const prefs = await loadReminderPreferences();
      expect(prefs).toEqual({
        enabled: false,
        time: { hour: 7, minute: 30 },
      });
    });

    it('returns stored preferences', async () => {
      (storage.multiGet as jest.Mock).mockResolvedValueOnce([
        ['@test-app/reminder-enabled', 'true'],
        ['@test-app/reminder-time', '{"hour":8,"minute":15}'],
      ]);

      const prefs = await loadReminderPreferences();
      expect(prefs).toEqual({
        enabled: true,
        time: { hour: 8, minute: 15 },
      });
    });

    it('returns defaults on invalid JSON in storage', async () => {
      (storage.multiGet as jest.Mock).mockResolvedValueOnce([
        ['@test-app/reminder-enabled', 'true'],
        ['@test-app/reminder-time', 'not-json'],
      ]);

      const prefs = await loadReminderPreferences();
      expect(prefs.time).toEqual({ hour: 7, minute: 30 });
    });

    it('rejects out-of-range time values', async () => {
      (storage.multiGet as jest.Mock).mockResolvedValueOnce([
        ['@test-app/reminder-enabled', 'false'],
        ['@test-app/reminder-time', '{"hour":25,"minute":70}'],
      ]);

      const prefs = await loadReminderPreferences();
      expect(prefs.time).toEqual({ hour: 7, minute: 30 });
    });

    it('rejects fractional time values from storage', async () => {
      (storage.multiGet as jest.Mock).mockResolvedValueOnce([
        ['@test-app/reminder-enabled', 'false'],
        ['@test-app/reminder-time', '{"hour":7.5,"minute":0}'],
      ]);

      const prefs = await loadReminderPreferences();
      expect(prefs.time).toEqual({ hour: 7, minute: 30 });
    });
  });

  describe('saveReminderPreferences', () => {
    it('persists preferences to AsyncStorage', async () => {
      await saveReminderPreferences({
        enabled: true,
        time: { hour: 6, minute: 0 },
      });

      expect(storage.multiSet).toHaveBeenCalledWith([
        ['@test-app/reminder-enabled', 'true'],
        ['@test-app/reminder-time', '{"hour":6,"minute":0}'],
      ]);
    });
  });

  describe('setMorningReminderEnabled', () => {
    it('enables: requests permissions, sets up channel, schedules, persists', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
      });

      const result = await setMorningReminderEnabled(true, { hour: 8, minute: 0 });
      expect(result).toBe(true);
      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalled();
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
      expect(storage.multiSet).toHaveBeenCalled();
    });

    it('returns false when permissions denied', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      });

      const result = await setMorningReminderEnabled(true);
      expect(result).toBe(false);
    });

    it('disables: cancels notification and persists', async () => {
      const result = await setMorningReminderEnabled(false);
      expect(result).toBe(true);
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
        'morning-reminder',
      );
      expect(storage.multiSet).toHaveBeenCalled();
    });
  });

  describe('updateReminderTime', () => {
    it('saves new time and reschedules if enabled', async () => {
      (storage.multiGet as jest.Mock).mockResolvedValueOnce([
        ['@test-app/reminder-enabled', 'true'],
        ['@test-app/reminder-time', '{"hour":7,"minute":0}'],
      ]);

      await updateReminderTime({ hour: 9, minute: 15 });

      expect(storage.multiSet).toHaveBeenCalled();
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
    });

    it('saves new time without rescheduling if disabled', async () => {
      (storage.multiGet as jest.Mock).mockResolvedValueOnce([
        ['@test-app/reminder-enabled', 'false'],
        ['@test-app/reminder-time', '{"hour":7,"minute":0}'],
      ]);

      await updateReminderTime({ hour: 10, minute: 0 });

      expect(storage.multiSet).toHaveBeenCalled();
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('rejects invalid new times before persisting', async () => {
      await expect(updateReminderTime({ hour: 8, minute: -1 })).rejects.toThrow(
        /Reminder time/,
      );
      expect(storage.multiSet).not.toHaveBeenCalled();
    });
  });
});
