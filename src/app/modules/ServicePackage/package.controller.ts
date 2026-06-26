import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ServicePackageServices } from './package.services';

/**
 * Vendor: Get my own packages (all 3 types with populated features)
 */
const getMyPackages = catchAsync(async (req, res) => {
  const result = await ServicePackageServices.getMyPackagesFromDB(
    req.user.userId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My packages retrieved successfully',
    data: result,
  });
});

/**
 * Public: Get active packages of a specific vendor
 */
const getPublicVendorPackages = catchAsync(async (req, res) => {
  const { vendorId } = req.params;
  const result =
    await ServicePackageServices.getPublicVendorPackagesFromDB(vendorId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Vendor packages retrieved successfully',
    data: result,
  });
});

const createPackage = catchAsync(async (req, res) => {
  const result = await ServicePackageServices.createPackageIntoDB(
    req.user.userId,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: `${req.body.packageType} package created successfully`,
    data: result,
  });
});

const updatePackage = catchAsync(async (req, res) => {
  const result = await ServicePackageServices.updatePackageInDB(
    req.user.userId,
    req.params.id,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Package updated successfully',
    data: result,
  });
});

const deletePackage = catchAsync(async (req, res) => {
  const result = await ServicePackageServices.deletePackageFromDB(
    req.user.userId,
    req.params.id,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Package deleted successfully',
    data: result,
  });
});

export const ServicePackageControllers = {
  getMyPackages,
  getPublicVendorPackages,
  createPackage,
  updatePackage,
  deletePackage,
};
