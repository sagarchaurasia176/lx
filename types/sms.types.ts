import { Request } from 'express';

// Authenticated Request Extension
export interface AuthenticatedRequest extends Request {
  user?: {
    email: string;
    id?: string;
  };
}

// OTP Structure
export interface OTPData {
  otp: string;
  contact: string;
  expiresAt: Date;
  attempts: number;
}

// SMS Send Response Format
export interface SmsResponse {
  success: boolean;
  message?: string;
  messageId?: string;
  error?: string;
  data?: any; // optional, for things like Twilio response object
}

// Status Check Structure
export interface MessageStatus {
  success: boolean;
  status?: string;
  dateCreated?: Date;
  dateSent?: Date;
  dateUpdated?: Date;
  errorCode?: string;
  errorMessage?: string;
  error?: string;
}

// SMS Provider Interface
export interface SMSProvider {
  sendSMS(phoneNumber: string, message: string): Promise<SmsResponse>;
  sendVerificationOTP(phoneNumber: string, otp: string): Promise<SmsResponse>;
}
