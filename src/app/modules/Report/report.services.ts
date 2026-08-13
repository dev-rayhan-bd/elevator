import PDFDocument from 'pdfkit';
import { User } from '../User/user.model';
import { Dispute } from '../Dispute/dispute.model';
import { IReportResponse, IReportTypeItem, IMonthlyBreakdownRow } from './report.interface';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Static revenue & bookings fallback values per month (design match)
const STATIC_MONTHLY_REVENUE = [245000, 312000, 398000, 356000, 467000, 524000];
const STATIC_MONTHLY_BOOKINGS = [342, 423, 534, 478, 612, 698];

const REPORT_TYPES: IReportTypeItem[] = [
  {
    key: 'revenue',
    title: 'Revenue Report',
    description: 'Financial performance and revenue trends',
  },
  {
    key: 'bookings',
    title: 'Bookings Report',
    description: 'Booking statistics and patterns',
  },
  {
    key: 'vendor',
    title: 'Vendor Report',
    description: 'Vendor performance and growth',
  },
  {
    key: 'user',
    title: 'User Report',
    description: 'User acquisition and engagement',
  },
  {
    key: 'disputes',
    title: 'Disputes Report',
    description: 'Dispute resolution metrics',
  },
  {
    key: 'custom',
    title: 'Custom Report',
    description: 'Build your own custom report',
  },
];

const getReportsData = async (type: string = 'vendor'): Promise<IReportResponse> => {
  const selectedType = REPORT_TYPES.find((r) => r.key === type) ? type : 'vendor';
  const now = new Date();

  // Generate last 6 months windows
  const monthsDataWindow: Array<{ name: string; year: number; start: Date; end: Date; index: number }> = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

    monthsDataWindow.push({
      name: MONTH_NAMES[d.getMonth()],
      year: d.getFullYear(),
      start: monthStart,
      end: monthEnd,
      index: 5 - i,
    });
  }

  // Execute queries in parallel for maximum performance
  const [
    totalVendorsCount,
    totalUsersCount,
    totalDisputesCount,
    ...monthlyCounts
  ] = await Promise.all([
    User.countDocuments({ role: 'vendor', isDeleted: { $ne: true } }),
    User.countDocuments({ role: 'user', isDeleted: { $ne: true } }),
    Dispute.countDocuments(),

    ...monthsDataWindow.flatMap((m) => [
      User.countDocuments({ role: 'vendor', createdAt: { $gte: m.start, $lte: m.end } }),
      User.countDocuments({ role: 'user', createdAt: { $gte: m.start, $lte: m.end } }),
      Dispute.countDocuments({ createdAt: { $gte: m.start, $lte: m.end } }),
    ]),
  ]);

  // Construct monthly breakdown rows
  const monthlyBreakdown: IMonthlyBreakdownRow[] = [];
  let prevVal = 0;

  for (let i = 0; i < monthsDataWindow.length; i++) {
    const m = monthsDataWindow[i];
    const newVendors = (monthlyCounts[i * 3] as number) || 0;
    const newUsers = (monthlyCounts[i * 3 + 1] as number) || 0;
    const disputes = (monthlyCounts[i * 3 + 2] as number) || 0;

    const revAmount = STATIC_MONTHLY_REVENUE[i % STATIC_MONTHLY_REVENUE.length];
    const bookingsCount = STATIC_MONTHLY_BOOKINGS[i % STATIC_MONTHLY_BOOKINGS.length];

    // Compute growth rate relative to previous month
    let growthStr = '- 0.0%';
    const currentVal = selectedType === 'user' ? newUsers : selectedType === 'disputes' ? disputes : newVendors;

    if (i > 0 && prevVal > 0) {
      const diffPct = (((currentVal - prevVal) / prevVal) * 100).toFixed(1);
      const numPct = Number(diffPct);
      growthStr = numPct >= 0 ? `+${numPct}%` : `${numPct}%`;
    }
    prevVal = currentVal;

    monthlyBreakdown.push({
      month: m.name,
      year: m.year,
      revenue: `$${revAmount.toLocaleString()}`,
      bookings: bookingsCount,
      newVendors,
      newUsers,
      disputes,
      growth: growthStr,
    });
  }

  // Trend chart data mapping depending on report type
  const chartTitle =
    selectedType === 'revenue'
      ? 'Revenue Trend (Last 6 Months)'
      : selectedType === 'bookings'
      ? 'Bookings Trend (Last 6 Months)'
      : selectedType === 'user'
      ? 'User Growth Trend (Last 6 Months)'
      : selectedType === 'disputes'
      ? 'Dispute Reports Trend (Last 6 Months)'
      : 'Vendor Growth Trend (Last 6 Months)';

  const trendData = monthlyBreakdown.map((row) => {
    let val = row.newVendors;
    if (selectedType === 'revenue') val = parseInt(row.revenue.replace(/[^0-9]/g, ''), 10);
    else if (selectedType === 'bookings') val = row.bookings;
    else if (selectedType === 'user') val = row.newUsers;
    else if (selectedType === 'disputes') val = row.disputes;

    return {
      month: row.month,
      value: val,
    };
  });

  return {
    reportTypes: REPORT_TYPES,
    selectedReportType: selectedType,
    lastUpdated: 'Just now',
    summaryCards: {
      totalRevenue: '$2,302,000',
      totalBookings: 3087,
      avgOrderValue: '$746',
      newVendors: totalVendorsCount,
      newUsers: totalUsersCount,
      totalDisputes: totalDisputesCount,
    },
    trendChart: {
      title: chartTitle,
      data: trendData,
    },
    monthlyBreakdown,
  };
};

const generateReportPDF = async (type: string = 'vendor'): Promise<Buffer> => {
  const reportData = await getReportsData(type);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers: Buffer[] = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', (err) => reject(err));

    // Header Branding
    doc.rect(0, 0, 595.28, 70).fill('#db2777');
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('WePlan Reports', 50, 22);
    doc.fontSize(10).font('Helvetica').text(`${reportData.selectedReportType.toUpperCase()} REPORT`, 400, 28, { align: 'right' });

    doc.y = 90;

    // Report Summary Title
    doc.fillColor('#1e293b').fontSize(16).font('Helvetica-Bold').text(`Business Summary Report (${reportData.selectedReportType.toUpperCase()})`);
    doc.fillColor('#64748b').fontSize(10).font('Helvetica').text(`Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`);
    doc.moveDown(1);

    // KPI Cards Grid
    doc.rect(50, doc.y, 115, 55).fillAndStroke('#fdf2f8', '#fbcfe8');
    doc.fillColor('#9d174d').fontSize(9).font('Helvetica-Bold').text('TOTAL REVENUE', 60, doc.y - 45);
    doc.fillColor('#be185d').fontSize(14).font('Helvetica-Bold').text(reportData.summaryCards.totalRevenue, 60, doc.y - 30);

    doc.rect(175, doc.y - 55, 115, 55).fillAndStroke('#f0fdf4', '#bbf7d0');
    doc.fillColor('#166534').fontSize(9).font('Helvetica-Bold').text('TOTAL BOOKINGS', 185, doc.y - 45);
    doc.fillColor('#15803d').fontSize(14).font('Helvetica-Bold').text(reportData.summaryCards.totalBookings.toString(), 185, doc.y - 30);

    doc.rect(300, doc.y - 55, 115, 55).fillAndStroke('#faf5ff', '#e9d5ff');
    doc.fillColor('#6b21a8').fontSize(9).font('Helvetica-Bold').text('AVG ORDER VALUE', 310, doc.y - 45);
    doc.fillColor('#7e22ce').fontSize(14).font('Helvetica-Bold').text(reportData.summaryCards.avgOrderValue, 310, doc.y - 30);

    doc.rect(425, doc.y - 55, 115, 55).fillAndStroke('#fffbe6', '#fef08a');
    doc.fillColor('#854d0e').fontSize(9).font('Helvetica-Bold').text('NEW VENDORS', 435, doc.y - 45);
    doc.fillColor('#a16207').fontSize(14).font('Helvetica-Bold').text(reportData.summaryCards.newVendors.toString(), 435, doc.y - 30);

    doc.y = 175;
    doc.moveDown(1.5);

    // Monthly Breakdown Table Header
    doc.fillColor('#1e293b').fontSize(14).font('Helvetica-Bold').text('Monthly Breakdown (Last 6 Months)');
    doc.moveDown(0.5);

    const tableTop = doc.y;
    doc.rect(50, tableTop, 495, 22).fill('#f1f5f9');
    doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold');
    doc.text('MONTH', 60, tableTop + 6);
    doc.text('REVENUE', 140, tableTop + 6);
    doc.text('BOOKINGS', 240, tableTop + 6);
    doc.text('NEW VENDORS', 330, tableTop + 6);
    doc.text('GROWTH', 440, tableTop + 6);

    let currentY = tableTop + 25;

    reportData.monthlyBreakdown.forEach((row, index) => {
      if (index % 2 === 1) {
        doc.rect(50, currentY - 3, 495, 20).fill('#f8fafc');
      }
      doc.fillColor('#334155').fontSize(9).font('Helvetica');
      doc.text(row.month, 60, currentY);
      doc.text(row.revenue, 140, currentY);
      doc.text(row.bookings.toString(), 240, currentY);
      doc.text(row.newVendors.toString(), 330, currentY);

      const growthColor = row.growth.startsWith('+') ? '#16a34a' : row.growth.startsWith('-') ? '#dc2626' : '#64748b';
      doc.fillColor(growthColor).font('Helvetica-Bold').text(row.growth, 440, currentY);

      currentY += 20;
    });

    // Footer note
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text('WePlan Platform Analytics & Reporting Service', 50, 750, { align: 'center', width: 495 });

    doc.end();
  });
};

export const ReportServices = {
  getReportsData,
  generateReportPDF,
};
