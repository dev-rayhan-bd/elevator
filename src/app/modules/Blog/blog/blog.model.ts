import { Schema, model } from 'mongoose';
import { TBlog } from './blog.interface';

const blogSchema = new Schema<TBlog>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    excerpt: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'BlogCategory',
      required: true,
    },
    author: {
      type: String,
      required: true,
      trim: true,
    },
    readTime: {
      type: String,
      required: true,
      trim: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    tags: {
      type: [String],
      default: [],
    },

    // ── SEO fields ──
    metaTitle: {
      type: String,
      trim: true,
    },
    metaDescription: {
      type: String,
      trim: true,
    },
    metaKeywords: {
      type: [String],
      default: [],
    },
    ogImage: {
      type: String,
    },

    // ── UI-specific fields ──
    featured: {
      type: Boolean,
      default: false,
    },
    showAuthor: {
      type: Boolean,
      default: true,
    },
    layout: {
      type: String,
      enum: ['full', 'sidebar', 'compact'],
      default: 'full',
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
blogSchema.index({ slug: 1 }, { unique: true });
blogSchema.index({ category: 1 });
blogSchema.index({ isPublished: 1 });
blogSchema.index({ createdAt: -1 });
blogSchema.index({ title: 'text', content: 'text', excerpt: 'text', author: 'text' });

// Auto-generate slug from title before validation
blogSchema.pre('validate', function (next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + Date.now().toString(36);
  }
  next();
});

export const Blog = model<TBlog>('Blog', blogSchema);
