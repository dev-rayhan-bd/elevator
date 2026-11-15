import express from 'express';
import auth from '../../middleware/auth';
import { UserControllers } from './user.controller';
import { upload } from '../../middleware/multer';

const router = express.Router();

// ──────────────────────────────────────────────────────────────
// Admin / SuperAdmin Routes
// ──────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────
// Admin / SuperAdmin Routes
// ──────────────────────────────────────────────────────────────
router.get('/',
  /*
    #swagger.tags = ['User']
    #swagger.summary = 'Get all users'
    #swagger.description = 'Fetch a list of all registered users (Admin / SuperAdmin).'
  */
  auth('admin', 'superAdmin'),
  UserControllers.getAllUsers
);

// ──────────────────────────────────────────────────────────────
// Authenticated User / Vendor Routes
// ──────────────────────────────────────────────────────────────
router.get('/me',
  /*
    #swagger.tags = ['User']
    #swagger.summary = 'Get current user profile'
    #swagger.description = 'Fetch the logged-in user profile.'
  */
  auth('user', 'vendor', 'admin', 'superAdmin'),
  UserControllers.getMe
);

router.patch('/update-me',
  /*
    #swagger.tags = ['User']
    #swagger.summary = 'Update user profile'
    #swagger.description = 'Update profile information for the authenticated user.'
    #swagger.parameters['body'] = {
      in: 'body',
      description: 'Profile update fields',
      schema: {
        firstName: 'John',
        lastName: 'Doe',
        phone: '01700000000',
        bio: 'Event organizer bio'
      }
    }
  */
  auth('user', 'vendor'),
  upload.single('image') as any,
  UserControllers.updateProfile
);

router.patch('/setup-profile',
  /*
    #swagger.tags = ['User']
    #swagger.summary = 'Setup user profile'
    #swagger.description = 'Initial profile setup after registration.'
    #swagger.parameters['body'] = {
      in: 'body',
      description: 'Profile setup payload',
      schema: {
        address: '123 Main St',
        city: 'New York',
        state: 'NY'
      }
    }
  */
  auth('user', 'vendor'),
  upload.single('image') as any,
  UserControllers.setupProfile
);

// ──────────────────────────────────────────────────────────────
// Vendor-Only Routes
// ──────────────────────────────────────────────────────────────
router.patch('/update-portfolio',
  /*
    #swagger.tags = ['User']
    #swagger.summary = 'Update vendor portfolio'
    #swagger.description = 'Upload multiple portfolio images for the vendor.'
  */
  auth('vendor'),
  upload.array('portfolio', 10) as any,
  UserControllers.updatePortfolio
);

router.post('/become-vendor',
  /*
    #swagger.tags = ['User']
    #swagger.summary = 'Request to become vendor'
    #swagger.description = 'Submit request to upgrade user role to vendor.'
    #swagger.parameters['body'] = {
      in: 'body',
      description: 'Vendor application details',
      schema: {
        businessName: 'Apex Event Decor',
        description: 'Professional event decoration company'
      }
    }
  */
  auth('user'),
  UserControllers.becomeVendorRequest
);

router.patch('/manage-availability',
  /*
    #swagger.tags = ['User']
    #swagger.summary = 'Manage vendor availability'
    #swagger.description = 'Update calendar availability dates for vendor services.'
  */
  auth('vendor'),
  UserControllers.updateAvailability
);

router.patch('/update-availability',
  /*
    #swagger.tags = ['User']
    #swagger.summary = 'Update vendor availability status'
    #swagger.description = 'Toggle online / offline availability status for vendor.'
  */
  auth('vendor'),
  UserControllers.updateAvailabilityStatus
);

// ──────────────────────────────────────────────────────────────
// Visibility Score Routes
// ──────────────────────────────────────────────────────────────
router.get('/me/visibility-tasks',
  /*
    #swagger.tags = ['User']
    #swagger.summary = 'Get vendor visibility score tasks'
    #swagger.description = 'Retrieve profile completion and visibility optimization tasks.'
  */
  auth('vendor'),
  UserControllers.getMyVisibilityTasks
);

// ──────────────────────────────────────────────────────────────
// Public Routes
// ──────────────────────────────────────────────────────────────
router.get('/public/vendor/:vendorId',
  /*
    #swagger.tags = ['User']
    #swagger.summary = 'Get public vendor profile'
    #swagger.description = 'View public profile and portfolio of a specific vendor.'
  */
  UserControllers.getVendorProfile
);

export const UserRoutes = router;