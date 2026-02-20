import nodemailer from "nodemailer";

// Get Gmail configuration from environment
const gmailEmail = process.env.GMAIL_EMAIL;
const gmailPassword = process.env.GMAIL_APP_PASSWORD;

if (!gmailEmail || !gmailPassword) {
  console.warn(
    "[Nodemailer] Gmail credentials not configured. OTP emails will fail. Set GMAIL_EMAIL and GMAIL_APP_PASSWORD."
  );
}

/**
 * Create nodemailer transporter for Gmail
 * Uses Gmail's SMTP server with app-specific password
 */
export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: gmailEmail && gmailPassword ? {
    user: gmailEmail,
    pass: gmailPassword,
  } : undefined,
});

/**
 * Send OTP email via Gmail
 * @param to - Recipient email address
 * @param otp - 6-digit OTP code
 * @returns Mail info object
 */
export async function sendOtpEmail(to: string, otp: string) {
  try {
    if (!gmailEmail || !gmailPassword) {
      throw new Error(
        "Gmail credentials not configured. Set GMAIL_EMAIL and GMAIL_APP_PASSWORD in .env.local"
      );
    }

    const info = await transporter.sendMail({
      from: gmailEmail,
      to,
      subject: "Your Cavendish Bus Tracker OTP",
      text: `Your OTP code is: ${otp}. It expires in 5 minutes. Do not share this code with anyone.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <h2>OTP Verification</h2>
          <p>Your OTP code is:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
            <h1 style="letter-spacing: 5px; font-weight: bold; color: #333;">${otp}</h1>
          </div>
          <p style="color: #666; font-size: 14px;">
            <strong>Expires in:</strong> 5 minutes<br>
            <strong>Do not share this code with anyone.</strong>
          </p>
        </div>
      `,
    });

    console.info(`[Nodemailer] OTP email sent to ${to}`, { messageId: info.messageId });
    return info;
  } catch (error) {
    console.error("[Nodemailer] Failed to send OTP email:", error);
    throw error;
  }
}

export default sendOtpEmail;
