import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { ContactUs } from './contact.model';
import { TContactUs } from './contact.interface';
import sendEmail from '../../utils/sendEmail';
import { sendNotificationToAdmins } from '../../utils/sendNotification';

const saveMessageIntoDB = async (payload: Pick<TContactUs, 'email' | 'subject' | 'message'>) => {
  // Save to database
  const result = await ContactUs.create(payload);

  // Send auto-reply to user
  const autoReplyHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Thank You for Contacting Us</h2>
      <p>Hi,</p>
      <p>We have received your message regarding "<strong>${payload.subject}</strong>".</p>
      <p>Our team will review your inquiry and get back to you as soon as possible.</p>
      <p>Best Regards,<br/>WePlan Team</p>
    </div>
  `;
  
  await sendEmail({
    to: payload.email,
    subject: 'We have received your message!',
    html: autoReplyHtml
  });

  // Send notification to admins
  await sendNotificationToAdmins(
    'New Contact Inquiry 📧',
    `You have a new message from ${payload.email} regarding "${payload.subject}".`,
    'general',
    { 
      contactId: result._id.toString(),
      actionLink: `/dashboard/admin/contact-messages` 
    }
  );

  return result;
};

const getAllMessagesFromDB = async (query: Record<string, unknown>) => {
  const messageQuery = new QueryBuilder(ContactUs.find(), query)
    .search(['email', 'subject', 'message'])
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

  // Send email to user
  const replyHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Re: ${message.subject}</h2>
      <p>Hi,</p>
      <p>${replyText.replace(/\n/g, '<br/>')}</p>
      <hr/>
      <p><em>Your original message:</em></p>
      <blockquote style="border-left: 3px solid #ccc; padding-left: 10px; color: #555;">
        ${message.message.replace(/\n/g, '<br/>')}
      </blockquote>
      <br/>
      <p>Best Regards,<br/>WePlan Support Team</p>
    </div>
  `;

  await sendEmail({
    to: message.email,
    subject: `Re: ${message.subject}`,
    html: replyHtml
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
