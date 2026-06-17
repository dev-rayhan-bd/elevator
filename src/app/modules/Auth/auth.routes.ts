import express from 'express';
import { AuthControllers } from './auth.controller';
import validateRequest from '../../middleware/validateRequest';
import { AuthValidation } from './authValidation';


const router = express.Router();

router.post('/register', validateRequest(AuthValidation.registerUserSchema), AuthControllers.register);
router.post('/login', validateRequest(AuthValidation.loginSchema), AuthControllers.login);
router.post('/verify-otp', validateRequest(AuthValidation.verifyOtpSchema), AuthControllers.verifyOtp);
router.post('/refresh-token', AuthControllers.handleRefreshToken);

export const AuthRoutes = router;