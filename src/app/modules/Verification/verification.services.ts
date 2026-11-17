import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { Verification } from './verification.model';
import { User } from '../User/user.model';
import { UserServices } from '../User/user.services';
import { TVerification } from './verification.interface';

import { sendNotification, sendNotificationToAdmins } from '../../utils/sendNotification';

// ══════════════════════════════════════════════
//  HELPER: FORMAT VERIFICATION DETAILS
// ══════════════════════════════════════════════

const formatVerificationDetails = (verification: any) => {
  if (!verification) return verification;
  const v = verification.toObject ? verification.toObject() : { ...verification };

  // Fill documents[] with all URLs if empty or incomplete
  const allDocs = Array.from(
    new Set(
      [
        ...(v.documents || []),
        v.cnicFront,
        v.cnicBack,
        v.ntn,
        v.incorporationCertificate,
      ].filter((url): url is string => typeof url === 'string' && url.trim().length > 0),
    ),
  );

  // If still empty, check if documents are stored on vendor user profile
  if (allDocs.length === 0) {
    const userDocs = v.vendor?.vendor?.documents || v.vendor?.documents;
    if (Array.isArray(userDocs) && userDocs.length > 0) {
      allDocs.push(
        ...userDocs.filter(
          (url: any) => typeof url === 'string' && url.trim().length > 0,
        ),
      );
    }
  }

  v.documents = allDocs;
  if (!v.cnicFront && allDocs.length >= 1) v.cnicFront = allDocs[0];
  if (!v.cnicBack && allDocs.length >= 2) v.cnicBack = allDocs[1];

  // Compose submitted verification fields for admin review
  const detailsParts: string[] = [];
  if (v.businessName) detailsParts.push(`Business Name: ${v.businessName}`);
  if (v.ownerName) detailsParts.push(`Owner Name: ${v.ownerName}`);
  if (v.registeredPhone) detailsParts.push(`Registered Phone: ${v.registeredPhone}`);
  if (v.fullAddress) detailsParts.push(`Address: ${v.fullAddress}`);
  if (v.notes && v.notes.trim()) detailsParts.push(`Notes: ${v.notes}`);

  const submittedDetails = detailsParts.length > 0 ? detailsParts.join('\n') : '';

  // Prefer submitted verification fields over dummy profile businessDetails ("xxxxxxxxxxxxxxxxxxx")
  if (submittedDetails) {
    v.businessDetails = submittedDetails;
    if (v.vendor && typeof v.vendor === 'object') {
      v.vendor.businessDetails = submittedDetails;
      if (v.vendor.vendor) {
        v.vendor.vendor.businessDetails = submittedDetails;
      }
    }
  } else if (v.notes && v.notes.trim()) {
    v.businessDetails = v.notes;
    if (v.vendor && typeof v.vendor === 'object') {
      v.vendor.businessDetails = v.notes;
      if (v.vendor.vendor) {
        v.vendor.vendor.businessDetails = v.notes;
      }
    }
  }

  // Ensure vendor.businessName is set to submitted businessName if present
  if (v.vendor && typeof v.vendor === 'object') {
    const bName =
      v.businessName ||
      v.vendor.vendor?.businessName ||
      v.vendor.businessName ||
      v.vendor.fullName ||
      `${v.vendor.firstName || ''} ${v.vendor.lastName || ''}`.trim();
    v.vendor.businessName = bName;
    if (v.vendor.vendor) {
      v.vendor.vendor.businessName = bName;
    }
    if (!v.businessName) {
      v.businessName = bName;
    }
  }

  return v;
};

// ══════════════════════════════════════════════
//  VENDOR: SUBMIT VERIFICATION REQUEST
// ══════════════════════════════════════════════

const submitVerificationIntoDB = async (
  vendorId: string,
  payload: {
    documents?: string[];
    cnicFront?: string;
    cnicBack?: string;
    ntn?: string;
    incorporationCertificate?: string;
    businessName?: string;
    fullAddress?: string;
    ownerName?: string;
    registeredPhone?: string;
    notes?: string;
  },
) => {
  // Check if vendor exists
  const vendor = await User.findById(vendorId);
  if (!vendor || vendor.role !== 'vendor') {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found');
  }

  // Ensure documents array contains all distinct files
  const allDocs = Array.from(
    new Set(
      [
        ...(payload.documents || []),
        payload.cnicFront,
        payload.cnicBack,
        payload.ntn,
        payload.incorporationCertificate,
      ].filter((url): url is string => typeof url === 'string' && url.trim().length > 0),
    ),
  );

  // Check existing verification request
  const existing = await Verification.findOne({ vendor: vendorId });
  let savedRecord: any;

  if (existing) {
    existing.documents = allDocs.length > 0 ? allDocs : existing.documents;
    if (payload.cnicFront) existing.cnicFront = payload.cnicFront;
    if (payload.cnicBack) existing.cnicBack = payload.cnicBack;
    if (payload.ntn) existing.ntn = payload.ntn;
    if (payload.incorporationCertificate)
      existing.incorporationCertificate = payload.incorporationCertificate;
    if (payload.businessName) existing.businessName = payload.businessName;
    if (payload.fullAddress) existing.fullAddress = payload.fullAddress;
    if (payload.ownerName) existing.ownerName = payload.ownerName;
    if (payload.registeredPhone) existing.registeredPhone = payload.registeredPhone;
    if (payload.notes) existing.notes = payload.notes;

    // Make sure documents has all distinct fields
    existing.documents = Array.from(
      new Set(
        [
          ...(existing.documents || []),
          existing.cnicFront,
          existing.cnicBack,
          existing.ntn,
          existing.incorporationCertificate,
        ].filter((url): url is string => typeof url === 'string' && url.trim().length > 0),
      ),
    );

    existing.status = 'pending';
    existing.verifiedBy = undefined;
    existing.verifiedAt = undefined;
    existing.rejectedReason = undefined;
    await existing.save();
    savedRecord = existing;
  } else {
    savedRecord = await Verification.create({
      vendor: new Types.ObjectId(vendorId),
      documents: allDocs,
      cnicFront: payload.cnicFront,
      cnicBack: payload.cnicBack,
      ntn: payload.ntn,
      incorporationCertificate: payload.incorporationCertificate,
      businessName: payload.businessName || vendor.vendor?.businessName,
      fullAddress: payload.fullAddress || vendor.vendor?.location?.address,
      ownerName: payload.ownerName || vendor.vendor?.ownerName || vendor.fullName,
      registeredPhone: payload.registeredPhone || vendor.vendor?.whatsappNumber || vendor.phone,
      notes: payload.notes,
      status: 'pending',
    });
  }

  // Also update user's profile documents & details if provided
  const updateObj: Record<string, any> = {};
  if (savedRecord.documents && savedRecord.documents.length > 0) {
    updateObj['vendor.documents'] = savedRecord.documents;
  }
  if (payload.businessName) updateObj['vendor.businessName'] = payload.businessName;
  if (payload.ownerName) updateObj['vendor.ownerName'] = payload.ownerName;
  if (payload.fullAddress) updateObj['vendor.location.address'] = payload.fullAddress;
  if (payload.registeredPhone) updateObj['vendor.whatsappNumber'] = payload.registeredPhone;
  if (Object.keys(updateObj).length > 0) {
    await User.findByIdAndUpdate(vendorId, { $set: updateObj });
  }

  const businessName =
    payload.businessName ||
    savedRecord.businessName ||
    vendor.vendor?.businessName ||
    vendor.fullName ||
    `${vendor.firstName || ''} ${vendor.lastName || ''}`.trim() ||
    'Vendor';

  sendNotificationToAdmins(
    'Vendor Verification Request 🛡️',
    `${businessName} has submitted/updated verification documents.`,
    'vendor_verification',
    { verificationId: savedRecord._id.toString(), vendorId, businessName },
  );

  return formatVerificationDetails(savedRecord);
};

// ══════════════════════════════════════════════
//  VENDOR: GET MY VERIFICATION STATUS
// ══════════════════════════════════════════════

const getMyVerificationFromDB = async (vendorId: string) => {
  const result = await Verification.findOne({ vendor: vendorId })
    .populate('vendor', 'firstName lastName fullName email image vendor.businessName vendor.businessDetails')
    .populate('verifiedBy', 'firstName lastName email');
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'No verification request found');
  }
  return formatVerificationDetails(result);
};

// ══════════════════════════════════════════════
//  ADMIN: GET ALL VERIFICATION REQUESTS
// ══════════════════════════════════════════════

const adminGetAllVerificationsFromDB = async (
  query: Record<string, unknown>,
) => {
  const verificationQuery = new QueryBuilder(
    Verification.find()
      .populate('vendor', 'firstName lastName fullName email image vendor.businessName vendor.businessDetails')
      .populate('verifiedBy', 'firstName lastName email'),
    query,
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const rawResult = await verificationQuery.modelQuery;
  const meta = await verificationQuery.countTotal();
  const result = rawResult.map((v: any) => formatVerificationDetails(v));
  return { meta, result };
};

// ══════════════════════════════════════════════
//  ADMIN: UPDATE VERIFICATION STATUS
// ══════════════════════════════════════════════

const adminUpdateVerificationStatusInDB = async (
  verificationId: string,
  adminId: string,
  payload: {
    status: 'verified' | 'rejected';
    rejectedReason?: string;
    notes?: string;
  },
) => {
  const verification = await Verification.findById(verificationId);
  if (!verification) {
    throw new AppError(httpStatus.NOT_FOUND, 'Verification request not found');
  }

  if (verification.status !== 'pending') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Verification request is already ${verification.status}`,
    );
  }

  verification.status = payload.status;
  verification.verifiedBy = payload.status === 'verified'
    ? new Types.ObjectId(adminId)
    : undefined;
  verification.verifiedAt = payload.status === 'verified' ? new Date() : undefined;
  verification.rejectedReason = payload.rejectedReason;
  verification.notes = payload.notes ?? verification.notes;

  await verification.save();

  // Update User's isVerifiedBadge (set or remove based on status)
  if (payload.status === 'verified') {
    await User.findByIdAndUpdate(verification.vendor, {
      'vendor.isVerifiedBadge': true,
    });

    // ── Auto-activate and mark paid any 'verified' VendorPromotion ──
    try {
      const { VendorPromotion } = await import('../Promotion/promotion.model');
      const promotions = await VendorPromotion.find({
        vendor: verification.vendor,
        promotionCategory: 'verified',
        $or: [
          { status: 'pending' },
          { paymentStatus: 'pending' },
          { isActive: false },
        ],
      });

      const now = new Date();
      for (const promo of promotions) {
        // Recalculate endDate so vendor gets full duration from approval date
        const originalDuration =
          promo.endDate.getTime() - promo.startDate.getTime();
        promo.startDate = now;
        promo.endDate = new Date(
          now.getTime() + (originalDuration > 0 ? originalDuration : 365 * 24 * 60 * 60 * 1000),
        );
        promo.status = 'active';
        promo.isActive = true;
        promo.paymentStatus = 'paid';
        await promo.save();
      }
    } catch (err) {
      console.error('Failed to activate vendor promotion:', err);
    }

    // Trigger visibility score recalculation for Business Verification task
    void UserServices.calculateAndUpdateVisibilityScore(verification.vendor.toString());
  } else if (payload.status === 'rejected') {
    // Ensure badge is removed when rejected
    await User.findByIdAndUpdate(verification.vendor, {
      'vendor.isVerifiedBadge': false,
    });

    try {
      const { VendorPromotion } = await import('../Promotion/promotion.model');
      await VendorPromotion.updateMany(
        {
          vendor: verification.vendor,
          promotionCategory: 'verified',
          status: { $in: ['pending', 'active'] },
        },
        {
          $set: {
            status: 'cancelled',
            isActive: false,
          },
        },
      );
    } catch (err) {
      console.error('Failed to cancel verified promotion on rejection:', err);
    }

    // Trigger visibility score recalculation (dynamic reversion)
    void UserServices.calculateAndUpdateVisibilityScore(verification.vendor.toString());
  }

  return formatVerificationDetails(verification);
};

// ══════════════════════════════════════════════
//  ADMIN: GET SINGLE VERIFICATION REQUEST
// ══════════════════════════════════════════════

const getSingleVerificationFromDB = async (id: string) => {
  const result = await Verification.findById(id)
    .populate('vendor', 'firstName lastName fullName email image vendor.businessName vendor.businessDetails vendor.documents')
    .populate('verifiedBy', 'firstName lastName email');
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Verification request not found');
  }
  return formatVerificationDetails(result);
};

export const VerificationServices = {
  submitVerificationIntoDB,
  getMyVerificationFromDB,
  adminGetAllVerificationsFromDB,
  adminUpdateVerificationStatusInDB,
  getSingleVerificationFromDB,
};
