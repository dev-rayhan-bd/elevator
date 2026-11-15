import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { ContactUs } from './contact.model';
import { TContactUs } from './contact.interface';
import sendEmail from '../../utils/sendEmail';
import { sendNotificationToAdmins } from '../../utils/sendNotification';
import {
  renderContactUsAutoReplyEmail,
  renderContactUsAdminReplyEmail,
} from '../../utils/emailTemplate';

const saveMessageIntoDB = async (payload: {
  name?: string;
  email: string;
  subject: string;
  message: string;
}) => {
  // Save to database (including user name)
  const result = await ContactUs.create({
    name: payload.name,
    email: payload.email,
    subject: payload.subject,
    message: payload.message,
    status: 'pending',
  });

  // Render branded HTML auto-reply email with WePlan logo & submitted details
  const autoReplyHtml = renderContactUsAutoReplyEmail({
    name: payload.name,
    subject: payload.subject,
    message: payload.message,
    email: payload.email,
  });

  await sendEmail({
    to: payload.email,
    subject: 'We have received your message! — WePlan',
    html: autoReplyHtml,
    fromName: 'WePlan',
  });

  // Send notification to admins
  await sendNotificationToAdmins(
    'New Contact Inquiry 📧',
    `You have a new message from ${payload.name || payload.email} regarding "${payload.subject}".`,
    'contact_inquiry',
    {
      contactId: result._id.toString(),
      senderName: payload.name || 'Visitor',
      senderEmail: payload.email,
    },
  );

  return result;
};

const getAllMessagesFromDB = async (query: Record<string, unknown>) => {
  const messageQuery = new QueryBuilder(ContactUs.find(), query)
    .search(['name', 'email', 'subject', 'message'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await messageQuery.modelQuery;
  const meta = await messageQuery.countTotal();

  return { meta, result };
};

const getSingleMessageFromDB = async (id: string) => {
  const result = await ContactUs.findById(id);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Message not found');
  }
  return result;
};

const replyToMessageInDB = async (
  id: string, 
  adminEmail: string, 
  replyText: string
) => {
  const message = await ContactUs.findById(id);
  if (!message) {
    throw new AppError(httpStatus.NOT_FOUND, 'Message not found');
  }

  if (message.status === 'replied') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Message has already been replied to');
  }

  // Send branded reply email to user
  const replyHtml = renderContactUsAdminReplyEmail({
    name: message.name,
    subject: message.subject,
    replyMessage: replyText,
    originalMessage: message.message,
  });

  await sendEmail({
    to: message.email,
    subject: `Re: ${message.subject} — WePlan Support`,
    html: replyHtml,
    fromName: 'WePlan Support',
  });

  // Update DB
  message.status = 'replied';
  message.replyMessage = replyText;
  message.repliedAt = new Date();
  message.repliedBy = adminEmail;
  
  await message.save();

  return message;
};

const deleteMessageFromDB = async (id: string) => {
  const result = await ContactUs.findByIdAndDelete(id);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Message not found');
  }
  return result;
};

export const ContactServices = {
  saveMessageIntoDB,
  getAllMessagesFromDB,
  getSingleMessageFromDB,
  replyToMessageInDB,
  deleteMessageFromDB,
};
