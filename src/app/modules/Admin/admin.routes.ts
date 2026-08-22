import express from 'express';
import validateRequest from '../../middleware/validateRequest';
import auth from '../../middleware/auth';
import { upload } from '../../middleware/multer';
import { AdminControllers } from './admin.controller';
import { AdminValidation } from './admin.validation';
import { USER_ROLE } from '../Auth/auth.constant';

const router = express.Router();


router.post('/login',
  /*
    #swagger.tags = ['Admin']
    #swagger.summary = 'Admin Login'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $identifier: 'admin@example.com',
        $password: 'password123'
      }
    }
  */
  validateRequest(AdminValidation.loginSchema),
  AdminControllers.loginAdmin
);

router.post('/forgot-password',
  /*
    #swagger.tags = ['Admin']
    #swagger.summary = 'Forgot Password (Admin)'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: { $phone: '01700000000' }
    }
  */
  validateRequest(AdminValidation.forgotPasswordSchema),
  AdminControllers.forgotPassword
);

router.post('/reset-password',
  /*
    #swagger.tags = ['Admin']
    #swagger.summary = 'Reset Password (Admin)'
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
  validateRequest(AdminValidation.resetPasswordSchema),
  AdminControllers.resetPassword
);

router.patch('/update-profile',
  /*
    #swagger.tags = ['Admin']
    #swagger.summary = 'Update Admin Profile'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  upload.single('image') as any,
  AdminControllers.updateProfile
);

router.post('/change-password',
  /*
    #swagger.tags = ['Admin']
    #swagger.summary = 'Change Password (Admin)'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $oldPassword: 'old_password',
        $newPassword: 'new_password'
      }
    }
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(AdminValidation.changePasswordSchema),
  AdminControllers.changePassword
);

router.get('/me',
  /*
    #swagger.tags = ['Admin']
    #swagger.summary = 'Get current Admin details'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AdminControllers.getMe
);

router.get('/pending-vendors',
  /*
    #swagger.tags = ['Admin']
    #swagger.summary = 'Get pending vendor applications'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AdminControllers.getPendingVendors
);

router.patch('/approve-vendor/:id',
  /*
    #swagger.tags = ['Admin']
    #swagger.summary = 'Approve vendor application'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AdminControllers.approveVendor
);

router.post('/create-admin',
  /*
    #swagger.tags = ['Admin']
    #swagger.summary = 'Create new Admin (SuperAdmin only)'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $firstName: 'Admin',
        $lastName: 'User',
        $email: 'newadmin@example.com',
        $phone: '01800000000',
        $password: 'password123'
      }
    }
  */
  auth(USER_ROLE.superAdmin),
  validateRequest(AdminValidation.createAdminSchema),
  AdminControllers.createAdmin
);

router.post('/resendOtp',
  /*
    #swagger.tags = ['Admin']
    #swagger.summary = 'Resend Admin OTP'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: { $identifier: 'admin@example.com' }
    }
  */
  AdminControllers.resendOtp
);

router.patch('/block-unblock/:id',
  /*
    #swagger.tags = ['Admin']
    #swagger.summary = 'Block or unblock user'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AdminControllers.blockUnblockUser
);

// ── Super Admin only ──
router.delete('/:id',
  /*
    #swagger.tags = ['Admin']
    #swagger.summary = 'Delete admin account'
  */
  auth(USER_ROLE.superAdmin),
  AdminControllers.deleteAdmin
);

router.patch('/block-unblock-admin/:id',
  /*
    #swagger.tags = ['Admin']
    #swagger.summary = 'Block or unblock admin account'
  */
  auth(USER_ROLE.superAdmin),
  AdminControllers.blockUnblockAdmin
);

router.get('/',
  /*
    #swagger.tags = ['Admin']
    #swagger.summary = 'Get list of all admins'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AdminControllers.getAllAdmins
);

router.get('/dashboard',
  /*
    #swagger.tags = ['Admin']
    #swagger.summary = 'Get admin dashboard statistics'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AdminControllers.getAdminDashboard
);

export const AdminRoutes = router;