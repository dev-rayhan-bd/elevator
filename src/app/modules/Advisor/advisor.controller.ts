import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AdvisorServices } from './advisor.services';

// ══════════════════════════════════════════════
//  ADMIN: ADVISOR SERVICE CRUD
// ══════════════════════════════════════════════

const createAdvisorService = catchAsync(async (req: Request, res: Response) => {
  const result = await AdvisorServices.createAdvisorServiceIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Advisor service created successfully',
    data: result,
  });
});

const updateAdvisorService = catchAsync(async (req: Request, res: Response) => {
  const result = await AdvisorServices.updateAdvisorServiceInDB(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Advisor service updated successfully',
    data: result,
  });
});

const deleteAdvisorService = catchAsync(async (req: Request, res: Response) => {
  const result = await AdvisorServices.deleteAdvisorServiceFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Advisor service deleted successfully',
    data: result,
  });
});

const getAllAdvisorServices = catchAsync(async (req: Request, res: Response) => {
  const result = await AdvisorServices.getAllAdvisorServicesFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Advisor services retrieved successfully',
    data: result,
  });
});

const getSingleAdvisorService = catchAsync(async (req: Request, res: Response) => {
  const result = await AdvisorServices.getSingleAdvisorServiceFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Advisor service retrieved successfully',
    data: result,
  });
});

// ══════════════════════════════════════════════
//  PUBLIC: GET ACTIVE ADVISOR SERVICES
// ══════════════════════════════════════════════

const getActiveAdvisorServices = catchAsync(async (req: Request, res: Response) => {
  const result = await AdvisorServices.getActiveAdvisorServicesFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Active advisor services retrieved successfully',
    data: result,
  });
});

// ══════════════════════════════════════════════
//  USER: BOOK AN ADVISOR
// ══════════════════════════════════════════════

const createBooking = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const result = await AdvisorServices.createBookingIntoDB(userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Advisor booking created successfully. Waiting for admin to assign an associate.',
    data: result,
  });
});

// ══════════════════════════════════════════════
//  USER: GET MY BOOKINGS
// ══════════════════════════════════════════════

const getMyBookings = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const result = await AdvisorServices.getMyBookingsFromDB(userId, req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My advisor bookings retrieved successfully',
    data: result,
  });
});

const getMySingleBooking = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const result = await AdvisorServices.getMySingleBookingFromDB(userId, req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Booking details retrieved successfully',
    data: result,
  });
});

const cancelBooking = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const result = await AdvisorServices.cancelBookingFromDB(userId, req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Booking cancelled successfully',
    data: result,
  });
});

// ══════════════════════════════════════════════
//  ADMIN: BOOKING MANAGEMENT
// ══════════════════════════════════════════════

const adminGetAllBookings = catchAsync(async (req: Request, res: Response) => {
  const result = await AdvisorServices.adminGetAllBookingsFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All advisor bookings retrieved successfully',
    data: result,
  });
});

const assignAssociate = catchAsync(async (req: Request, res: Response) => {
  const { assignedAssociate, adminNotes } = req.body;
  const result = await AdvisorServices.assignAssociateToBookingInDB(
    req.params.id,
    assignedAssociate,
    adminNotes,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Associate assigned to booking successfully',
    data: result,
  });
});

const adminUpdateBookingStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await AdvisorServices.adminUpdateBookingStatusInDB(
    req.params.id,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Booking status updated successfully',
    data: result,
  });
});

// ══════════════════════════════════════════════
//  ADMIN: DASHBOARD STATISTICS
// ══════════════════════════════════════════════

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const result = await AdvisorServices.getAdvisorDashboardStatsFromDB();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Advisor dashboard statistics retrieved successfully',
    data: result,
  });
});

export const AdvisorControllers = {
  createAdvisorService,
  updateAdvisorService,
  deleteAdvisorService,
  getAllAdvisorServices,
  getSingleAdvisorService,
  getActiveAdvisorServices,
  createBooking,
  getMyBookings,
  getMySingleBooking,
  cancelBooking,
  adminGetAllBookings,
  assignAssociate,
  adminUpdateBookingStatus,
  getDashboardStats,
};
