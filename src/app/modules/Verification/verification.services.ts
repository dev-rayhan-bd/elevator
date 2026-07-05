import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { Verification } from './verification.model';
import { User } from '../User/user.model';
import { TVerification } from './verification.interface';

// ══════════════════════════════════════════════
//  VENDOR: SUBMIT VERIFICATION REQUEST
// ══════════════════════════════════════════════

const submitVerificationIntoDB = async (
  vendorId: string,
  payload: { documents: string[]; notes?: string },
) => {
  // Check if vendor exists
  const vendor = await User.findById(vendorId);
  if (!vendor || vendor.role !== 'vendor') {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found');
  }

  // Check if already verified
  if (vendor.vendor?.isVerifiedBadge) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You are already verified',
    );
  }

  // Check existing verification request
  const existing = await Verification.findOne({ vendor: vendorId });
  if (existing) {
    if (existing.status === 'pending') {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'You already have a pending verification request',
      );
    }

    // If rejected, allow resubmission by updating
    if (existing.status === 'rejected') {
      existing.documents = payload.documents;
      existing.notes = payload.notes;
      existing.status = 'pending';
      existing.verifiedBy = undefined;
      existing.verifiedAt = undefined;
      existing.rejectedReason = undefined;
      await existing.save();
      return existing;
    }
  }

  // Create new verification request
  const result = await Verification.create({
    vendor: vendorId,
    documents: payload.documents,
    notes: payload.notes,
  });

  return result;
};

// ══════════════════════════════════════════════
//  VENDOR: GET MY VERIFICATION STATUS
// ══════════════════════════════════════════════

const getMyVerificationFromDB = async (vendorId: string) => {
  const result = await Verification.findOne({ vendor: vendorId })
    .populate('verifiedBy', 'firstName lastName email');
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'No verification request found');
  }
  return result;
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

  const result = await verificationQuery.modelQuery;
  const meta = await verificationQuery.countTotal();
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
  } else if (payload.status === 'rejected') {
    // Ensure badge is removed when rejected
    await User.findByIdAndUpdate(verification.vendor, {
      'vendor.isVerifiedBadge': false,
    });
  }

  return verification;
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
  return result;
};

export const VerificationServices = {
  submitVerificationIntoDB,
  getMyVerificationFromDB,
  adminGetAllVerificationsFromDB,
  adminUpdateVerificationStatusInDB,
  getSingleVerificationFromDB,
};
