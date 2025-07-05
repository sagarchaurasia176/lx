// controllers/api/otp/otpController.ts - WORKING VERSION
import { Request, Response } from 'express';
import prisma from '../../../config/prisma';
import { TwilioSMSService } from '../../../services/sms/twilioService';
import { PhoneEmailService } from '../../../services/sms/phoneEmailService';
import { OTPService } from '../../../services/sms/OTPService';
import { otpStore } from '../../../utils/otpStore';
import { PhoneFormatter } from '../../../utils/phoneFormatter';
import { config } from '../../../config/environment';
import { error } from 'console';

export class OTPController {
  private static twilioService = new TwilioSMSService();
  private static phoneEmailService = new PhoneEmailService(); // Fallback service
  private static otpService = new OTPService();

  static async sendOTP(req: Request, res: Response): Promise<void> {
    try {
      const userEmail = req.user?.email;
      
      if (!userEmail) {
        res.status(401).json({ error: "Unauthorized: User email not found." });
        return;
      }
      
      // Get user contact number
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
      });
      
      if (!user || !user.contact) {
        res.status(400).json({ error: "Contact number not found for the user." });
        return;
      }
      
      if (user.isContactVerified) {
        res.status(400).json({ error: "Contact number is already verified." });
        return;
      }
      
      // Check if there's an existing OTP that hasn't expired
      const existingOTP = otpStore.get(userEmail);
      if (existingOTP && !OTPController.otpService.isOTPExpired(existingOTP)) {
        const timeRemaining = Math.ceil((existingOTP.expiresAt.getTime() - Date.now()) / 1000 / 60);
        res.status(400).json({ 
          error: `Please wait ${timeRemaining} minutes before requesting a new OTP.`,
          expiresAt: existingOTP.expiresAt 
        });
        return;
      }
      
      // Generate OTP
      const otp = OTPController.otpService.generateOTP();
      
      // FIXED: Use formatForSMS for SMS services (no spaces, proper validation)
      const smsFormattedContact = PhoneFormatter.formatForSMS(user.contact);
      
      // Validate the formatted number for SMS
      if (!PhoneFormatter.validateForSMS(smsFormattedContact)) {
        console.error('SMS Validation failed:', {
          original: user.contact,
          formatted: smsFormattedContact,
          reason: 'Phone number failed SMS validation'
        });
        
        res.status(400).json({ 
          error: "Invalid phone number format. Please ensure your phone number is valid.",
          providedNumber: user.contact,
          formattedNumber: smsFormattedContact,
          hint: "Phone number should be in format +919876543210"
        });
        return;
      }
      
      const otpData = OTPController.otpService.createOTPData(otp, smsFormattedContact);
      
      // Store OTP
      otpStore.set(userEmail, otpData);
      
      
      // Send SMS via Twilio
      const twilioResult = await OTPController.twilioService.sendOTP(smsFormattedContact, otp);
      
      if (!twilioResult.success) {
        console.error('Twilio SMS failed:', {
          error: twilioResult.message,
          errorCode: twilioResult.errorCode,
          to: smsFormattedContact,
          from: process.env.TWILIO_FROM_NUMBER
        });
        
        // Try fallback service if enabled
        if (config.sms.fallbackEnabled) {
          const fallbackResult = await OTPController.phoneEmailService.sendVerificationOTP(smsFormattedContact, otp);
          
          if (!fallbackResult.success) {
            // Clean up stored OTP if both methods failed
            otpStore.delete(userEmail);
            res.status(500).json({
              error: "Failed to send SMS verification code via all available methods",
              details: {
                twilio: {
                  error: twilioResult.message,
                  errorCode: twilioResult.errorCode
                },
                fallback: fallbackResult.message,
              },
              phoneNumber: smsFormattedContact
            });
            return;
          }
          
          // Fallback succeeded
          res.status(200).json({
            success: true,
            message: "OTP sent successfully to your phone number (via fallback service)",
            ...(config.app.nodeEnv === 'development' && { otp }),
            expires: otpData.expiresAt,
            provider: 'fallback',
            // Show formatted number for display
            sentTo: PhoneFormatter.formatPhoneNumber(user.contact),
          });
          return;
        }
        
        // No fallback, clean up and return error
        otpStore.delete(userEmail);
        // No fallback, clean up and return error
        otpStore.delete(userEmail);
        res.status(500).json({
          error: "Failed to send SMS verification code",
          details: {
            error: twilioResult.message,
            errorCode: twilioResult.errorCode
          },
          phoneNumber: smsFormattedContact
        });
        return;
      }      
      res.status(200).json({
        success: true,
        message: "OTP sent successfully to your phone number",
        ...(config.app.nodeEnv === 'development' && { otp }),
        expires: otpData.expiresAt,
        provider: 'twilio',
        messageId: twilioResult.messageId,
        // Show formatted number for display
        sentTo: PhoneFormatter.formatPhoneNumber(user.contact),
      });
      
    } catch (error) {
      console.error("Error in sendOTP:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async verifyOTP(req: Request, res: Response): Promise<void> {
    try {
      const { otp } = req.body;
      const userEmail = req.user?.email;
      
      if (!userEmail) {
        res.status(401).json({ error: "Unauthorized: User email not found." });
        return;
      }
      
      if (!otp) {
        res.status(400).json({ error: "OTP is required." });
        return;
      }
      
      // Validate OTP format
      if (!/^\d{6}$/.test(otp)) {
        res.status(400).json({ error: "OTP must be a 6-digit number." });
        return;
      }
      
      // Get stored OTP data
      const storedOTPData = otpStore.get(userEmail);
      
      if (!storedOTPData) {
        res.status(400).json({ error: "No OTP found for this user. Please request a new OTP." });
        return;
      }
      
      // Check if OTP has expired
      if (OTPController.otpService.isOTPExpired(storedOTPData)) {
        otpStore.delete(userEmail);
        res.status(400).json({ error: "OTP has expired. Please request a new OTP." });
        return;
      }
      
      // Verify OTP
      if (storedOTPData.otp !== otp) {
        storedOTPData.attempts += 1;
        
        if (OTPController.otpService.isMaxAttemptsReached(storedOTPData)) {
          otpStore.delete(userEmail);
          res.status(400).json({ 
            error: "Too many failed attempts. Please request a new OTP." 
          });
          return;
        }
        
        res.status(400).json({ 
          error: "Invalid OTP. Please try again.",
          attemptsRemaining: config.otp.maxAttempts - storedOTPData.attempts 
        });
        return;
      }
      
      // Update user verification status
      const updatedUser = await prisma.user.update({
        where: { email: userEmail },
        data: {
          isContactVerified: true,
        },
      });
      
      // Clean up OTP data
      otpStore.delete(userEmail);
      
      res.status(200).json({
        success: true,
        message: "Contact number verified successfully",
        user: {
          email: updatedUser.email,
          name: updatedUser.name,
          contact: updatedUser.contact,
          isContactVerified: updatedUser.isContactVerified,
        },
      });
      
    } catch (error) {
      console.error("Error in verifyOTP:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async resendOTP(req: Request, res: Response): Promise<void> {
    try {
      const userEmail = req.user?.email;
      
      if (!userEmail) {
        res.status(401).json({ error: "Unauthorized: User email not found." });
        return;
      }
      
      // Clear existing OTP and send new one
      otpStore.delete(userEmail);
      await OTPController.sendOTP(req, res);
      
    } catch (error) {
      console.error("Error in resendOTP:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // New method to check OTP delivery status (for Twilio)
  static async checkOTPStatus(req: Request, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const userEmail = req.user?.email;
      
      if (!userEmail) {
        res.status(401).json({ error: "Unauthorized: User email not found." });
        return;
      }
      
      if (!messageId) {
        res.status(400).json({ error: "Message ID is required." });
        return;
      }
      
      const status = await OTPController.twilioService.getMessageStatus(messageId);
      
      if (!status.success) {
        res.status(400).json({ 
          error: "Failed to fetch message status",
          details: status.error 
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        messageId,
        status: status.status,
        dateCreated: status.dateCreated,
        dateSent: status.dateSent,
        dateUpdated: status.dateUpdated,
        errorCode: status.errorCode,
        errorMessage: status.errorMessage,
      });
      
    } catch (error) {
      console.error("Error in checkOTPStatus:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}