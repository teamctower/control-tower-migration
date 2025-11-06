import { NormalizedCallLog, NormalizedSMSLog } from '../types';
import { PhoneActivityPayload, PhoneActivityType } from '../api/phoneActivity.types';

/**
 * Maps call type to PhoneActivity type
 */
function mapCallTypeToActivityType(
  callType: NormalizedCallLog['callType'],
  duration: number
): PhoneActivityType {
  switch (callType) {
    case 'incoming':
      return 'incoming-answered-call';
    case 'outgoing':
      return duration > 0 ? 'outgoing-answered-call' : 'outgoing-missed-call';
    case 'missed':
      return 'incoming-missed-call';
    case 'rejected':
      return 'incoming-rejected-call';
    case 'blocked':
      return 'incoming-rejected-call'; // Treat blocked as rejected
    default:
      // Default to incoming-missed-call for unknown types
      return 'incoming-missed-call';
  }
}

/**
 * Maps SMS message type to PhoneActivity type
 */
function mapSMSTypeToActivityType(
  messageType: NormalizedSMSLog['messageType']
): PhoneActivityType {
  switch (messageType) {
    case 'received':
      return 'incoming-sms';
    case 'sent':
      return 'outgoing-sms';
    default:
      // Default to incoming-sms for drafts and other types
      return 'incoming-sms';
  }
}

/**
 * Converts Unix timestamp (milliseconds) to ISO 8601 string
 */
function timestampToISO(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

/**
 * Converts a normalized call log to PhoneActivity format
 */
export function mapCallLogToPhoneActivity(
  callLog: NormalizedCallLog
): PhoneActivityPayload {
  return {
    phoneNumber: callLog.phoneNumber,
    type: mapCallTypeToActivityType(callLog.callType, callLog.durationSeconds),
    duration: callLog.durationSeconds,
    timestamp: timestampToISO(callLog.timestamp),
    status: 'open', // Default status for new activities
  };
}

/**
 * Converts a normalized SMS log to PhoneActivity format
 */
export function mapSMSLogToPhoneActivity(
  smsLog: NormalizedSMSLog
): PhoneActivityPayload {
  return {
    phoneNumber: smsLog.phoneNumber,
    type: mapSMSTypeToActivityType(smsLog.messageType),
    content: smsLog.body,
    timestamp: timestampToISO(smsLog.timestamp),
    status: 'open', // Default status for new activities
  };
}

/**
 * Converts arrays of call logs and SMS logs to PhoneActivity format
 */
export function mapLogsToPhoneActivities(
  callLogs: NormalizedCallLog[],
  smsLogs: NormalizedSMSLog[]
): PhoneActivityPayload[] {
  const activities: PhoneActivityPayload[] = [];

  // Map call logs
  for (const callLog of callLogs) {
    try {
      activities.push(mapCallLogToPhoneActivity(callLog));
    } catch (error) {
      console.error('Error mapping call log:', callLog, error);
    }
  }

  // Map SMS logs
  for (const smsLog of smsLogs) {
    try {
      activities.push(mapSMSLogToPhoneActivity(smsLog));
    } catch (error) {
      console.error('Error mapping SMS log:', smsLog, error);
    }
  }

  // Sort by timestamp (oldest first)
  activities.sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return activities;
}
