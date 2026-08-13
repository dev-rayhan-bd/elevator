import PDFDocument from 'pdfkit';
import { User } from '../User/user.model';
import { VendorService } from '../VendorService/vendorService.model';
import { EventRequest } from '../EventRequest/eventRequest.model';
import { EventQuote } from '../EventQuote/eventQuote.model';
import { Dispute } from '../Dispute/dispute.model';
import { IReportResponse, ISummaryCardItem, IMonthlyBreakdownRow } from './report.interface';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATIC_MONTHLY_REVENUE = [245000, 312000, 398000, 356000, 467000, 524000];
const STATIC_MONTHLY_BOOKINGS = [342, 423, 534, 478, 612, 698];

const getReportsData = async (type: string = 'vendor'): Promise<IReportResponse> => {
  const validTypes = ['revenue', 'bookings', 'vendor', 'user', 'disputes', 'custom'];
  const selectedType = validTypes.includes(type) ? type : 'vendor';
  const now = new Date();

  // Generate last 6 months windows
  const monthsDataWindow: Array<{ name: string; year: number; start: Date; end: Date }> = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

    monthsDataWindow.push({
      name: MONTH_NAMES[d.getMonth()],
      year: d.getFullYear(),
      start: monthStart,
      end: monthEnd,
    });
  }

  // Execute ALL metrics in parallel via Promise.all
  const [
    totalVendorsCount,
    totalUsersCount,
    totalDisputesCount,
    activeVendorsCount,
    pendingVendorsCount,
    verifiedVendorsCount,
    activeListingsCount,
    activeUsersCount,
    totalRequestsCount,
    pendingDisputesCount,
    resolvedDisputesCount,
    rejectedDisputesCount,
    wonQuotesCount,
    pendingQuotesCount,
    savedListingsResult,

    ...monthlyCounts
  ] = await Promise.all([
    User.countDocuments({ role: 'vendor', isDeleted: { $ne: true } }),
    User.countDocuments({ role: 'user', isDeleted: { $ne: true } }),
    Dispute.countDocuments(),
    User.countDocuments({ role: 'vendor', status: 'active' }),
    User.countDocuments({ role: 'vendor', status: 'pending' }),
    User.countDocuments({ role: 'vendor', 'vendor.isVerifiedBadge': true }),
    VendorService.countDocuments({ isActive: true, isDraft: { $ne: true } }),
    User.countDocuments({ role: 'user', status: 'active' }),
    EventRequest.countDocuments({ isDeleted: { $ne: true } }),
    Dispute.countDocuments({ status: 'pending' }),
    Dispute.countDocuments({ status: 'resolved' }),
    Dispute.countDocuments({ status: 'rejected' }),
    EventQuote.countDocuments({ status: { $in: ['accepted', 'won'] } }),
    EventQuote.countDocuments({ status: 'pending' }),
    User.aggregate([
      { $project: { favCount: { $size: { $ifNull: ['$favoriteServices', []] } } } },
      { $group: { _id: null, total: { $sum: '$favCount' } } },
    ]),

    ...monthsDataWindow.flatMap((m) => [
      User.countDocuments({ role: 'vendor', createdAt: { $gte: m.start, $lte: m.end } }),
      User.countDocuments({ role: 'user', createdAt: { $gte: m.start, $lte: m.end } }),
      VendorService.countDocuments({ isActive: true, createdAt: { $gte: m.start, $lte: m.end } }),
      EventRequest.countDocuments({ isDeleted: { $ne: true }, createdAt: { $gte: m.start, $lte: m.end } }),
      Dispute.countDocuments({ createdAt: { $gte: m.start, $lte: m.end } }),
      Dispute.countDocuments({ status: 'resolved', createdAt: { $gte: m.start, $lte: m.end } }),
    ]),
  ]);

  // Construct 4 relevant summary cards based on report type
  let summaryCards: ISummaryCardItem[] = [];

  if (selectedType === 'vendor') {
    summaryCards = [
      { title: 'Total Vendors', value: totalVendorsCount },
      { title: 'Active Listings', value: activeListingsCount },
      { title: 'Verified Vendors', value: verifiedVendorsCount },
      { title: 'Pending Reviews', value: pendingVendorsCount },
    ];
  } else if (selectedType === 'user') {
    const totalSaved = savedListingsResult[0]?.total || 0;
    summaryCards = [
      { title: 'Total Users', value: totalUsersCount },
      { title: 'Active Users', value: activeUsersCount },
      { title: 'Buyer Requests', value: totalRequestsCount },
      { title: 'Saved Listings', value: totalSaved },
    ];
  } else if (selectedType === 'disputes') {
    summaryCards = [
      { title: 'Total Disputes', value: totalDisputesCount },
      { title: 'Pending Disputes', value: pendingDisputesCount },
      { title: 'Resolved Disputes', value: resolvedDisputesCount },
      { title: 'Rejected Disputes', value: rejectedDisputesCount },
    ];
  } else if (selectedType === 'bookings') {
    summaryCards = [
      { title: 'Total Bookings', value: 3087 },
      { title: 'Won Deals', value: wonQuotesCount },
      { title: 'Pending Quotes', value: pendingQuotesCount },
      { title: 'Buyer Requests', value: totalRequestsCount },
    ];
  } else if (selectedType === 'revenue') {
    summaryCards = [
      { title: 'Total Revenue', value: '$2,302,000' },
      { title: 'Total Bookings', value: 3087 },
      { title: 'Avg Order Value', value: '$746' },
      { title: 'Monetized Ads', value: '$345,678' },
    ];
  } else {
    summaryCards = [
      { title: 'Total Vendors', value: totalVendorsCount },
      { title: 'Total Users', value: totalUsersCount },
      { title: 'Active Listings', value: activeListingsCount },
      { title: 'Total Requests', value: totalRequestsCount },
    ];
  }

  // Construct monthly breakdown rows with ONLY real fields for vendor, user, disputes, custom
  const monthlyBreakdown: IMonthlyBreakdownRow[] = [];
  let prevVal = 0;

  for (let i = 0; i < monthsDataWindow.length; i++) {
    const m = monthsDataWindow[i];
    const newVendors = (monthlyCounts[i * 6] as number) || 0;
    const newUsers = (monthlyCounts[i * 6 + 1] as number) || 0;
    const activeListings = (monthlyCounts[i * 6 + 2] as number) || 0;
    const buyerRequests = (monthlyCounts[i * 6 + 3] as number) || 0;
    const disputes = (monthlyCounts[i * 6 + 4] as number) || 0;
    const resolvedDisputes = (monthlyCounts[i * 6 + 5] as number) || 0;

    const revAmount = STATIC_MONTHLY_REVENUE[i % STATIC_MONTHLY_REVENUE.length];
    const bookingsCount = STATIC_MONTHLY_BOOKINGS[i % STATIC_MONTHLY_BOOKINGS.length];

    let currentVal = newVendors;
    if (selectedType === 'user') currentVal = newUsers;
    else if (selectedType === 'disputes') currentVal = disputes;
    else if (selectedType === 'bookings') currentVal = bookingsCount;
    else if (selectedType === 'revenue') currentVal = revAmount;

    let growthStr = '- 0.0%';
    if (i > 0 && prevVal > 0) {
      const diffPct = (((currentVal - prevVal) / prevVal) * 100).toFixed(1);
      const numPct = Number(diffPct);
      growthStr = numPct >= 0 ? `+${numPct}%` : `${numPct}%`;
    }
    prevVal = currentVal;

    let rowObj: IMonthlyBreakdownRow;

    if (selectedType === 'vendor') {
      rowObj = {
        month: m.name,
        year: m.year,
        newVendors,
        activeListings,
        growth: growthStr,
      };
    } else if (selectedType === 'user') {
      rowObj = {
        month: m.name,
        year: m.year,
        newUsers,
        buyerRequests,
        growth: growthStr,
      };
    } else if (selectedType === 'disputes') {
      rowObj = {
        month: m.name,
        year: m.year,
        disputes,
        resolvedDisputes,
        growth: growthStr,
      };
    } else if (selectedType === 'custom') {
      rowObj = {
        month: m.name,
        year: m.year,
        newVendors,
        newUsers,
        activeListings,
        buyerRequests,
        disputes,
        growth: growthStr,
      };
    } else {
      // revenue | bookings
      rowObj = {
        month: m.name,
        year: m.year,
        revenue: `$${revAmount.toLocaleString()}`,
        bookings: bookingsCount,
        newVendors,
        growth: growthStr,
      };
    }

    monthlyBreakdown.push(rowObj);
  }

  // Trend chart data mapping
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
    let val = row.newVendors ?? 0;
    if (selectedType === 'revenue' && row.revenue) val = parseInt(row.revenue.replace(/[^0-9]/g, ''), 10);
    else if (selectedType === 'bookings' && row.bookings) val = row.bookings;
    else if (selectedType === 'user' && row.newUsers !== undefined) val = row.newUsers;
    else if (selectedType === 'disputes' && row.disputes !== undefined) val = row.disputes;

    return {
      month: row.month,
      value: val,
    };
  });

  return {
    selectedReportType: selectedType,
    lastUpdated: 'Just now',
    summaryCards,
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

    // KPI Cards Grid (Render dynamic summaryCards)
    const cardBgColors = ['#fdf2f8', '#f0fdf4', '#faf5ff', '#fffbe6'];
    const cardBorderColors = ['#fbcfe8', '#bbf7d0', '#e9d5ff', '#fef08a'];
    const titleColors = ['#9d174d', '#166534', '#6b21a8', '#854d0e'];
    const valColors = ['#be185d', '#15803d', '#7e22ce', '#a16207'];

    reportData.summaryCards.forEach((card, idx) => {
      const xPos = 50 + idx * 125;
      doc.rect(xPos, doc.y, 115, 55).fillAndStroke(cardBgColors[idx % 4], cardBorderColors[idx % 4]);
      doc.fillColor(titleColors[idx % 4]).fontSize(8).font('Helvetica-Bold').text(card.title.toUpperCase(), xPos + 10, doc.y - 45, { width: 95 });
      doc.fillColor(valColors[idx % 4]).fontSize(13).font('Helvetica-Bold').text(card.value.toString(), xPos + 10, doc.y - 30, { width: 95 });
    });

    doc.y = 175;
    doc.moveDown(1.5);

    // Dynamic Monthly Breakdown Table Header
    doc.fillColor('#1e293b').fontSize(14).font('Helvetica-Bold').text('Monthly Breakdown (Last 6 Months)');
    doc.moveDown(0.5);

    const tableTop = doc.y;
    doc.rect(50, tableTop, 495, 22).fill('#f1f5f9');
    doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold');

    if (reportData.selectedReportType === 'vendor') {
      doc.text('MONTH', 60, tableTop + 6);
      doc.text('NEW VENDORS', 160, tableTop + 6);
      doc.text('ACTIVE LISTINGS', 300, tableTop + 6);
      doc.text('GROWTH', 440, tableTop + 6);
    } else if (reportData.selectedReportType === 'user') {
      doc.text('MONTH', 60, tableTop + 6);
      doc.text('NEW USERS', 160, tableTop + 6);
      doc.text('BUYER REQUESTS', 300, tableTop + 6);
      doc.text('GROWTH', 440, tableTop + 6);
    } else if (reportData.selectedReportType === 'disputes') {
      doc.text('MONTH', 60, tableTop + 6);
      doc.text('TOTAL DISPUTES', 160, tableTop + 6);
      doc.text('RESOLVED DISPUTES', 300, tableTop + 6);
      doc.text('GROWTH', 440, tableTop + 6);
    } else {
      doc.text('MONTH', 60, tableTop + 6);
      doc.text('REVENUE', 140, tableTop + 6);
      doc.text('BOOKINGS', 240, tableTop + 6);
      doc.text('NEW VENDORS', 330, tableTop + 6);
      doc.text('GROWTH', 440, tableTop + 6);
    }

    let currentY = tableTop + 25;

    reportData.monthlyBreakdown.forEach((row, index) => {
      if (index % 2 === 1) {
        doc.rect(50, currentY - 3, 495, 20).fill('#f8fafc');
      }
      doc.fillColor('#334155').fontSize(9).font('Helvetica');

      if (reportData.selectedReportType === 'vendor') {
        doc.text(row.month, 60, currentY);
        doc.text((row.newVendors ?? 0).toString(), 160, currentY);
        doc.text((row.activeListings ?? 0).toString(), 300, currentY);
      } else if (reportData.selectedReportType === 'user') {
        doc.text(row.month, 60, currentY);
        doc.text((row.newUsers ?? 0).toString(), 160, currentY);
        doc.text((row.buyerRequests ?? 0).toString(), 300, currentY);
      } else if (reportData.selectedReportType === 'disputes') {
        doc.text(row.month, 60, currentY);
        doc.text((row.disputes ?? 0).toString(), 160, currentY);
        doc.text((row.resolvedDisputes ?? 0).toString(), 300, currentY);
      } else {
        doc.text(row.month, 60, currentY);
        doc.text(row.revenue || '$0', 140, currentY);
        doc.text((row.bookings ?? 0).toString(), 240, currentY);
        doc.text((row.newVendors ?? 0).toString(), 330, currentY);
      }

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
