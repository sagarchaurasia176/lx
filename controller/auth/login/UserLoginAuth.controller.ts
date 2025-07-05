import { Request, Response } from "express";
import prisma from "../../../config/prisma";

// create a new user or update existing user in the database
export const UserLoginAuth = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, name } = req.body;
    if (!email || !name) {
      res.status(400).json({ error: "Email and name are required." });
      return;
    }
    // now check if the user exists in the database,if not then create a new user
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });
    // Use PostgreSQL UPSERT (INSERT ... ON CONFLICT)
    await prisma.user.upsert({
      where: { email: email },
      update: {
        name: name,
        createdAt: new Date(), // Update createdAt to current date
      },
      create: {
        email: email,
        name: name,
        contact: null,
        isContactVerified: false, // default value
      },
    });
    //Then return the user data in json format
    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      user: {
        email: user?.email,
        name: user?.name,
        contact: user?.contact,
        isContactVerified: user?.isContactVerified,
      },
    });
  } catch (error) {
    console.error("Error in UserLoginAuth:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
