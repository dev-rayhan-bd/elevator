import { Request, Response } from 'express';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import CookiePolicy from './cookiePolicy.model';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';

const createOrUpdateCookiePolicy = catchAsync(async (req: Request, res: Response) => {
  const { cookiePolicy } = req.body;

  if (!cookiePolicy) {
    throw new AppError(httpStatus.BAD_REQUEST, 'cookiePolicy content is required');
  }

  const existing = await CookiePolicy.findOne();

  if (existing) {
    const updated = await CookiePolicy.findByIdAndUpdate(
      existing._id,
      { cookiePolicy },
      { new: true, runValidators: true },
    );

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Cookie Policy updated successfully',
      data: updated,
    });
  } else {
    const newPolicy = await CookiePolicy.create({ cookiePolicy });

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Cookie Policy created successfully',
      data: newPolicy,
    });
  }
});

const getCookiePolicy = catchAsync(async (req: Request, res: Response) => {
  const policy = await CookiePolicy.findOne();

  if (!policy) {
    throw new AppError(httpStatus.NOT_FOUND, 'No Cookie Policy found!');
  }

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Cookie Policy retrieved successfully',
    data: policy,
  });
});

export default {
  createOrUpdateCookiePolicy,
  getCookiePolicy,
};
