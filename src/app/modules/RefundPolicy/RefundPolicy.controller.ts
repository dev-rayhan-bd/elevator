import { Request, Response } from 'express';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import RefundPolicy from './refundPolicy.model';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';

const createOrUpdateRefundPolicy = catchAsync(async (req: Request, res: Response) => {
  const { refundPolicy } = req.body;

  if (!refundPolicy) {
    throw new AppError(httpStatus.BAD_REQUEST, 'refundPolicy content is required');
  }

  const existing = await RefundPolicy.findOne();

  if (existing) {
    const updated = await RefundPolicy.findByIdAndUpdate(
      existing._id,
      { refundPolicy },
      { new: true, runValidators: true },
    );

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Refund Policy updated successfully',
      data: updated,
    });
  } else {
    const newPolicy = await RefundPolicy.create({ refundPolicy });

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Refund Policy created successfully',
      data: newPolicy,
    });
  }
});

const getRefundPolicy = catchAsync(async (req: Request, res: Response) => {
  const policy = await RefundPolicy.findOne();

  if (!policy) {
    throw new AppError(httpStatus.NOT_FOUND, 'No Refund Policy found!');
  }

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Refund Policy retrieved successfully',
    data: policy,
  });
});

export default {
  createOrUpdateRefundPolicy,
  getRefundPolicy,
};
