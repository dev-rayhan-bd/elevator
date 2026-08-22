import express from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { VendorQuoteControllers } from './vendorQuote.controller';
import { VendorQuoteValidations } from './vendorQuote.validation';

const router = express.Router();

// ── User routes ──
router.post(
  '/',
  /*
    #swagger.tags = ['VendorQuote']
    #swagger.summary = 'Request quote directly from vendor'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $vendorId: '60d5ecb8b5c9c123456789ab',
        $serviceId: '60d5ecb8b5c9c123456789ac',
        $eventDate: '2026-11-15',
        $budget: 3500,
        message: 'Requesting quote for corporate anniversary event'
      }
    }
  */
  auth('user'),
  validateRequest(VendorQuoteValidations.sendQuoteValidationSchema),
  VendorQuoteControllers.sendQuote,
);

router.get('/my-quotes',
  /*
    #swagger.tags = ['VendorQuote']
    #swagger.summary = 'Get my sent quotes (User)'
  */
  auth('user'),
  VendorQuoteControllers.getMyQuotes
);

router.patch(
  '/:quoteId/accept',
  /*
    #swagger.tags = ['VendorQuote']
    #swagger.summary = 'Accept vendor quote (User)'
  */
  auth('user'),
  VendorQuoteControllers.acceptQuote,
);

router.patch(
  '/:quoteId/decline',
  /*
    #swagger.tags = ['VendorQuote']
    #swagger.summary = 'Decline vendor quote (User)'
  */
  auth('user'),
  VendorQuoteControllers.declineQuote,
);

router.patch(
  '/:quoteId/counter',
  /*
    #swagger.tags = ['VendorQuote']
    #swagger.summary = 'Send counter offer (User)'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $counterAmount: 3200,
        message: 'Can you match $3200?'
      }
    }
  */
  auth('user'),
  validateRequest(VendorQuoteValidations.counterOfferValidationSchema),
  VendorQuoteControllers.userCounterQuote,
);

// ── Vendor routes ──
router.get('/vendor-quotes',
  /*
    #swagger.tags = ['VendorQuote']
    #swagger.summary = 'Get quotes received by vendor'
  */
  auth('vendor'),
  VendorQuoteControllers.getVendorQuotes
);

router.patch(
  '/:quoteId/vendor-counter',
  /*
    #swagger.tags = ['VendorQuote']
    #swagger.summary = 'Send counter offer (Vendor)'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $counterAmount: 3400,
        message: 'Lowest price I can offer is $3400'
      }
    }
  */
  auth('vendor'),
  validateRequest(VendorQuoteValidations.counterOfferValidationSchema),
  VendorQuoteControllers.counterQuote,
);

router.patch('/:quoteId/win',
  /*
    #swagger.tags = ['VendorQuote']
    #swagger.summary = 'Mark quote as won (Vendor)'
  */
  auth('vendor'),
  VendorQuoteControllers.winQuote
);

router.patch('/:quoteId/lose',
  /*
    #swagger.tags = ['VendorQuote']
    #swagger.summary = 'Mark quote as lost (Vendor)'
  */
  auth('vendor'),
  VendorQuoteControllers.loseQuote
);

// ── Shared: quote details (user or vendor) ──
router.get('/:quoteId',
  /*
    #swagger.tags = ['VendorQuote']
    #swagger.summary = 'Get single quote details'
  */
  auth('user', 'vendor'),
  VendorQuoteControllers.getQuoteDetails
);

export const VendorQuoteRoutes = router;
