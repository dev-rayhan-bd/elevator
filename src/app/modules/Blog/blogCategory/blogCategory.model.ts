import { Schema, model } from 'mongoose';
import { TBlogCategory } from './blogCategory.interface';

const blogCategorySchema = new Schema<TBlogCategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

blogCategorySchema.index({ name: 1 }, { unique: true });

export const BlogCategory = model<TBlogCategory>('BlogCategory', blogCategorySchema);
