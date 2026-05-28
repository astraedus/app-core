/** Mock for expo-notifications */

export const AndroidImportance = {
  DEFAULT: 3,
  HIGH: 4,
  LOW: 2,
  MAX: 5,
  MIN: 1,
  NONE: 0,
};

export const SchedulableTriggerInputTypes = {
  DAILY: 'daily' as const,
  DATE: 'date' as const,
  TIME_INTERVAL: 'timeInterval' as const,
  WEEKLY: 'weekly' as const,
  YEARLY: 'yearly' as const,
  CALENDAR: 'calendar' as const,
};

export const setNotificationHandler = jest.fn();
export const setNotificationChannelAsync = jest.fn().mockResolvedValue(undefined);
export const getPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
export const requestPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
export const scheduleNotificationAsync = jest.fn().mockResolvedValue('notification-id');
export const cancelScheduledNotificationAsync = jest.fn().mockResolvedValue(undefined);
export const getAllScheduledNotificationsAsync = jest.fn().mockResolvedValue([]);
