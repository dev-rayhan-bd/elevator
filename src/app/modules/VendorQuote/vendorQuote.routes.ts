import express from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { VendorQuoteControllers } from './vendorQuote.controller';
import { VendorQuoteValidations } from './vendorQuote.validation';

const router = express.Router();

// ── User routes ──
router.post(
  '/',
  auth('user'),
  validateRequest(VendorQuoteValidations.sendQuoteValidationSchema),
  VendorQuoteControllers.sendQuote,
);

router.get('/my-quotes', auth('user'), VendorQuoteControllers.getMyQuotes);

router.patch(
  '/:quoteId/accept',
  auth('user'),
  VendorQuoteControllers.acceptQuote,
);

router.patch(
  '/:quoteId/decline',
  auth('user'),
  VendorQuoteControllers.declineQuote,
);

router.patch(
  '/:quoteId/counter',
  auth('user'),
  validateRequest(VendorQuoteValidations.counterOfferValidationSchema),
  VendorQuoteControllers.userCounterQuote,
);

// ── Vendor routes ──
router.get('/vendor-quotes', auth('vendor'), VendorQuoteControllers.getVendorQuotes);

router.patch(
  '/:quoteId/vendor-counter',
  auth('vendor'),
  validateRequest(VendorQuoteValidations.counterOfferValidationSchema),
  VendorQuoteControllers.counterQuote,
);

router.patch('/:quoteId/win', auth('vendor'), VendorQuoteControllers.winQuote);

router.patch('/:quoteId/lose', auth('vendor'), VendorQuoteControllers.loseQuote);

// ── Shared: quote details (user or vendor) ──
router.get('/:quoteId', auth('user', 'vendor'), VendorQuoteControllers.getQuoteDetails);

export const VendorQuoteRoutes = router;
