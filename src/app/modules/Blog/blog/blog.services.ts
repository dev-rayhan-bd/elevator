import httpStatus from 'http-status';
import QueryBuilder from '../../../builder/QueryBuilder';
import AppError from '../../../errors/AppError';
import { Blog } from './blog.model';

// ── Admin: Create ──
const createBlogIntoDB = async (payload: Record<string, unknown>) => {
  // Auto-generate slug if not provided
  if (!payload.slug && payload.title) {
    payload.slug = (payload.title as string)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + Date.now().toString(36);
  }
  const result = await Blog.create(payload);
  return result;
};

// ── Admin: Update ──
const updateBlogInDB = async (id: string, payload: Record<string, unknown>) => {
  const result = await Blog.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Blog not found');
  return result;
};

// ── Admin: Delete ──
const deleteBlogFromDB = async (id: string) => {
  const result = await Blog.findByIdAndDelete(id);
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Blog not found');
  return result;
};



// ── Get Single by id ──
const getSingleBlogFromDB = async (id: string) => {
  const result = await Blog.findById(id)
    .populate('category', 'name');
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Blog not found');
  return result;
};

// ── Get All ──
const getAllBlogsFromDB = async (query: Record<string, unknown>) => {
  const blogQuery = new QueryBuilder(
    Blog.find()
      .populate('category', 'name'),
    query,
  )
    .search(['title', 'excerpt', 'author'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await blogQuery.modelQuery;
  const meta = await blogQuery.countTotal();
  return { meta, result };
};

// ── Get Single by Slug (public) ──
const getSingleBlogBySlugFromDB = async (slug: string) => {
  const result = await Blog.findOne({ slug, isPublished: true })
    .populate('category', 'name');
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Blog not found');
  return result;
};

export const BlogServices = {
  createBlogIntoDB,
  updateBlogInDB,
  deleteBlogFromDB,

  getSingleBlogFromDB,
  getAllBlogsFromDB,
  getSingleBlogBySlugFromDB,
};
