import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT || 587);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

if (!host || !user || !pass) {
  console.warn("SMTP not fully configured. Emails will fail until SMTP vars are set.");
}

export const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: user && pass ? { user, pass } : undefined,
});

export async function sendOtpEmail(to: string, otp: string) {
  if (!transporter) throw new Error("Mail transporter not configured");

  const info = await transporter.sendMail({
    from,
    to,
    subject: "Your Cavendish Bus Tracker OTP",
    text: `Your OTP code is: ${otp}. It expires in 10 minutes.`,
    html: `<p>Your OTP code is: <strong>${otp}</strong></p><p>It expires in 10 minutes.</p>`,
  });

  return info;
}

export default sendOtpEmail;
