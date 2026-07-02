import httpStatus from 'http-status';
import QueryBuilder from '../../../builder/QueryBuilder';
import AppError from '../../../errors/AppError';
import { Blog } from './blog.model';
import { JwtPayload } from 'jsonwebtoken';

/** Check if user is admin or superAdmin */
const isAdmin = (user?: JwtPayload): boolean => {
  return !!user && (user.role === 'admin' || user.role === 'superAdmin');
};

/** Build base filter: admins see everything, others see only published */
const buildVisibilityFilter = (user?: JwtPayload) => {
  if (isAdmin(user)) return {};
  return { isPublished: true };
};

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

// ── Get Single by slug (role-aware) ──
const getSingleBlogBySlugFromDB = async (slug: string, user?: JwtPayload) => {
  const filter = { slug, ...buildVisibilityFilter(user) };
  const result = await Blog.findOne(filter)
    .populate('category', 'name');
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Blog not found');
  return result;
};

// ── Get Single by id (role-aware) ──
const getSingleBlogFromDB = async (id: string, user?: JwtPayload) => {
  const filter = { _id: id, ...buildVisibilityFilter(user) };
  const result = await Blog.findOne(filter)
    .populate('category', 'name');
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Blog not found');
  return result;
};

// ── Get All (role-aware — one API for all) ──
const getAllBlogsFromDB = async (query: Record<string, unknown>, user?: JwtPayload) => {
  const filter = buildVisibilityFilter(user);
  const blogQuery = new QueryBuilder(
    Blog.find(filter)
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

export const BlogServices = {
  createBlogIntoDB,
  updateBlogInDB,
  deleteBlogFromDB,
  getSingleBlogBySlugFromDB,
  getSingleBlogFromDB,
  getAllBlogsFromDB,
};
