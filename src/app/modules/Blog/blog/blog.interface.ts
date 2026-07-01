import { Types } from 'mongoose';

export interface TBlog {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  image: string;
  category: Types.ObjectId;
  author: string; // e.g. "Fatima Malik"
  readTime: string; // e.g. "10 min read"
  isPublished: boolean;
  tags?: string[];
}
