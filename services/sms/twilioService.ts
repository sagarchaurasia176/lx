// services/sms/twilioService.ts - WORKING VERSION
import twilio from 'twilio';

export class TwilioSMSService {
  private client: twilio.Twilio;
  private fromNumber: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Missing required Twilio environment variables');
    }

    // FIXED: Remove any spaces from the from number
    this.fromNumber = fromNumber.replace(/\s/g, '');
    
    // FIXED: Validate credentials format
    if (!accountSid.startsWith('AC') && !accountSid.startsWith('SK')) {
      throw new Error('Invalid TWILIO_ACCOUNT_SID format');
    }
    
    this.client = twilio(accountSid, authToken);
    
    console.log('Twilio initialized with:', {
      accountSid: accountSid.substring(0, 10) + '...',
      fromNumber: this.fromNumber
    });
  }

  async sendOTP(to: string, otp: string): Promise<{
    success: boolean;
    message?: string;
    messageId?: string;
    errorCode?: string;
    moreInfo?: string;
  }> {
    try {
      console.log(`Sending OTP via Twilio:`);
      console.log(`  To: ${to}`);
      console.log(`  From: ${this.fromNumber}`);
      console.log(`  OTP: ${otp}`);
      
      const message = await this.client.messages.create({
        body: `Your OTP verification code is: ${otp}. This code will expire in 10 minutes. Do not share this code with anyone.`,
        from: this.fromNumber,
        to: to,
      });

      console.log('✅ Twilio SMS sent successfully:', {
        messageId: message.sid,
        status: message.status,
        to: message.to,
        from: message.from
      });
      
      return {
        success: true,
        messageId: message.sid,
        message: 'OTP sent successfully'
      };
      
    } catch (error: any) {
      console.error('❌ Twilio SMS Error:', {
        error: error.message,
        code: error.code,
        moreInfo: error.moreInfo,
        status: error.status,
        to: to,
        from: this.fromNumber
      });
      
      return {
        success: false,
        message: error.message || 'Failed to send SMS',
        errorCode: error.code,
        moreInfo: error.moreInfo
      };
    }
  }

  async getMessageStatus(messageId: string): Promise<{
    success: boolean;
    status?: string;
    dateCreated?: string;
    dateSent?: string;
    dateUpdated?: string;
    errorCode?: string;
    errorMessage?: string;
    error?: string;
  }> {
    try {
      const message = await this.client.messages(messageId).fetch();
      
      return {
        success: true,
        status: message.status,
        dateCreated: message.dateCreated?.toISOString(),
        dateSent: message.dateSent?.toISOString(),
        dateUpdated: message.dateUpdated?.toISOString(),
        errorCode: message.errorCode?.toString(),
        errorMessage: message.errorMessage,
      };
      
    } catch (error: any) {
      console.error('Error fetching message status:', error);
      
      return {
        success: false,
        error: error.message || 'Failed to fetch message status'
      };
    }
  }
}

// Alternative initialization if you want to test credentials
export const testTwilioConnection = async (): Promise<boolean> => {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      console.error('Missing Twilio credentials');
      return false;
    }
    
    const client = twilio(accountSid, authToken);
    
    // Test by fetching account info
    const account = await client.api.accounts(accountSid).fetch();
    
    console.log('✅ Twilio connection successful:', {
      accountSid: account.sid,
      friendlyName: account.friendlyName,
      status: account.status
    });
    
    return true;
    
  } catch (error: any) {
    console.error('❌ Twilio connection failed:', {
      error: error.message,
      code: error.code,
      moreInfo: error.moreInfo
    });
    
    return false;
  }
};