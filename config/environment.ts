// config/environment.ts
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  app: {
    name: process.env.APP_NAME || 'Your App',
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '4000', 10),
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_FROM_NUMBER || '',
  },
  
  otp: {
    expirationMinutes: parseInt(process.env.OTP_EXPIRATION_MINUTES || '10', 10),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10),
    length: parseInt(process.env.OTP_LENGTH || '6', 10),
  },
  
  sms: {
    provider: process.env.SMS_PROVIDER || 'twilio', // 'twilio' or 'custom'
    fallbackEnabled: process.env.SMS_FALLBACK_ENABLED === 'true',
  },
};

// Validate required environment variables
const requiredEnvVars = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_FROM_NUMBER',
];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}