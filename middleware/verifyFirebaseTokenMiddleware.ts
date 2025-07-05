import { Request, Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { verifyFirebaseToken } from '../config/FirebaseSDKSetup';


// Extend Express Request interface to include 'user'
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}
const verifyFirebaseTokenMiddleware = async (req: Request, res: Response, next: Function):Promise<void> => {
    try {
        const token = req.headers.authorization?.replace("Bearer ", "") || req.body.token; // Get token from headers, body, or query params
        if (!token) {
            console.error("No token provided!");
            res.status(401).json({ error: "Token is required for authentication." });
            return;
          }
        // Verify token using Firebase Admin SDK
        const decodeToken = await getAuth().verifyIdToken(token); // it fetch from the firebase 
        if (!decodeToken.email) {
             res.status(401).json({ error: "No email associated with this token." });
            return
            }
        // Extract user information
        const { uid, email, name } = await verifyFirebaseToken(token);
        //Decoded token contains user information
        req.user ={uid , email, name}; // Attach user info to request body
        next();
          
    }catch (error) {
        console.error("Error verifying Firebase token:", error);
        throw new Error("Invalid or expired token.");
    }
}
export { verifyFirebaseTokenMiddleware};
