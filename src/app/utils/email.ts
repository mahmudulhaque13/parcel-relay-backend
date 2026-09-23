import nodemailer from "nodemailer";

import config from "../config";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: config.email_user,
    pass: config.email_password,
  },
});

const sendEmail = async (to: string, subject: string, html: string) => {
  await transporter.sendMail({
    from: config.email_from,
    to,
    subject,
    html,
  });
};

const sendOtpEmail = async (email: string, otp: string, purpose: string) => {
  await sendEmail(
    email,
    `ParcelRelay - ${purpose}`,
    `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>ParcelRelay</h2>

        <p>Your verification code is:</p>

        <h1 style="letter-spacing: 8px;">
          ${otp}
        </h1>

        <p>This OTP will expire in 5 minutes.</p>

        <p>If you did not request this code, please ignore this email.</p>
      </div>
    `,
  );
};

export const emailUtils = {
  sendEmail,
  sendOtpEmail,
};
