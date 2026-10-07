import fs from "fs";
import path from "path";
import ejs from "ejs";
import nodemailer from "nodemailer";

import config from "../config";

interface IEmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: config.email_user,
    pass: config.email_password,
  },
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 15_000,
});

const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  attachments?: IEmailAttachment[],
) => {
  try {
    await transporter.sendMail({
      from: config.email_from,
      to,
      subject,
      html,
      attachments,
    });
  } catch (error) {
    console.error("[Email] Failed to send email:", {
      to,
      subject,
      error: error instanceof Error ? error.message : "Unknown email error",
    });

    throw error;
  }
};

const renderEmailTemplate = async (
  templateName: string,
  data: Record<string, unknown>,
): Promise<string> => {
  const templatePath = path.join(
    process.cwd(),
    "src",
    "app",
    "templates",
    "email",
    templateName,
  );

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Email template not found: ${templateName}`);
  }

  return ejs.renderFile(templatePath, data);
};

const sendOtpEmail = async (email: string, otp: string, purpose: string) => {
  const html = await renderEmailTemplate("otp.ejs", {
    otp,
    purpose,
    expiresInMinutes: 5,
  });

  await sendEmail(email, `ParcelRelay - ${purpose}`, html);
};

const sendWelcomeEmail = async (email: string, name: string) => {
  const html = await renderEmailTemplate("welcome.ejs", {
    name,
  });

  await sendEmail(email, "Welcome to ParcelRelay", html);
};

const sendCourierApprovalEmail = async (
  email: string,
  name: string,
  approved: boolean,
) => {
  const html = await renderEmailTemplate("courier-approval.ejs", {
    name,
    approved,
  });

  await sendEmail(
    email,
    approved
      ? "ParcelRelay Courier Application Approved"
      : "ParcelRelay Courier Application Rejected",
    html,
  );
};

const sendShippingLabelEmail = async ({
  to,
  customerName,
  trackingNumber,
  shipmentId,
  shippingLabel,
}: {
  to: string;
  customerName: string;
  trackingNumber: string;
  shipmentId: string;
  shippingLabel: Buffer;
}) => {
  const html = await renderEmailTemplate("shipping-label.ejs", {
    customerName,
    trackingNumber,
    shipmentId,
  });

  await sendEmail(to, "ParcelRelay Shipping Label", html, [
    {
      filename: `shipping-label-${trackingNumber}.pdf`,
      content: shippingLabel,
      contentType: "application/pdf",
    },
  ]);
};

const sendPaymentSuccessEmail = async (
  email: string,
  name: string,
  shipmentId: string,
  transactionId: string,
  amount: number,
  attachments?: IEmailAttachment[],
) => {
  const html = await renderEmailTemplate("payment-success.ejs", {
    name,
    shipmentId,
    transactionId,
    amount,
  });

  await sendEmail(email, "ParcelRelay Payment Successful", html, attachments);
};

export const emailUtils = {
  sendEmail,
  sendOtpEmail,
  sendWelcomeEmail,
  sendCourierApprovalEmail,
  sendShippingLabelEmail,
  sendPaymentSuccessEmail,
};
