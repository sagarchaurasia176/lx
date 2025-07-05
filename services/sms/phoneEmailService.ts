import twilio from 'twilio';
import { config } from '../../config/environment';
import { SmsResponse, SMSProvider } from '../../types/sms.types';

export class PhoneEmailService implements SMSProvider {
    private client: twilio.Twilio;
    private fromPhone: string;

    constructor() {
        this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
        this.fromPhone = config.twilio.fromNumber;
    }

    async sendSMS(phoneNumber: string, message: string): Promise<SmsResponse> {
        try {
            const response = await this.client.messages.create({
                body: message,
                from: this.fromPhone,
                to: phoneNumber,
            });

            return {
                success: true,
                message: 'SMS sent successfully',
                data: response,
            };
        } catch (error: any) {
            console.error('SMS sending error:', error.message);
            return {
                success: false,
                message: error.message || 'Failed to send SMS',
            };
        }
    }

    async sendVerificationOTP(phoneNumber: string, otp: string): Promise<SmsResponse> {
        const message = `Your verification code is: ${otp}`;
        return this.sendSMS(phoneNumber, message);
    }
}
