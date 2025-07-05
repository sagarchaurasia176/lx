// routes/auth.ts
import express from 'express';
import { UserLoginAuth} from '../controller/auth/login/UserLoginAuth.controller';
import { verifyFirebaseTokenMiddleware } from '../middleware/verifyFirebaseTokenMiddleware';
import { ContactController } from '../controller/auth/otp/UpdateContactNumberIntoDB.controller';
import { OTPController } from '../controller/auth/otp/otp.controller';
import { StudentQueryResolver } from '../controller/ChatBot.controller';


const router = express.Router();
router.post('/login', verifyFirebaseTokenMiddleware, UserLoginAuth);
router.put('/contact', verifyFirebaseTokenMiddleware, ContactController.updateContactNumber); // here the contact number is updated into the database
router.post('/send-otp', verifyFirebaseTokenMiddleware, OTPController.sendOTP);
router.post('/verify-otp', verifyFirebaseTokenMiddleware, OTPController.verifyOTP);
router.post('/resend-otp', verifyFirebaseTokenMiddleware, OTPController.resendOTP);
//chat bot route
router.post('/chatbot', verifyFirebaseTokenMiddleware,StudentQueryResolver);

// Dummy route to check if the auth route is active
router.get('/ping', (req, res) => {
  res.send('Auth route is active');
});


export default router;