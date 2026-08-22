import express, { NextFunction, Request, Response } from 'express';
import { AuthControllers } from './auth.controller';
import { USER_ROLE } from './auth.constant';
import { AuthValidation } from './authValidation';
import validateRequest from '../../middleware/validateRequest';
import auth from '../../middleware/auth';
import { upload } from '../../middleware/multer';

const router = express.Router();

router.post('/register', upload.single('image') as any, (req: Request, res: Response, next: NextFunction) => {
    /*
      #swagger.tags = ['Auth']
      #swagger.summary = 'Register User or Vendor'
      #swagger.description = 'Register a new user or vendor account.'
      #swagger.parameters['body'] = {
        in: 'body',
        description: 'User registration details',
        required: true,
        schema: {
          $firstName: 'John',
          $lastName: 'Doe',
          $email: 'user@example.com',
          $phone: '01700000000',
          $password: 'password123',
          $acceptedTerms: true,
          $role: 'user',
          fcmToken: 'optional_token'
        }
      }
    */
    if (req.body.body) req.body = JSON.parse(req.body.body);
    next();
  }, AuthControllers.registerUser
);

router.post('/resendOtp',
  /*
    #swagger.tags = ['Auth']
    #swagger.summary = 'Resend OTP'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: { $identifier: 'user@example.com' }
    }
  */
  AuthControllers.resendOtp
);

router.post('/login',
  /*
    #swagger.tags = ['Auth']
    #swagger.summary = 'User Login'
    #swagger.description = 'Login using email or phone identifier along with password.'
    #swagger.parameters['body'] = {
      in: 'body',
      description: 'User login credentials',
      required: true,
      schema: {
        $identifier: 'user@example.com',
        $password: 'password123',
        fcmToken: 'optional_token'
      }
    }
  */
  validateRequest(AuthValidation.loginSchema),
  AuthControllers.userLogin
);

router.post('/admin/login',
  /*
    #swagger.tags = ['Auth']
    #swagger.summary = 'Admin Login'
    #swagger.description = 'Login for admin and superAdmin.'
    #swagger.parameters['body'] = {
      in: 'body',
      description: 'Admin login credentials',
      required: true,
      schema: {
        $identifier: 'admin@example.com',
        $password: 'password123',
        fcmToken: 'optional_token'
      }
    }
  */
  validateRequest(AuthValidation.loginSchema),
  AuthControllers.AdminLogin
);

router.post('/changePassword',
  /*
    #swagger.tags = ['Auth']
    #swagger.summary = 'Change Password'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $oldPassword: 'old_password_123',
        $newPassword: 'new_password_123'
      }
    }
  */
  auth(USER_ROLE.user, USER_ROLE.vendor, USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(AuthValidation.changePasswordSchema),
  AuthControllers.changePassword
);

router.post('/refresh-token',
  /*
    #swagger.tags = ['Auth']
    #swagger.summary = 'Refresh Token'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $refreshToken: 'your_refresh_token_here'
      }
    }
  */
  AuthControllers.refreshToken
);

router.post('/forgotPass',
  /*
    #swagger.tags = ['Auth']
    #swagger.summary = 'Forgot Password'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $phone: '01700000000'
      }
    }
  */
  AuthControllers.forgotPassword
);

router.post('/resetPass',
  /*
    #swagger.tags = ['Auth']
    #swagger.summary = 'Reset Password'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $phone: '01700000000',
        $otp: '123456',
        $newPassword: 'new_password_123'
      }
    }
  */
  AuthControllers.resetPassword
);

router.post('/regOtpVerify',
  /*
    #swagger.tags = ['Auth']
    #swagger.summary = 'Verify Registration OTP'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $identifier: 'user@example.com',
        $otp: '123456'
      }
    }
  */
  validateRequest(AuthValidation.verifyOtpSchema),
  AuthControllers.VerifyOtpForRegistration
);

router.post('/logout',
  /*
    #swagger.tags = ['Auth']
    #swagger.summary = 'Logout User'
  */
  auth(USER_ROLE.user, USER_ROLE.vendor, USER_ROLE.admin),
  AuthControllers.logout
);

export const AuthRoutes = router;