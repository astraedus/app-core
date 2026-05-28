export {
  configureNotifications,
  configureNotificationHandler,
  setupAndroidChannel,
  requestPermissions,
  scheduleMorningReminder,
  cancelMorningReminder,
  getScheduledNotifications,
  loadReminderPreferences,
  saveReminderPreferences,
  setMorningReminderEnabled,
  updateReminderTime,
} from './NotificationService';

export type {
  NotificationConfig,
  ReminderTime,
  ReminderPreferences,
} from './NotificationService';
