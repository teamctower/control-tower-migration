import * as fs from 'fs';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import { parse } from 'csv-parse/sync';
import {
  CallLogsData,
  SMSLogsData,
  NormalizedCallLog,
  NormalizedSMSLog,
  CSVCallLogRow,
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
 * Maps CSV call type string to normalized call type
 * Based on CSV format: Incoming, Outgoing, Missed, Declined, Blocked
 */
function mapCSVCallType(type: string): NormalizedCallLog['callType'] {
  const normalizedType = type.toLowerCase().trim();
  const typeMap: Record<string, NormalizedCallLog['callType']> = {
    'incoming': 'incoming',
    'outgoing': 'outgoing',
    'missed': 'missed',
    'declined': 'rejected',
    'blocked': 'blocked'
  };
  return typeMap[normalizedType] || 'unknown';
}

/**
 * Parses duration string in format HH:MM:SS to seconds
 */
function parseDurationToSeconds(duration: string): number {
  const parts = duration.split(':').map(p => parseInt(p, 10));
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }
  return 0;
}

/**
 * Parses CSV date string to Unix timestamp
 * Format: "MM/DD/YY HH:MM:SS"
 */
function parseCSVDate(dateStr: string): number {
  try {
    // Parse date in format "10/28/25 12:45:18"
    const [datePart, timePart] = dateStr.split(' ');
    const [month, day, year] = datePart.split('/').map(n => parseInt(n, 10));
    const [hours, minutes, seconds] = timePart.split(':').map(n => parseInt(n, 10));

    // Assume 20xx for year (2025, not 1925)
    const fullYear = 2000 + year;

    const date = new Date(fullYear, month - 1, day, hours, minutes, seconds);
    return date.getTime();
  } catch (error) {
    console.error('Error parsing CSV date:', dateStr, error);
    return 0;
  }
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
 * Parses CSV call logs file (Calllog-export.csv format)
 */
export async function parseCSVCallLogs(filePath: string): Promise<NormalizedCallLog[]> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.warn(`CSV call logs file not found at: ${filePath}`);
      console.warn('Skipping CSV call logs parsing...');
      return [];
    }

    const csvContent = fs.readFileSync(filePath, 'utf-8');

    // Parse CSV with header
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as CSVCallLogRow[];

    // Normalize CSV records to NormalizedCallLog format
    return records.map(record => {
      const durationSeconds = parseDurationToSeconds(record['Duration(HH:MM:SS)']);
      const timestamp = parseCSVDate(record.Date);

      return {
        phoneNumber: record.Phone || '',
        durationSeconds,
        timestamp,
        callType: mapCSVCallType(record.Type),
        contactName: record.Name || '(Unknown)',
        readableDate: record.Date
      };
    });
  } catch (error) {
    console.error('Error parsing CSV call logs:', error);
    console.warn('Continuing without CSV call logs...');
    return [];
  }
}

/**
 * Parses both call logs and SMS logs
 */
export async function parseAllLogs(callLogsPath: string, smsLogsPath: string, csvCallLogsPath?: string) {
  // Parse XML logs
  const [callLogs, smsLogs] = await Promise.all([
    parseCallLogs(callLogsPath),
    parseSMSLogs(smsLogsPath)
  ]);

  // Parse CSV logs if path is provided
  const csvCallLogs = csvCallLogsPath ? await parseCSVCallLogs(csvCallLogsPath) : [];

  // Merge XML and CSV call logs
  const allCallLogs = [...callLogs, ...csvCallLogs];

  return {
    callLogs: allCallLogs,
    smsLogs,
    summary: {
      totalCalls: allCallLogs.length,
      totalSMS: smsLogs.length,
      callsByType: {
        incoming: allCallLogs.filter(c => c.callType === 'incoming').length,
        outgoing: allCallLogs.filter(c => c.callType === 'outgoing').length,
        missed: allCallLogs.filter(c => c.callType === 'missed').length,
        rejected: allCallLogs.filter(c => c.callType === 'rejected').length,
        blocked: allCallLogs.filter(c => c.callType === 'blocked').length
      },
      smsByType: {
        received: smsLogs.filter(s => s.messageType === 'received').length,
        sent: smsLogs.filter(s => s.messageType === 'sent').length,
        draft: smsLogs.filter(s => s.messageType === 'draft').length
      }
    }
  };
}
