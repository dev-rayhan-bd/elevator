import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { DisputeServices } from './dispute.services';
import { DisputeValidations } from './dispute.validation';
import uploadImage from '../../middleware/upload';

// ── User/Vendor: Create a dispute ──
const createDispute = catchAsync(async (req, res) => {
  let evidenceUrls: string[] = [];

  // Handle multiple file uploads (images / PDFs)
  const files = req.files as Express.Multer.File[] | undefined;
  if (files && files.length > 0) {
    evidenceUrls = await Promise.all(
      files.map((file) => uploadImage(req, file)),
    );
  }

  // Parse form-data `data` string or use raw body
  const rawBody =
    req.body?.data && typeof req.body.data === 'string'
      ? JSON.parse(req.body.data)
      : req.body;

  // Validate with Zod
  const validated =
    DisputeValidations.createDisputeValidationSchema.parse(rawBody);

  const result = await DisputeServices.createDisputeInDB(
    req.user.userId,
    validated,
    evidenceUrls,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Dispute filed successfully',
    data: result,
  });
});

// ── Admin: Summary stats for cards ──
const getDisputeSummaryStats = catchAsync(async (req, res) => {
  const result = await DisputeServices.getDisputeSummaryStatsFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Dispute summary statistics retrieved successfully',
    data: result,
  });
});

// ── User/Vendor: Get my disputes ──
const getMyDisputes = catchAsync(async (req, res) => {
  const result = await DisputeServices.getMyDisputesFromDB(
    req.user.userId,
    req.query,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My disputes retrieved successfully',
    data: result,
  });
});

// ── Admin: Get all disputes ──
const getAllDisputes = catchAsync(async (req, res) => {
  const result = await DisputeServices.getAllDisputesFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All disputes retrieved successfully',
    data: result,
  });
});

// ── Admin / Submitter: Get dispute details ──
const getDisputeDetails = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await DisputeServices.getDisputeDetailsFromDB(
    id,
    req.user as any,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Dispute details retrieved successfully',
    data: result,
  });
});

// ── Admin: Update dispute status ──
const updateDisputeStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const validated =
    DisputeValidations.updateDisputeStatusValidationSchema.parse(req.body);

  const result = await DisputeServices.updateDisputeStatusInDB(
    id,
    req.user.userId,
    validated,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Dispute status updated successfully',
    data: result,
  });
});

// ── Admin & Submitter: Add Response / Reply ──
const addDisputeResponse = catchAsync(async (req, res) => {
  const { id } = req.params;
  let attachmentUrls: string[] = [];

  const files = req.files as Express.Multer.File[] | undefined;
  if (files && files.length > 0) {
    attachmentUrls = await Promise.all(
      files.map((file) => uploadImage(req, file)),
    );
  }

  const rawBody =
    req.body?.data && typeof req.body.data === 'string'
      ? JSON.parse(req.body.data)
      : req.body;

  const validated =
    DisputeValidations.addDisputeResponseValidationSchema.parse(rawBody);

  const result = await DisputeServices.addDisputeResponseInDB(
    id,
    req.user as any,
    validated,
    attachmentUrls,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Response posted successfully',
    data: result,
  });
});

// ── Admin: Add internal note ──
const addAdminNote = catchAsync(async (req, res) => {
  const { id } = req.params;
  const validated =
    DisputeValidations.addAdminNoteValidationSchema.parse(req.body);

  const result = await DisputeServices.addAdminNoteInDB(
    id,
    req.user.userId,
    validated.note,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Note added successfully',
    data: result,
  });
});

// ── Admin: Export dispute report ──
const exportDisputeReport = catchAsync(async (req, res) => {
  const { id } = req.params;
  const pdfBuffer = await DisputeServices.exportDisputeReportFromDB(id);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="Dispute_Report_${id}.pdf"`,
  );

  res.send(pdfBuffer);
});

export const DisputeControllers = {
  createDispute,
  getDisputeSummaryStats,
  getMyDisputes,
  getAllDisputes,
  getDisputeDetails,
  updateDisputeStatus,
  addDisputeResponse,
  addAdminNote,
  exportDisputeReport,
};
