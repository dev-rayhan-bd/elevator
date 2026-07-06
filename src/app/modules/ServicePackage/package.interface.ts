import { Types } from 'mongoose';

export type TPackageType = 'basic' | 'standard' | 'premium';

export interface TServicePackage {
  vendor: Types.ObjectId;
  packageType: TPackageType;
  title: string;
  description: string;
  price: number;
  // deliveryTime: string;
  // revisions: number;
  features: Types.ObjectId[];
  isActive: boolean;
}
