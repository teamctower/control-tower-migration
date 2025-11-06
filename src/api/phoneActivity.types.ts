// Phone Activity Types based on the PhoneActivity entity

export type PhoneActivityType =
  | "incoming-missed-call"
  | "incoming-rejected-call"
  | "incoming-answered-call"
  | "outgoing-missed-call"
  | "outgoing-answered-call"
  | "incoming-sms"
  | "outgoing-sms";

export type PhoneActivityStatus = "open" | "done" | "ignored";

export interface PhoneActivityPayload {
  phoneNumber: string;
  type: PhoneActivityType;
  duration?: number;
  content?: string;
  timestamp: string; // ISO 8601 format
  status?: PhoneActivityStatus;
}

export interface DataStreamRequest {
  activity: PhoneActivityPayload[];
}

export interface DataStreamResponse {
  statusCode: number;
  message?: string;
  data: boolean;
}
