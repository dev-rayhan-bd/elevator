import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { ServicePackage } from './package.model';
import { TServicePackage } from './package.interface';
import { VendorService } from '../VendorService/vendorService.model';
import { UserServices } from '../User/user.services';

const PACKAGE_ORDER_MAP: Record<string, number> = {
  basic: 1,
  standard: 2,
  premium: 3,
};

/**
 * Get all packages of the logged-in vendor with features (VendorService) populated,
 * along with stats: total packages, active packages, total services count
 */
const getMyPackagesFromDB = async (vendorId: string) => {
  const packages = await ServicePackage.find({
    vendor: new Types.ObjectId(vendorId),
  })
    .populate({
      path: 'features',
      select: 'title price duration images isActive',
    })
    .sort({ order: 1 });

  // In-memory sort ensures deterministic Basic -> Standard -> Premium ordering
  // even for existing legacy records that don't have order field set yet
  packages.sort((a, b) => {
    const orderA = PACKAGE_ORDER_MAP[a.packageType] ?? 99;
    const orderB = PACKAGE_ORDER_MAP[b.packageType] ?? 99;
    return orderA - orderB;
  });

  // ── Compute stats ──
  const totalPackages = packages.length;
  const activePackages = packages.filter((pkg) => pkg.isActive).length;

  // Count total VendorService documents belonging to this vendor
  const totalServices = await VendorService.countDocuments({
    vendor: new Types.ObjectId(vendorId),
  });

  return {
    packages,
    stats: {
      totalPackages,
      activePackages,
      totalServices,
    },
  };
};

/**
 * Get active packages of a specific vendor (public-facing)
 */
const getPublicVendorPackagesFromDB = async (vendorId: string) => {
  const result = await ServicePackage.find({
    vendor: new Types.ObjectId(vendorId),
    isActive: true,
  })
    .populate({
      path: 'features',
      match: { isActive: true },
      select: 'title price duration images',
    })
    .sort({ order: 1 });

  result.sort((a, b) => {
    const orderA = PACKAGE_ORDER_MAP[a.packageType] ?? 99;
    const orderB = PACKAGE_ORDER_MAP[b.packageType] ?? 99;
    return orderA - orderB;
  });

  return result;
};

/**
 * Verify that all provided feature IDs belong to VendorServices owned by this vendor
 */
const validateFeatureOwnership = async (
  vendorId: string,
  featureIds: string[],
) => {
  if (!featureIds || featureIds.length === 0) return;

  const vendorServices = await VendorService.find({
    _id: { $in: featureIds.map((id) => new Types.ObjectId(id)) },
    vendor: new Types.ObjectId(vendorId),
  }).select('_id');

  const validIds = vendorServices.map((s) => s._id.toString());
  const invalidIds = featureIds.filter((id) => !validIds.includes(id));

  if (invalidIds.length > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Some services do not exist or are not yours: ${invalidIds.join(', ')}`,
    );
  }
};

/**
 * Create a package for the vendor (one per type: basic/standard/premium)
 */
const createPackageIntoDB = async (
  vendorId: string,
  payload: TServicePackage,
) => {
  // Check if vendor already has a package of this type
  const existing = await ServicePackage.findOne({
    vendor: new Types.ObjectId(vendorId),
    packageType: payload.packageType,
  });
  if (existing) {
    throw new AppError(
      httpStatus.CONFLICT,
      `You already have a "${payload.packageType}" package. Use update to modify it.`,
    );
  }

  // Validate that all features (services) belong to this vendor
  if (payload.features && payload.features.length > 0) {
    await validateFeatureOwnership(
      vendorId,
      payload.features as unknown as string[],
    );
  }

  const packageData = {
    ...payload,
    order: PACKAGE_ORDER_MAP[payload.packageType] ?? 1,
    vendor: new Types.ObjectId(vendorId) as any,
  };

  const result = await ServicePackage.create(packageData);

  // Trigger visibility score recalculation for Packages & Pricing task
  void UserServices.calculateAndUpdateVisibilityScore(vendorId);

  return result;
};

/**
 * Update a vendor's own package
 */
const updatePackageInDB = async (
  vendorId: string,
  packageId: string,
  payload: Partial<TServicePackage>,
) => {
  const pkg = await ServicePackage.findOne({
    _id: new Types.ObjectId(packageId),
    vendor: new Types.ObjectId(vendorId),
  });
  if (!pkg) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Package not found or unauthorized',
    );
  }

  // If features are being updated, validate ownership
  if (payload.features) {
    await validateFeatureOwnership(
      vendorId,
      payload.features as unknown as string[],
    );
  }

  const updatePayload = { ...payload };
  if (payload.packageType) {
    updatePayload.order = PACKAGE_ORDER_MAP[payload.packageType] ?? 1;
  }

  const result = await ServicePackage.findByIdAndUpdate(packageId, updatePayload, {
    new: true,
    runValidators: true,
  });

  // Trigger visibility score recalculation (package status may have changed)
  void UserServices.calculateAndUpdateVisibilityScore(vendorId);

  return result;
};

/**
 * Delete a vendor's own package
 */
const deletePackageFromDB = async (vendorId: string, packageId: string) => {
  const pkg = await ServicePackage.findOne({
    _id: new Types.ObjectId(packageId),
    vendor: new Types.ObjectId(vendorId),
  });
  if (!pkg) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Package not found or unauthorized',
    );
  }

  await ServicePackage.findByIdAndDelete(packageId);

  // Trigger visibility score recalculation (dynamic reversion)
  void UserServices.calculateAndUpdateVisibilityScore(vendorId);

  return pkg;
};

export const ServicePackageServices = {
  getMyPackagesFromDB,
  getPublicVendorPackagesFromDB,
  createPackageIntoDB,
  updatePackageInDB,
  deletePackageFromDB,
};
