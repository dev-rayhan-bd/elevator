import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { Dispute } from './dispute.model';
import { TDispute } from './dispute.interface';
import QueryBuilder from '../../builder/QueryBuilder';
import PDFDocument from 'pdfkit';
import { User } from '../User/user.model';
import { Admin } from '../Admin/admin.model';
import {
  sendNotification,
  sendNotificationToAdmins,
} from '../../utils/sendNotification';

// ── User/Vendor: Create a new dispute ──
const createDisputeInDB = async (
  userId: string,
  payload: Record<string, any>,
  evidenceUrls: string[],
) => {
  const subject = payload.subject || payload.title || 'General Dispute';
  const issueType =
    payload.issueType || payload.disputeType || 'Service Issue';

  const data: Partial<TDispute> = {
    disputer: userId as any,
    disputeAbout: payload.disputeAbout || 'Other',
    subject,
    title: subject,
    issueType,
    disputeType: issueType,
    otherPartyName: payload.otherPartyName || '',
    otherPartyContact: payload.otherPartyContact || '',
    otherPartyProfileLink: payload.otherPartyProfileLink || '',
    bookingId: payload.bookingId || '',
    priority: payload.priority || 'medium',
    description: payload.description,
    evidence: evidenceUrls || [],
    status: 'submitted',
  };

  if (payload.respondent) {
    data.respondent = payload.respondent;
  }

  const result = await Dispute.create(data);

  // Notify Admins
  sendNotificationToAdmins(
    'New Dispute Raised ⚠️',
    `Dispute #${result.disputeId} regarding "${result.subject}" has been submitted by a user.`,
    'new_dispute',
    { disputeId: result._id.toString() },
  );

  return result;
};

// ── Admin: Summary Cards Stats ──
const getDisputeSummaryStatsFromDB = async () => {
  const [total, submitted, underReview, closed] = await Promise.all([
    Dispute.countDocuments({ isDeleted: false }),
    Dispute.countDocuments({
      status: { $in: ['submitted', 'pending', 'open'] },
      isDeleted: false,
    }),
    Dispute.countDocuments({
      status: 'under_review',
      isDeleted: false,
    }),
    Dispute.countDocuments({
      status: { $in: ['closed', 'resolved', 'rejected'] },
      isDeleted: false,
    }),
  ]);

  return {
    total,
    submitted,
    underReview,
    closed,
  };
};

// ── User/Vendor: Get my own disputes ──
const getMyDisputesFromDB = async (
  userId: string,
  query: Record<string, unknown>,
) => {
  const disputeQuery = new QueryBuilder(
    Dispute.find({
      disputer: userId,
      isDeleted: false,
    }),
    query,
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await disputeQuery.modelQuery
    .populate('disputer', 'firstName lastName email phone image role')
    .populate('respondent', 'firstName lastName email phone image role');

  const meta = await disputeQuery.countTotal();
  return { meta, result };
};

// ── Admin: Get all disputes (with QueryBuilder & Custom Status/Search) ──
const getAllDisputesFromDB = async (query: Record<string, any>) => {
  const filterQuery: Record<string, any> = { isDeleted: false };

  // Handle status filter mapping
  if (query.status && query.status.toLowerCase() !== 'all') {
    const s = query.status.toLowerCase();
    if (s === 'submitted') {
      filterQuery.status = { $in: ['submitted', 'pending', 'open'] };
    } else if (s === 'under_review' || s === 'under review') {
      filterQuery.status = 'under_review';
    } else if (s === 'closed') {
      filterQuery.status = { $in: ['closed', 'resolved', 'rejected'] };
    } else {
      filterQuery.status = query.status;
    }
  }

  // Handle submitter name search alongside disputeId, subject, title
  if (query.searchTerm) {
    const term = query.searchTerm.trim();
    const matchingUsers = await User.find({
      $or: [
        { firstName: { $regex: term, $options: 'i' } },
        { lastName: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
      ],
    })
      .select('_id')
      .lean();

    const matchingUserIds = matchingUsers.map((u) => u._id);

    filterQuery.$or = [
      { disputeId: { $regex: term, $options: 'i' } },
      { subject: { $regex: term, $options: 'i' } },
      { title: { $regex: term, $options: 'i' } },
      { otherPartyName: { $regex: term, $options: 'i' } },
      { disputer: { $in: matchingUserIds } },
    ];
  }

  // Clean raw query so QueryBuilder does not conflict
  const cleanQuery = { ...query };
  delete cleanQuery.searchTerm;
  delete cleanQuery.status;

  const disputeQuery = new QueryBuilder(Dispute.find(filterQuery), cleanQuery)
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await disputeQuery.modelQuery
    .populate('disputer', 'firstName lastName email phone image role')
    .populate('respondent', 'firstName lastName email phone image role');

  const meta = await disputeQuery.countTotal();
  return { meta, result };
};

// ── Get single dispute details ──
const getDisputeDetailsFromDB = async (
  id: string,
  user: { userId: string; role: string },
) => {
  const isMatchById = id.startsWith('DSP-');
  const query = isMatchById ? { disputeId: id } : { _id: id };

  const queryBuilder = Dispute.findOne({ ...query, isDeleted: false })
    .populate('disputer', 'firstName lastName email phone image role')
    .populate('respondent', 'firstName lastName email phone image role')
    .populate('closedBy', 'firstName lastName email role');

  // Only include internal adminNotes if user is admin or superAdmin
  if (user.role === 'admin' || user.role === 'superAdmin') {
    queryBuilder.select('+adminNotes').populate('adminNotes.admin', 'firstName lastName email role');
  }

  const result = await queryBuilder;

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Dispute not found');
  }

  // Access check: Only admin, superAdmin, or disputer can view
  if (
    user.role !== 'admin' &&
    user.role !== 'superAdmin' &&
    result.disputer?._id?.toString() !== user.userId
  ) {
    throw new AppError(httpStatus.FORBIDDEN, 'Access denied to this dispute');
  }

  return result;
};

// ── Admin: Update dispute status (Requires closingResponse when closing) ──
const updateDisputeStatusInDB = async (
  id: string,
  adminId: string,
  payload: { status: string; closingResponse?: string },
) => {
  const dispute = await Dispute.findOne({ _id: id, isDeleted: false });
  if (!dispute) {
    throw new AppError(httpStatus.NOT_FOUND, 'Dispute not found');
  }

  const normalizedStatus = payload.status.toLowerCase();

  // If closing, require closingResponse
  if (normalizedStatus === 'closed' || normalizedStatus === 'resolved') {
    if (!payload.closingResponse || !payload.closingResponse.trim()) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'When closing a dispute, a short Closing Response explaining the outcome to the submitter is required.',
      );
    }
    dispute.closingResponse = payload.closingResponse.trim();
    dispute.closedAt = new Date();
    dispute.closedBy = adminId as any;
    dispute.status = 'closed';
  } else if (normalizedStatus === 'under_review' || normalizedStatus === 'under review') {
    dispute.status = 'under_review';
  } else if (normalizedStatus === 'submitted' || normalizedStatus === 'pending') {
    dispute.status = 'submitted';
  } else {
    dispute.status = payload.status as any;
  }

  await dispute.save();

  // Notify submitter of status change
  const statusDisplayMap: Record<string, string> = {
    submitted: 'Submitted',
    under_review: 'Under Review',
    closed: 'Closed',
  };
  const displayStatus = statusDisplayMap[dispute.status] || dispute.status;

  const notificationMessage =
    dispute.status === 'closed' && dispute.closingResponse
      ? `Your dispute #${dispute.disputeId} has been closed. Outcome: ${dispute.closingResponse}`
      : `The status of your dispute #${dispute.disputeId} has been updated to "${displayStatus}".`;

  sendNotification(
    dispute.disputer.toString(),
    `Dispute Status Updated: ${displayStatus}`,
    notificationMessage,
    'dispute_status_changed',
    { disputeId: dispute._id.toString(), status: dispute.status },
  );

  return dispute;
};

// ── Admin & Submitter: Send Response / Request Information Thread ──
const addDisputeResponseInDB = async (
  id: string,
  sender: { userId: string; role: string },
  payload: { message: string },
  attachmentUrls: string[] = [],
) => {
  const dispute = await Dispute.findOne({ _id: id, isDeleted: false });
  if (!dispute) {
    throw new AppError(httpStatus.NOT_FOUND, 'Dispute not found');
  }

  // Determine sender details
  let senderName = 'WePlan Support';
  if (sender.role === 'admin' || sender.role === 'superAdmin') {
    const adminUser = await Admin.findById(sender.userId).lean();
    if (adminUser) {
      senderName = `${adminUser.firstName} ${adminUser.lastName}`.trim() || 'Admin';
    }
  } else {
    const regularUser = await User.findById(sender.userId).lean();
    if (regularUser) {
      senderName = `${regularUser.firstName} ${regularUser.lastName}`.trim() || 'Submitter';
    }
  }

  const newResponse = {
    sender: sender.userId as any,
    senderRole: sender.role as any,
    senderName,
    message: payload.message.trim(),
    attachments: attachmentUrls,
    createdAt: new Date(),
  };

  dispute.responses.push(newResponse as any);

  // If status was submitted and admin responds, optionally advance status to under_review
  if (
    (sender.role === 'admin' || sender.role === 'superAdmin') &&
    dispute.status === 'submitted'
  ) {
    dispute.status = 'under_review';
  }

  await dispute.save();

  // Notifications
  if (sender.role === 'admin' || sender.role === 'superAdmin') {
    // Admin responded -> Notify Submitter
    sendNotification(
      dispute.disputer.toString(),
      `New Message on Dispute #${dispute.disputeId}`,
      `WePlan Admin has sent a response regarding your dispute: "${payload.message.slice(0, 100)}"`,
      'dispute_response',
      { disputeId: dispute._id.toString() },
    );
  } else {
    // Submitter replied -> Notify Admin Team
    sendNotificationToAdmins(
      `Dispute Reply Received (#${dispute.disputeId})`,
      `${senderName} replied to dispute #${dispute.disputeId}: "${payload.message.slice(0, 100)}"`,
      'dispute_reply',
      { disputeId: dispute._id.toString() },
    );
  }

  return dispute;
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
    .populate('disputer', 'firstName lastName email phone role')
    .populate('adminNotes.admin', 'firstName lastName email')
    .lean();

  if (!dispute) {
    throw new AppError(httpStatus.NOT_FOUND, 'Dispute not found');
  }

  // Format as clean report
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', (err) => reject(err));

    // Header
    doc.rect(0, 0, 595, 80).fill('#0f172a');
    doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text('WePlan Disputes', 50, 28);
    doc.fillColor('#94a3b8').fontSize(10).font('Helvetica').text(
      `Dispute Report\nGenerated on ${new Date().toLocaleDateString()}`,
      250, 28, { align: 'right', width: 295 }
    );

    doc.y = 105;

    // Overview
    doc.fillColor('#334155').fontSize(16).font('Helvetica-Bold').text('Dispute Summary');
    doc.moveDown(0.5);

    let y = doc.y;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#475569');
    doc.text('Dispute ID:', 50, y);
    doc.font('Helvetica').text(dispute.disputeId || 'N/A', 140, y);

    doc.font('Helvetica-Bold').text('Status:', 320, y);
    doc.font('Helvetica').text((dispute.status || 'N/A').toUpperCase(), 400, y);

    y += 20;
    doc.font('Helvetica-Bold').text('Dispute About:', 50, y);
    doc.font('Helvetica').text(dispute.disputeAbout || 'N/A', 140, y);

    doc.font('Helvetica-Bold').text('Issue Type:', 320, y);
    doc.font('Helvetica').text(dispute.issueType || 'N/A', 400, y);

    y += 20;
    doc.font('Helvetica-Bold').text('Submitted On:', 50, y);
    doc.font('Helvetica').text(dispute.createdAt ? new Date(dispute.createdAt).toLocaleString() : 'N/A', 140, y);

    doc.moveDown(2);
    doc.y = y + 30;

    // Submitter Details
    doc.fillColor('#334155').fontSize(14).font('Helvetica-Bold').text('Submitter Information');
    doc.moveDown(0.3);
    const disp = (dispute.disputer as any) || {};
    doc.fontSize(10).font('Helvetica').fillColor('#475569');
    doc.text(`Name: ${disp.firstName || ''} ${disp.lastName || ''} (${disp.role || 'User'})`);
    doc.text(`Email: ${disp.email || 'N/A'}`);
    doc.text(`Phone: ${disp.phone || 'N/A'}`);

    // Other Party
    doc.moveDown(1);
    doc.fillColor('#334155').fontSize(14).font('Helvetica-Bold').text('Other Party Details (As Submitted)');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#475569');
    doc.text(`Name: ${dispute.otherPartyName || 'N/A'}`);
    doc.text(`Contact: ${dispute.otherPartyContact || 'N/A'}`);
    if (dispute.otherPartyProfileLink) {
      doc.text(`Profile Link: ${dispute.otherPartyProfileLink}`);
    }

    // Explanation
    doc.moveDown(1);
    doc.fillColor('#334155').fontSize(14).font('Helvetica-Bold').text(`Subject: ${dispute.subject || dispute.title || ''}`);
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#334155').text(dispute.description || '', { width: 495 });

    // Closing Response if closed
    if (dispute.closingResponse) {
      doc.moveDown(1);
      doc.fillColor('#047857').fontSize(12).font('Helvetica-Bold').text('Closing Outcome / Resolution:');
      doc.moveDown(0.2);
      doc.fontSize(10).font('Helvetica').fillColor('#065f46').text(dispute.closingResponse, { width: 495 });
    }

    doc.end();
  });
};

export const DisputeServices = {
  createDisputeInDB,
  getDisputeSummaryStatsFromDB,
  getMyDisputesFromDB,
  getAllDisputesFromDB,
  getDisputeDetailsFromDB,
  updateDisputeStatusInDB,
  addDisputeResponseInDB,
  addAdminNoteInDB,
  exportDisputeReportFromDB,
};
