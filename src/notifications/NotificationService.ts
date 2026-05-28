/**
 * Core notification service -- schedules and manages local push notifications.
 * Fully reusable across apps. Call configureNotifications() at app startup
 * with app-specific config before using any other function.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── App-specific config (set at startup via configureNotifications) ────────────

export interface NotificationConfig {
  storagePrefix: string;
  channelId: string;
  channelName: string;
  appName: string;
  messages: readonly string[];
  accentColor: string;
}

let _config: NotificationConfig | null = null;

function assertNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`NotificationConfig.${fieldName} must not be empty.`);
  }
}

function validateNotificationConfig(config: NotificationConfig): void {
  assertNonEmptyString(config.storagePrefix, 'storagePrefix');
  assertNonEmptyString(config.channelId, 'channelId');
  assertNonEmptyString(config.channelName, 'channelName');
  assertNonEmptyString(config.appName, 'appName');
  assertNonEmptyString(config.accentColor, 'accentColor');

  if (config.messages.length === 0) {
    throw new Error('NotificationConfig.messages must contain at least one message.');
  }
  for (const message of config.messages) {
    assertNonEmptyString(message, 'messages[]');
  }
}

function getConfig(): NotificationConfig {
  if (!_config) {
    throw new Error(
      'NotificationService not configured. Call configureNotifications() at app startup.',
    );
  }
  return _config;
}

/**
 * Initialize the notification service with app-specific config.
 * Must be called once at app startup (e.g. in _layout.tsx) before
 * any other notification functions are used.
 */
export function configureNotifications(config: NotificationConfig): void {
  validateNotificationConfig(config);
  _config = {
    ...config,
    messages: [...config.messages],
  };
}

// ── Derived storage keys and identifiers ──────────────────────────────────────

function storageKeys() {
  const cfg = getConfig();
  return {
    reminderEnabled: `${cfg.storagePrefix}/reminder-enabled`,
    reminderTime: `${cfg.storagePrefix}/reminder-time`,
  } as const;
}

const MORNING_REMINDER_ID = 'morning-reminder';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ReminderTime {
  hour: number;   // 0-23
  minute: number; // 0-59
}

export interface ReminderPreferences {
  enabled: boolean;
  time: ReminderTime;
}

const DEFAULT_TIME: ReminderTime = { hour: 7, minute: 30 };

function isValidReminderTime(time: ReminderTime): boolean {
  return (
    Number.isInteger(time.hour) &&
    Number.isInteger(time.minute) &&
    time.hour >= 0 &&
    time.hour <= 23 &&
    time.minute >= 0 &&
    time.minute <= 59
  );
}

function assertValidReminderTime(time: ReminderTime): void {
  if (!isValidReminderTime(time)) {
    throw new RangeError('Reminder time must use integer hour 0-23 and minute 0-59.');
  }
}

// ── Notification handler setup (call once at app start) ────────────────────────

export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// ── Android channel setup ──────────────────────────────────────────────────────

export async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const cfg = getConfig();
  await Notifications.setNotificationChannelAsync(cfg.channelId, {
    name: cfg.channelName,
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: cfg.accentColor,
  });
}

// ── Permissions ────────────────────────────────────────────────────────────────

export async function requestPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ── Schedule / cancel ──────────────────────────────────────────────────────────

export async function scheduleMorningReminder(
  hour: number,
  minute: number,
): Promise<void> {
  assertValidReminderTime({ hour, minute });

  // Cancel any existing morning reminder before scheduling a new one
  await cancelMorningReminder();

  const cfg = getConfig();
  const message = cfg.messages[Math.floor(Math.random() * cfg.messages.length)];

  await Notifications.scheduleNotificationAsync({
    identifier: MORNING_REMINDER_ID,
    content: {
      title: cfg.appName,
      body: message,
      ...(Platform.OS === 'android' && { channelId: cfg.channelId }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: Platform.OS === 'android' ? cfg.channelId : undefined,
    },
  });
}

export async function cancelMorningReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(MORNING_REMINDER_ID);
}

export async function getScheduledNotifications() {
  return Notifications.getAllScheduledNotificationsAsync();
}

// ── Preferences persistence ────────────────────────────────────────────────────

export async function loadReminderPreferences(): Promise<ReminderPreferences> {
  const keys = storageKeys();
  const [enabledRaw, timeRaw] = await AsyncStorage.multiGet([
    keys.reminderEnabled,
    keys.reminderTime,
  ]);

  const enabled = enabledRaw[1] === 'true';
  let time = DEFAULT_TIME;

  if (timeRaw[1]) {
    try {
      const parsed = JSON.parse(timeRaw[1]) as ReminderTime;
      if (isValidReminderTime(parsed)) {
        time = parsed;
      }
    } catch {
      // Invalid JSON -- use default
    }
  }

  return { enabled, time };
}

export async function saveReminderPreferences(
  prefs: ReminderPreferences,
): Promise<void> {
  const keys = storageKeys();
  await AsyncStorage.multiSet([
    [keys.reminderEnabled, String(prefs.enabled)],
    [keys.reminderTime, JSON.stringify(prefs.time)],
  ]);
}

// ── High-level toggle ──────────────────────────────────────────────────────────

/**
 * Enable or disable the morning reminder. Handles permissions, scheduling,
 * and persistence in one call.
 *
 * Returns whether the operation succeeded (permissions may be denied).
 */
export async function setMorningReminderEnabled(
  enabled: boolean,
  time: ReminderTime = DEFAULT_TIME,
): Promise<boolean> {
  assertValidReminderTime(time);

  if (enabled) {
    const granted = await requestPermissions();
    if (!granted) return false;

    await setupAndroidChannel();
    await scheduleMorningReminder(time.hour, time.minute);
  } else {
    await cancelMorningReminder();
  }

  await saveReminderPreferences({ enabled, time });
  return true;
}

/**
 * Update just the reminder time (reschedules if currently enabled).
 */
export async function updateReminderTime(time: ReminderTime): Promise<void> {
  assertValidReminderTime(time);

  const prefs = await loadReminderPreferences();
  prefs.time = time;
  await saveReminderPreferences(prefs);

  if (prefs.enabled) {
    await scheduleMorningReminder(time.hour, time.minute);
  }
}
