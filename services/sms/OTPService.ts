// Export the OTPService class to make this file a module
export class OTPService {
  /**
   * Generate a 6-digit OTP
   */
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Create OTP data object with expiration time
   */
  createOTPData(otp: string, contact: string): {
    otp: string;
    expiresAt: Date;
    attempts: number;
    contact: string;
  } {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry
    
    return {
      otp,
      expiresAt,
      attempts: 0,
      contact,
    };
  }

  /**
   * Check if OTP has expired
   */
  isOTPExpired(otpData: {
    otp: string;
    expiresAt: Date;
    attempts: number;
    contact: string;
  }): boolean {
    return new Date() > otpData.expiresAt;
  }

  /**
   * Check if maximum attempts reached
   */
  isMaxAttemptsReached(otpData: {
    otp: string;
    expiresAt: Date;
    attempts: number;
    contact: string;
  }): boolean {
    return otpData.attempts >= 3; // Maximum 3 attempts
  }

  /**
   * Validate OTP format (6 digits)
   */
  validateOTPFormat(otp: string): boolean {
    return /^\d{6}$/.test(otp);
  }

  /**
   * Get remaining time for OTP expiry in minutes
   */
  getRemainingTime(otpData: {
    otp: string;
    expiresAt: Date;
    attempts: number;
    contact: string;
  }): number {
    return Math.ceil((otpData.expiresAt.getTime() - Date.now()) / 1000 / 60);
  }
}