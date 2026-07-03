import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../utils/catchAsync';
import sendResponse from '../../../utils/sendResponse';
import { BlogServices } from './blog.services';
import uploadImage from '../../../middleware/upload';

// ── Admin: Create ──
const createBlog = catchAsync(async (req: Request, res: Response) => {
  let imageUrl = '';
  if (req.file) {
    imageUrl = await uploadImage(req);
  }

  const rawData = req.body.data ? JSON.parse(req.body.data) : req.body;
  const payload = { ...rawData, image: imageUrl };

  const result = await BlogServices.createBlogIntoDB(payload);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Blog created successfully',
    data: result,
  });
});

// ── Admin: Update ──
const updateBlog = catchAsync(async (req: Request, res: Response) => {
  let imageUrl: string | undefined;
  if (req.file) {
    imageUrl = await uploadImage(req);
  }

  const rawData = req.body.data ? JSON.parse(req.body.data) : req.body;
  const payload = { ...rawData, ...(imageUrl && { image: imageUrl }) };

  const result = await BlogServices.updateBlogInDB(req.params.id, payload);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Blog updated successfully',
    data: result,
  });
});

// ── Admin: Delete ──
const deleteBlog = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogServices.deleteBlogFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Blog deleted successfully',
    data: result,
  });
});



// ── Get Single by id ──
const getSingleBlog = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogServices.getSingleBlogFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Blog retrieved successfully',
    data: result,
  });
});

// ── Get All ──
const getAllBlogs = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogServices.getAllBlogsFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Blogs retrieved successfully',
    data: result,
  });
});

export const BlogControllers = {
  createBlog,
  updateBlog,
  deleteBlog,
  getSingleBlog,
  getAllBlogs,
};
