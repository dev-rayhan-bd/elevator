import { Request, Response } from 'express';
import httpStatus from 'http-status';
import Footer from './footer.model';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';

const createOrUpdateFooter = catchAsync(async (req: Request, res: Response) => {
  const { description, socialLinks } = req.body;

  const existing = await Footer.findOne();

  if (existing) {
    const updateData: Record<string, any> = {};
    if (description !== undefined) updateData.description = description;
    if (socialLinks !== undefined) {
      updateData.socialLinks = {
        ...existing.socialLinks,
        ...socialLinks,
      };
    }

    const updated = await Footer.findByIdAndUpdate(
      existing._id,
      updateData,
      { new: true, runValidators: true },
    );

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Footer content updated successfully',
      data: updated,
    });
  } else {
    const newFooter = await Footer.create({
      description: description || '',
      socialLinks: socialLinks || {},
    });

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Footer content created successfully',
      data: newFooter,
    });
  }
});

const getFooter = catchAsync(async (req: Request, res: Response) => {
  let footer = await Footer.findOne();

  if (!footer) {
    footer = await Footer.create({
      description: 'Your trusted platform to find the perfect wedding vendors and plan your dream wedding effortlessly.',
      socialLinks: {
        facebook: '',
        instagram: '',
        linkedin: '',
        twitter: '',
        youtube: '',
        whatsapp: '',
      },
    });
  }

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Footer content retrieved successfully',
    data: footer,
  });
});

export default {
  createOrUpdateFooter,
  getFooter,
};
