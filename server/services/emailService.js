import nodemailer from "nodemailer";

// Create reusable transporter
const createTransporter = () => {
  // For Gmail with explicit SMTP settings
  if (process.env.EMAIL_SERVICE === "gmail") {
    return nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // use TLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // Use App Password, not regular password
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }

  // For other SMTP services (SendGrid, Mailgun, etc.)
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

// Send password reset email
export const sendPasswordResetEmail = async (email, resetToken, userName) => {
  try {
    // If email is not configured, log to console (development mode)
    if (!process.env.EMAIL_USER && !process.env.SMTP_HOST) {
      console.log("\n=================================");
      console.log("📧 EMAIL NOT CONFIGURED - DEVELOPMENT MODE");
      console.log("PASSWORD RESET TOKEN FOR:", email);
      console.log("Token:", resetToken);
      console.log("Expires in: 1 hour");
      console.log("=================================\n");
      return { success: true, mode: "console" };
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.APP_NAME || "Restaurant QR Menu"}" <${
        process.env.EMAIL_USER || process.env.SMTP_USER
      }>`,
      to: email,
      subject: "Reset Your Password",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f97316; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .code-box { background-color: #fff; border: 2px dashed #f97316; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px; }
            .code { font-size: 32px; font-weight: bold; color: #f97316; letter-spacing: 5px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .button { display: inline-block; padding: 12px 30px; background-color: #f97316; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hi ${userName || "there"},</p>
              <p>We received a request to reset your password. Use the code below to reset your password:</p>
              
              <div class="code-box">
                <div class="code">${resetToken}</div>
              </div>
              
              <p><strong>This code will expire in 1 hour.</strong></p>
              
              <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
              
              <p>For security reasons, never share this code with anyone.</p>
              
              <p>Best regards,<br>The ${
                process.env.APP_NAME || "Restaurant QR Menu"
              } Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${userName || "there"},

We received a request to reset your password.

Your password reset code is: ${resetToken}

This code will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.

Best regards,
The ${process.env.APP_NAME || "Restaurant QR Menu"} Team
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Password reset email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw error;
  }
};

// Send welcome email (optional - for future use)
export const sendWelcomeEmail = async (email, userName) => {
  try {
    if (!process.env.EMAIL_USER && !process.env.SMTP_HOST) {
      console.log("📧 Welcome email would be sent to:", email);
      return { success: true, mode: "console" };
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.APP_NAME || "Restaurant QR Menu"}" <${
        process.env.EMAIL_USER || process.env.SMTP_USER
      }>`,
      to: email,
      subject: "Welcome to Restaurant QR Menu!",
      html: `
        <h1>Welcome ${userName}!</h1>
        <p>Thank you for joining us. We're excited to have you on board!</p>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending welcome email:", error);
    throw error;
  }
};
