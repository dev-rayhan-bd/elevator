import { Types } from 'mongoose';
import QueryBuilder from '../../builder/QueryBuilder';
import { User } from './user.model';
import httpStatus from 'http-status'
import AppError from '../../errors/AppError';
import { Admin } from '../Admin/admin.model';
import { sendNotification, sendNotificationToAdmins } from '../../utils/sendNotification';
import { VendorService } from '../VendorService/vendorService.model';
import { ServicePackage } from '../ServicePackage/package.model';

const getAllUsersFromDB = async (query: Record<string, unknown>) => {
  const userQuery = new QueryBuilder(User.find({ isDeleted: false }), query)
    .search(['firstName', 'lastName', 'email', 'phone'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await userQuery.modelQuery;
  const meta = await userQuery.countTotal();
  return { meta, result };
};

const updateProfileInDB = async (userId: string, payload: any) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found');
  delete payload.role;
  delete payload.password;
  delete payload.email;
  delete payload.isOtpVerified;

  // ── Security: Strip restricted fields that users must not set ──
  delete payload.isSponsored;
  delete payload.isFeatured;
  delete payload.isDeleted;
  if (payload.vendor) {
    delete payload.vendor.isVerifiedBadge;
    delete payload.vendor.isProfileCompleted;
    delete payload.vendor.profileScore;
    delete payload.vendor.passwordChangedAt;
  }

  if (user.role === 'vendor' && payload.vendor) {
    let score = 0;
    const vendorData = payload.vendor || user.vendor;

    // Existing scoring
    if (vendorData?.isVerifiedBadge) score += 25;
    if (vendorData?.categories?.length >= 3) score += 20;
    if (vendorData?.portfolio?.length > 0) score += 15;

    // New scoring additions
    if (vendorData?.businessName) score += 10;
    if (vendorData?.businessDetails) score += 10;
    if (vendorData?.experienceYears && vendorData.experienceYears > 0) score += 5;
    if (vendorData?.location?.address) score += 5;
    if (vendorData?.categories?.length >= 1) score += 5;
    if (vendorData?.serviceArea?.length >= 1) score += 5;

    score = Math.min(score, 100);
    const previousScore = user.vendor?.profileScore ?? 0;

    if (payload.vendor) {
      payload.vendor.profileScore = score;
    } else {
      payload['vendor.profileScore'] = score;
    }

    // Notify score change (fire-and-forget)
    if (previousScore !== score) {
      _triggerProfileScoreChanged(userId, previousScore, score);
    }
  }

  return await User.findByIdAndUpdate(userId, payload, { new: true, runValidators: true });
};

const manageAvailabilityInDB = async (userId: string, availability: any) => {
  return await User.findByIdAndUpdate(userId, { 'vendor.availability': availability }, { new: true });
};

const applyToBecomeVendor = async (userId: string, vendorData: any) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found');
  if (user.role === 'vendor') throw new AppError(400, 'You are already a vendor');

  const result = await User.findByIdAndUpdate(
    userId,
    {
      status: 'pending',
      vendor: {
        ...vendorData,
        profileScore: 40,
      }
    },
    { new: true, runValidators: true }
  );

  // Fire-and-forget: notify admins + applicant
  sendNotificationToAdmins(
    'New Vendor Application',
    `${user.firstName} ${user.lastName} (${user.email}) has applied to become a vendor.`,
    'vendor_application',
    { userId, action: 'vendor_application' }
  );
  sendNotification(
    userId,
    'Application Received',
    'Your vendor application has been submitted. You will be notified once reviewed.',
    'vendor_application',
    { action: 'vendor_application' }
  );

  return result;
};

const getMeFromDB = async (userId: string, role: string) => {
  let result = null;
  if (role === 'admin' || role === 'superAdmin') {
    result = await Admin.findById(userId);
  } else {
    result = await User.findById(userId);
  }
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'User profile not found!');
  }
  return result;
};

const updateVendorAvailabilityInDB = async (
  userId: string,
  payload: { date: string; status: string }
) => {
  const { date, status } = payload;
  const user = await User.findById(userId);
  if (!user || user.role !== 'vendor') {
    throw new AppError(404, 'Vendor not found');
  }

  let updateQuery;
  const currentStatus = status.toLowerCase();

  if (currentStatus === 'booked') {
    updateQuery = { $addToSet: { 'vendor.bookedDates': date } };
  } else if (currentStatus === 'available') {
    updateQuery = { $pull: { 'vendor.bookedDates': date } };
  } else {
    throw new AppError(400, 'Invalid status. Use "booked" or "available"');
  }

  const result = await User.findByIdAndUpdate(userId, updateQuery, { new: true, runValidators: true });

  sendNotification(
    userId,
    'Availability Updated',
    `Your date ${date} has been marked as ${currentStatus}.`,
    'availability_update',
    { date, status: currentStatus, action: 'availability_update' }
  );

  return result;
};

// ──────────────────────────────────────────────────────────────
// Fire-and-Forget Notification Triggers (exported)
// ──────────────────────────────────────────────────────────────

const _triggerProfileScoreChanged = async (userId: string, oldScore: number, newScore: number) => {
  const direction = newScore > oldScore ? 'increased' : 'decreased';
  sendNotification(
    userId,
    'Profile Score Updated',
    `Your vendor profile score has ${direction} from ${oldScore} to ${newScore}.`,
    'profile_score_changed',
    { oldScore: String(oldScore), newScore: String(newScore), action: 'profile_score_changed' }
  );
};

const triggerNewReviewNotification = async (vendorId: string, reviewerName: string, rating: number) => {
  sendNotification(
    vendorId,
    'New Review Received',
    `${reviewerName} left you a ${rating}-star review.`,
    'new_review',
    { reviewerName, rating: String(rating), action: 'new_review' }
  );
};

const triggerVendorApprovalNotification = async (vendorId: string, approved: boolean, reason?: string) => {
  if (approved) {
    sendNotification(
      vendorId,
      'Vendor Application Approved! 🎉',
      'Congratulations! Your vendor application has been approved. Your profile is now active.',
      'vendor_approved',
      { action: 'vendor_approved' }
    );
  } else {
    sendNotification(
      vendorId,
      'Vendor Application Update',
      `Your vendor application was not approved.${reason ? ` Reason: ${reason}` : ' Please contact support for details.'}`,
      'vendor_rejected',
      { action: 'vendor_rejected', reason: reason || '' }
    );
  }
};

const triggerVendorVerificationNotification = async (vendorId: string) => {
  sendNotification(
    vendorId,
    'Profile Verified ✓',
    'Your business documents have been verified. A verification badge has been added to your profile.',
    'vendor_verification',
    { action: 'vendor_verification' }
  );
};

const triggerBookingNotification = async (vendorId: string, date: string, customerName: string) => {
  sendNotification(
    vendorId,
    'New Booking',
    `${customerName} has booked your services for ${date}.`,
    'booking_update',
    { date, customerName, action: 'booking_update' }
  );
};

// ══════════════════════════════════════════════
//  PUBLIC: GET SINGLE VENDOR PROFILE
// ══════════════════════════════════════════════

const getVendorProfileFromDB = async (vendorId: string) => {
  const vendor = await User.findOne({
    _id: new Types.ObjectId(vendorId),
    role: 'vendor',
    isDeleted: false,
    status: 'active',
  }).select(
    'firstName lastName fullName image lat long role vendor.businessName vendor.ownerName vendor.whatsappNumber vendor.location vendor.businessDetails vendor.experienceYears vendor.teamSize vendor.socialLinks vendor.googleMapLink vendor.categories vendor.serviceArea vendor.portfolio vendor.profileScore vendor.isVerifiedBadge vendor.isProfileCompleted createdAt',
  );

  if (!vendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found');
  }

  return vendor;
};

// ══════════════════════════════════════════════
//  PROFILE VISIBILITY NUDGE (Cron + Manual)
// ══════════════════════════════════════════════

/**
 * Sends profile-visibility push nudges to vendors missing key sections.
 * Designed to be called from a weekly cron job.
 */
const sendProfileNudgeNotifications = async () => {
  try {
    console.log('⏰ [CRON] Running profile visibility nudges...');

    // 1. Missing Verification
    const unverifiedVendors = await User.find({
      role: 'vendor',
      status: 'active',
      isDeleted: false,
      'vendor.isVerifiedBadge': { $ne: true },
    }).select('_id');
    if (unverifiedVendors.length > 0) {
      const promises = unverifiedVendors.map((v) =>
        sendNotification(
          v._id.toString(),
          '🛡️ Boost Your Visibility by 25%!',
          'Complete your Business Verification now.',
          'profile_score_nudge',
          { action: 'verification_nudge' },
        ),
      );
      await Promise.all(promises);
      console.log(`✅ Verification nudges sent to ${unverifiedVendors.length} vendors.`);
    }

    // 2. Low Service Variety (fewer than 3 services)
    const allVendors = await User.find({
      role: 'vendor',
      status: 'active',
      isDeleted: false,
    }).select('_id');
    for (const vendor of allVendors) {
      const serviceCount = await VendorService.countDocuments({
        vendor: vendor._id,
        isDraft: { $ne: true },
      });
      if (serviceCount < 3) {
        sendNotification(
          vendor._id.toString(),
          '🛠️ Add More Services!',
          'Gain +20% visibility score.',
          'profile_score_nudge',
          { action: 'service_variety_nudge' },
        );
      }
    }

    // 3. No Packages
    for (const vendor of allVendors) {
      const packageCount = await ServicePackage.countDocuments({ vendor: vendor._id });
      if (packageCount === 0) {
        sendNotification(
          vendor._id.toString(),
          '📦 Missing Packages?',
          'Clients prefer vendors with clear pricing.',
          'profile_score_nudge',
          { action: 'packages_nudge' },
        );
      }
    }

    console.log('✅ [CRON] Profile visibility nudges completed.');
  } catch (error) {
    console.error('❌ [CRON] Profile visibility nudges error:', error);
  }
};

export const UserServices = {
  getAllUsersFromDB,
  updateProfileInDB,
  manageAvailabilityInDB,
  applyToBecomeVendor,
  getMeFromDB,
  updateVendorAvailabilityInDB,
  getVendorProfileFromDB,
  triggerNewReviewNotification,
  triggerVendorApprovalNotification,
  triggerVendorVerificationNotification,
  triggerBookingNotification,
  sendProfileNudgeNotifications,
};