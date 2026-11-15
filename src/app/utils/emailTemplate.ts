interface IEmailOptions {
  userName: string;
  title: string;
  body: string;
  otpCode?: string;
  buttonText?: string;
  buttonLink?: string;
}

export const getEmailTemplate = ({
  userName,
  title,
  body,
  otpCode,
  buttonText,
  buttonLink,
}: IEmailOptions): string => {
  const logoUrl =
    "https://res.cloudinary.com/da1uxchgo/image/upload/v1781263900/un4seen/i9ti2hs0hnzi8apxz5fj.png";
  const brandColor = "#BE185D"; // Your brand primary color

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        /* General Reset */
        body { margin: 0; padding: 0; font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #f4f4f7; color: #333333; -webkit-font-smoothing: antialiased; }
        table { border-collapse: collapse !important; }
        a { text-decoration: none !important; }

        /* Container */
        .wrapper { width: 100%; table-layout: fixed; background-color: #f4f4f7; padding-bottom: 40px; }
        .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }

        /* Header */
        .header { background-color: #ffffff; padding: 30px; text-align: center; border-bottom: 1px solid #eeeeee; }
        .logo { width: 140px; height: auto; }

        /* Body */
        .content { padding: 40px 35px; line-height: 1.6; text-align: left; }
        .greeting { font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 15px; }
        .title { font-size: 24px; font-weight: 700; color: ${brandColor}; margin-bottom: 20px; line-height: 1.2; }
        .body-text { font-size: 16px; color: #555555; margin-bottom: 30px; }

        /* OTP Section */
        .otp-container { background-color: #fff0f6; border: 2px dashed ${brandColor}; border-radius: 12px; padding: 25px; text-align: center; margin: 30px 0; }
        .otp-label { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #888888; margin-bottom: 10px; font-weight: bold; }
        .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 10px; color: ${brandColor}; margin: 0; }

        /* Button */
        .btn-wrapper { text-align: center; margin: 35px 0; }
        .btn { background-color: ${brandColor}; color: #ffffff !important; padding: 14px 35px; font-size: 16px; font-weight: 600; border-radius: 8px; display: inline-block; transition: background-color 0.3s; }

        /* Footer */
        .footer { padding: 30px; text-align: center; font-size: 13px; color: #999999; background-color: #fafafa; }
        .footer p { margin: 5px 0; }
        .social-links { margin-top: 20px; }
        .social-links a { color: ${brandColor}; font-weight: bold; margin: 0 10px; }

        /* Responsive */
        @media screen and (max-width: 600px) {
            .content { padding: 30px 20px; }
            .main { width: 95% !important; margin: 20px auto; }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <center>
            <div style="height: 40px;">&nbsp;</div>
            <table class="main" role="presentation">
                <!-- Header -->
                <tr>
                    <td class="header">
                        <img src="${logoUrl}" alt="WePlan Logo" class="logo">
                    </td>
                </tr>

                <!-- Content Area -->
                <tr>
                    <td class="content">
                        <div class="greeting">Hi ${userName},</div>
                        <div class="title">${title}</div>
                        <div class="body-text">${body}</div>

                        <!-- Conditionally render OTP -->
                        ${
                          otpCode
                            ? `
                        <div class="otp-container">
                            <span class="otp-label">Verification Code</span>
                            <div class="otp-code">${otpCode}</div>
                            <p style="font-size: 13px; color: #888; margin-top: 15px;">Valid for the next 10 minutes.</p>
                        </div>
                        `
                            : ""
                        }

                        <!-- Conditionally render Button -->
                        ${
                          buttonText && buttonLink
                            ? `
                        <div class="btn-wrapper">
                            <a href="${buttonLink}" class="btn">${buttonText}</a>
                        </div>
                        `
                            : ""
                        }

                        <p style="font-size: 15px; color: #666; margin-top: 30px;">
                            Warm regards,<br>
                            <strong>Team WePlan</strong>
                        </p>
                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td class="footer">
                        <p>Crafting Your Perfect Wedding Story.</p>
                        <p>&copy; ${new Date().getFullYear()} WePlan. All rights reserved.</p>
                        <div class="social-links">
                            <a href="https://www.facebook.com/Weplanofficial" target="_blank">Facebook</a> | <a href="https://www.instagram.com/weplan.official/" target="_blank">Instagram</a> | <a href="https://www.linkedin.com/company/weplans" target="_blank">LinkedIn</a>
                        </div>
                        <p style="margin-top: 15px; font-size: 11px;">You are receiving this email because you registered on our platform. If this wasn't you, please ignore this email.</p>
                    </td>
                </tr>
            </table>
            <div style="height: 40px;">&nbsp;</div>
        </center>
    </div>
</body>
</html>
    `;
};

export interface IContactUsAutoReply {
  name?: string;
  subject: string;
  message: string;
  email: string;
}

export const renderContactUsAutoReplyEmail = ({
  name,
  subject,
  message,
}: IContactUsAutoReply): string => {
  const logoUrl =
    'https://res.cloudinary.com/da1uxchgo/image/upload/v1781263900/un4seen/i9ti2hs0hnzi8apxz5fj.png';
  const brandColor = '#BE185D';
  const recipientName = name && name.trim() ? name.trim() : 'there';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thank you for contacting WePlan</title>
    <style>
        body { margin: 0; padding: 0; font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #f4f4f7; color: #333333; -webkit-font-smoothing: antialiased; }
        table { border-collapse: collapse !important; }
        a { text-decoration: none !important; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f4f4f7; padding: 30px 0 50px 0; }
        .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
        .header { background: linear-gradient(135deg, #ffffff 0%, #fff5f8 100%); padding: 35px 20px; text-align: center; border-bottom: 2px solid #fde2ec; }
        .logo { width: 150px; height: auto; max-height: 50px; object-fit: contain; }
        .content { padding: 40px 35px; line-height: 1.6; text-align: left; }
        .greeting { font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 12px; }
        .title { font-size: 22px; font-weight: 700; color: ${brandColor}; margin-bottom: 18px; line-height: 1.3; }
        .body-text { font-size: 15px; color: #555555; margin-bottom: 24px; }
        .summary-box { background-color: #fafafa; border: 1px solid #eeeeee; border-left: 4px solid ${brandColor}; border-radius: 8px; padding: 18px 20px; margin: 25px 0; }
        .summary-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #888888; margin-bottom: 6px; }
        .summary-subject { font-size: 16px; font-weight: 600; color: #222222; margin-bottom: 10px; }
        .summary-message { font-size: 14px; color: #555555; white-space: pre-wrap; font-style: italic; }
        .info-pill { background-color: #fff0f6; border: 1px solid #fcc7d9; border-radius: 6px; padding: 12px 16px; font-size: 13px; color: #9c174c; margin: 20px 0; }
        .footer { padding: 30px; text-align: center; font-size: 12px; color: #999999; background-color: #fafafa; border-top: 1px solid #f0f0f0; }
        .footer p { margin: 6px 0; }
        .social-links { margin-top: 15px; }
        .social-links a { color: ${brandColor}; font-weight: 600; margin: 0 8px; }
        @media screen and (max-width: 600px) {
            .content { padding: 30px 20px; }
            .main { width: 95% !important; margin: 15px auto; }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <center>
            <table class="main" role="presentation">
                <!-- Header with prominent WePlan Logo -->
                <tr>
                    <td class="header">
                        <img src="${logoUrl}" alt="WePlan Logo" class="logo" />
                    </td>
                </tr>

                <!-- Content Area -->
                <tr>
                    <td class="content">
                        <div class="greeting">Hi ${recipientName},</div>
                        <div class="title">Thank You for Contacting Us!</div>
                        <p class="body-text">
                            We have received your message regarding <strong>"${subject}"</strong>. Our dedicated support team is currently reviewing your inquiry and will get back to you as soon as possible.
                        </p>

                        <!-- Message Summary Card -->
                        <div class="summary-box">
                            <div class="summary-label">Your Submitted Inquiry:</div>
                            <div class="summary-subject">${subject}</div>
                            <div class="summary-message">"${message.replace(/\n/g, '<br/>')}"</div>
                        </div>

                        <div class="info-pill">
                            ⏳ We typically respond within 24 business hours. If your request is urgent, you can also reach us via phone or WhatsApp.
                        </div>

                        <p style="font-size: 15px; color: #555555; margin-top: 30px; line-height: 1.5;">
                            Warm regards,<br>
                            <strong style="color: #222222;">Team WePlan</strong><br>
                            <span style="font-size: 13px; color: #888888;">WePlan Event Management & Services</span>
                        </p>
                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td class="footer">
                        <p><strong>WePlan</strong> — Crafting Your Perfect Wedding Story.</p>
                        <p>&copy; ${new Date().getFullYear()} WePlan. All rights reserved.</p>
                        <div class="social-links">
                            <a href="https://www.facebook.com/Weplanofficial" target="_blank">Facebook</a> |
                            <a href="https://www.instagram.com/weplan.official/" target="_blank">Instagram</a> |
                            <a href="https://www.linkedin.com/company/weplans" target="_blank">LinkedIn</a>
                        </div>
                        <p style="margin-top: 15px; font-size: 11px; color: #aaaaaa;">
                            This is an automated confirmation sent from our Contact Us desk at WePlan.
                        </p>
                    </td>
                </tr>
            </table>
        </center>
    </div>
</body>
</html>
  `;
};

export const renderContactUsAdminReplyEmail = ({
  name,
  subject,
  replyMessage,
  originalMessage,
}: {
  name?: string;
  subject: string;
  replyMessage: string;
  originalMessage: string;
}): string => {
  const logoUrl =
    'https://res.cloudinary.com/da1uxchgo/image/upload/v1781263900/un4seen/i9ti2hs0hnzi8apxz5fj.png';
  const brandColor = '#BE185D';
  const recipientName = name && name.trim() ? name.trim() : 'there';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Response to your inquiry - WePlan</title>
    <style>
        body { margin: 0; padding: 0; font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #f4f4f7; color: #333333; -webkit-font-smoothing: antialiased; }
        table { border-collapse: collapse !important; }
        a { text-decoration: none !important; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f4f4f7; padding: 30px 0 50px 0; }
        .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
        .header { background: linear-gradient(135deg, #ffffff 0%, #fff5f8 100%); padding: 35px 20px; text-align: center; border-bottom: 2px solid #fde2ec; }
        .logo { width: 150px; height: auto; max-height: 50px; object-fit: contain; }
        .content { padding: 40px 35px; line-height: 1.6; text-align: left; }
        .greeting { font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 12px; }
        .title { font-size: 20px; font-weight: 700; color: ${brandColor}; margin-bottom: 18px; }
        .reply-box { background-color: #ffffff; border-left: 4px solid ${brandColor}; padding: 15px 20px; margin: 20px 0; font-size: 15px; color: #222222; }
        .original-box { background-color: #fafafa; border: 1px solid #eeeeee; border-radius: 8px; padding: 15px 20px; margin: 20px 0; font-size: 13px; color: #666666; }
        .footer { padding: 30px; text-align: center; font-size: 12px; color: #999999; background-color: #fafafa; border-top: 1px solid #f0f0f0; }
        .social-links a { color: ${brandColor}; font-weight: 600; margin: 0 8px; }
    </style>
</head>
<body>
    <div class="wrapper">
        <center>
            <table class="main" role="presentation">
                <tr>
                    <td class="header">
                        <img src="${logoUrl}" alt="WePlan Logo" class="logo" />
                    </td>
                </tr>
                <tr>
                    <td class="content">
                        <div class="greeting">Hi ${recipientName},</div>
                        <div class="title">Re: ${subject}</div>
                        <div class="reply-box">
                            ${replyMessage.replace(/\n/g, '<br/>')}
                        </div>
                        <div class="original-box">
                            <strong>Your original inquiry:</strong><br/>
                            "${originalMessage.replace(/\n/g, '<br/>')}"
                        </div>
                        <p style="font-size: 15px; color: #555555; margin-top: 25px;">
                            Warm regards,<br>
                            <strong style="color: #222222;">Team WePlan Support</strong>
                        </p>
                    </td>
                </tr>
                <tr>
                    <td class="footer">
                        <p>&copy; ${new Date().getFullYear()} WePlan. All rights reserved.</p>
                    </td>
                </tr>
            </table>
        </center>
    </div>
</body>
</html>
  `;
};