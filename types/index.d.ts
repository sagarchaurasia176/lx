
// types/index.ts
export interface OTPData {
  otp: string;
  contact: string;
  expiresAt: Date;
  attempts: number;
}

export interface User {
  email: string;
  name: string;
  contact: string | null;
  isContactVerified: boolean;
}

export interface PhoneEmailResponse {
  success: boolean;
  message: string;
  data?: any;
}
