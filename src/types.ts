// Call log types
export interface CallLog {
  number: string;
  duration: number;
  date: number;
  type: number;
  presentation: number;
  subscription_id: number;
  post_dial_digits: string;
  subscription_component_name: string;
  readable_date: string;
  contact_name: string;
}

export interface CallLogsData {
  calls: {
    $: {
      count: string;
      backup_set: string;
      backup_date: string;
      type: string;
    };
    call: CallLog[];
  };
}

// SMS log types
export interface SMSLog {
  protocol?: string;
  address: string;
  date: number;
  type: number;
  subject?: string;
  body: string;
  toa?: string;
  sc_toa?: string;
  service_center?: string;
  read: number;
  status: number;
  locked: number;
  date_sent: number;
  sub_id: number;
  readable_date: string;
  contact_name: string;
  // Additional fields for newer format
  predefined_id?: string;
  imdn_message_id?: string;
  updated_timestamp?: string;
  delivered_timestamp?: string;
  message_type?: string;
  recipients?: string;
  seen?: string;
  content_type?: string;
  sim_slot?: string;
  creator?: string;
  session_id?: string;
  service_type?: string;
  s_chat?: string;
}

export interface SMSLogsData {
  smses: {
    $: {
      count: string;
      backup_set: string;
      backup_date: string;
      type: string;
    };
    sms: SMSLog[];
  };
}

// CSV Call Log types
export interface CSVCallLogRow {
  Name: string;
  Phone: string;
  Date: string;
  Type: string;
  'Duration(HH:MM:SS)': string;
  'Duration(secs)': string;
  SIM: string;
}

// Normalized types for API
export interface NormalizedCallLog {
  phoneNumber: string;
  durationSeconds: number;
  timestamp: number;
  callType: 'incoming' | 'outgoing' | 'missed' | 'rejected' | 'blocked' | 'unknown';
  contactName: string;
  readableDate: string;
}

export interface NormalizedSMSLog {
  phoneNumber: string;
  timestamp: number;
  messageType: 'received' | 'sent' | 'draft' | 'outbox' | 'failed' | 'queued' | 'unknown';
  body: string;
  contactName: string;
  readableDate: string;
  isRead: boolean;
}
