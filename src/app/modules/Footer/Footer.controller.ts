import { Request, Response } from 'express';
import httpStatus from 'http-status';
import Footer from './footer.model';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';

const createOrUpdateFooter = catchAsync(async (req: Request, res: Response) => {
  const { companyName, tagline, address, phone, email, description, socialLinks } = req.body;

  const existing = await Footer.findOne();

  if (existing) {
    const updateData: Record<string, any> = {};
    if (companyName !== undefined) updateData.companyName = companyName;
    if (tagline !== undefined) updateData.tagline = tagline;
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (description !== undefined) updateData.description = description;
    if (socialLinks !== undefined) {
      const existingLinks = existing.socialLinks
        ? typeof (existing.socialLinks as any).toObject === 'function'
          ? (existing.socialLinks as any).toObject()
          : existing.socialLinks
        : {};
      updateData.socialLinks = {
        ...existingLinks,
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
      companyName: companyName || '',
      tagline: tagline || '',
      address: address || '',
      phone: phone || '',
      email: email || '',
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
      companyName: 'WePlan Inc.',
      tagline: 'Making your events unforgettable',
      address: '123 Wedding Street, Event City, EC 12345',
      phone: '+1 (555) 123-4567',
      email: 'hello@weplan.com',
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
