import * as fs from 'fs';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import {
  CallLogsData,
  SMSLogsData,
  NormalizedCallLog,
  NormalizedSMSLog,
} from './types';

const parseXML = promisify(parseString);

/**
 * Maps call type number to readable string
 * Based on Android call log types:
 * 1 = Incoming, 2 = Outgoing, 3 = Missed, 4 = Voicemail, 5 = Rejected, 6 = Blocked
 */
function mapCallType(type: number): NormalizedCallLog['callType'] {
  const typeMap: Record<number, NormalizedCallLog['callType']> = {
    1: 'incoming',
    2: 'outgoing',
    3: 'missed',
    5: 'rejected',
    6: 'blocked'
  };
  return typeMap[type] || 'unknown';
}

/**
 * Maps SMS type number to readable string
 * Based on Android SMS types:
 * 1 = Received, 2 = Sent, 3 = Draft, 4 = Outbox, 5 = Failed, 6 = Queued
 */
function mapSMSType(type: number): NormalizedSMSLog['messageType'] {
  const typeMap: Record<number, NormalizedSMSLog['messageType']> = {
    1: 'received',
    2: 'sent',
    3: 'draft',
    4: 'outbox',
    5: 'failed',
    6: 'queued'
  };
  return typeMap[type] || 'unknown';
}

/**
 * Normalizes a single call log entry
 */
function normalizeCallLog(call: any): NormalizedCallLog {
  return {
    phoneNumber: call.$.number || call.number || '',
    durationSeconds: parseInt(call.$.duration || call.duration || '0'),
    timestamp: parseInt(call.$.date || call.date || '0'),
    callType: mapCallType(parseInt(call.$.type || call.type || '0')),
    contactName: call.$.contact_name || call.contact_name || '(Unknown)',
    readableDate: call.$.readable_date || call.readable_date || ''
  };
}

/**
 * Normalizes a single SMS log entry
 */
function normalizeSMSLog(sms: any): NormalizedSMSLog {
  return {
    phoneNumber: sms.$.address || sms.address || '',
    timestamp: parseInt(sms.$.date || sms.date || '0'),
    messageType: mapSMSType(parseInt(sms.$.type || sms.type || '0')),
    body: sms.$.body || sms.body || '',
    contactName: sms.$.contact_name || sms.contact_name || '(Unknown)',
    readableDate: sms.$.readable_date || sms.readable_date || '',
    isRead: (sms.$.read || sms.read || '0') === '1'
  };
}

/**
 * Parses the call logs XML file
 */
export async function parseCallLogs(filePath: string): Promise<NormalizedCallLog[]> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.warn(`Call logs file not found at: ${filePath}`);
      console.warn('Skipping call logs parsing...');
      return [];
    }

    const xmlContent = fs.readFileSync(filePath, 'utf-8');
    const result = await parseXML(xmlContent) as CallLogsData;

    if (!result.calls || !result.calls.call) {
      console.warn('No call logs found in the file');
      return [];
    }

    const calls = Array.isArray(result.calls.call)
      ? result.calls.call
      : [result.calls.call];

    return calls.map(normalizeCallLog);
  } catch (error) {
    console.error('Error parsing call logs:', error);
    console.warn('Continuing without call logs...');
    return [];
  }
}

/**
 * Parses the SMS logs XML file
 */
export async function parseSMSLogs(filePath: string): Promise<NormalizedSMSLog[]> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.warn(`SMS logs file not found at: ${filePath}`);
      console.warn('Skipping SMS logs parsing...');
      return [];
    }

    const xmlContent = fs.readFileSync(filePath, 'utf-8');
    const result = await parseXML(xmlContent) as SMSLogsData;

    if (!result.smses || !result.smses.sms) {
      console.warn('No SMS logs found in the file');
      return [];
    }

    const smsMessages = Array.isArray(result.smses.sms)
      ? result.smses.sms
      : [result.smses.sms];

    return smsMessages.map(normalizeSMSLog);
  } catch (error) {
    console.error('Error parsing SMS logs:', error);
    console.warn('Continuing without SMS logs...');
    return [];
  }
}

/**
 * Parses both call logs and SMS logs
 */
export async function parseAllLogs(callLogsPath: string, smsLogsPath: string) {
  const [callLogs, smsLogs] = await Promise.all([
    parseCallLogs(callLogsPath),
    parseSMSLogs(smsLogsPath)
  ]);

  return {
    callLogs,
    smsLogs,
    summary: {
      totalCalls: callLogs.length,
      totalSMS: smsLogs.length,
      callsByType: {
        incoming: callLogs.filter(c => c.callType === 'incoming').length,
        outgoing: callLogs.filter(c => c.callType === 'outgoing').length,
        missed: callLogs.filter(c => c.callType === 'missed').length,
        rejected: callLogs.filter(c => c.callType === 'rejected').length,
        blocked: callLogs.filter(c => c.callType === 'blocked').length
      },
      smsByType: {
        received: smsLogs.filter(s => s.messageType === 'received').length,
        sent: smsLogs.filter(s => s.messageType === 'sent').length,
        draft: smsLogs.filter(s => s.messageType === 'draft').length
      }
    }
  };
}
