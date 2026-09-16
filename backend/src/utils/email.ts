import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<void> => {
  if (!env.SMTP_USER) {
    console.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
    return;
  }

  await transporter.sendMail({
    from: `"CSE Portal" <${env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
};

export const sendOTPEmail = async (email: string, otp: string): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
      <h2>CSE Portal - Email Verification</h2>
      <p>Your OTP for email verification is:</p>
      <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; 
                  font-weight: bold; letter-spacing: 5px; border-radius: 8px;">
        ${otp}
      </div>
      <p style="color: #666; margin-top: 15px;">
        This OTP expires in ${env.OTP_EXPIRY_MINUTES} minutes. Do not share this code.
      </p>
    </div>
  `;
  await sendEmail(email, 'CSE Portal - Email Verification OTP', html);
};

export const sendNotificationEmail = async (
  email: string,
  title: string,
  message: string
): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
      <h2>CSE Portal - ${title}</h2>
      <p>${message}</p>
      <hr style="border: none; border-top: 1px solid #eee;" />
      <p style="color: #999; font-size: 12px;">
        This is an automated notification from CSE Portal.
      </p>
    </div>
  `;
  await sendEmail(email, `CSE Portal - ${title}`, html);
};
