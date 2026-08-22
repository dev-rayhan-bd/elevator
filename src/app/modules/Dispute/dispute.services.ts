import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { Dispute } from './dispute.model';
import { TDispute } from './dispute.interface';
import QueryBuilder from '../../builder/QueryBuilder';
import PDFDocument from 'pdfkit';

import { sendNotificationToAdmins } from '../../utils/sendNotification';

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

  sendNotificationToAdmins(
    'New Dispute Opened ⚠️',
    `A dispute has been submitted regarding "${result.title || 'Booking Issue'}".`,
    'new_dispute',
    { disputeId: result._id.toString() }
  );

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

  // Fetch logo buffer
  let logoBuffer: Buffer | null = null;
  try {
    const res = await fetch("https://res.cloudinary.com/da1uxchgo/image/upload/v1781263900/un4seen/i9ti2hs0hnzi8apxz5fj.png");
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      logoBuffer = Buffer.from(arrayBuffer);
    }
  } catch (error) {
    console.error("Failed to fetch logo for PDF", error);
  }

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

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', (err) => reject(err));

    // --- Header ---
    doc.rect(0, 0, 595, 85).fill('#0f172a');
    
    if (logoBuffer) {
      doc.image(logoBuffer, 50, 15, { height: 55 });
    } else {
      doc.fillColor('#ffffff').fontSize(26).font('Helvetica-Bold').text('WEEPLAN', 50, 30);
    }

    // Align text to the right side of the header so it doesn't overlap the logo
    doc.fillColor('#94a3b8').fontSize(10).font('Helvetica').text(
      `Dispute Resolution Report\nGenerated on ${new Date().toLocaleDateString()}`,
      250, 30, { align: 'right', width: 295 }
    );
    
    // Move cursor below the header
    doc.y = 110;
    
    // --- Helper function for dividers ---
    const drawDivider = () => {
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').lineWidth(1).stroke();
      doc.moveDown(0.5);
    };

    // --- Dispute Overview Section ---
    doc.fillColor('#334155').fontSize(18).font('Helvetica-Bold').text('Dispute Overview');
    doc.moveTo(50, doc.y + 5).lineTo(545, doc.y + 5).strokeColor('#cbd5e1').lineWidth(2).stroke();
    doc.moveDown(1.5);

    // Grid Layout
    let yStart = doc.y;
    doc.fillColor('#475569').fontSize(11).font('Helvetica-Bold').text('Dispute ID:', 50, yStart, { width: 80 });
    doc.font('Helvetica').text(report.disputeId || 'N/A', 130, yStart, { width: 150 });
    
    doc.font('Helvetica-Bold').text('Created At:', 300, yStart, { width: 80 });
    doc.font('Helvetica').text(report.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'N/A', 380, yStart);
    
    doc.moveDown(0.5);
    yStart = doc.y;
    doc.font('Helvetica-Bold').text('Type:', 50, yStart, { width: 80 });
    doc.font('Helvetica').text(report.disputeType.toUpperCase(), 130, yStart, { width: 150 });
    
    doc.font('Helvetica-Bold').text('Booking ID:', 300, yStart, { width: 80 });
    doc.font('Helvetica').text(report.bookingId || 'N/A', 380, yStart);

    doc.moveDown(0.5);
    yStart = doc.y;
    doc.font('Helvetica-Bold').text('Priority:', 50, yStart, { width: 80 });
    const priorityColor = report.priority === 'high' ? '#ef4444' : report.priority === 'medium' ? '#f59e0b' : '#3b82f6';
    doc.fillColor(priorityColor).font('Helvetica-Bold').text(report.priority.toUpperCase(), 130, yStart, { width: 150 });
    
    doc.fillColor('#475569').font('Helvetica-Bold').text('Status:', 300, yStart, { width: 80 });
    const statusColor = report.status === 'resolved' ? '#10b981' : report.status === 'rejected' ? '#ef4444' : '#f59e0b';
    doc.fillColor(statusColor).font('Helvetica-Bold').text(report.status.toUpperCase(), 380, yStart);
    
    doc.x = 50;
    doc.moveDown(1.5);

    // --- Description ---
    doc.fillColor('#334155').fontSize(14).font('Helvetica-Bold').text(report.title);
    doc.moveDown(0.2);
    doc.fillColor('#64748b').fontSize(11).font('Helvetica').text(report.description);
    
    drawDivider();

    // --- Parties Involved ---
    doc.moveDown(1);
    doc.fillColor('#334155').fontSize(18).font('Helvetica-Bold').text('Parties Involved', 50, doc.y);
    doc.moveTo(50, doc.y + 5).lineTo(545, doc.y + 5).strokeColor('#cbd5e1').lineWidth(2).stroke();
    doc.moveDown(1.5);

    yStart = doc.y;
    
    // Draw Titles
    doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('Disputer (Plaintiff)', 50, yStart);
    doc.text('Respondent (Defendant)', 300, yStart);
    
    yStart = doc.y + 10;
    doc.fillColor('#475569').fontSize(11).font('Helvetica');
    
    // Draw Name Row
    doc.text(`Name: ${(report.disputer as any)?.firstName || ''} ${(report.disputer as any)?.lastName || ''}`, 50, yStart);
    doc.text(`Name: ${(report.respondent as any)?.firstName || ''} ${(report.respondent as any)?.lastName || ''}`, 300, yStart);

    // Draw Email Row
    yStart += 15;
    doc.text(`Email: ${(report.disputer as any)?.email || 'N/A'}`, 50, yStart);
    doc.text(`Email: ${(report.respondent as any)?.email || 'N/A'}`, 300, yStart);

    // Draw Phone Row
    yStart += 15;
    doc.text(`Phone: ${(report.disputer as any)?.phone || 'N/A'}`, 50, yStart);
    doc.text(`Phone: ${(report.respondent as any)?.phone || 'N/A'}`, 300, yStart);

    doc.x = 50;
    doc.y = yStart + 30;
    drawDivider();

    // --- Admin Notes ---
    if (report.adminNotes && report.adminNotes.length > 0) {
      doc.moveDown(1);
      doc.fillColor('#334155').fontSize(18).font('Helvetica-Bold').text('Admin Internal Notes');
      doc.moveTo(50, doc.y + 5).lineTo(545, doc.y + 5).strokeColor('#cbd5e1').lineWidth(2).stroke();
      doc.moveDown(1.5);

      report.adminNotes.forEach((note: any, index: number) => {
        // Draw note box background (approximated with rect)
        const currentY = doc.y;
        doc.rect(50, currentY, 495, 60).fill('#f8fafc');
        
        doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(`Note ${index + 1} - ${new Date(note.createdAt).toLocaleString()}`, 60, currentY + 10);
        doc.fillColor('#64748b').fontSize(10).font('Helvetica').text(`Author: ${note.admin?.firstName} ${note.admin?.lastName} (${note.admin?.email})`, 60, currentY + 25);
        doc.fillColor('#334155').font('Helvetica').text(note.note, 60, currentY + 40, { width: 475 });
        
        // Advance cursor manually past the rect
        doc.y = currentY + 75; 
      });
    }

    doc.end();
  });
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
