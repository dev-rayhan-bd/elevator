import { z } from 'zod';

const createBlogSchema = z.object({

    data: z.string().transform((str) => JSON.parse(str)).pipe(
      z.object({
        title: z.string().min(1, 'Title is required'),
        slug: z.string().optional(),
        content: z.string().min(1, 'Content is required'),
        excerpt: z.string().min(1, 'Excerpt is required'),
        category: z.string().min(1, 'Category is required'),
        author: z.string().min(1, 'Author name is required'),
        readTime: z.string().min(1, 'Read time is required'),
        isPublished: z.boolean().optional(),
        tags: z.array(z.string()).optional(),

        // SEO
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        metaKeywords: z.array(z.string()).optional(),
        ogImage: z.string().optional(),

        // UI
        featured: z.boolean().optional(),
        showAuthor: z.boolean().optional(),
        layout: z.enum(['full', 'sidebar', 'compact']).optional(),
      }),
    ),

});

const updateBlogSchema = z.object({
  body: z.object({
    data: z.string().transform((str) => JSON.parse(str)).pipe(
      z.object({
        title: z.string().min(1).optional(),
        slug: z.string().optional(),
        content: z.string().min(1).optional(),
        excerpt: z.string().min(1).optional(),
        category: z.string().optional(),
        author: z.string().optional(),
        readTime: z.string().optional(),
        isPublished: z.boolean().optional(),
        tags: z.array(z.string()).optional(),

        // SEO
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        metaKeywords: z.array(z.string()).optional(),
        ogImage: z.string().optional(),

        // UI
        featured: z.boolean().optional(),
        showAuthor: z.boolean().optional(),
        layout: z.enum(['full', 'sidebar', 'compact']).optional(),
      }),
    ),
  }),
});

export const BlogValidations = {
  createBlogSchema,
  updateBlogSchema,
};
