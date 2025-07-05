import { Request, Response } from 'express';
import prisma from '../../../config/prisma';
import { PhoneFormatter } from '../../../utils/phoneFormatter';

export class ContactController {
  static async updateContactNumber(req: Request, res: Response): Promise<void> {
    try {
      const { contact } = req.body;
      const userEmail = req.user?.email;
      
      if (!userEmail) {
        res.status(401).json({ error: "Unauthorized: User email not found." });
        return;
      }
      
      if (!contact) {
        res.status(400).json({ error: "Contact number is required." });
        return;
      }
      
      // Validate contact number format
      if (!PhoneFormatter.validatePhoneNumber(contact)) {
        res.status(400).json({
          error: "Invalid contact number format.",
          code: "INVALID_CONTACT",
        });
        return;
      }
    
      const cleanedContact = PhoneFormatter.cleanPhoneNumber(contact);
      const formattedContact = PhoneFormatter.formatPhoneNumber(cleanedContact);
      
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userEmail },
      });
      
      if (!existingUser) {
        res.status(404).json({ error: "User not found." });
        return;
      }
      
      // Check if contact number already exists
      const contactExists = await prisma.user.findFirst({
        where: {
          contact: formattedContact,
          email: { not: userEmail },
        },
      });
      
      if (contactExists) {
        res.status(409).json({
          error: "This contact number is already associated with another account.",
          code: "CONTACT_EXISTS",
        });
        return;
      }
      
      // Update the user's contact number
      const updatedUser = await prisma.user.update({
        where: { email: userEmail },
        data: {
          contact: formattedContact,
          isContactVerified: false,
        },
      });
      
      res.status(200).json({
        success: true,
        message: "Contact number updated successfully",
        user: {
          email: updatedUser.email,
          name: updatedUser.name,
          contact: updatedUser.contact,
          isContactVerified: updatedUser.isContactVerified,
        },
      });
    } catch (error) {
      console.error("Error in updateContactNumber:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}