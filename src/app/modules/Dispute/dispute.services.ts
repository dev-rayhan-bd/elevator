import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { Dispute } from './dispute.model';
import { TDispute } from './dispute.interface';
import QueryBuilder from '../../builder/QueryBuilder';

// ── User/Vendor: Create a new dispute ──
const createDisputeInDB = async (
  userId: string,
  payload: Record<string, unknown>,
  evidenceUrls: string[],
) => {
  // Ensure disputer is the logged-in user
  const data = {
    ...payload,
    disputer: userId,
    evidence: evidenceUrls,
  };

  const result = await Dispute.create(data);
  return result;
};

// ── User/Vendor: Get my own disputes ──
const getMyDisputesFromDB = async (
  userId: string,
  query: Record<string, unknown>,
) => {
  const disputeQuery = new QueryBuilder(
    Dispute.find({
      $or: [{ disputer: userId }, { respondent: userId }],
      isDeleted: false,
    }),
    query,
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await disputeQuery.modelQuery
    .populate('disputer', 'firstName lastName email phone image')
    .populate('respondent', 'firstName lastName email phone image');

  const meta = await disputeQuery.countTotal();
  return { meta, result };
};

// ── Admin: Get all disputes (with QueryBuilder) ──
const getAllDisputesFromDB = async (query: Record<string, unknown>) => {
  const disputeQuery = new QueryBuilder(
    Dispute.find({ isDeleted: false }),
    query,
  )
    .search(['disputeId', 'disputeType', 'status', 'title'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await disputeQuery.modelQuery
    .populate('disputer', 'firstName lastName email phone image')
    .populate('respondent', 'firstName lastName email phone image');

  const meta = await disputeQuery.countTotal();
  return { meta, result };
};

// ── Admin: Get single dispute details (includes adminNotes) ──
const getDisputeDetailsFromDB = async (id: string) => {
  const result = await Dispute.findOne({ _id: id, isDeleted: false })
    .select('+adminNotes')
    .populate('disputer', 'firstName lastName email phone image')
    .populate('respondent', 'firstName lastName email phone image')
    .populate('adminNotes.admin', 'firstName lastName email');

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Dispute not found');
  }

  return result;
};

// ── Admin: Update dispute status / priority ──
const updateDisputeStatusInDB = async (
  id: string,
  payload: { status: string; priority?: string },
) => {
  const dispute = await Dispute.findOne({ _id: id, isDeleted: false });
  if (!dispute) {
    throw new AppError(httpStatus.NOT_FOUND, 'Dispute not found');
  }

  // Validate status transitions — a resolved or rejected dispute cannot be changed
  if (
    (dispute.status === 'resolved' || dispute.status === 'rejected') &&
    payload.status !== dispute.status
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot change status. Dispute is already ${dispute.status}`,
    );
  }

  const updateData: Record<string, unknown> = { status: payload.status };
  if (payload.priority) {
    updateData.priority = payload.priority;
  }

  const result = await Dispute.findOneAndUpdate(
    { _id: id, isDeleted: false },
    updateData,
    { new: true },
  );

  return result;
};

// ── Admin: Add internal note to dispute thread ──
const addAdminNoteInDB = async (
  id: string,
  adminId: string,
  note: string,
) => {
  const dispute = await Dispute.findOne({ _id: id, isDeleted: false });
  if (!dispute) {
    throw new AppError(httpStatus.NOT_FOUND, 'Dispute not found');
  }

  const result = await Dispute.findByIdAndUpdate(
    dispute._id,
    {
      $push: {
        adminNotes: { admin: adminId, note, createdAt: new Date() },
      },
    },
    { new: true },
  ).select('+adminNotes');

  return result;
};

// ── Admin: Export dispute report ──
const exportDisputeReportFromDB = async (id: string) => {
  const dispute = await Dispute.findOne({ _id: id, isDeleted: false })
    .select('+adminNotes')
    .populate('disputer', 'firstName lastName email phone')
    .populate('respondent', 'firstName lastName email phone')
    .populate('adminNotes.admin', 'firstName lastName email')
    .lean();

  if (!dispute) {
    throw new AppError(httpStatus.NOT_FOUND, 'Dispute not found');
  }

  // Format as a clean JSON report
  const report = {
    disputeId: dispute.disputeId,
    title: dispute.title,
    description: dispute.description,
    disputeType: dispute.disputeType,
    priority: dispute.priority,
    status: dispute.status,
    bookingId: dispute.bookingId || 'N/A',
    disputer: dispute.disputer,
    respondent: dispute.respondent,
    evidence: dispute.evidence,
    adminNotes: dispute.adminNotes,
    createdAt: dispute.createdAt,
    updatedAt: dispute.updatedAt,
  };

  return report;
};

export const DisputeServices = {
  createDisputeInDB,
  getMyDisputesFromDB,
  getAllDisputesFromDB,
  getDisputeDetailsFromDB,
  updateDisputeStatusInDB,
  addAdminNoteInDB,
  exportDisputeReportFromDB,
};
