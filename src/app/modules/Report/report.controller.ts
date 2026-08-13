import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ReportServices } from './report.services';

const getReports = catchAsync(async (req, res) => {
  const reportType = (req.query.type as string) || 'vendor';
  const result = await ReportServices.getReportsData(reportType);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Report data retrieved successfully',
    data: result,
  });
});

const exportReportPDF = catchAsync(async (req, res) => {
  const reportType = (req.query.type as string) || 'vendor';
  const pdfBuffer = await ReportServices.generateReportPDF(reportType);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="WePlan_${reportType.toUpperCase()}_Report_${Date.now()}.pdf"`,
  );
  res.setHeader('Content-Length', pdfBuffer.length);

  res.send(pdfBuffer);
});

export const ReportControllers = {
  getReports,
  exportReportPDF,
};
