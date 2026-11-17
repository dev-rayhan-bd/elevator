import cron from 'node-cron';
import { expireOverduePromotions } from '../modules/Promotion/promotion.services';
import { expireOverdueBanners } from '../modules/Banner/banner.services';
import { UserServices } from '../modules/User/user.services';
import { expireOverdueEventRequests } from '../modules/EventRequest/eventRequest.services';
import { expireOverdueVendorQuotes } from '../modules/VendorQuote/vendorQuote.services';

// ══════════════════════════════════════════════
//  SCHEDULED CRON JOBS
//  Runs automatically every day at 12:00 AM
//  Admin can also trigger manually via API
// ══════════════════════════════════════════════

export const startCronJobs = () => {
  // ── Event Requests & Custom Quotes Expiry: Every day at 00:00 ──
  cron.schedule('0 0 * * *', async () => {
    console.log('⏰ [CRON] Running EventRequest & VendorQuote expiry check...');
    try {
      const eventReqResult = await expireOverdueEventRequests();
      console.log(
        `✅ [CRON] EventRequests expired: ${eventReqResult.expiredRequestsCount}, associated quotes expired: ${eventReqResult.expiredQuotesCount}`,
      );
      const vendorQuoteResult = await expireOverdueVendorQuotes();
      console.log(`✅ [CRON] VendorQuotes expired: ${vendorQuoteResult}`);
    } catch (error) {
      console.error('❌ [CRON] EventRequest/VendorQuote expiry error:', error);
    }
  });

  // ── Promotion Expiry: Every day at 00:00 ──
  cron.schedule('0 0 * * *', async () => {
    console.log('⏰ [CRON] Running promotion expiry check...');
    try {
      const result = await expireOverduePromotions();
      console.log(`✅ [CRON] Promotions expired: ${result.modifiedCount}`);
    } catch (error) {
      console.error('❌ [CRON] Promotion expiry error:', error);
    }
  });

  // ── Banner Expiry: Every day at 00:00 ──
  cron.schedule('0 0 * * *', async () => {
    console.log('⏰ [CRON] Running banner expiry check...');
    try {
      const result = await expireOverdueBanners();
      console.log(`✅ [CRON] Banners expired: ${result.modifiedCount}`);
    } catch (error) {
      console.error('❌ [CRON] Banner expiry error:', error);
    }
  });

  // ── Profile Visibility Nudges: Every Monday at 09:00 ──
  cron.schedule('0 9 * * 1', async () => {
    await UserServices.sendProfileNudgeNotifications();
  });

  console.log('🟢 Cron jobs registered successfully');
};
